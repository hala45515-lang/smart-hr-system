const express = require('express');
const { listTasks, createTask, updateTask, deleteTask } = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);

router.get('/', listTasks);
router.get('/:employeeId', listTasks);
router.post('/:employeeId', allowRoles('manager', 'hr_admin'), createTask);
router.patch('/item/:taskId', updateTask);
router.delete('/item/:taskId', allowRoles('manager', 'hr_admin'), deleteTask);

module.exports = router;
