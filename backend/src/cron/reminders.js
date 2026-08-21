const cron = require('node-cron');
const {
  checkLowLeaveBalances,
  checkUpcomingTasks,
  checkExpiringDocuments,
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
      console.log('[cron] Daily HR reminders processed');
    } catch (err) {
      console.error('[cron] Failed to process daily reminders:', err.message);
    }
  });
};

module.exports = scheduleReminders;
