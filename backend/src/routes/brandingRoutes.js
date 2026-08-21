const express = require('express');
const { getBrandingStats, getSuggestedPosts } = require('../controllers/brandingController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);
router.use(allowRoles('manager', 'hr_admin'));

router.get('/stats', getBrandingStats);
router.get('/posts', getSuggestedPosts);

module.exports = router;
