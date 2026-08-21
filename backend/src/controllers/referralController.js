const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const Referral = require('../models/Referral');
const Employee = require('../models/Employee');
const { createNotification } = require('../services/notificationService');

// @desc  Internal Referral / Transfer Network — nominate an employee for internal transfer,
//        or refer an external candidate for an open job.
// @route POST /api/referrals
const createReferral = asyncHandler(async (req, res) => {
  const { type, employee, candidateName, candidateEmail, job, toDepartment, reason } = req.body;
  if (!type) throw new ApiError(400, 'type is required (referral | transfer)');

  let fromDepartment;
  if (type === 'transfer') {
    if (!employee || !toDepartment) throw new ApiError(400, 'employee and toDepartment are required for a transfer nomination');
    const nominee = await Employee.findById(employee);
    if (!nominee) throw new ApiError(404, 'Nominated employee not found');
    fromDepartment = nominee.department;
  } else if (type === 'referral') {
    if (!candidateName || !candidateEmail || !job) throw new ApiError(400, 'candidateName, candidateEmail and job are required for a referral');
  } else {
    throw new ApiError(400, "type must be 'referral' or 'transfer'");
  }

  const referral = await Referral.create({
    type,
    employee,
    candidateName,
    candidateEmail,
    job,
    fromDepartment,
    toDepartment,
    reason,
    nominatedBy: req.user._id,
  });

  created(res, referral, `${type === 'transfer' ? 'Transfer nomination' : 'Referral'} submitted`);
});

// @desc  List referrals/transfer nominations
// @route GET /api/referrals
const listReferrals = asyncHandler(async (req, res) => {
  const { type, status } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;

  const referrals = await Referral.find(filter)
    .populate({ path: 'employee', populate: { path: 'user', select: 'name' } })
    .populate('nominatedBy', 'name')
    .populate('fromDepartment', 'name')
    .populate('toDepartment', 'name')
    .populate('job', 'title')
    .sort({ createdAt: -1 });
  ok(res, referrals);
});

// @desc  Full profile/history view for a nominated employee (so the receiving manager can decide)
// @route GET /api/referrals/:id/candidate-profile
const getNomineeProfile = asyncHandler(async (req, res) => {
  const referral = await Referral.findById(req.params.id);
  if (!referral) throw new ApiError(404, 'Referral not found');
  if (referral.type !== 'transfer' || !referral.employee) {
    throw new ApiError(400, 'This referral does not reference an internal employee');
  }

  const employee = await Employee.findById(referral.employee)
    .populate('user', 'name email')
    .populate('department', 'name');
  ok(res, employee);
});

// @desc  Approve or reject a referral/transfer nomination
// @route PATCH /api/referrals/:id/decision
const decideReferral = asyncHandler(async (req, res) => {
  const { decision } = req.body;
  if (!['approved', 'rejected'].includes(decision)) throw new ApiError(400, "decision must be 'approved' or 'rejected'");

  const referral = await Referral.findById(req.params.id);
  if (!referral) throw new ApiError(404, 'Referral not found');
  if (referral.status !== 'pending') throw new ApiError(400, 'This referral has already been decided');

  referral.status = decision;
  referral.decidedBy = req.user._id;
  referral.decidedAt = new Date();
  await referral.save();

  if (decision === 'approved' && referral.type === 'transfer' && referral.employee) {
    await Employee.findByIdAndUpdate(referral.employee, { department: referral.toDepartment });
  }

  await createNotification({
    userId: referral.nominatedBy,
    type: 'referral_update',
    title: `Referral ${decision}`,
    message: `Your ${referral.type} submission was ${decision}.`,
  });

  ok(res, referral, `Referral ${decision}`);
});

module.exports = { createReferral, listReferrals, getNomineeProfile, decideReferral };
