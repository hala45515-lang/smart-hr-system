const express = require('express');
const {
  listInterviews,
  getInterview,
  createInterview,
  cancelInterview,
  runAiScribe,
  updateEvaluation,
  addNote,
  attachRecording,
  downloadRecording,
} = require('../controllers/interviewController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');
const { recordingUpload } = require('../middleware/upload');

const router = express.Router();
router.use(protect);
router.use(allowRoles('manager', 'hr_admin'));

router.get('/', listInterviews);
router.get('/:id', getInterview);
router.post('/', createInterview);
router.patch('/:id/cancel', cancelInterview);
router.post('/:id/scribe', runAiScribe);
router.patch('/:id/evaluation', updateEvaluation);
router.post('/:id/notes', addNote);
router.patch('/:id/recording', recordingUpload.single('recording'), attachRecording);
router.get('/:id/recording', downloadRecording);

module.exports = router;
