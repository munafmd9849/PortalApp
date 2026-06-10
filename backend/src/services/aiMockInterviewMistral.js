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

/**
 * Comprehensive post-interview report (reviewer-assist; video not transcribed).
 */
export async function generateAiInterviewInsights({
  interviewTitle,
  interviewType,
  questions,
  answers,
  violationsCount,
}) {
  const qaBlock = questions
    .map((q, i) => {
      const a = answers.find((x) => x.questionId === q.id);
      return `Q${i + 1}: ${q.questionText}
Submitted: ${a?.submittedAt ? 'Yes (video)' : 'No'}
Duration: ${a?.durationSeconds ?? 0}s
Acknowledgement given: ${a?.acknowledgementText ? 'Yes' : 'No'}`;
    })
    .join('\n\n');

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
Evaluate fluency, pace, structure, professionalism, technical depth, and behavioral signals as inferable from completion pattern and timing. Be fair and constructive.`;

  const user = `Interview: ${interviewTitle}
Type: ${interviewType}
Proctoring violations: ${violationsCount}

${qaBlock}

Note: Answers are video recordings without transcripts — infer readiness from structure, timing, and interview type. State assumptions briefly in improvements if needed.`;

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
