const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const LeaveType = require('../models/LeaveType');

const listLeaveTypes = asyncHandler(async (req, res) => {
  const leaveTypes = await LeaveType.find();
  ok(res, leaveTypes);
});

const createLeaveType = asyncHandler(async (req, res) => {
  const { name, defaultDaysPerYear, description } = req.body;
  if (!name) throw new ApiError(400, 'name is required');
  const leaveType = await LeaveType.create({ name, defaultDaysPerYear, description });
  created(res, leaveType, 'Leave type created');
});

module.exports = { listLeaveTypes, createLeaveType };
