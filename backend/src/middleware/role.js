const { ApiError } = require('../utils/apiResponse');

/**
 * Restrict access to specific roles: 'employee' | 'manager' | 'hr_admin'
 * hr_admin implicitly passes every check.
 */
const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Not authorized');
  }
  if (req.user.role === 'hr_admin' || roles.includes(req.user.role)) {
    return next();
  }
  throw new ApiError(403, 'You do not have permission to perform this action');
};

module.exports = { allowRoles };
