const AuditLog = require('../models/AuditLog');

/**
 * Records a permission/role change (or other sensitive admin action) for the Audit Log.
 */
const logAudit = async ({ actor, action, targetType, targetId, changes }) =>
  AuditLog.create({ actor, action, targetType, targetId, changes });

module.exports = { logAudit };
