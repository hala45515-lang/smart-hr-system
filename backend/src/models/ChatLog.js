const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    intent: { type: String },
    resolvedByAI: { type: Boolean, default: true },
    escalated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatLog', chatLogSchema);
