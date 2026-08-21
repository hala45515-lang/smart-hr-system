const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    year: { type: Number, required: true },
    totalDays: { type: Number, required: true, default: 21 },
    usedDays: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

leaveBalanceSchema.virtual('remainingDays').get(function remaining() {
  return Math.max(this.totalDays - this.usedDays, 0);
});
leaveBalanceSchema.set('toJSON', { virtuals: true });
leaveBalanceSchema.set('toObject', { virtuals: true });

leaveBalanceSchema.index({ employee: 1, leaveType: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
