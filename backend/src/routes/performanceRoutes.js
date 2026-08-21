const express = require('express');
const { getPerformanceScore, getPerformanceHistory } = require('../controllers/performanceController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', getPerformanceScore);
router.get('/history', getPerformanceHistory);
router.get('/:employeeId', getPerformanceScore);
router.get('/:employeeId/history', getPerformanceHistory);

module.exports = router;
