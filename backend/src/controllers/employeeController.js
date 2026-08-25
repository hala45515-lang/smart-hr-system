const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const Employee = require('../models/Employee');
const User = require('../models/User');
const CareerEvent = require('../models/CareerEvent');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Payroll = require('../models/Payroll');
const Evaluation = require('../models/Evaluation');
const { logAudit } = require('../services/auditService');

// @desc  HR admin creates a full employee (user account + employee profile)
// @route POST /api/employees
const createEmployee = asyncHandler(async (req, res) => {
  const { name, email, password, role, employeeCode, department, position, level, manager, hireDate, baseSalary } = req.body;
  if (!name || !email || !password || !employeeCode || !position || !hireDate) {
    throw new ApiError(400, 'name, email, password, employeeCode, position and hireDate are required');
  }

  const user = await User.create({ name, email, password, role: role || 'employee' });
  const employee = await Employee.create({
    user: user._id,
    employeeCode,
    department,
    position,
    level,
    manager,
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

  created(res, employee, 'Employee created');
});

// @desc  List employees (with basic filters)
// @route GET /api/employees
const listEmployees = asyncHandler(async (req, res) => {
  const { department, status, search } = req.query;
  const filter = {};
  if (department) filter.department = department;
  if (status) filter.status = status;

  let query = Employee.find(filter).populate('user', 'name email role').populate('department', 'name').populate('manager', 'position');
  const employees = await query;

  const filtered = search
    ? employees.filter((e) => e.user?.name?.toLowerCase().includes(search.toLowerCase()))
    : employees;

  ok(res, filtered);
});

// @desc  Get a single employee
// @route GET /api/employees/:id
const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
    .populate('user', 'name email role')
    .populate('department', 'name')
    .populate('manager', 'position');
  if (!employee) throw new ApiError(404, 'Employee not found');

  if (req.user.role === 'employee' && String(employee.user._id) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only access your own records');
  }

  ok(res, employee);
});

// @desc  Full record for an employee — attendance, leave requests, payroll and
//        evaluations composed into a single response (US-010's "full history" view)
// @route GET /api/employees/:id/full-record
const getEmployeeFullRecord = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
    .populate('user', 'name email role')
    .populate('department', 'name')
    .populate('manager', 'position');
  if (!employee) throw new ApiError(404, 'Employee not found');

  if (req.user.role === 'employee' && String(employee.user._id) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only access your own records');
  }

  const payrollFilter = { employee: employee._id };
  if (req.user.role === 'employee') payrollFilter.status = 'approved';

  const [attendance, leaveRequests, payroll, evaluations] = await Promise.all([
    Attendance.find({ employee: employee._id }).sort({ date: -1 }).limit(90),
    LeaveRequest.find({ employee: employee._id }).sort({ startDate: -1 }).populate('leaveType', 'name'),
    Payroll.find(payrollFilter).sort({ year: -1, month: -1 }),
    Evaluation.find({ employee: employee._id }).sort({ createdAt: -1 }).populate('evaluator', 'name'),
  ]);

  ok(res, { employee, attendance, leaveRequests, payroll, evaluations });
});

// @desc  Update employee profile fields
// @route PUT /api/employees/:id
const updateEmployee = asyncHandler(async (req, res) => {
  const allowed = ['department', 'position', 'level', 'manager', 'status', 'baseSalary', 'phone', 'avatarUrl'];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const employee = await Employee.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!employee) throw new ApiError(404, 'Employee not found');
  ok(res, employee, 'Employee updated');
});

// @desc  Add a skill to an employee
// @route POST /api/employees/:id/skills
const addSkill = asyncHandler(async (req, res) => {
  const { name, level } = req.body;
  if (!name) throw new ApiError(400, 'skill name is required');
  const employee = await Employee.findByIdAndUpdate(
    req.params.id,
    { $push: { skills: { name, level } } },
    { new: true }
  );
  if (!employee) throw new ApiError(404, 'Employee not found');
  ok(res, employee, 'Skill added');
});

// @desc  Add a completed course to an employee
// @route POST /api/employees/:id/courses
const addCourse = asyncHandler(async (req, res) => {
  const { title, provider, completedAt, certificateUrl } = req.body;
  if (!title) throw new ApiError(400, 'course title is required');
  const employee = await Employee.findByIdAndUpdate(
    req.params.id,
    { $push: { courses: { title, provider, completedAt, certificateUrl } } },
    { new: true }
  );
  if (!employee) throw new ApiError(404, 'Employee not found');
  ok(res, employee, 'Course added');
});

// @desc  Change a user's role (employee/manager/hr_admin) — logged to the Audit Log
// @route PATCH /api/employees/:id/role
const changeRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['employee', 'manager', 'hr_admin'].includes(role)) {
    throw new ApiError(400, "role must be one of 'employee', 'manager', 'hr_admin'");
  }

  const employee = await Employee.findById(req.params.id).populate('user', 'name email role');
  if (!employee) throw new ApiError(404, 'Employee not found');

  const previousRole = employee.user.role;
  if (previousRole === role) throw new ApiError(400, `User already has the '${role}' role`);

  await User.findByIdAndUpdate(employee.user._id, { role });

  await logAudit({
    actor: req.user._id,
    action: 'role_change',
    targetType: 'User',
    targetId: employee.user._id,
    changes: { from: previousRole, to: role },
  });

  ok(res, { employeeId: employee._id, userId: employee.user._id, previousRole, role }, 'Role updated');
});

// @desc  Deactivate/terminate an employee
// @route DELETE /api/employees/:id
const deactivateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findByIdAndUpdate(req.params.id, { status: 'terminated' }, { new: true });
  if (!employee) throw new ApiError(404, 'Employee not found');
  await User.findByIdAndUpdate(employee.user, { isActive: false });
  await CareerEvent.create({
    employee: employee._id,
    type: 'exit',
    title: 'Employment ended',
    date: new Date(),
    createdBy: req.user._id,
  });
  ok(res, employee, 'Employee deactivated');
});

module.exports = {
  createEmployee,
  listEmployees,
  getEmployee,
  getEmployeeFullRecord,
  updateEmployee,
  addSkill,
  addCourse,
  changeRole,
  deactivateEmployee,
};
