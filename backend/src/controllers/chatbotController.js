const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok } = require('../utils/apiResponse');
const Employee = require('../models/Employee');
const LeaveBalance = require('../models/LeaveBalance');
const Document = require('../models/Document');
const ChatLog = require('../models/ChatLog');
const User = require('../models/User');
const aiService = require('../services/aiService');
const { createNotification } = require('../services/notificationService');

// @desc  AI HR Companion — answers common HR questions instantly or escalates to HR
// @route POST /api/chatbot/ask
const ask = asyncHandler(async (req, res) => {
  const { question } = req.body;
  if (!question) throw new ApiError(400, 'question is required');

  const employee = await Employee.findOne({ user: req.user._id });

  const context = { employeeName: req.user.name };
  if (employee) {
    const year = new Date().getFullYear();
    const balances = await LeaveBalance.find({ employee: employee._id, year }).populate('leaveType', 'name');
    context.leaveBalances = balances.map((b) => ({
      leaveTypeName: b.leaveType?.name,
      remainingDays: b.totalDays - b.usedDays,
    }));

    const contract = await Document.findOne({ employee: employee._id, type: 'contract' }).sort({ createdAt: -1 });
    if (contract?.expiryDate) context.contractExpiry = contract.expiryDate.toDateString();

    // Payday convention: last business day of the current month
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    context.nextPayday = lastDay.toDateString();
  }

  const result = await aiService.answerHRQuestion(question, context);

  const log = await ChatLog.create({
    user: req.user._id,
    question,
    answer: result.answer,
    intent: result.intent,
    resolvedByAI: !result.escalated,
    escalated: result.escalated,
  });

  if (result.escalated) {
    // Reassure the employee it's being handled...
    await createNotification({
      userId: req.user._id,
      type: 'general',
      title: 'Your question was routed to HR',
      message: `We could not fully answer "${question}" automatically. An HR team member will follow up.`,
    });

    // ...and actually notify HR so someone follows up — see GET /api/chatbot/escalated
    // for the full queue of unresolved questions.
    const hrAdmins = await User.find({ role: 'hr_admin' }).select('_id');
    for (const hrAdmin of hrAdmins) {
      await createNotification({
        userId: hrAdmin._id,
        type: 'general',
        title: 'Unresolved employee question',
        message: `${req.user.name} asked: "${question}" — the AI HR Companion could not answer confidently.`,
        meta: { chatLogId: log._id, employeeUserId: req.user._id },
      });
    }
  }

  ok(res, { answer: result.answer, escalated: result.escalated, chatLogId: log._id });
});

// @desc  Chat history for the logged-in user
// @route GET /api/chatbot/history
const history = asyncHandler(async (req, res) => {
  const logs = await ChatLog.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  ok(res, logs);
});

// @desc  Queue of unresolved/escalated employee questions for HR to follow up on
// @route GET /api/chatbot/escalated
const listEscalated = asyncHandler(async (req, res) => {
  const logs = await ChatLog.find({ escalated: true }).sort({ createdAt: -1 }).limit(100).populate('user', 'name email');
  ok(res, logs);
});

module.exports = { ask, history, listEscalated };
