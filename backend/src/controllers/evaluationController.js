const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const Evaluation = require('../models/Evaluation');
const { calculatePerformanceScore } = require('../services/performanceService');
const { resolveEmployeeId } = require('../utils/resolveEmployee');

// @desc  Manager/HR submits a performance evaluation for an employee
// @route POST /api/evaluations/:employeeId
const createEvaluation = asyncHandler(async (req, res) => {
  const { period, managerRating, strengths, areasToImprove, comments } = req.body;
  if (!period || !managerRating) throw new ApiError(400, 'period and managerRating are required');

  const evaluation = await Evaluation.create({
    employee: req.params.employeeId,
    evaluator: req.user._id,
    period,
    managerRating,
    strengths,
    areasToImprove,
    comments,
  });

  await calculatePerformanceScore(req.params.employeeId);

  created(res, evaluation, 'Evaluation submitted');
});

// @desc  List evaluations for an employee
// @route GET /api/evaluations/:employeeId
const listEvaluations = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const evaluations = await Evaluation.find({ employee: employeeId })
    .sort({ createdAt: -1 })
    .populate('evaluator', 'name');
  ok(res, evaluations);
});

module.exports = { createEvaluation, listEvaluations };
