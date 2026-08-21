const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const CareerEvent = require('../models/CareerEvent');
const PerformanceScore = require('../models/PerformanceScore');
const { sendExcel, sendPdfTable } = require('../utils/exportUtils');

const monthRange = (month, year) => {
  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59, 999), month: m, year: y };
};

/**
 * Builds the monthly attendance report rows: present/absent/late day counts and
 * total hours worked per employee, optionally filtered by department.
 */
const buildAttendanceReport = async ({ month, year, department }) => {
  const { start, end } = monthRange(month, year);

  const employeeFilter = { status: 'active' };
  if (department) employeeFilter.department = department;
  const employees = await Employee.find(employeeFilter).populate('user', 'name').populate('department', 'name');

  const records = await Attendance.find({
    employee: { $in: employees.map((e) => e._id) },
    date: { $gte: start, $lte: end },
  });

  const byEmployee = {};
  records.forEach((r) => {
    const key = String(r.employee);
    byEmployee[key] = byEmployee[key] || { present: 0, absent: 0, late: 0, hoursWorked: 0 };
    if (r.status === 'present') byEmployee[key].present += 1;
    if (r.status === 'absent') byEmployee[key].absent += 1;
    if (r.status === 'late') {
      byEmployee[key].late += 1;
      byEmployee[key].present += 1;
    }
    byEmployee[key].hoursWorked += r.hoursWorked || 0;
  });

  return employees.map((emp) => {
    const stats = byEmployee[String(emp._id)] || { present: 0, absent: 0, late: 0, hoursWorked: 0 };
    return {
      employeeId: emp._id,
      employeeName: emp.user?.name || '-',
      department: emp.department?.name || '-',
      presentDays: stats.present,
      absentDays: stats.absent,
      lateDays: stats.late,
      hoursWorked: Math.round(stats.hoursWorked * 100) / 100,
    };
  });
};

// @desc  Monthly attendance report per employee, filterable by department
// @route GET /api/reports/attendance
const getAttendanceReport = asyncHandler(async (req, res) => {
  const { month, year, department } = req.query;
  const rows = await buildAttendanceReport({ month, year, department });
  ok(res, rows);
});

const attendanceColumns = [
  { header: 'Employee', key: 'employeeName', width: 25 },
  { header: 'Department', key: 'department', width: 20 },
  { header: 'Present Days', key: 'presentDays', width: 15 },
  { header: 'Absent Days', key: 'absentDays', width: 15 },
  { header: 'Late Days', key: 'lateDays', width: 12 },
  { header: 'Hours Worked', key: 'hoursWorked', width: 15 },
];

// @desc  Export the monthly attendance report as Excel or PDF
// @route GET /api/reports/attendance/export?format=excel|pdf
const exportAttendanceReport = asyncHandler(async (req, res) => {
  const { month, year, department, format = 'excel' } = req.query;
  const rows = await buildAttendanceReport({ month, year, department });
  const { month: m, year: y } = monthRange(month, year);
  const filename = `attendance-report-${y}-${m}`;

  if (format === 'pdf') {
    return sendPdfTable(res, filename, `Attendance Report — ${m}/${y}`, attendanceColumns, rows);
  }
  await sendExcel(res, filename, attendanceColumns, rows);
});

// @desc  Turnover rate for a period: exits / average headcount, %
// @route GET /api/reports/turnover
const getTurnoverReport = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const { start, end, month: m, year: y } = monthRange(month, year);

  const [exits, hires, headcountNow] = await Promise.all([
    CareerEvent.countDocuments({ type: 'exit', date: { $gte: start, $lte: end } }),
    CareerEvent.countDocuments({ type: 'hire', date: { $gte: start, $lte: end } }),
    Employee.countDocuments({ status: 'active' }),
  ]);

  const startHeadcount = headcountNow + exits - hires;
  const averageHeadcount = (headcountNow + startHeadcount) / 2 || 1;
  const turnoverRate = Math.round((exits / averageHeadcount) * 1000) / 10;

  ok(res, { period: `${m}/${y}`, exits, hires, averageHeadcount, turnoverRatePercent: turnoverRate });
});

/**
 * Builds average performance score per department for a given period
 * (defaults to each employee's most recent score if no period is given).
 */
const buildDepartmentPerformanceReport = async ({ period }) => {
  const match = period ? { period } : {};
  const scores = await PerformanceScore.find(match)
    .sort({ calculatedAt: -1 })
    .populate({ path: 'employee', populate: ['department'] });

  const latestPerEmployee = {};
  scores.forEach((s) => {
    const key = String(s.employee?._id);
    if (!latestPerEmployee[key]) latestPerEmployee[key] = s;
  });

  const byDepartment = {};
  Object.values(latestPerEmployee).forEach((s) => {
    const deptName = s.employee?.department?.name || 'Unassigned';
    byDepartment[deptName] = byDepartment[deptName] || { total: 0, count: 0 };
    byDepartment[deptName].total += s.score;
    byDepartment[deptName].count += 1;
  });

  return Object.entries(byDepartment).map(([department, { total, count }]) => ({
    department,
    employeeCount: count,
    averageScore: Math.round((total / count) * 10) / 10,
  }));
};

// @desc  Average performance score per department
// @route GET /api/reports/department-performance
const getDepartmentPerformanceReport = asyncHandler(async (req, res) => {
  const rows = await buildDepartmentPerformanceReport({ period: req.query.period });
  ok(res, rows);
});

const perfColumns = [
  { header: 'Department', key: 'department', width: 25 },
  { header: 'Employees Scored', key: 'employeeCount', width: 18 },
  { header: 'Average Score', key: 'averageScore', width: 15 },
];

// @desc  Export the department performance report as Excel or PDF
// @route GET /api/reports/department-performance/export?format=excel|pdf
const exportDepartmentPerformanceReport = asyncHandler(async (req, res) => {
  const { period, format = 'excel' } = req.query;
  const rows = await buildDepartmentPerformanceReport({ period });
  const filename = `department-performance-${period || 'latest'}`;

  if (format === 'pdf') {
    return sendPdfTable(res, filename, `Department Performance — ${period || 'Latest'}`, perfColumns, rows);
  }
  await sendExcel(res, filename, perfColumns, rows);
});

module.exports = {
  getAttendanceReport,
  exportAttendanceReport,
  getTurnoverReport,
  getDepartmentPerformanceReport,
  exportDepartmentPerformanceReport,
};
