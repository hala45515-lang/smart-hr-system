const cron = require('node-cron');
const {
  checkLowLeaveBalances,
  checkUpcomingTasks,
  checkExpiringDocuments,
  checkForgottenCheckouts,
  checkRepeatedLateness,
  checkRepeatedAbsence,
  checkStaleEmergencyInfo,
} = require('../services/notificationService');
const { markAbsentees } = require('../services/attendanceService');

/**
 * Smart Leave & Task Assistant + Employee Vault reminders.
 * Runs once a day at 08:00 server time.
 */
const scheduleReminders = () => {
  cron.schedule('0 8 * * *', async () => {
    try {
      await checkLowLeaveBalances();
      await checkUpcomingTasks();
      await checkExpiringDocuments();
      await checkRepeatedLateness();
      await checkRepeatedAbsence();
      await checkStaleEmergencyInfo();
      console.log('[cron] Daily HR reminders processed');
    } catch (err) {
      console.error('[cron] Failed to process daily reminders:', err.message);
    }
  });

  // Forgotten checkout sweep — runs in the evening after the workday ends.
  cron.schedule('0 20 * * *', async () => {
    try {
      await checkForgottenCheckouts(20);
      console.log('[cron] Forgotten checkout sweep processed');
    } catch (err) {
      console.error('[cron] Failed to process forgotten checkout sweep:', err.message);
    }
  });

  // End-of-day absence sweep — marks employees with no attendance record as
  // absent (or on leave, if covered by an approved leave request) so reports,
  // the HR dashboard, and payroll all see accurate attendance data.
  cron.schedule('45 23 * * *', async () => {
    try {
      const { marked } = await markAbsentees(new Date());
      console.log(`[cron] Absence sweep processed (${marked} record(s) marked)`);
    } catch (err) {
      console.error('[cron] Failed to process absence sweep:', err.message);
    }
  });
};

module.exports = scheduleReminders;
