const express = require('express');
const { listDepartments, createDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/role');

const router = express.Router();
router.use(protect);

router.get('/', listDepartments);
router.post('/', allowRoles('hr_admin'), createDepartment);
router.put('/:id', allowRoles('hr_admin'), updateDepartment);
router.delete('/:id', allowRoles('hr_admin'), deleteDepartment);

module.exports = router;
