const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok } = require('../utils/apiResponse');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc  List notifications for the logged-in user
// @route GET /api/notifications
const listNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly } = req.query;
  const filter = { user: req.user._id };
  if (unreadOnly === 'true') filter.read = false;
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
  ok(res, notifications);
});

// @desc  Mark a notification as read
// @route PATCH /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) throw new ApiError(404, 'Notification not found');
  ok(res, notification);
});

// @desc  Mark all notifications as read
// @route PATCH /api/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  ok(res, null, 'All notifications marked as read');
});

// @desc  Get the logged-in user's notification preferences (in-app / email)
// @route GET /api/notifications/preferences
const getPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('notificationPreferences');
  ok(res, user.notificationPreferences);
});

// @desc  Update the logged-in user's notification preferences
// @route PATCH /api/notifications/preferences
const updatePreferences = asyncHandler(async (req, res) => {
  const { inApp, email } = req.body;
  const updates = {};
  if (inApp !== undefined) updates['notificationPreferences.inApp'] = inApp;
  if (email !== undefined) updates['notificationPreferences.email'] = email;

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('notificationPreferences');
  ok(res, user.notificationPreferences, 'Notification preferences updated');
});

module.exports = { listNotifications, markAsRead, markAllAsRead, getPreferences, updatePreferences };
