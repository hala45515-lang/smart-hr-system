const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, created } = require('../utils/apiResponse');
const Interview = require('../models/Interview');
const Candidate = require('../models/Candidate');
const aiService = require('../services/aiService');
const schedulingService = require('../services/schedulingService');
const { createNotification } = require('../services/notificationService');

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
  const { candidate, job, interviewers, type, scheduledAt, durationMinutes } = req.body;
  if (!candidate || !job || !interviewers?.length) {
    throw new ApiError(400, 'candidate, job and interviewers are required');
  }

  const duration = durationMinutes || (await schedulingService.learnDurationForType(type || 'phone'));
  const startAt = scheduledAt ? new Date(scheduledAt) : await schedulingService.findNextAvailableSlot(interviewers, duration);
  if (!startAt) throw new ApiError(409, 'No available slot found for the selected interviewers');

  const interview = await Interview.create({
    candidate,
    job,
    interviewers,
    type: type || 'phone',
    scheduledAt: startAt,
    durationMinutes: duration,
  });

  await Candidate.findByIdAndUpdate(candidate, { stage: 'interview' });

  for (const interviewerId of interviewers) {
    await createNotification({
      userId: interviewerId,
      type: 'interview_scheduled',
      title: 'New interview scheduled',
      message: `You have a ${interview.type} interview scheduled on ${startAt.toLocaleString()}.`,
      meta: { interviewId: interview._id },
    });
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
  const updates = {};
  if (aiSummary !== undefined) updates.aiSummary = aiSummary;
  if (aiEvaluation !== undefined) updates.aiEvaluation = aiEvaluation;
  if (status) updates.status = status;

  const interview = await Interview.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!interview) throw new ApiError(404, 'Interview not found');
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

  const interview = await Interview.findByIdAndUpdate(
    req.params.id,
    { videoRecordingUrl: recordingUrl, status: 'completed' },
    { new: true }
  );
  if (!interview) throw new ApiError(404, 'Interview not found');
  ok(res, interview, 'Recording attached to candidate file');
});

module.exports = {
  listInterviews,
  getInterview,
  createInterview,
  cancelInterview,
  runAiScribe,
  updateEvaluation,
  addNote,
  attachRecording,
};
