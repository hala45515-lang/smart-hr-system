const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const Department = require('../models/Department');

const listDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find().populate('manager', 'position');
  ok(res, departments);
});

const createDepartment = asyncHandler(async (req, res) => {
  const { name, description, manager } = req.body;
  if (!name) throw new ApiError(400, 'name is required');
  const department = await Department.create({ name, description, manager });
  created(res, department, 'Department created');
});

const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!department) throw new ApiError(404, 'Department not found');
  ok(res, department, 'Department updated');
});

const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findByIdAndDelete(req.params.id);
  if (!department) throw new ApiError(404, 'Department not found');
  ok(res, null, 'Department deleted');
});

module.exports = { listDepartments, createDepartment, updateDepartment, deleteDepartment };
