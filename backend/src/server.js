require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const scheduleReminders = require('./cron/reminders');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  scheduleReminders();

  const server = app.listen(PORT, () => {
    console.log(`[server] Smart HR API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('[server] Unhandled rejection:', err);
    server.close(() => process.exit(1));
  });
};

start();
