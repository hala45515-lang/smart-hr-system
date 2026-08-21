const express = require('express');
const { createEvaluation, listEvaluations } = require('../controllers/evaluationController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);

router.get('/:employeeId', listEvaluations);
router.post('/:employeeId', allowRoles('manager', 'hr_admin'), createEvaluation);

module.exports = router;
