const { ApiError } = require('./apiResponse');
const Employee = require('../models/Employee');

/**
 * Resolves the target employee id for a request:
 * - if req.params.employeeId is provided and the requester is manager/hr_admin, use it
 * - otherwise resolve the requester's own employee record ("my" endpoints)
 */
const resolveEmployeeId = async (req) => {
  const requestedId = req.params.employeeId;
  if (requestedId && (req.user.role === 'hr_admin' || req.user.role === 'manager')) {
    return requestedId;
  }
  const own = await Employee.findOne({ user: req.user._id }).select('_id');
  if (!own) throw new ApiError(404, 'No employee profile linked to this user');
  if (requestedId && String(own._id) !== String(requestedId)) {
    throw new ApiError(403, 'You can only access your own records');
  }
  return own._id;
};

module.exports = { resolveEmployeeId };
