const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const Employee = require('../models/Employee');
const { resolveEmployeeId } = require('../utils/resolveEmployee');
const { findLeaveConflicts, createNotification } = require('../services/notificationService');

const daysBetween = (start, end) => Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

/**
 * Scopes who may act on someone else's leave request: hr_admin can act on
 * anyone's; a manager only on their own department's team; a plain employee
 * only on their own request.
 */
const assertCanActOnLeaveRequest = async (req, leaveRequest) => {
  if (req.user.role === 'hr_admin') return;

  if (req.user.role === 'manager') {
    const managerEmployee = await Employee.findOne({ user: req.user._id }).select('department');
    const requesterDepartment = leaveRequest.employee?.department;
    if (managerEmployee?.department && requesterDepartment && String(managerEmployee.department) === String(requesterDepartment)) {
      return;
    }
    throw new ApiError(403, 'You can only manage leave requests for your own team');
  }

  const own = await Employee.findOne({ user: req.user._id }).select('_id');
  if (!own || String(own._id) !== String(leaveRequest.employee?._id || leaveRequest.employee)) {
    throw new ApiError(403, 'You can only manage your own leave requests');
  }
};

// @desc  Get leave balances for the current year (how many days left, no need to ask)
// @route GET /api/leave/:employeeId?/balances
const getBalances = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const year = Number(req.query.year) || new Date().getFullYear();
  const balances = await LeaveBalance.find({ employee: employeeId, year }).populate('leaveType', 'name');
  ok(res, balances);
});

// @desc  Submit a leave request; flags conflicts with teammates automatically
// @route POST /api/leave/:employeeId?/requests
const createLeaveRequest = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const { leaveType, startDate, endDate, reason } = req.body;
  if (!leaveType || !startDate || !endDate) throw new ApiError(400, 'leaveType, startDate and endDate are required');

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) throw new ApiError(400, 'endDate must be after startDate');
  const days = daysBetween(start, end);

  const year = start.getFullYear();
  const balance = await LeaveBalance.findOne({ employee: employeeId, leaveType, year });
  if (balance && balance.totalDays - balance.usedDays < days) {
    throw new ApiError(400, 'Insufficient leave balance for the requested range');
  }

  const conflicts = await findLeaveConflicts(employeeId, start, end);

  const leaveRequest = await LeaveRequest.create({
    employee: employeeId,
    leaveType,
    startDate: start,
    endDate: end,
    days,
    reason,
    attachmentUrl: req.file ? `/uploads/documents/${req.file.filename}` : undefined,
  });

  created(res, {
    leaveRequest,
    teamConflicts: conflicts.map((c) => ({
      employeeName: c.employee?.user?.name,
      startDate: c.startDate,
      endDate: c.endDate,
    })),
  }, 'Leave request submitted');
});

// @desc  List leave requests (mine, or a given employee's for managers/HR)
// @route GET /api/leave/:employeeId?/requests
const listLeaveRequests = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const { status } = req.query;
  const filter = { employee: employeeId };
  if (status) filter.status = status;
  const requests = await LeaveRequest.find(filter).sort({ startDate: -1 }).populate('leaveType', 'name');
  ok(res, requests);
});

// @desc  List all pending leave requests across every employee, for HR/manager review
// @route GET /api/leave/requests/pending
const listPendingLeaveRequests = asyncHandler(async (req, res) => {
  let employeeFilter = {};
  if (req.user.role === 'manager') {
    const managerEmployee = await Employee.findOne({ user: req.user._id }).select('department');
    if (managerEmployee?.department) {
      const teamIds = await Employee.find({ department: managerEmployee.department }).select('_id');
      employeeFilter = { employee: { $in: teamIds.map((e) => e._id) } };
    }
  }

  const requests = await LeaveRequest.find({ status: 'pending', ...employeeFilter })
    .sort({ createdAt: 1 })
    .populate({ path: 'employee', populate: [{ path: 'user', select: 'name email' }, { path: 'department', select: 'name' }] })
    .populate('leaveType', 'name');

  ok(res, requests);
});

// @desc  Manager/HR approves or rejects a leave request
// @route PATCH /api/leave/requests/:requestId/decision
const decideLeaveRequest = asyncHandler(async (req, res) => {
  const { decision, note } = req.body; // 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(decision)) throw new ApiError(400, "decision must be 'approved' or 'rejected'");

  const leaveRequest = await LeaveRequest.findById(req.params.requestId).populate({ path: 'employee', populate: 'user' });
  if (!leaveRequest) throw new ApiError(404, 'Leave request not found');
  if (leaveRequest.status !== 'pending') throw new ApiError(400, 'This request has already been decided');
  await assertCanActOnLeaveRequest(req, leaveRequest);

  // Surface team conflicts to the reviewer at decision time, not just to the requester at submission time.
  const conflicts = await findLeaveConflicts(leaveRequest.employee._id, leaveRequest.startDate, leaveRequest.endDate);

  leaveRequest.status = decision;
  leaveRequest.approvedBy = req.user._id;
  leaveRequest.decidedAt = new Date();
  leaveRequest.decisionNote = note;
  await leaveRequest.save();

  if (decision === 'approved') {
    const year = leaveRequest.startDate.getFullYear();
    await LeaveBalance.findOneAndUpdate(
      { employee: leaveRequest.employee._id, leaveType: leaveRequest.leaveType, year },
      { $inc: { usedDays: leaveRequest.days } },
      { upsert: true, setDefaultsOnInsert: { totalDays: 21 } }
    );
  }

  if (leaveRequest.employee?.user) {
    await createNotification({
      userId: leaveRequest.employee.user._id || leaveRequest.employee.user,
      type: 'general',
      title: `Leave request ${decision}`,
      message: `Your leave request from ${leaveRequest.startDate.toDateString()} to ${leaveRequest.endDate.toDateString()} was ${decision}.`,
    });
  }

  ok(res, {
    leaveRequest,
    teamConflicts: conflicts.map((c) => ({
      employeeName: c.employee?.user?.name,
      startDate: c.startDate,
      endDate: c.endDate,
    })),
  }, `Leave request ${decision}`);
});

// @desc  Cancel a pending leave request (by the employee)
// @route PATCH /api/leave/requests/:requestId/cancel
const cancelLeaveRequest = asyncHandler(async (req, res) => {
  const leaveRequest = await LeaveRequest.findById(req.params.requestId);
  if (!leaveRequest) throw new ApiError(404, 'Leave request not found');
  if (leaveRequest.status !== 'pending') throw new ApiError(400, 'Only pending requests can be cancelled');
  await assertCanActOnLeaveRequest(req, leaveRequest);
  leaveRequest.status = 'cancelled';
  await leaveRequest.save();
  ok(res, leaveRequest, 'Leave request cancelled');
});

// @desc  Seed/ensure a leave balance exists for an employee/year (HR admin)
// @route POST /api/leave/:employeeId/balances
const setLeaveBalance = asyncHandler(async (req, res) => {
  const { leaveType, year, totalDays } = req.body;
  if (!leaveType || !year || totalDays === undefined) throw new ApiError(400, 'leaveType, year and totalDays are required');

  const balance = await LeaveBalance.findOneAndUpdate(
    { employee: req.params.employeeId, leaveType, year },
    { totalDays },
    { upsert: true, new: true, setDefaultsOnInsert: { usedDays: 0 } }
  );
  ok(res, balance, 'Leave balance set');
});

module.exports = {
  getBalances,
  createLeaveRequest,
  listLeaveRequests,
  listPendingLeaveRequests,
  decideLeaveRequest,
  cancelLeaveRequest,
  setLeaveBalance,
};
