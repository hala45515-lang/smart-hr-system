const express = require('express');
const {
  getAttendanceReport,
  exportAttendanceReport,
  getTurnoverReport,
  getDepartmentPerformanceReport,
  exportDepartmentPerformanceReport,
  getDepartmentAttendanceLeaveReport,
  exportDepartmentAttendanceLeaveReport,
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);
router.use(allowRoles('manager', 'hr_admin'));

router.get('/attendance', getAttendanceReport);
router.get('/attendance/export', exportAttendanceReport);
router.get('/turnover', getTurnoverReport);
router.get('/department-performance', getDepartmentPerformanceReport);
router.get('/department-performance/export', exportDepartmentPerformanceReport);
router.get('/department-attendance-leave', getDepartmentAttendanceLeaveReport);
router.get('/department-attendance-leave/export', exportDepartmentAttendanceLeaveReport);

module.exports = router;
