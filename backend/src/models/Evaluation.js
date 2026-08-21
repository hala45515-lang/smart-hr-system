const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    evaluator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    period: { type: String, required: true }, // e.g. "2025-Q1"
    managerRating: { type: Number, min: 1, max: 5, required: true },
    strengths: { type: String },
    areasToImprove: { type: String },
    comments: { type: String },
  },
  { timestamps: true }
);

evaluationSchema.index({ employee: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Evaluation', evaluationSchema);
