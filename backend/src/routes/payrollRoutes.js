const express = require('express');
const { createPayroll, listPayroll } = require('../controllers/payrollController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);

router.get('/', listPayroll);
router.get('/:employeeId', listPayroll);
router.post('/:employeeId', allowRoles('hr_admin'), createPayroll);

module.exports = router;
