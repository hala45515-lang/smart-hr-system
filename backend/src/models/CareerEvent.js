const mongoose = require('mongoose');

const careerEventSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    type: {
      type: String,
      enum: ['hire', 'promotion', 'transfer', 'project_lead', 'role_change', 'recognition', 'exit'],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    previousValue: { type: String },
    newValue: { type: String },
    date: { type: Date, required: true, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

careerEventSchema.index({ employee: 1, date: -1 });

module.exports = mongoose.model('CareerEvent', careerEventSchema);
