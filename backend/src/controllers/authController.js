const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const User = require('../models/User');
const Employee = require('../models/Employee');
const generateToken = require('../utils/generateToken');

// @desc  Register a new user account (HR admin typically provisions employees)
// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) throw new ApiError(400, 'name, email and password are required');

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'A user with this email already exists');

  const user = await User.create({ name, email, password, role: role || 'employee' });
  const token = generateToken(user._id, user.role);

  created(res, { user: { id: user._id, name: user.name, email: user.email, role: user.role }, token }, 'User registered');
});

// @desc  Login
// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated');

  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user._id, user.role);
  ok(res, { user: { id: user._id, name: user.name, email: user.email, role: user.role }, token }, 'Login successful');
});

// @desc  Get current logged-in user + linked employee profile id
// @route GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user: req.user._id }).select('_id');
  ok(res, { user: req.user, employeeId: employee?._id || null });
});

module.exports = { register, login, me };
