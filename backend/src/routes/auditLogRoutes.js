const express = require('express');
const { listAuditLogs } = require('../controllers/auditLogController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);
router.use(allowRoles('hr_admin'));

router.get('/', listAuditLogs);

module.exports = router;
