const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok } = require('../utils/apiResponse');
const Employee = require('../models/Employee');
const CareerEvent = require('../models/CareerEvent');
const Evaluation = require('../models/Evaluation');
const { resolveEmployeeId } = require('../utils/resolveEmployee');
const { calculatePerformanceScore } = require('../services/performanceService');
const aiService = require('../services/aiService');

// @desc  Interactive Profile Map — full 360 view: career history, skills, courses,
//        past evaluations and personalized development tips.
// @route GET /api/profile/:employeeId?  (defaults to the logged-in employee)
const getProfileMap = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);

  const employee = await Employee.findById(employeeId)
    .populate('user', 'name email')
    .populate('department', 'name')
    .populate('manager', 'position');
  if (!employee) throw new ApiError(404, 'Employee not found');

  const [careerHistory, evaluations, performance] = await Promise.all([
    CareerEvent.find({ employee: employeeId }).sort({ date: 1 }),
    Evaluation.find({ employee: employeeId }).sort({ createdAt: -1 }),
    calculatePerformanceScore(employeeId, { persist: false }),
  ]);

  const tips = await aiService.generateDevelopmentTips({
    skills: employee.skills,
    courses: employee.courses,
    performanceScore: performance.score,
  });

  ok(res, {
    employee,
    careerHistory,
    skills: employee.skills,
    courses: employee.courses,
    evaluations,
    performanceScore: performance,
    developmentTips: tips,
  });
});

// @desc  Career Timeline only
// @route GET /api/profile/:employeeId?/timeline
const getCareerTimeline = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const events = await CareerEvent.find({ employee: employeeId }).sort({ date: 1 }).populate('department', 'name');
  ok(res, events);
});

// @desc  HR/manager adds a career event (promotion, transfer, project lead, etc.)
// @route POST /api/profile/:employeeId/timeline
const addCareerEvent = asyncHandler(async (req, res) => {
  const { type, title, description, department, previousValue, newValue, date } = req.body;
  if (!type || !title) throw new ApiError(400, 'type and title are required');

  const event = await CareerEvent.create({
    employee: req.params.employeeId,
    type,
    title,
    description,
    department,
    previousValue,
    newValue,
    date: date || new Date(),
    createdBy: req.user._id,
  });

  if (type === 'promotion' && newValue) {
    await Employee.findByIdAndUpdate(req.params.employeeId, { level: newValue });
  }
  if (type === 'transfer' && department) {
    await Employee.findByIdAndUpdate(req.params.employeeId, { department });
  }

  ok(res, event, 'Career event added', 201);
});

module.exports = { getProfileMap, getCareerTimeline, addCareerEvent };
