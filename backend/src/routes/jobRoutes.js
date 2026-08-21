const express = require('express');
const { listJobs, getJob, createJob, updateJob } = require('../controllers/jobController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);

router.get('/', listJobs);
router.get('/:id', getJob);
router.post('/', allowRoles('manager', 'hr_admin'), createJob);
router.put('/:id', allowRoles('manager', 'hr_admin'), updateJob);

module.exports = router;
