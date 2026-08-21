const express = require('express');
const { getProfileMap, getCareerTimeline, addCareerEvent } = require('../controllers/profileController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);

router.get('/', getProfileMap);
router.get('/timeline', getCareerTimeline);
router.get('/:employeeId', getProfileMap);
router.get('/:employeeId/timeline', getCareerTimeline);
router.post('/:employeeId/timeline', allowRoles('manager', 'hr_admin'), addCareerEvent);

module.exports = router;
