const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { resolveEmployeeId } = require('../utils/resolveEmployee');
const { sendPayslipPdf } = require('../utils/exportUtils');

// Working week convention: Sunday-Thursday (Friday/Saturday are the weekend).
const countWorkingDays = (start, end) => {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day >= 0 && day <= 4) count += 1;
    d.setDate(d.getDate() + 1);
  }
  return count;
};

// @desc  HR admin creates/updates a payroll record for an employee/month
// @route POST /api/payroll/:employeeId
const createPayroll = asyncHandler(async (req, res) => {
  const { month, year, baseSalary, bonuses = 0, deductions = 0, payslipUrl } = req.body;
  if (!month || !year || baseSalary === undefined) throw new ApiError(400, 'month, year and baseSalary are required');

  // netSalary is computed here (not left to the schema's pre('validate') hook) because
  // findOneAndUpdate does not run document middleware, only query-level validators.
  const netSalary = Number(baseSalary) + Number(bonuses) - Number(deductions);

  const payroll = await Payroll.findOneAndUpdate(
    { employee: req.params.employeeId, month, year },
    { baseSalary, bonuses, deductions, netSalary, payslipUrl, paidAt: new Date() },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  created(res, payroll, 'Payroll record saved');
});

// @desc  List payroll records for an employee (defaults to self)
// @route GET /api/payroll/:employeeId?
const listPayroll = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const records = await Payroll.find({ employee: employeeId }).sort({ year: -1, month: -1 });
  ok(res, records);
});

// @desc  Auto-calculate payroll for an employee/month from their attendance record
//        (base salary minus a per-day deduction for each unpaid absence), plus optional
//        manual bonuses/deductions on top.
// @route POST /api/payroll/:employeeId/generate
const generatePayroll = asyncHandler(async (req, res) => {
  const { month, year, bonuses = 0, deductions = 0 } = req.body;
  if (!month || !year) throw new ApiError(400, 'month and year are required');

  const employee = await Employee.findById(req.params.employeeId);
  if (!employee) throw new ApiError(404, 'Employee not found');

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const totalWorkingDays = countWorkingDays(start, end) || 1;

  const absentDays = await Attendance.countDocuments({ employee: employee._id, date: { $gte: start, $lte: end }, status: 'absent' });

  const baseSalary = employee.baseSalary || 0;
  const dailyRate = baseSalary / totalWorkingDays;
  const attendanceDeduction = Math.round(dailyRate * absentDays * 100) / 100;
  const netSalary = Math.round((baseSalary - attendanceDeduction + Number(bonuses) - Number(deductions)) * 100) / 100;

  const payroll = await Payroll.findOneAndUpdate(
    { employee: employee._id, month, year },
    {
      baseSalary,
      bonuses,
      deductions,
      netSalary,
      absentDays,
      attendanceDeduction,
      generatedFromAttendance: true,
      paidAt: new Date(),
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  created(res, payroll, 'Payroll generated from attendance');
});

// @desc  Download a payroll record's payslip as a PDF (the owning employee, their manager, or HR)
// @route GET /api/payroll/slip/:payrollId/pdf
const downloadPayslipPdf = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findById(req.params.payrollId);
  if (!payroll) throw new ApiError(404, 'Payroll record not found');

  const employee = await Employee.findById(payroll.employee).populate('user', 'name').populate('department', 'name');
  if (!employee) throw new ApiError(404, 'Employee not found');

  if (req.user.role !== 'hr_admin' && req.user.role !== 'manager' && String(employee.user._id) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only download your own payslip');
  }

  sendPayslipPdf(
    res,
    {
      employeeName: employee.user?.name,
      employeeCode: employee.employeeCode,
      position: employee.position,
      department: employee.department?.name,
    },
    payroll
  );
});

module.exports = { createPayroll, listPayroll, generatePayroll, downloadPayslipPdf };
