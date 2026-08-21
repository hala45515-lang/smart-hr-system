const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const emergencyContactSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const employeeMedicalInfoSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
      default: 'unknown',
    },
    allergies: [{ type: String }],
    chronicConditions: [{ type: String }],
    qrToken: { type: String, unique: true, default: () => uuidv4() },
  },
  { timestamps: true }
);

module.exports = {
  EmergencyContact: mongoose.model('EmergencyContact', emergencyContactSchema),
  EmployeeMedicalInfo: mongoose.model('EmployeeMedicalInfo', employeeMedicalInfoSchema),
};
