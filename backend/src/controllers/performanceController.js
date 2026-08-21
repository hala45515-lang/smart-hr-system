const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const PerformanceScore = require('../models/PerformanceScore');
const { resolveEmployeeId } = require('../utils/resolveEmployee');
const { calculatePerformanceScore } = require('../services/performanceService');

// @desc  Get current Performance Score (recalculated on demand), like a "credit score" for performance
// @route GET /api/performance/:employeeId?
const getPerformanceScore = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await calculatePerformanceScore(employeeId);
  ok(res, result);
});

// @desc  Get performance score history/trend
// @route GET /api/performance/:employeeId?/history
const getPerformanceHistory = asyncHandler(async (req, res) => {
  const employeeId = await resolveEmployeeId(req);
  const history = await PerformanceScore.find({ employee: employeeId }).sort({ period: 1 });
  ok(res, history);
});

module.exports = { getPerformanceScore, getPerformanceHistory };
