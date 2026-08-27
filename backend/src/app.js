const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Uploaded files (documents, resumes, recordings, leave attachments) are never
// served as public static assets — each has its own authenticated, permission-
// checked download route instead (see vault/leave/candidate/interview routes).

app.use('/api', apiRoutes);

app.get('/', (req, res) => res.json({ success: true, message: 'Smart HR System API' }));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
