import { Mistral } from '@mistralai/mistralai';

const MODEL = process.env.MISTRAL_MODEL || 'mistral-large-latest';

const FALLBACK = {
  generic: [
    'Thank you for your response.',
    'I appreciate your explanation.',
    'Thank you for sharing that with me.',
  ],
  project: [
    'That sounds like an interesting project.',
    'Your explanation demonstrates practical experience.',
    "It's good to hear about your hands-on involvement.",
  ],
  technical: [
    'I understand your approach.',
    "That's a reasonable technical explanation.",
    'Thank you for explaining the implementation details.',
  ],
  behavioral: [
    'Thank you for sharing that experience.',
    'That provides useful insight into your approach.',
    'I appreciate your perspective on that.',
  ],
};

function pickCategory(questionText, notes, interviewType) {
  const t = `${questionText || ''} ${notes || ''} ${interviewType || ''}`.toLowerCase();
  if (/project|build|developed|internship|final year|capstone/.test(t)) return 'project';
  if (/technical|code|algorithm|system|implement|dsa|database|api/.test(t)) return 'technical';
  if (/team|leadership|challenge|conflict|situation|behavior|star/.test(t)) return 'behavioral';
  return 'generic';
}

function pickFallback(category) {
  const list = FALLBACK[category] || FALLBACK.generic;
  return list[Math.floor(Math.random() * list.length)];
}

function buildTransition(questionIndex, totalQuestions) {
  if (questionIndex + 1 >= totalQuestions) {
    return 'Thank you. That completes the questions for this interview.';
  }
  const variants = [
    "Let's move on to the next question.",
    "Let's continue to the next question.",
    'Let us proceed to the next question.',
  ];
  return variants[questionIndex % variants.length];
}

async function callMistralAck(systemPrompt, userPrompt) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;
  const client = new Mistral({ apiKey, timeoutMs: 30000 });
  const response = await client.chat.complete({
    model: MODEL,
    temperature: 0.4,
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

/**
 * Short neutral acknowledgement after a recorded answer (15–40 words).
 * Does not score, coach, or reveal evaluation criteria.
 */
export async function generateInterviewAcknowledgement({
  questionText,
  notes,
  interviewType,
  durationSeconds,
  questionIndex,
  totalQuestions,
  transcriptText,
}) {
  const transition = buildTransition(questionIndex, totalQuestions);
  const category = pickCategory(questionText, notes, interviewType);
  const spoken = transcriptText?.trim();
  const noSpeech = !spoken || spoken.length < 3;

  try {
    const json = await callMistralAck(
      `You are a neutral professional interviewer. Return strict JSON only: {"acknowledgement":"..."}.
Rules:
- 1-2 sentences, 15-40 words maximum
- Professional, natural, human-like
- Context-aware to the question topic (${category})
- Reference specific points the candidate mentioned when transcript is substantive
- If transcript is empty, nonsense, or off-topic filler only, acknowledge briefly without praising content (e.g. note you'd like more detail)
- NEVER give scores, evaluation criteria, correct answers, coaching, or strengths/weaknesses
- Do not ask a new question`,
      `Interview type: ${interviewType || 'GENERAL'}
Question asked: ${questionText}
${notes ? `Interviewer notes: ${notes}` : ''}
Student answer transcript: ${spoken || '(no clear speech detected)'}
Recording duration: approximately ${durationSeconds || 0} seconds.
${noSpeech ? 'The candidate did not provide a clear verbal answer.' : ''}
Generate a brief acknowledgement only.`
    );

    const ack = String(json?.acknowledgement || '').trim();
    if (ack && ack.split(/\s+/).length <= 45) {
      return { acknowledgement: ack, transition, category };
    }
  } catch (e) {
    console.warn('[ai-ack] Mistral fallback:', e?.message);
  }

  return {
    acknowledgement: pickFallback(category),
    transition,
    category,
  };
}
