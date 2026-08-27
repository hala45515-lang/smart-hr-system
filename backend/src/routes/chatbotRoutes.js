const express = require('express');
const { ask, history, listEscalated } = require('../controllers/chatbotController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);

router.post('/ask', ask);
router.get('/history', history);
router.get('/escalated', allowRoles('hr_admin'), listEscalated);

module.exports = router;
