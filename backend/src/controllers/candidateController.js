const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const Candidate = require('../models/Candidate');

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

module.exports = { listCandidates, getCandidate, createCandidate, updateCandidateStage };
