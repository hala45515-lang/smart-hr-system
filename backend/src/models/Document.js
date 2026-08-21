const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    type: {
      type: String,
      enum: ['contract', 'certificate', 'evaluation', 'payslip', 'id', 'other'],
      required: true,
    },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

documentSchema.index({ employee: 1, type: 1 });

module.exports = mongoose.model('Document', documentSchema);
