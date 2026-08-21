const express = require('express');
const { createReferral, listReferrals, getNomineeProfile, decideReferral } = require('../controllers/referralController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);
router.use(allowRoles('manager', 'hr_admin'));

router.get('/', listReferrals);
router.post('/', createReferral);
router.get('/:id/candidate-profile', getNomineeProfile);
router.patch('/:id/decision', decideReferral);

module.exports = router;
