require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const LeaveType = require('../models/LeaveType');
const CareerEvent = require('../models/CareerEvent');
const Evaluation = require('../models/Evaluation');
const PerformanceScore = require('../models/PerformanceScore');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveRequest = require('../models/LeaveRequest');
const Task = require('../models/Task');
const Document = require('../models/Document');
const { EmergencyContact, EmployeeMedicalInfo } = require('../models/EmergencyContact');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Interview = require('../models/Interview');
const Referral = require('../models/Referral');
const ChatLog = require('../models/ChatLog');
const Notification = require('../models/Notification');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');

const run = async () => {
  await connectDB();
  console.log('[seed] Clearing all collections for a clean reseed...');
  await Promise.all([
    User.deleteMany({}),
    Employee.deleteMany({}),
    Department.deleteMany({}),
    LeaveType.deleteMany({}),
    CareerEvent.deleteMany({}),
    Evaluation.deleteMany({}),
    PerformanceScore.deleteMany({}),
    LeaveBalance.deleteMany({}),
    LeaveRequest.deleteMany({}),
    Task.deleteMany({}),
    Document.deleteMany({}),
    EmergencyContact.deleteMany({}),
    EmployeeMedicalInfo.deleteMany({}),
    Job.deleteMany({}),
    Candidate.deleteMany({}),
    Interview.deleteMany({}),
    Referral.deleteMany({}),
    ChatLog.deleteMany({}),
    Notification.deleteMany({}),
    Attendance.deleteMany({}),
    Payroll.deleteMany({}),
  ]);

  const engineering = await Department.create({ name: 'Engineering', description: 'Product engineering team' });
  const hrDept = await Department.create({ name: 'Human Resources', description: 'People & culture team' });

  await LeaveType.insertMany([
    { name: 'Annual', defaultDaysPerYear: 21 },
    { name: 'Sick', defaultDaysPerYear: 10 },
    { name: 'Unpaid', defaultDaysPerYear: 0 },
  ]);

  const hrAdminUser = await User.create({
    name: 'Sara HR Admin',
    email: 'hr.admin@smarthr.test',
    password: 'password123',
    role: 'hr_admin',
  });

  const managerUser = await User.create({
    name: 'Omar Manager',
    email: 'manager@smarthr.test',
    password: 'password123',
    role: 'manager',
  });
  const managerEmployee = await Employee.create({
    user: managerUser._id,
    employeeCode: 'EMP-0001',
    department: engineering._id,
    position: 'Engineering Manager',
    level: 'manager',
    hireDate: new Date('2021-03-01'),
    baseSalary: 3500,
  });
  managerUser.employee = managerEmployee._id;
  await managerUser.save();
  engineering.manager = managerEmployee._id;
  await engineering.save();

  const employeeUser = await User.create({
    name: 'Lina Developer',
    email: 'employee@smarthr.test',
    password: 'password123',
    role: 'employee',
  });
  const employee = await Employee.create({
    user: employeeUser._id,
    employeeCode: 'EMP-0002',
    department: engineering._id,
    position: 'Software Engineer',
    level: 'mid',
    manager: managerEmployee._id,
    hireDate: new Date('2023-01-15'),
    baseSalary: 1800,
    skills: [{ name: 'Node.js', level: 'advanced' }, { name: 'MongoDB', level: 'intermediate' }],
    courses: [{ title: 'Advanced JavaScript', provider: 'Udemy', completedAt: new Date('2024-02-01') }],
  });
  employeeUser.employee = employee._id;
  await employeeUser.save();

  await CareerEvent.insertMany([
    { employee: employee._id, type: 'hire', title: 'Joined as Junior Developer', date: new Date('2023-01-15') },
    { employee: employee._id, type: 'promotion', title: 'Promoted to Mid-level Engineer', newValue: 'mid', date: new Date('2024-06-01') },
  ]);

  console.log('[seed] Done. Sample accounts (password: password123):');
  console.log(`  HR Admin -> ${hrAdminUser.email}`);
  console.log(`  Manager  -> ${managerUser.email}`);
  console.log(`  Employee -> ${employeeUser.email}`);

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
