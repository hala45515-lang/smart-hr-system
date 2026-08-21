const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Document = require('../models/Document');
const Payroll = require('../models/Payroll');

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// @desc  HR/manager main dashboard — attendance today, pending leave, document alerts, payroll summary
// @route GET /api/dashboard
const getDashboardSummary = asyncHandler(async (req, res) => {
  const today = startOfDay(new Date());
  const now = new Date();

  const [activeEmployeeCount, todayRecords, pendingLeaveCount, expiringDocs, payrollThisMonth, trend] =
    await Promise.all([
      Employee.countDocuments({ status: 'active' }),
      Attendance.find({ date: today }),
      LeaveRequest.countDocuments({ status: 'pending' }),
      Document.find({
        expiryDate: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
      })
        .populate({ path: 'employee', populate: { path: 'user', select: 'name' } })
        .limit(10),
      Payroll.aggregate([
        { $match: { month: now.getMonth() + 1, year: now.getFullYear() } },
        { $group: { _id: null, totalNet: { $sum: '$netSalary' }, count: { $sum: 1 } } },
      ]),
      Attendance.aggregate([
        { $match: { date: { $gte: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, status: '$status' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]),
    ]);

  const presentToday = todayRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
  const lateToday = todayRecords.filter((r) => r.status === 'late').length;
  const absentToday = Math.max(activeEmployeeCount - presentToday, 0);

  const attendanceTrend = {};
  trend.forEach(({ _id, count }) => {
    attendanceTrend[_id.date] = attendanceTrend[_id.date] || {};
    attendanceTrend[_id.date][_id.status] = count;
  });

  ok(res, {
    attendanceToday: {
      activeEmployeeCount,
      present: presentToday,
      absent: absentToday,
      late: lateToday,
    },
    pendingLeaveRequests: pendingLeaveCount,
    expiringDocuments: {
      count: expiringDocs.length,
      documents: expiringDocs.map((d) => ({
        id: d._id,
        title: d.title,
        type: d.type,
        expiryDate: d.expiryDate,
        employeeName: d.employee?.user?.name,
      })),
    },
    payrollThisMonth: {
      totalNet: payrollThisMonth[0]?.totalNet || 0,
      recordCount: payrollThisMonth[0]?.count || 0,
    },
    attendanceTrend,
  });
});

module.exports = { getDashboardSummary };
