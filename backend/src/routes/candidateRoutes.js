const express = require('express');
const { listCandidates, getCandidate, createCandidate, updateCandidateStage } = require('../controllers/candidateController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');
const { resumeUpload } = require('../middleware/upload');

const router = express.Router();
router.use(protect);
router.use(allowRoles('manager', 'hr_admin'));

router.get('/', listCandidates);
router.get('/:id', getCandidate);
router.post('/', resumeUpload.single('resume'), createCandidate);
router.patch('/:id/stage', updateCandidateStage);

module.exports = router;
