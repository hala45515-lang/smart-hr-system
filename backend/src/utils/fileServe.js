const path = require('path');
const { ApiError } = require('./apiResponse');

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');

/**
 * Resolves a stored "/uploads/<subfolder>/<file>" URL to an absolute path on
 * disk, guarding against path traversal. Files under uploads/ are no longer
 * served as public static assets (see app.js) — every download must go through
 * an authenticated, permission-checked route that calls this.
 */
const resolveUploadPath = (fileUrl) => {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) throw new ApiError(400, 'Invalid file reference');
  const relative = fileUrl.replace('/uploads/', '');
  const absolute = path.join(UPLOADS_ROOT, relative);
  if (!absolute.startsWith(UPLOADS_ROOT + path.sep)) throw new ApiError(400, 'Invalid file path');
  return absolute;
};

module.exports = { resolveUploadPath };
