const nodemailer = require('nodemailer');

/**
 * Outbound email via Gmail SMTP. If GMAIL_USER/GMAIL_APP_PASSWORD are unset,
 * sendEmail becomes a no-op (logged), so the app keeps working with in-app-only
 * notifications until email is configured.
 *
 * GMAIL_APP_PASSWORD must be a Google App Password (Google Account -> Security ->
 * 2-Step Verification -> App passwords), not the account's normal login password.
 */
const isEmailEnabled = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

let transporter = null;
const getTransporter = () => {
  if (!isEmailEnabled()) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  return transporter;
};

const sendEmail = async ({ to, subject, html }) => {
  const client = getTransporter();
  if (!client) {
    console.log(`[emailService] GMAIL_USER/GMAIL_APP_PASSWORD not set — skipping email to ${to}: "${subject}"`);
    return null;
  }

  try {
    return await client.sendMail({
      from: `"Smart HR System" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[emailService] Failed to send email:', err.message);
    return null;
  }
};

module.exports = { isEmailEnabled, sendEmail };
