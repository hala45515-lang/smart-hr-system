const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const AuditLog = require('../models/AuditLog');

// @desc  List audit log entries (role/permission changes and other sensitive admin actions)
// @route GET /api/audit-logs
const listAuditLogs = asyncHandler(async (req, res) => {
  const { targetType, targetId, actor } = req.query;
  const filter = {};
  if (targetType) filter.targetType = targetType;
  if (targetId) filter.targetId = targetId;
  if (actor) filter.actor = actor;

  const logs = await AuditLog.find(filter).populate('actor', 'name email role').sort({ createdAt: -1 }).limit(200);
  ok(res, logs);
});

module.exports = { listAuditLogs };
