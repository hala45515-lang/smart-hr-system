const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');

// Working week convention: Sunday-Thursday (Friday/Saturday are the weekend) —
// matches countWorkingDays() in payrollController.js.
const isWorkingDay = (date) => {
  const day = date.getDay();
  return day >= 0 && day <= 4;
};

/**
 * For every active employee with no Attendance record on `date`, creates one:
 * status 'leave' if they have an approved leave request covering that date,
 * otherwise 'absent'. Meant to run once near the end of each working day so
 * absences show up in reports/dashboards/payroll without manual HR entry.
 */
const markAbsentees = async (date = new Date()) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  if (!isWorkingDay(dayStart)) return { marked: 0, skipped: 'weekend' };

  const employees = await Employee.find({ status: 'active' }).select('_id');
  const existing = await Attendance.find({ date: { $gte: dayStart, $lte: dayEnd } }).select('employee');
  const existingIds = new Set(existing.map((a) => String(a.employee)));

  const onLeave = await LeaveRequest.find({
    status: 'approved',
    startDate: { $lte: dayEnd },
    endDate: { $gte: dayStart },
  }).select('employee');
  const onLeaveIds = new Set(onLeave.map((l) => String(l.employee)));

  let marked = 0;
  for (const employee of employees) {
    const id = String(employee._id);
    if (existingIds.has(id)) continue;
    await Attendance.create({
      employee: employee._id,
      date: dayStart,
      status: onLeaveIds.has(id) ? 'leave' : 'absent',
      hoursWorked: 0,
    });
    marked += 1;
  }
  return { marked };
};

module.exports = { markAbsentees, isWorkingDay };
