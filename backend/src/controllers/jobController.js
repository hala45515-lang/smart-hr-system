const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const Job = require('../models/Job');

const listJobs = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const jobs = await Job.find(filter).populate('department', 'name').sort({ createdAt: -1 });
  ok(res, jobs);
});

const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('department', 'name');
  if (!job) throw new ApiError(404, 'Job not found');
  ok(res, job);
});

const createJob = asyncHandler(async (req, res) => {
  const { title, department, description, requirements, openings } = req.body;
  if (!title) throw new ApiError(400, 'title is required');
  const job = await Job.create({ title, department, description, requirements, openings, createdBy: req.user._id });
  created(res, job, 'Job posted');
});

const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!job) throw new ApiError(404, 'Job not found');
  ok(res, job, 'Job updated');
});

module.exports = { listJobs, getJob, createJob, updateJob };
