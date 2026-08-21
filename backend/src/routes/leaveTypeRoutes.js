const express = require('express');
const { listLeaveTypes, createLeaveType } = require('../controllers/leaveTypeController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);

router.get('/', listLeaveTypes);
router.post('/', allowRoles('hr_admin'), createLeaveType);

module.exports = router;
