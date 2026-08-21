const Evaluation = require('../models/Evaluation');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const PerformanceScore = require('../models/PerformanceScore');

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Performance Score = weighted composite (0-100), similar to a "credit score" for performance:
 *  - 40% manager evaluation ratings (avg of last 6 evaluations, scaled 1-5 -> 0-100)
 *  - 25% attendance rate (last 90 days)
 *  - 25% on-time task completion rate (last 90 days)
 *  - 10% self development (skills + courses count, capped)
 */
const calculatePerformanceScore = async (employeeId, { persist = true } = {}) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new Error('Employee not found');

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [evaluations, attendanceRecords, tasks] = await Promise.all([
    Evaluation.find({ employee: employeeId }).sort({ createdAt: -1 }).limit(6),
    Attendance.find({ employee: employeeId, date: { $gte: ninetyDaysAgo } }),
    Task.find({ employee: employeeId, dueDate: { $gte: ninetyDaysAgo } }),
  ]);

  const managerRating = evaluations.length
    ? (evaluations.reduce((sum, e) => sum + e.managerRating, 0) / evaluations.length / 5) * 100
    : 70; // neutral default for employees with no evaluations yet

  const attendanceRate = attendanceRecords.length
    ? (attendanceRecords.filter((a) => ['present', 'late'].includes(a.status)).length / attendanceRecords.length) * 100
    : 100;

  const onTimeTasks = tasks.filter((t) => t.status === 'done' && t.completedAt && t.completedAt <= t.dueDate).length;
  const taskCompletion = tasks.length ? (onTimeTasks / tasks.length) * 100 : 80;

  const developmentCount = (employee.skills?.length || 0) + (employee.courses?.length || 0);
  const selfDevelopment = Math.min(developmentCount * 10, 100);

  const score = Math.round(
    managerRating * 0.4 + attendanceRate * 0.25 + taskCompletion * 0.25 + selfDevelopment * 0.1
  );

  const breakdown = {
    managerRating: Math.round(managerRating),
    attendance: Math.round(attendanceRate),
    taskCompletion: Math.round(taskCompletion),
    selfDevelopment: Math.round(selfDevelopment),
  };

  if (persist) {
    await PerformanceScore.findOneAndUpdate(
      { employee: employeeId, period: currentPeriod() },
      { score, breakdown, calculatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return { employeeId, period: currentPeriod(), score, breakdown };
};

module.exports = { calculatePerformanceScore, currentPeriod };
