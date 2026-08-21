const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'beginner' },
    acquiredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    provider: { type: String },
    completedAt: { type: Date },
    certificateUrl: { type: String },
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeCode: { type: String, required: true, unique: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    position: { type: String, required: true },
    level: {
      type: String,
      enum: ['junior', 'mid', 'senior', 'lead', 'manager', 'director'],
      default: 'junior',
    },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    hireDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'on_leave', 'terminated'], default: 'active' },
    baseSalary: { type: Number, default: 0 },
    skills: [skillSchema],
    courses: [courseSchema],
    developmentTips: [{ type: String }],
    phone: { type: String },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

employeeSchema.index({ department: 1 });
employeeSchema.index({ manager: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
