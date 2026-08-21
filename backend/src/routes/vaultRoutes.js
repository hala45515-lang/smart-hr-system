const express = require('express');
const { listDocuments, uploadDocument, getSalaryHistory, deleteDocument } = require('../controllers/vaultController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');
const { documentUpload } = require('../middleware/upload');

const router = express.Router();
router.use(protect);

router.get('/', listDocuments);
router.get('/salary-history', getSalaryHistory);
router.get('/:employeeId', listDocuments);
router.get('/:employeeId/salary-history', getSalaryHistory);
router.post('/:employeeId', allowRoles('hr_admin'), documentUpload.single('file'), uploadDocument);
router.delete('/document/:documentId', allowRoles('hr_admin'), deleteDocument);

module.exports = router;
