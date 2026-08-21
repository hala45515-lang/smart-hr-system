/**
 * AI service used by: AI HR Companion (chatbot), AI Scribe (interview summaries),
 * Employer Branding Kit (post suggestions), and development tip generation.
 *
 * If GEMINI_API_KEY is set, real calls are made to Google Gemini (free tier).
 * Otherwise every function falls back to deterministic, rule-based logic so
 * the API keeps working out of the box without any external dependency.
 */

const isAiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

const askAI = async (systemPrompt, userPrompt) => {
  if (!isAiEnabled()) return null;
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 800 },
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`${res.status} ${errBody}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) {
    console.error('[aiService] Gemini request failed, falling back:', err.message);
    return null;
  }
};

/**
 * AI HR Companion — answers common HR questions instantly, or flags for escalation.
 * context: { leaveBalances, nextPayday, employeeName }
 */
const answerHRQuestion = async (question, context = {}) => {
  const q = question.toLowerCase();

  // Rule-based fast paths for the most common, structured questions
  if (/(رصيد|كم يوم|leave balance|إجاز)/i.test(question)) {
    if (context.leaveBalances?.length) {
      const summary = context.leaveBalances
        .map((b) => `${b.leaveTypeName}: ${b.remainingDays} day(s) remaining`)
        .join(', ');
      return { answer: `Here is your current leave balance — ${summary}.`, intent: 'leave_balance', escalated: false };
    }
    return { answer: 'I could not find your leave balance yet. I will route this to HR for you.', intent: 'leave_balance', escalated: true };
  }

  if (/(راتب|salary|payday|صرف)/i.test(question)) {
    if (context.nextPayday) {
      return { answer: `Your next payday is ${context.nextPayday}.`, intent: 'payday', escalated: false };
    }
    return { answer: 'Payroll dates are usually the last business day of the month. Routing to HR to confirm.', intent: 'payday', escalated: true };
  }

  if (/(contract|عقد|expire|ينتهي)/i.test(question)) {
    if (context.contractExpiry) {
      return { answer: `Your current contract is on file and expires on ${context.contractExpiry}.`, intent: 'contract', escalated: false };
    }
    return { answer: 'I could not find your contract details. Routing this to HR.', intent: 'contract', escalated: true };
  }

  // Try the real model for open-ended questions
  const aiAnswer = await askAI(
    'You are the AI HR Companion inside a Smart HR System. Answer employee HR questions briefly and factually using the provided context. If you cannot answer confidently, say you will route the question to HR.',
    `Employee context: ${JSON.stringify(context)}\n\nQuestion: ${question}`
  );
  if (aiAnswer) {
    return { answer: aiAnswer, intent: 'general', escalated: /route|hr team|contact hr/i.test(aiAnswer) };
  }

  return {
    answer: "I'm not fully sure about that one — I'll route it to an HR team member who can help.",
    intent: 'unknown',
    escalated: true,
  };
};

/**
 * AI Scribe — summarizes an interview transcript into a structured evaluation.
 */
const summarizeInterview = async (transcript) => {
  const aiResult = await askAI(
    'You are an HR interview scribe. Given an interview transcript, produce a concise JSON object with keys: summary (string), strengths (string array), concerns (string array), overallRating (1-5 integer), recommendation (one of strong_yes, yes, neutral, no, strong_no). Respond with JSON only.',
    transcript
  );
  if (aiResult) {
    try {
      const parsed = JSON.parse(aiResult.replace(/```json|```/g, '').trim());
      return parsed;
    } catch (err) {
      return { summary: aiResult, strengths: [], concerns: [], overallRating: 3, recommendation: 'neutral' };
    }
  }

  // Rule-based fallback: naive keyword scan
  const positive = (transcript.match(/(strong|excellent|great|impressive|confident)/gi) || []).length;
  const negative = (transcript.match(/(weak|struggled|unclear|hesitant|lacked)/gi) || []).length;
  const rating = Math.max(1, Math.min(5, 3 + Math.sign(positive - negative)));
  return {
    summary: `Auto-generated summary based on transcript keyword analysis (${transcript.length} characters reviewed).`,
    strengths: positive > 0 ? ['Communicated confidently in parts of the interview'] : [],
    concerns: negative > 0 ? ['Some hesitation or gaps noted during the interview'] : [],
    overallRating: rating,
    recommendation: rating >= 4 ? 'yes' : rating === 3 ? 'neutral' : 'no',
  };
};

/**
 * Employer Branding Kit — suggests social posts using company stats.
 */
const suggestBrandingPosts = async (stats) => {
  const aiResult = await askAI(
    'You are a recruitment marketing assistant. Given company HR statistics, write 3 short, upbeat social media post drafts to attract candidates. Return them as a JSON array of strings only.',
    JSON.stringify(stats)
  );
  if (aiResult) {
    try {
      return JSON.parse(aiResult.replace(/```json|```/g, '').trim());
    } catch (err) {
      return [aiResult];
    }
  }

  return [
    `Our team stays with us! Average tenure is ${stats.averageTenureYears?.toFixed(1) || 'N/A'} years — come build a career, not just a job.`,
    `${stats.employeeSatisfactionScore || 'High'}% average performance across our teams. We invest in growth. Join us!`,
    `We're hiring across ${stats.openPositions || 'several'} roles right now. Come see why our people stay.`,
  ];
};

/**
 * Development tips based on an employee's profile snapshot.
 */
const generateDevelopmentTips = async (profileSnapshot) => {
  const aiResult = await askAI(
    'You are a career development coach for an HR system. Given an employee profile summary, suggest 3 short, actionable development tips. Return a JSON array of strings only.',
    JSON.stringify(profileSnapshot)
  );
  if (aiResult) {
    try {
      return JSON.parse(aiResult.replace(/```json|```/g, '').trim());
    } catch (err) {
      return [aiResult];
    }
  }

  const tips = [];
  if (!profileSnapshot.skills?.length) tips.push('Add at least one new skill to your profile this quarter.');
  if (!profileSnapshot.courses?.length) tips.push('Enroll in a course relevant to your next career level.');
  if ((profileSnapshot.performanceScore ?? 100) < 70) tips.push('Schedule a 1:1 with your manager to discuss performance goals.');
  if (tips.length === 0) tips.push('Keep up the strong momentum — consider mentoring a junior teammate.');
  return tips;
};

module.exports = {
  isAiEnabled,
  answerHRQuestion,
  summarizeInterview,
  suggestBrandingPosts,
  generateDevelopmentTips,
};
