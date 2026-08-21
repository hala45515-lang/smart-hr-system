const cron = require('node-cron');
const {
  checkLowLeaveBalances,
  checkUpcomingTasks,
  checkExpiringDocuments,
  checkForgottenCheckouts,
  checkRepeatedLateness,
} = require('../services/notificationService');

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
};

module.exports = scheduleReminders;
