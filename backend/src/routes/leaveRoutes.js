const express = require('express');
const {
  getBalances,
  createLeaveRequest,
  listLeaveRequests,
  decideLeaveRequest,
  cancelLeaveRequest,
  setLeaveBalance,
} = require('../controllers/leaveController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');
const { leaveAttachmentUpload } = require('../middleware/upload');

const router = express.Router();
router.use(protect);

router.get('/balances', getBalances);
router.get('/:employeeId/balances', getBalances);
router.post('/:employeeId/balances', allowRoles('hr_admin'), setLeaveBalance);

router.get('/requests', listLeaveRequests);
router.get('/:employeeId/requests', listLeaveRequests);
router.post('/requests', leaveAttachmentUpload.single('attachment'), createLeaveRequest);
router.post('/:employeeId/requests', allowRoles('manager', 'hr_admin'), leaveAttachmentUpload.single('attachment'), createLeaveRequest);

router.patch('/requests/:requestId/decision', allowRoles('manager', 'hr_admin'), decideLeaveRequest);
router.patch('/requests/:requestId/cancel', cancelLeaveRequest);

module.exports = router;
