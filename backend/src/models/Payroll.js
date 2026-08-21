const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    baseSalary: { type: Number, required: true },
    bonuses: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    paidAt: { type: Date },
    payslipUrl: { type: String },
    absentDays: { type: Number, default: 0 },
    attendanceDeduction: { type: Number, default: 0 },
    generatedFromAttendance: { type: Boolean, default: false },
  },
  { timestamps: true }
);

payrollSchema.index({ employee: 1, year: 1, month: 1 }, { unique: true });

payrollSchema.pre('validate', function computeNet(next) {
  this.netSalary = (this.baseSalary || 0) + (this.bonuses || 0) - (this.deductions || 0);
  next();
});

module.exports = mongoose.model('Payroll', payrollSchema);
