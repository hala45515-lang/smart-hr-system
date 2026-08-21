const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const Employee = require('../models/Employee');
const Job = require('../models/Job');
const PerformanceScore = require('../models/PerformanceScore');
const aiService = require('../services/aiService');

// @desc  Employer Branding Kit — company stats used as a recruitment marketing tool
// @route GET /api/branding/stats
const getBrandingStats = asyncHandler(async (req, res) => {
  const employees = await Employee.find({ status: 'active' });
  const now = new Date();

  const tenureYears = employees.map((e) => (now - e.hireDate) / (1000 * 60 * 60 * 24 * 365));
  const averageTenureYears = tenureYears.length ? tenureYears.reduce((a, b) => a + b, 0) / tenureYears.length : 0;

  const latestScores = await PerformanceScore.aggregate([
    { $sort: { period: -1 } },
    { $group: { _id: '$employee', score: { $first: '$score' } } },
  ]);
  const employeeSatisfactionScore = latestScores.length
    ? Math.round(latestScores.reduce((sum, s) => sum + s.score, 0) / latestScores.length)
    : null;

  const openPositions = await Job.countDocuments({ status: 'open' });

  const stats = {
    totalActiveEmployees: employees.length,
    averageTenureYears: Math.round(averageTenureYears * 10) / 10,
    employeeSatisfactionScore,
    openPositions,
  };

  ok(res, stats);
});

// @desc  AI-suggested social posts to attract candidates, based on live company stats
// @route GET /api/branding/posts
const getSuggestedPosts = asyncHandler(async (req, res) => {
  const employees = await Employee.find({ status: 'active' });
  const now = new Date();
  const tenureYears = employees.map((e) => (now - e.hireDate) / (1000 * 60 * 60 * 24 * 365));
  const averageTenureYears = tenureYears.length ? tenureYears.reduce((a, b) => a + b, 0) / tenureYears.length : 0;
  const openPositions = await Job.countDocuments({ status: 'open' });

  const latestScores = await PerformanceScore.aggregate([
    { $sort: { period: -1 } },
    { $group: { _id: '$employee', score: { $first: '$score' } } },
  ]);
  const employeeSatisfactionScore = latestScores.length
    ? Math.round(latestScores.reduce((sum, s) => sum + s.score, 0) / latestScores.length)
    : null;

  const posts = await aiService.suggestBrandingPosts({
    averageTenureYears,
    openPositions,
    employeeSatisfactionScore,
  });

  ok(res, posts);
});

module.exports = { getBrandingStats, getSuggestedPosts };
