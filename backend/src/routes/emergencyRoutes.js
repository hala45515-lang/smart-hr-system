const express = require('express');
const {
  getEmergencyInfo,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  upsertMedicalInfo,
  getEmergencyQr,
  getPublicEmergencyInfo,
} = require('../controllers/emergencyController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public route — no auth — used when scanning the Emergency QR Code
router.get('/public/:qrToken', getPublicEmergencyInfo);

router.use(protect);
router.get('/', getEmergencyInfo);
router.get('/:employeeId', getEmergencyInfo);
router.post('/:employeeId/contacts', addEmergencyContact);
router.put('/contacts/:contactId', updateEmergencyContact);
router.delete('/contacts/:contactId', deleteEmergencyContact);
router.put('/:employeeId/medical', upsertMedicalInfo);
router.get('/:employeeId/qr', getEmergencyQr);

module.exports = router;
