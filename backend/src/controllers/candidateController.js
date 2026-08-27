const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const Candidate = require('../models/Candidate');
const Employee = require('../models/Employee');
const User = require('../models/User');
const CareerEvent = require('../models/CareerEvent');
const { resolveUploadPath } = require('../utils/fileServe');

const listCandidates = asyncHandler(async (req, res) => {
  const { job, stage } = req.query;
  const filter = {};
  if (job) filter.job = job;
  if (stage) filter.stage = stage;
  const candidates = await Candidate.find(filter).populate('job', 'title').sort({ createdAt: -1 });
  ok(res, candidates);
});

const getCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id).populate('job', 'title').populate('referral');
  if (!candidate) throw new ApiError(404, 'Candidate not found');
  ok(res, candidate);
});

const createCandidate = asyncHandler(async (req, res) => {
  const { name, email, phone, job, source } = req.body;
  if (!name || !email || !job) throw new ApiError(400, 'name, email and job are required');

  const candidate = await Candidate.create({
    name,
    email,
    phone,
    job,
    source: source || 'careers_page',
    resumeUrl: req.file ? `/uploads/resumes/${req.file.filename}` : undefined,
  });
  created(res, candidate, 'Candidate added');
});

const updateCandidateStage = asyncHandler(async (req, res) => {
  const { stage } = req.body;
  if (!stage) throw new ApiError(400, 'stage is required');
  const candidate = await Candidate.findByIdAndUpdate(req.params.id, { stage }, { new: true });
  if (!candidate) throw new ApiError(404, 'Candidate not found');
  ok(res, candidate, 'Candidate stage updated');
});

// @desc  Convert an accepted candidate directly into an employee record
// @route POST /api/candidates/:id/hire
const hireCandidate = asyncHandler(async (req, res) => {
  const { employeeCode, department, position, level, hireDate, baseSalary, password } = req.body;
  if (!employeeCode || !position || !hireDate) {
    throw new ApiError(400, 'employeeCode, position and hireDate are required');
  }

  const candidate = await Candidate.findById(req.params.id).populate('job', 'title department');
  if (!candidate) throw new ApiError(404, 'Candidate not found');
  if (candidate.hiredEmployee) throw new ApiError(400, 'This candidate has already been hired');

  const user = await User.create({
    name: candidate.name,
    email: candidate.email,
    password: password || `Welcome${Math.random().toString(36).slice(2, 8)}!`,
    role: 'employee',
  });

  const employee = await Employee.create({
    user: user._id,
    employeeCode,
    department: department || candidate.job?.department,
    position,
    level,
    hireDate,
    baseSalary,
  });
  user.employee = employee._id;
  await user.save();

  await CareerEvent.create({
    employee: employee._id,
    type: 'hire',
    title: `Joined as ${position}`,
    date: hireDate,
    createdBy: req.user._id,
  });

  candidate.stage = 'hired';
  candidate.hiredEmployee = employee._id;
  await candidate.save();

  created(res, { candidate, employee }, 'Candidate hired and converted to an employee');
});

// @desc  Add an internal note to a candidate's file
// @route POST /api/candidates/:id/notes
const addCandidateNote = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) throw new ApiError(400, 'text is required');

  const candidate = await Candidate.findByIdAndUpdate(
    req.params.id,
    { $push: { notes: { text, by: req.user._id, at: new Date() } } },
    { new: true }
  );
  if (!candidate) throw new ApiError(404, 'Candidate not found');
  created(res, candidate, 'Note added');
});

// @desc  Download a candidate's resume (manager/hr_admin only, per the router gate above)
// @route GET /api/candidates/:id/resume
const downloadResume = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) throw new ApiError(404, 'Candidate not found');
  if (!candidate.resumeUrl) throw new ApiError(404, 'This candidate has no resume on file');

  const filePath = resolveUploadPath(candidate.resumeUrl);
  const ext = path.extname(filePath);
  res.download(filePath, `${candidate.name}-resume${ext}`);
});

module.exports = { listCandidates, getCandidate, createCandidate, updateCandidateStage, hireCandidate, addCandidateNote, downloadResume };
