const Notification = require('../models/Notification');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const Task = require('../models/Task');
const Document = require('../models/Document');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { EmergencyContact, EmployeeMedicalInfo } = require('../models/EmergencyContact');
const { sendEmail } = require('./emailService');

/**
 * Creates an in-app notification (unless the recipient opted out via
 * notificationPreferences.inApp), and sends the same update by email if the
 * recipient opted in via notificationPreferences.email.
 */
const createNotification = async ({ userId, type, title, message, meta }) => {
  const user = await User.findById(userId).select('notificationPreferences email name');
  if (!user) return null;
  const prefs = user.notificationPreferences || {};

  let notification = null;
  if (prefs.inApp !== false) {
    notification = await Notification.create({ user: userId, type, title, message, meta });
  }

  if (prefs.email === true && user.email) {
    await sendEmail({
      to: user.email,
      subject: title,
      html: `<p>Hi ${user.name || 'there'},</p><p>${message}</p>`,
    });
  }

  return notification;
};

/**
 * Leave conflict detection: checks whether an employee's requested leave
 * overlaps with an already-approved leave of a teammate in the same department.
 */
const findLeaveConflicts = async (employeeId, startDate, endDate) => {
  const employee = await Employee.findById(employeeId);
  if (!employee?.department) return [];

  const teammates = await Employee.find({ department: employee.department, _id: { $ne: employeeId } }).select('_id');
  const teammateIds = teammates.map((t) => t._id);

  const conflicts = await LeaveRequest.find({
    employee: { $in: teammateIds },
    status: 'approved',
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  }).populate({ path: 'employee', populate: { path: 'user', select: 'name' } });

  return conflicts;
};

/**
 * Scans for low leave balances (<= threshold days remaining) and notifies employees.
 */
const checkLowLeaveBalances = async (threshold = 3) => {
  const year = new Date().getFullYear();
  const balances = await LeaveBalance.find({ year }).populate({ path: 'employee', populate: 'user' });
  for (const balance of balances) {
    const remaining = balance.totalDays - balance.usedDays;
    if (remaining <= threshold && remaining >= 0 && balance.employee?.user) {
      await createNotification({
        userId: balance.employee.user._id || balance.employee.user,
        type: 'leave_balance_low',
        title: 'Leave balance running low',
        message: `You have ${remaining} day(s) of leave remaining this year.`,
        meta: { leaveBalanceId: balance._id },
      });
    }
  }
};

/**
 * Scans for tasks due within 24-48 hours that have not had a reminder sent.
 */
const checkUpcomingTasks = async () => {
  const now = new Date();
  const soon = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const tasks = await Task.find({ status: { $ne: 'done' }, dueDate: { $gte: now, $lte: soon }, reminderSent: false }).populate({
    path: 'employee',
    populate: 'user',
  });
  for (const task of tasks) {
    if (!task.employee?.user) continue;
    await createNotification({
      userId: task.employee.user._id || task.employee.user,
      type: 'task_due',
      title: 'Task due soon',
      message: `Task "${task.title}" is due on ${task.dueDate.toDateString()}.`,
      meta: { taskId: task._id },
    });
    task.reminderSent = true;
    await task.save();
  }
};

/**
 * Scans for documents (contracts) expiring within 30 days.
 */
const checkExpiringDocuments = async (daysAhead = 30) => {
  const now = new Date();
  const soon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const docs = await Document.find({ expiryDate: { $gte: now, $lte: soon } }).populate({
    path: 'employee',
    populate: 'user',
  });
  for (const doc of docs) {
    if (!doc.employee?.user) continue;
    await createNotification({
      userId: doc.employee.user._id || doc.employee.user,
      type: 'contract_expiring',
      title: `${doc.type} expiring soon`,
      message: `Your ${doc.type} ("${doc.title}") expires on ${doc.expiryDate.toDateString()}.`,
      meta: { documentId: doc._id },
    });
  }
};

/**
 * Scans for employees who checked in today but never checked out (past a cutoff hour).
 */
const checkForgottenCheckouts = async (cutoffHour = 20) => {
  const now = new Date();
  if (now.getHours() < cutoffHour) return;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const records = await Attendance.find({
    date: { $gte: start, $lte: end },
    checkIn: { $ne: null },
    checkOut: null,
  }).populate({ path: 'employee', populate: 'user' });

  for (const record of records) {
    if (!record.employee?.user) continue;
    await createNotification({
      userId: record.employee.user._id || record.employee.user,
      type: 'general',
      title: 'You forgot to check out',
      message: `You checked in today but never checked out. Please update your attendance if needed.`,
      meta: { attendanceId: record._id },
    });
  }
};

/**
 * Scans the current month's attendance for employees with a repeated status
 * (>= threshold days of 'late' or 'absent') and notifies their manager and HR admins.
 */
const checkRepeatedAttendanceIssue = async (status, threshold, label) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const counts = await Attendance.aggregate([
    { $match: { date: { $gte: start, $lte: end }, status } },
    { $group: { _id: '$employee', count: { $sum: 1 } } },
    { $match: { count: { $gte: threshold } } },
  ]);
  if (!counts.length) return;

  const hrAdmins = await User.find({ role: 'hr_admin' }).select('_id');

  for (const entry of counts) {
    const employee = await Employee.findById(entry._id).populate('user', 'name').populate('manager');
    if (!employee) continue;

    const recipients = new Set(hrAdmins.map((u) => String(u._id)));
    if (employee.manager) {
      const manager = await Employee.findById(employee.manager).select('user');
      if (manager?.user) recipients.add(String(manager.user));
    }

    for (const userId of recipients) {
      await createNotification({
        userId,
        type: 'general',
        title: `Repeated ${label} detected`,
        message: `${employee.user?.name || 'An employee'} has been ${label} ${entry.count} time(s) this month.`,
        meta: { employeeId: employee._id, count: entry.count, status },
      });
    }
  }
};

const checkRepeatedLateness = (threshold = 3) => checkRepeatedAttendanceIssue('late', threshold, 'late');
const checkRepeatedAbsence = (threshold = 3) => checkRepeatedAttendanceIssue('absent', threshold, 'absent');

/**
 * Reminds employees whose emergency contact/medical info has never been set,
 * or hasn't been touched in `daysThreshold` days, to review and update it.
 */
const checkStaleEmergencyInfo = async (daysThreshold = 180) => {
  const cutoff = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);
  const employees = await Employee.find({ status: 'active' }).populate('user', '_id');

  for (const employee of employees) {
    if (!employee.user) continue;

    const [medicalInfo, latestContact] = await Promise.all([
      EmployeeMedicalInfo.findOne({ employee: employee._id }).select('updatedAt'),
      EmergencyContact.findOne({ employee: employee._id }).sort({ updatedAt: -1 }).select('updatedAt'),
    ]);

    const lastUpdated = [medicalInfo?.updatedAt, latestContact?.updatedAt].filter(Boolean).sort((a, b) => b - a)[0];
    if (lastUpdated && lastUpdated >= cutoff) continue;

    await createNotification({
      userId: employee.user._id,
      type: 'general',
      title: 'Please update your emergency info',
      message: 'Your emergency contact and medical information is missing or outdated. Please review and confirm it is current.',
      meta: { employeeId: employee._id },
    });
  }
};

module.exports = {
  createNotification,
  findLeaveConflicts,
  checkLowLeaveBalances,
  checkUpcomingTasks,
  checkExpiringDocuments,
  checkForgottenCheckouts,
  checkRepeatedLateness,
  checkRepeatedAbsence,
  checkStaleEmergencyInfo,
};
