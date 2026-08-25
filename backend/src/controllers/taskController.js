const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const { resolveEmployeeId } = require('../utils/resolveEmployee');

// @desc  List tasks for an employee (defaults to self)
// @route GET /api/tasks/:employeeId?
const listTasks = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const { status } = req.query;
  const filter = { employee: employeeId };
  if (status) filter.status = status;
  const tasks = await Task.find(filter).sort({ dueDate: 1 });
  ok(res, tasks);
});

// @desc  Assign a task to an employee
// @route POST /api/tasks/:employeeId
const createTask = asyncHandler(async (req, res) => {
  const { title, description, dueDate, priority } = req.body;
  if (!title || !dueDate) throw new ApiError(400, 'title and dueDate are required');

  const task = await Task.create({
    employee: req.params.employeeId,
    title,
    description,
    dueDate,
    priority,
    assignedBy: req.user._id,
  });
  created(res, task, 'Task assigned');
});

// @desc  Update task status/details
// @route PATCH /api/tasks/item/:taskId
const updateTask = asyncHandler(async (req, res) => {
  if (req.user.role === 'employee') {
    const task = await Task.findById(req.params.taskId).select('employee');
    if (!task) throw new ApiError(404, 'Task not found');
    const own = await Employee.findOne({ user: req.user._id }).select('_id');
    if (!own || String(own._id) !== String(task.employee)) {
      throw new ApiError(403, 'You can only update your own tasks');
    }
  }

  const { status, title, description, dueDate, priority } = req.body;
  const updates = {};
  if (status) {
    updates.status = status;
    if (status === 'done') updates.completedAt = new Date();
  }
  if (title) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (dueDate) updates.dueDate = dueDate;
  if (priority) updates.priority = priority;

  const task = await Task.findByIdAndUpdate(req.params.taskId, updates, { new: true, runValidators: true });
  if (!task) throw new ApiError(404, 'Task not found');
  ok(res, task, 'Task updated');
});

// @desc  Delete a task
// @route DELETE /api/tasks/item/:taskId
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.taskId);
  if (!task) throw new ApiError(404, 'Task not found');
  ok(res, null, 'Task deleted');
});

module.exports = { listTasks, createTask, updateTask, deleteTask };
