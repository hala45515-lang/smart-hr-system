const mongoose = require('mongoose');

const performanceScoreSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    period: { type: String, required: true }, // e.g. "2026-08"
    score: { type: Number, min: 0, max: 100, required: true },
    breakdown: {
      managerRating: { type: Number, default: 0 },
      attendance: { type: Number, default: 0 },
      taskCompletion: { type: Number, default: 0 },
      selfDevelopment: { type: Number, default: 0 },
    },
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

performanceScoreSchema.index({ employee: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('PerformanceScore', performanceScoreSchema);
