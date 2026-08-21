const mongoose = require('mongoose');

const hrNoteSchema = new mongoose.Schema(
  {
    note: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    interviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    type: { type: String, enum: ['phone', 'technical', 'video', 'onsite'], default: 'phone' },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, default: 45 },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'no_show'], default: 'scheduled' },

    // AI Scribe
    consentGiven: { type: Boolean, default: false },
    transcript: { type: String },
    aiSummary: { type: String },
    aiEvaluation: {
      overallRating: { type: Number, min: 1, max: 5 },
      strengths: [{ type: String }],
      concerns: [{ type: String }],
      recommendation: { type: String, enum: ['strong_yes', 'yes', 'neutral', 'no', 'strong_no'] },
    },

    // Video Interview Native
    videoRecordingUrl: { type: String },
    liveNotes: [hrNoteSchema],
    hrNotes: [hrNoteSchema],
  },
  { timestamps: true }
);

interviewSchema.index({ candidate: 1, scheduledAt: 1 });
interviewSchema.index({ scheduledAt: 1 });

module.exports = mongoose.model('Interview', interviewSchema);
