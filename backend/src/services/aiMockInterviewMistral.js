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

/**
 * Generate reviewer-assist insights from Q&A transcript (no video analysis).
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
      return `Q${i + 1}: ${q.questionText}\nAnswer submitted: ${a?.submittedAt ? 'Yes (video recorded)' : 'No'}\nDuration: ${a?.durationSeconds ?? 0}s`;
    })
    .join('\n\n');

  const system = `You are a placement interview coach. Return strict JSON only.
Schema:
{
  "communicationScore": number 0-100,
  "confidenceScore": number 0-100,
  "clarityScore": number 0-100,
  "technicalUnderstanding": number 0-100,
  "overallPerformance": number 0-100,
  "strengths": string[],
  "improvements": string[],
  "recommendedFocus": string[]
}
Scores are indicative for human reviewers — be fair and constructive.`;

  const user = `Interview: ${interviewTitle}
Type: ${interviewType}
Proctoring violations logged: ${violationsCount}

Questions and submission status:
${qaBlock}

Based on interview type and completion pattern, suggest scores and feedback areas. Note: actual answers are video recordings not transcribed here — infer readiness from structure and timing only, and state assumptions briefly in improvements if needed.`;

  const json = await callMistralJSON(system, user);
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

  return {
    communicationScore: clamp(json.communicationScore),
    confidenceScore: clamp(json.confidenceScore),
    clarityScore: clamp(json.clarityScore),
    technicalUnderstanding: clamp(json.technicalUnderstanding),
    overallPerformance: clamp(json.overallPerformance),
    strengths: Array.isArray(json.strengths) ? json.strengths.join('\n') : String(json.strengths || ''),
    improvements: Array.isArray(json.improvements) ? json.improvements.join('\n') : String(json.improvements || ''),
    recommendedFocus: Array.isArray(json.recommendedFocus) ? json.recommendedFocus.join('\n') : String(json.recommendedFocus || ''),
    rawJson: JSON.stringify(json),
  };
}
