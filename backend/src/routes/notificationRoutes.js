const express = require('express');
const { listNotifications, markAsRead, markAllAsRead, getPreferences, updatePreferences } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', listNotifications);
router.get('/preferences', getPreferences);
router.patch('/preferences', updatePreferences);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

module.exports = router;
