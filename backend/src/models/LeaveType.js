const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g. Annual, Sick, Unpaid
    defaultDaysPerYear: { type: Number, required: true, default: 21 },
    description: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeaveType', leaveTypeSchema);
