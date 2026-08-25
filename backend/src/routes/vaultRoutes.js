const express = require('express');
const { listDocuments, uploadDocument, getSalaryHistory, reviewDocument, deleteDocument } = require('../controllers/vaultController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');
const { documentUpload } = require('../middleware/upload');

const router = express.Router();
router.use(protect);

router.get('/', listDocuments);
router.get('/salary-history', getSalaryHistory);
router.get('/:employeeId', listDocuments);
router.get('/:employeeId/salary-history', getSalaryHistory);
router.post('/', documentUpload.single('file'), uploadDocument);
router.post('/:employeeId', documentUpload.single('file'), uploadDocument);
router.patch('/document/:documentId/review', allowRoles('hr_admin'), reviewDocument);
router.delete('/document/:documentId', allowRoles('hr_admin'), deleteDocument);

module.exports = router;
