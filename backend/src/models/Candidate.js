const mongoose = require('mongoose');

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
  },
  { timestamps: true }
);

candidateSchema.index({ job: 1, stage: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
