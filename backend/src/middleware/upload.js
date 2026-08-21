const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const makeStorage = (subfolder) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', subfolder)),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
  });

const documentUpload = multer({ storage: makeStorage('documents'), limits: { fileSize: 15 * 1024 * 1024 } });
const resumeUpload = multer({ storage: makeStorage('resumes'), limits: { fileSize: 15 * 1024 * 1024 } });
const recordingUpload = multer({ storage: makeStorage('recordings'), limits: { fileSize: 500 * 1024 * 1024 } });
const leaveAttachmentUpload = multer({ storage: makeStorage('documents'), limits: { fileSize: 15 * 1024 * 1024 } });

module.exports = { documentUpload, resumeUpload, recordingUpload, leaveAttachmentUpload };
