const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const Payroll = require('../models/Payroll');
const { resolveEmployeeId } = require('../utils/resolveEmployee');

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

module.exports = { createPayroll, listPayroll };
