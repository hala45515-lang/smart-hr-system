const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const { EmergencyContact, EmployeeMedicalInfo } = require('../models/EmergencyContact');
const Employee = require('../models/Employee');
const { resolveEmployeeIdHrOnly } = require('../utils/resolveEmployee');
const { generateQrDataUrl } = require('../utils/qrCode');

// @desc  Family & Emergency Info Hub — list emergency contacts + medical info
// @route GET /api/emergency/:employeeId?
const getEmergencyInfo = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeIdHrOnly(req);
  const [contacts, medicalInfo] = await Promise.all([
    EmergencyContact.find({ employee: employeeId }),
    EmployeeMedicalInfo.findOne({ employee: employeeId }),
  ]);
  ok(res, { contacts, medicalInfo });
});

// @desc  Add an emergency contact
// @route POST /api/emergency/:employeeId/contacts
const addEmergencyContact = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeIdHrOnly(req);
  const { name, relationship, phone, isPrimary } = req.body;
  if (!name || !relationship || !phone) throw new ApiError(400, 'name, relationship and phone are required');

  if (isPrimary) {
    await EmergencyContact.updateMany({ employee: employeeId }, { isPrimary: false });
  }
  const contact = await EmergencyContact.create({ employee: employeeId, name, relationship, phone, isPrimary });
  created(res, contact, 'Emergency contact added');
});

// @desc  Update/create medical info (blood type, allergies, chronic conditions)
// @route PUT /api/emergency/:employeeId/medical
const upsertMedicalInfo = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeIdHrOnly(req);
  const { bloodType, allergies, chronicConditions } = req.body;

  const medicalInfo = await EmployeeMedicalInfo.findOneAndUpdate(
    { employee: employeeId },
    { bloodType, allergies, chronicConditions },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  ok(res, medicalInfo, 'Medical info updated');
});

// @desc  Emergency QR Code — generates a scannable QR pointing to the public emergency view
// @route GET /api/emergency/:employeeId?/qr
const getEmergencyQr = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeIdHrOnly(req);
  const medicalInfo = await EmployeeMedicalInfo.findOneAndUpdate(
    { employee: employeeId },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const { url, dataUrl } = await generateQrDataUrl(medicalInfo.qrToken);
  ok(res, { qrToken: medicalInfo.qrToken, publicUrl: url, qrImageDataUrl: dataUrl });
});

// @desc  Public (no-auth) emergency lookup by QR token — for first responders/anyone with the code
// @route GET /api/emergency/public/:qrToken
const getPublicEmergencyInfo = asyncHandler(async (req, res) => {
  const medicalInfo = await EmployeeMedicalInfo.findOne({ qrToken: req.params.qrToken });
  if (!medicalInfo) throw new ApiError(404, 'No emergency record found for this code');

  const [employee, contacts] = await Promise.all([
    Employee.findById(medicalInfo.employee).populate('user', 'name'),
    EmergencyContact.find({ employee: medicalInfo.employee }),
  ]);

  ok(res, {
    name: employee?.user?.name,
    bloodType: medicalInfo.bloodType,
    allergies: medicalInfo.allergies,
    chronicConditions: medicalInfo.chronicConditions,
    contacts: contacts.map((c) => ({ name: c.name, relationship: c.relationship, phone: c.phone, isPrimary: c.isPrimary })),
  });
});

module.exports = { getEmergencyInfo, addEmergencyContact, upsertMedicalInfo, getEmergencyQr, getPublicEmergencyInfo };
