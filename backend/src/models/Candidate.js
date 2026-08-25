const mongoose = require('mongoose');

const candidateNoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const candidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    resumeUrl: { type: String },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    stage: {
      type: String,
      enum: ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'],
      default: 'applied',
    },
    source: { type: String, enum: ['careers_page', 'referral', 'agency', 'other'], default: 'careers_page' },
    referral: { type: mongoose.Schema.Types.ObjectId, ref: 'Referral' },
    hiredEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    notes: [candidateNoteSchema],
  },
  { timestamps: true }
);

candidateSchema.index({ job: 1, stage: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
