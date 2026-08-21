const express = require('express');

const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/employees', require('./employeeRoutes'));
router.use('/profile', require('./profileRoutes'));
router.use('/evaluations', require('./evaluationRoutes'));
router.use('/performance', require('./performanceRoutes'));
router.use('/chatbot', require('./chatbotRoutes'));
router.use('/vault', require('./vaultRoutes'));
router.use('/leave', require('./leaveRoutes'));
router.use('/leave-types', require('./leaveTypeRoutes'));
router.use('/tasks', require('./taskRoutes'));
router.use('/emergency', require('./emergencyRoutes'));
router.use('/departments', require('./departmentRoutes'));
router.use('/jobs', require('./jobRoutes'));
router.use('/candidates', require('./candidateRoutes'));
router.use('/interviews', require('./interviewRoutes'));
router.use('/branding', require('./brandingRoutes'));
router.use('/referrals', require('./referralRoutes'));
router.use('/attendance', require('./attendanceRoutes'));
router.use('/payroll', require('./payrollRoutes'));
router.use('/notifications', require('./notificationRoutes'));

router.get('/health', (req, res) => res.json({ success: true, message: 'Smart HR API is running' }));

module.exports = router;
