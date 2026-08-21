const Interview = require('../models/Interview');

/**
 * Smart Scheduling: learns typical durations per interview type from historical
 * completed interviews, and finds the next free slot for the given interviewers.
 */
const DEFAULT_DURATIONS = { phone: 30, technical: 60, video: 45, onsite: 90 };

const learnDurationForType = async (type) => {
  const completed = await Interview.find({ type, status: 'completed' }).select('durationMinutes').limit(50);
  if (!completed.length) return DEFAULT_DURATIONS[type] || 45;
  const avg = completed.reduce((sum, i) => sum + i.durationMinutes, 0) / completed.length;
  return Math.round(avg / 5) * 5; // round to nearest 5 minutes
};

/**
 * Finds the next available slot for a list of interviewer user IDs, starting
 * from `from`, within working hours (09:00-17:00), avoiding overlaps.
 */
const findNextAvailableSlot = async (interviewerIds, durationMinutes, from = new Date()) => {
  const candidate = new Date(from);
  candidate.setMinutes(Math.ceil(candidate.getMinutes() / 15) * 15, 0, 0);

  for (let attempts = 0; attempts < 200; attempts += 1) {
    const hour = candidate.getHours();
    const day = candidate.getDay();
    const isWorkingHours = hour >= 9 && hour + Math.ceil(durationMinutes / 60) <= 17;
    const isWeekday = day >= 0 && day <= 4; // Sun-Thu default; adjust per org calendar

    if (isWorkingHours && isWeekday) {
      const slotEnd = new Date(candidate.getTime() + durationMinutes * 60 * 1000);
      const overlapping = await Interview.findOne({
        interviewers: { $in: interviewerIds },
        status: 'scheduled',
        scheduledAt: { $lt: slotEnd },
        $expr: {
          $gt: [{ $add: ['$scheduledAt', { $multiply: ['$durationMinutes', 60000] }] }, candidate.getTime()],
        },
      });
      if (!overlapping) return candidate;
    }

    candidate.setMinutes(candidate.getMinutes() + 30);
    if (candidate.getHours() >= 17) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(9, 0, 0, 0);
    }
  }
  return null;
};

/**
 * If an interview is cancelled, auto-suggest the next available replacement slot
 * for the same interviewers/duration.
 */
const autoRescheduleAfterCancellation = async (interview) => {
  const nextSlot = await findNextAvailableSlot(interview.interviewers, interview.durationMinutes);
  return nextSlot;
};

module.exports = { learnDurationForType, findNextAvailableSlot, autoRescheduleAfterCancellation, DEFAULT_DURATIONS };
