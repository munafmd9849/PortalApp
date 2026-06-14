import { Mistral } from '@mistralai/mistralai';

const MODEL = process.env.MISTRAL_MODEL || 'mistral-large-latest';

function getClient() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY is not configured');
  return new Mistral({ apiKey, timeoutMs: 120000 });
}

async function callMistralJSON(systemPrompt, userPrompt) {
  const client = getClient();
  const response = await client.chat.complete({
    model: MODEL,
    temperature: 0.35,
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
    if (match) return JSON.parse(match[0]);
    throw new Error('Mistral did not return valid JSON');
  }
}

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

function isWeakTranscript(text) {
  if (!text?.trim()) return true;
  const t = text.trim().toLowerCase();
  if (t.length < 8) return true;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 3) return true;
  const unique = new Set(words);
  if (unique.size <= 2 && words.length >= 3) return true;
  if (/^(bla|blah|um+|uh+|test|hello|hi|ok|okay|yes|no)[\s.!]*$/i.test(t)) return true;
  return false;
}

function formatAnswerBlock(q, a, index) {
  const transcript = a?.transcriptText?.trim();
  const weak = isWeakTranscript(transcript);
  return `Q${index + 1}: ${q.questionText}
Submitted: ${a?.submittedAt ? 'Yes' : 'No'}
Duration: ${a?.durationSeconds ?? 0}s
Transcript status: ${a?.transcriptStatus || (transcript ? 'COMPLETED' : 'missing')}
Transcript: ${transcript || '(no speech detected)'}
Answer quality flag: ${weak ? 'WEAK_OR_EMPTY — score this answer low' : 'SUBSTANTIVE'}
Acknowledgement given: ${a?.acknowledgementText ? 'Yes' : 'No'}`;
}

/**
 * Content-based post-interview report from answer transcripts.
 */
export async function generateAiInterviewInsights({
  interviewTitle,
  interviewType,
  sessionMode,
  questions,
  answers,
  violationsCount,
}) {
  const qaBlock = questions.map((q, i) => formatAnswerBlock(q, answers.find((x) => x.questionId === q.id), i)).join('\n\n');

  const weakCount = questions.filter((q) => {
    const a = answers.find((x) => x.questionId === q.id);
    return isWeakTranscript(a?.transcriptText);
  }).length;

  const system = `You are a placement interview analyst. Return strict JSON only.
Schema:
{
  "communicationScore": number 0-100,
  "confidenceScore": number 0-100,
  "clarityScore": number 0-100,
  "professionalismScore": number 0-100,
  "technicalDepthScore": number 0-100,
  "technicalUnderstanding": number 0-100,
  "behavioralScore": number 0-100,
  "overallPerformance": number 0-100,
  "strengths": string[],
  "improvements": string[],
  "recommendedFocus": string[],
  "improvementPlan": string[],
  "interviewSummary": string
}
Score based on what the candidate actually said in transcripts — content, structure, relevance, and depth.
Penalize heavily for empty, nonsense, or off-topic answers. Be fair and constructive.`;

  const user = `Interview: ${interviewTitle}
Type: ${interviewType}
Mode: ${sessionMode || 'GUIDED'}
Proctoring violations: ${violationsCount}
Weak or empty answers: ${weakCount} of ${questions.length}

${qaBlock}

Evaluate fluency, relevance, structure, professionalism, technical depth, and behavioral signals from transcript content.`;

  const json = await callMistralJSON(system, user);

  const strengths = Array.isArray(json.strengths) ? json.strengths : [];
  const improvements = Array.isArray(json.improvements) ? json.improvements : [];
  const recommendedFocus = Array.isArray(json.recommendedFocus) ? json.recommendedFocus : [];
  const improvementPlan = Array.isArray(json.improvementPlan) ? json.improvementPlan : recommendedFocus;

  return {
    communicationScore: clamp(json.communicationScore),
    confidenceScore: clamp(json.confidenceScore),
    clarityScore: clamp(json.clarityScore),
    professionalismScore: clamp(json.professionalismScore),
    technicalDepthScore: clamp(json.technicalDepthScore ?? json.technicalUnderstanding),
    technicalUnderstanding: clamp(json.technicalUnderstanding ?? json.technicalDepthScore),
    behavioralScore: clamp(json.behavioralScore),
    overallPerformance: clamp(json.overallPerformance),
    strengths: strengths.join('\n'),
    improvements: improvements.join('\n'),
    recommendedFocus: recommendedFocus.join('\n'),
    improvementPlan: improvementPlan.map((s, i) => `${i + 1}. ${s}`).join('\n'),
    interviewSummary: String(json.interviewSummary || '').trim(),
    rawJson: JSON.stringify(json),
  };
}
