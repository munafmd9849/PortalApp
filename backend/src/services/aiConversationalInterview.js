import { Mistral } from '@mistralai/mistralai';
import { generateInterviewAcknowledgement } from './aiMockInterviewAcknowledgement.js';

const MODEL = process.env.MISTRAL_MODEL || 'mistral-large-latest';

const OPENING_FALLBACKS = [
  'Tell me about yourself and what motivated you to pursue your current field of study.',
  'Walk me through a project or experience you are most proud of and your role in it.',
  'What are your career goals for the next few years, and how are you preparing for them?',
];

function pickFallbackOpening(topic) {
  if (topic?.trim()) {
    return `Let's begin our conversation on ${topic.trim()}. In your own words, introduce yourself and share what draws you to this area.`;
  }
  return OPENING_FALLBACKS[Math.floor(Math.random() * OPENING_FALLBACKS.length)];
}

async function callMistralJSON(systemPrompt, userPrompt) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;
  const client = new Mistral({ apiKey, timeoutMs: 45000 });
  const response = await client.chat.complete({
    model: MODEL,
    temperature: 0.45,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  const raw = response.choices[0].message.content;
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

function buildHistoryBlock(questions, answers) {
  const byQ = new Map(answers.map((a) => [a.questionId, a]));
  const lines = [];
  for (const q of questions) {
    const a = byQ.get(q.id);
    if (!a?.submittedAt) continue;
    lines.push(`Interviewer: ${q.questionText}`);
    lines.push(`Candidate: [video answer, ${a.durationSeconds || 0}s]`);
    if (a.acknowledgementText) lines.push(`Interviewer (brief): ${a.acknowledgementText}`);
  }
  return lines.join('\n');
}

/**
 * Opening question for a conversational interview.
 */
export async function generateConversationalOpening({
  topic,
  interviewType,
  instructions,
}) {
  try {
    const json = await callMistralJSON(
      `You are a professional interviewer starting a conversational mock interview. Return JSON only: {"question":"..."}.
Rules:
- One natural opening question, 1-2 sentences, under 35 words
- Professional, warm, not overly casual
- Do not reveal scoring criteria`,
      `Topic focus: ${topic || 'general placement readiness'}
Interview type: ${interviewType || 'GENERAL'}
${instructions ? `Admin instructions: ${instructions}` : ''}
Generate the first question only.`
    );
    const q = String(json?.question || '').trim();
    if (q && q.split(/\s+/).length <= 45) return q;
  } catch (e) {
    console.warn('[conversational] opening fallback:', e?.message);
  }
  return pickFallbackOpening(topic);
}

/**
 * Next follow-up question based on conversation history.
 */
export async function generateConversationalFollowUp({
  topic,
  interviewType,
  instructions,
  questions,
  answers,
  turnIndex,
  maxTurns,
}) {
  const history = buildHistoryBlock(questions, answers);
  const isLast = turnIndex + 1 >= maxTurns;

  if (isLast) {
    return {
      question: null,
      isComplete: true,
      acknowledgement: 'Thank you for sharing your thoughts throughout this conversation.',
      transition: 'That concludes our interview. Thank you for your time today.',
    };
  }

  try {
    const json = await callMistralJSON(
      `You are a professional interviewer in a live conversational interview. Return JSON only: {"question":"..."}.
Rules:
- Ask ONE follow-up question based on the conversation so far
- 1-2 sentences, under 40 words
- Probe deeper, clarify, or explore related skills — do not repeat earlier questions
- Stay professional; never give scores or coaching`,
      `Topic: ${topic || 'placement readiness'}
Type: ${interviewType || 'GENERAL'}
Turn ${turnIndex + 1} of ${maxTurns}
${instructions ? `Notes: ${instructions}` : ''}

Conversation so far:
${history || '(opening turn)'}

Generate the next question only.`
    );
    const q = String(json?.question || '').trim();
    if (q && q.split(/\s+/).length <= 50) {
      const ackData = await generateInterviewAcknowledgement({
        questionText: questions[turnIndex]?.questionText || q,
        interviewType,
        durationSeconds: answers.find((a) => a.questionId === questions[turnIndex]?.id)?.durationSeconds,
        questionIndex: turnIndex,
        totalQuestions: maxTurns,
      });
      return {
        question: q,
        isComplete: false,
        acknowledgement: ackData.acknowledgement,
        transition: ackData.transition,
      };
    }
  } catch (e) {
    console.warn('[conversational] follow-up fallback:', e?.message);
  }

  const fallbacks = [
    'Could you elaborate on a specific challenge you faced in that context?',
    'What did you learn from that experience that you would apply again?',
    'How would you approach a similar situation differently next time?',
  ];
  const ackData = await generateInterviewAcknowledgement({
    questionText: questions[turnIndex]?.questionText || 'your last answer',
    interviewType,
    questionIndex: turnIndex,
    totalQuestions: maxTurns,
  });
  return {
    question: fallbacks[turnIndex % fallbacks.length],
    isComplete: false,
    acknowledgement: ackData.acknowledgement,
    transition: ackData.transition,
  };
}
