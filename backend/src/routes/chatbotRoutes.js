const express = require('express');
const { ask, history } = require('../controllers/chatbotController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.post('/ask', ask);
router.get('/history', history);

module.exports = router;
