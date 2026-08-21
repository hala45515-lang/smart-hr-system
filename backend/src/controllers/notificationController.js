const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok } = require('../utils/apiResponse');
const Notification = require('../models/Notification');

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

module.exports = { listNotifications, markAsRead, markAllAsRead };
