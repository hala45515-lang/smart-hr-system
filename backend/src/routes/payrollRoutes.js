const express = require('express');
const { createPayroll, listPayroll, generatePayroll, approvePayroll, downloadPayslipPdf } = require('../controllers/payrollController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);

router.get('/', listPayroll);
router.get('/slip/:payrollId/pdf', downloadPayslipPdf);
router.get('/:employeeId', listPayroll);
router.post('/:employeeId', allowRoles('hr_admin'), createPayroll);
router.post('/:employeeId/generate', allowRoles('hr_admin'), generatePayroll);
router.patch('/:payrollId/approve', allowRoles('hr_admin'), approvePayroll);

module.exports = router;
