const express = require('express');
const { checkIn, checkOut, getAttendance, runAbsenceSweep } = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.post('/mark-absentees', allowRoles('hr_admin'), runAbsenceSweep);
router.get('/', getAttendance);
router.get('/:employeeId', getAttendance);

module.exports = router;
