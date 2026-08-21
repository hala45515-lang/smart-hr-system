const express = require('express');
const { checkIn, checkOut, getAttendance } = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/', getAttendance);
router.get('/:employeeId', getAttendance);

module.exports = router;
