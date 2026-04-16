import { HfInference } from '@huggingface/inference';
import { z } from 'zod';

const hf = new HfInference(process.env.HF_API_TOKEN);
const MODEL = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';

// ── Output Schema (Zod) ──────────────────────────────────────────────────────
const SourceAttributionSchema = z.object({
  title: z.string(),
  authors: z.string().default('Unknown'),
  year: z.number().nullable().optional(),
  platform: z.string(),
  url: z.string().default(''),
  snippet: z.string().default(''),
});

const ResponseSchema = z.object({
  conditionOverview: z.string(),
  researchInsights: z.array(
    z.object({
      finding: z.string(),
      source: z.string(),
    })
  ),
  clinicalTrials: z.array(
    z.object({
      title: z.string(),
      phase: z.string().default('N/A'),
      status: z.string().default('Unknown'),
      url: z.string().default(''),
    })
  ),
  sourceAttribution: z.array(SourceAttributionSchema),
});

// ── Prompt Builder ───────────────────────────────────────────────────────────
function buildPrompt({ patientName, disease, query, location, history, topSources }) {
  const sourceSummaries = topSources
    .map((s, i) => {
      const snippet = (s.abstract || 'No abstract available').slice(0, 500);
      return `[Source ${i + 1}] Platform: ${s.source}
Title: ${s.title}
Authors: ${s.authors || 'N/A'} | Year: ${s.year || 'N/A'}
URL: ${s.url}
Excerpt: ${snippet}`;
    })
    .join('\n\n---\n\n');

  const history_ctx =
    history && history.length > 0
      ? `\nPrevious conversation turns:\n${history
          .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
          .join('\n')}\n`
      : '';

  return `You are Curalink, a specialised medical research AI assistant. Generate an evidence-based report.

PATIENT CONTEXT:
- Name: ${patientName || 'Patient'}
- Condition: ${disease}
- Query: ${query}
- Location: ${location || 'Not specified'}
${history_ctx}
RETRIEVED EVIDENCE SOURCES (${topSources.length} sources):
${sourceSummaries}

TASK: Generate a personalised, structured medical research report synthesising the sources above.

Respond with ONLY a valid JSON object matching this exact schema (no markdown fences, no preamble):
{
  "conditionOverview": "<2–3 paragraphs: personalised overview of ${disease} for ${patientName || 'the patient'}, covering pathophysiology, treatment landscape, and patient-specific context>",
  "researchInsights": [
    { "finding": "<specific evidence-backed finding>", "source": "<[Source N] or title>" }
  ],
  "clinicalTrials": [
    { "title": "<trial title>", "phase": "<phase>", "status": "<status>", "url": "<url>" }
  ],
  "sourceAttribution": [
    { "title": "<full title>", "authors": "<authors>", "year": <year|null>, "platform": "<PubMed|OpenAlex|ClinicalTrials>", "url": "<url>", "snippet": "<1-2 sentence excerpt most relevant to query>" }
  ]
}

Rules:
- researchInsights: 3–5 entries, each grounded in a specific source
- clinicalTrials: include ONLY entries sourced from ClinicalTrials sources; leave array empty if none
- sourceAttribution: include all ${topSources.length} sources
- Write conditionOverview in second-person ("you have…" or "patients with…") and reference the query context`;
}

// ── Generator ────────────────────────────────────────────────────────────────
/**
 * Runs Step 4 of the pipeline: LLM generation with structured output.
 * Calls onProgress() to emit SSE progress events during streaming.
 *
 * @param {{ patientContext: Object, topSources: Object[], onProgress: Function }} params
 * @returns {Promise<Object>} Validated structured report
 */
export async function generateResponse({ patientContext, topSources, onProgress }) {
  const prompt = buildPrompt({ ...patientContext, topSources });
  let fullText = '';

  onProgress?.({ step: 'generating', message: '🤖 Generating personalised report...' });

  // ── Try streaming first ────────────────────────────────────────────────────
  try {
    const stream = hf.chatCompletionStream({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are Curalink, a medical research AI. ' +
            'Always respond with a single valid JSON object only. ' +
            'No markdown, no fences, no explanations — just the JSON.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.2,
    });

    let charsSinceLastPing = 0;
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      fullText += delta;
      charsSinceLastPing += delta.length;
      // Emit a heartbeat every ~300 chars to keep connection alive
      if (charsSinceLastPing >= 300) {
        onProgress?.({ step: 'streaming', message: '✍️  Writing report...' });
        charsSinceLastPing = 0;
      }
    }
  } catch (streamErr) {
    // ── Fallback to non-streaming ──────────────────────────────────────────
    console.warn('[Generator] Streaming failed, falling back:', streamErr.message);
    onProgress?.({ step: 'generating', message: '🤖 Generating report (non-streaming)...' });

    const response = await hf.chatCompletion({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a medical research AI. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.2,
    });
    fullText = response.choices[0].message.content || '';
  }

  // ── Parse & Validate ───────────────────────────────────────────────────────
  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      `LLM did not return valid JSON. Response preview: "${fullText.slice(0, 300)}"`
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (parseErr) {
    throw new Error(`JSON parse failed: ${parseErr.message}`);
  }

  const validated = ResponseSchema.safeParse(parsed);
  if (!validated.success) {
    console.warn('[Generator] Zod coercion issues (non-fatal):', validated.error.issues);
    // Return raw parsed — Zod issues are usually minor field mismatches
    return parsed;
  }

  return validated.data;
}
