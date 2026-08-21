const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const Attendance = require('../models/Attendance');
const { resolveEmployeeId } = require('../utils/resolveEmployee');

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// @desc  Check in for today
// @route POST /api/attendance/check-in
const checkIn = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const today = startOfDay(new Date());

  const existing = await Attendance.findOne({ employee: employeeId, date: today });
  if (existing?.checkIn) throw new ApiError(400, 'Already checked in today');

  const now = new Date();
  const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);

  const record = await Attendance.findOneAndUpdate(
    { employee: employeeId, date: today },
    { checkIn: now, status: isLate ? 'late' : 'present' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  created(res, record, 'Checked in');
});

// @desc  Check out for today
// @route POST /api/attendance/check-out
const checkOut = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const today = startOfDay(new Date());

  const record = await Attendance.findOne({ employee: employeeId, date: today });
  if (!record || !record.checkIn) throw new ApiError(400, 'You must check in before checking out');
  if (record.checkOut) throw new ApiError(400, 'Already checked out today');

  record.checkOut = new Date();
  record.hoursWorked = Math.round(((record.checkOut - record.checkIn) / (1000 * 60 * 60)) * 100) / 100;
  await record.save();

  ok(res, record, 'Checked out');
});

// @desc  Attendance history for an employee
// @route GET /api/attendance/:employeeId?
const getAttendance = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const { from, to } = req.query;
  const filter = { employee: employeeId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  const records = await Attendance.find(filter).sort({ date: -1 });
  ok(res, records);
});

module.exports = { checkIn, checkOut, getAttendance };
