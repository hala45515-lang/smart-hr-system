const express = require('express');
const {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  addSkill,
  addCourse,
  deactivateEmployee,
} = require('../controllers/employeeController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);

router.get('/', allowRoles('manager', 'hr_admin'), listEmployees);
router.post('/', allowRoles('hr_admin'), createEmployee);
router.get('/:id', getEmployee);
router.put('/:id', allowRoles('hr_admin'), updateEmployee);
router.post('/:id/skills', allowRoles('manager', 'hr_admin'), addSkill);
router.post('/:id/courses', allowRoles('manager', 'hr_admin'), addCourse);
router.delete('/:id', allowRoles('hr_admin'), deactivateEmployee);

module.exports = router;
