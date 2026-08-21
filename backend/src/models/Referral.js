const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['referral', 'transfer'], required: true },

    // For internal transfer: nominee is an existing Employee
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

    // For external referral of a new candidate
    candidateName: { type: String },
    candidateEmail: { type: String },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },

    nominatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    toDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    reason: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Referral', referralSchema);
