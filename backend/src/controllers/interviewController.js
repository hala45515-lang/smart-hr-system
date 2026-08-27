const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const Interview = require('../models/Interview');
const Candidate = require('../models/Candidate');
const aiService = require('../services/aiService');
const schedulingService = require('../services/schedulingService');
const { createNotification } = require('../services/notificationService');
const { sendEmail } = require('../services/emailService');
const { resolveUploadPath } = require('../utils/fileServe');

// @desc  List interviews (optionally by candidate)
// @route GET /api/interviews
const listInterviews = asyncHandler(async (req, res) => {
  const { candidate, status } = req.query;
  const filter = {};
  if (candidate) filter.candidate = candidate;
  if (status) filter.status = status;
  const interviews = await Interview.find(filter)
    .populate('candidate', 'name email')
    .populate('job', 'title')
    .populate('interviewers', 'name')
    .sort({ scheduledAt: 1 });
  ok(res, interviews);
});

const getInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id)
    .populate('candidate', 'name email')
    .populate('job', 'title')
    .populate('interviewers', 'name');
  if (!interview) throw new ApiError(404, 'Interview not found');
  ok(res, interview);
});

// @desc  Schedule an interview. If no scheduledAt is given, Smart Scheduling finds the
//        next open slot for the interviewers and learns typical duration by type.
// @route POST /api/interviews
const createInterview = asyncHandler(async (req, res) => {
  const { candidate, job, interviewers, type, scheduledAt, durationMinutes, force } = req.body;
  if (!candidate || !job || !interviewers?.length) {
    throw new ApiError(400, 'candidate, job and interviewers are required');
  }

  const duration = durationMinutes || (await schedulingService.learnDurationForType(type || 'phone'));
  const startAt = scheduledAt ? new Date(scheduledAt) : await schedulingService.findNextAvailableSlot(interviewers, duration);
  if (!startAt) throw new ApiError(409, 'No available slot found for the selected interviewers');

  if (scheduledAt && !force) {
    const conflict = await schedulingService.findConflict(interviewers, startAt, duration);
    if (conflict) {
      throw new ApiError(
        409,
        `This time conflicts with an existing interview (${conflict.candidate?.name || 'another candidate'} at ${conflict.scheduledAt.toLocaleString()}). Pass force: true to schedule anyway.`
      );
    }
  }

  const interview = await Interview.create({
    candidate,
    job,
    interviewers,
    type: type || 'phone',
    scheduledAt: startAt,
    durationMinutes: duration,
  });

  const candidateDoc = await Candidate.findByIdAndUpdate(candidate, { stage: 'interview' }, { new: true });

  for (const interviewerId of interviewers) {
    await createNotification({
      userId: interviewerId,
      type: 'interview_scheduled',
      title: 'New interview scheduled',
      message: `You have a ${interview.type} interview scheduled on ${startAt.toLocaleString()}.`,
      meta: { interviewId: interview._id },
    });
  }

  // Candidates don't have in-app accounts, so they're notified by email directly
  // (sendEmail no-ops with a log line until RESEND_API_KEY is configured).
  if (candidateDoc?.email) {
    await sendEmail({
      to: candidateDoc.email,
      subject: 'Your interview has been scheduled',
      html: `<p>Hi ${candidateDoc.name},</p><p>Your ${interview.type} interview has been scheduled for ${startAt.toLocaleString()}.</p>`,
    });
    interview.candidateNotifiedAt = new Date();
    await interview.save();
  }

  created(res, interview, 'Interview scheduled');
});

// @desc  Cancel an interview and auto-suggest the next available replacement slot
// @route PATCH /api/interviews/:id/cancel
const cancelInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new ApiError(404, 'Interview not found');

  interview.status = 'cancelled';
  await interview.save();

  const suggestedSlot = await schedulingService.autoRescheduleAfterCancellation(interview);
  ok(res, { interview, suggestedSlot }, 'Interview cancelled');
});

// @desc  AI Scribe — submit transcript (with candidate consent) and get an AI-generated
//        summary + structured evaluation for HR to review/edit.
// @route POST /api/interviews/:id/scribe
const runAiScribe = asyncHandler(async (req, res) => {
  const { transcript, consentGiven } = req.body;
  if (!transcript) throw new ApiError(400, 'transcript is required');
  if (!consentGiven) throw new ApiError(400, "consentGiven must be true — the candidate's consent is required to process the recording/transcript");

  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new ApiError(404, 'Interview not found');

  const aiResult = await aiService.summarizeInterview(transcript);

  interview.consentGiven = true;
  interview.transcript = transcript;
  interview.aiSummary = aiResult.summary;
  interview.aiEvaluation = {
    overallRating: aiResult.overallRating,
    strengths: aiResult.strengths,
    concerns: aiResult.concerns,
    recommendation: aiResult.recommendation,
  };
  await interview.save();

  ok(res, interview, 'AI summary generated — HR can review and edit before finalizing');
});

// @desc  HR reviews/edits the AI-generated evaluation before finalizing
// @route PATCH /api/interviews/:id/evaluation
const updateEvaluation = asyncHandler(async (req, res) => {
  const { aiSummary, aiEvaluation, status } = req.body;

  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new ApiError(404, 'Interview not found');

  if (aiSummary !== undefined) interview.aiSummary = aiSummary;
  if (aiEvaluation !== undefined) {
    // Merge field-by-field so HR can edit e.g. just overallRating without
    // wiping out the AI-suggested strengths/concerns/recommendation.
    interview.aiEvaluation = { ...(interview.aiEvaluation?.toObject?.() ?? interview.aiEvaluation ?? {}), ...aiEvaluation };
  }
  if (status) interview.status = status;

  await interview.save();
  ok(res, interview, 'Evaluation updated');
});

// @desc  Video Interview Native — add a live/HR note during or after the interview
// @route POST /api/interviews/:id/notes
const addNote = asyncHandler(async (req, res) => {
  const { note, live } = req.body;
  if (!note) throw new ApiError(400, 'note is required');

  const field = live ? 'liveNotes' : 'hrNotes';
  const interview = await Interview.findByIdAndUpdate(
    req.params.id,
    { $push: { [field]: { note, by: req.user._id, at: new Date() } } },
    { new: true }
  );
  if (!interview) throw new ApiError(404, 'Interview not found');
  ok(res, interview, 'Note added');
});

// @desc  Video Interview Native — attach the recording URL to the candidate's file
// @route PATCH /api/interviews/:id/recording
const attachRecording = asyncHandler(async (req, res) => {
  const recordingUrl = req.file ? `/uploads/recordings/${req.file.filename}` : req.body.videoRecordingUrl;
  if (!recordingUrl) throw new ApiError(400, 'a recording file or videoRecordingUrl is required');

  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new ApiError(404, 'Interview not found');

  // The candidate's consent must cover the recording, not just the AI Scribe transcript step.
  // This route accepts multipart/form-data (multer), where every field arrives as a
  // string — so a literal "false" must NOT be treated as truthy.
  const consentGiven = req.body.consentGiven === true || req.body.consentGiven === 'true';
  if (!interview.consentGiven && !consentGiven) {
    throw new ApiError(400, "consentGiven must be true — the candidate's explicit consent is required to store the interview recording");
  }

  interview.videoRecordingUrl = recordingUrl;
  interview.status = 'completed';
  interview.consentGiven = true;
  await interview.save();

  ok(res, interview, 'Recording attached to candidate file');
});

// @desc  Download an interview recording (manager/hr_admin only, per the router gate above)
// @route GET /api/interviews/:id/recording
const downloadRecording = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new ApiError(404, 'Interview not found');
  if (!interview.videoRecordingUrl) throw new ApiError(404, 'This interview has no recording on file');

  const filePath = resolveUploadPath(interview.videoRecordingUrl);
  const ext = path.extname(filePath);
  res.download(filePath, `interview-recording-${interview._id}${ext}`);
});

module.exports = {
  listInterviews,
  getInterview,
  createInterview,
  cancelInterview,
  downloadRecording,
  runAiScribe,
  updateEvaluation,
  addNote,
  attachRecording,
};
