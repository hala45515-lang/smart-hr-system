const express = require('express');
const {
  createEmployee,
  listEmployees,
  getEmployee,
  getEmployeeFullRecord,
  updateEmployee,
  addSkill,
  addCourse,
  changeRole,
  deactivateEmployee,
} = require('../controllers/employeeController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);

router.get('/', allowRoles('manager', 'hr_admin'), listEmployees);
router.post('/', allowRoles('hr_admin'), createEmployee);
router.get('/:id', getEmployee);
router.get('/:id/full-record', getEmployeeFullRecord);
router.put('/:id', allowRoles('hr_admin'), updateEmployee);
router.post('/:id/skills', allowRoles('manager', 'hr_admin'), addSkill);
router.post('/:id/courses', allowRoles('manager', 'hr_admin'), addCourse);
router.patch('/:id/role', allowRoles('hr_admin'), changeRole);
router.delete('/:id', allowRoles('hr_admin'), deactivateEmployee);

module.exports = router;
