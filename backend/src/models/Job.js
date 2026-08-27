const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    openings: { type: Number, default: 1 },
    status: { type: String, enum: ['open', 'closed', 'on_hold'], default: 'open' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', jobSchema);
