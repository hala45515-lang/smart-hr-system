const Notification = require('../models/Notification');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const Task = require('../models/Task');
const Document = require('../models/Document');
const Employee = require('../models/Employee');

const createNotification = async ({ userId, type, title, message, meta }) =>
  Notification.create({ user: userId, type, title, message, meta });

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

module.exports = {
  createNotification,
  findLeaveConflicts,
  checkLowLeaveBalances,
  checkUpcomingTasks,
  checkExpiringDocuments,
};
