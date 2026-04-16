import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_API_TOKEN);
const MODEL = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';

/**
 * Expands the user's disease + query into richer search terms using the HF LLM.
 *
 * @param {{ disease: string, query: string, location?: string }} params
 * @returns {Promise<{ expandedQuery: string, keywords: string[] }>}
 */
export async function expandQuery({ disease, query, location }) {
  const systemPrompt =
    'You are a medical research assistant specializing in clinical literature search. ' +
    'Expand user queries into comprehensive medical search strings. ' +
    'Respond with ONLY a valid JSON object — no markdown, no explanation.';

  const userPrompt = `Disease: ${disease}
Original query: ${query}
Patient location: ${location || 'Not specified'}

Expand this into a rich, comprehensive medical search query by adding synonyms, related terms, drug classes, and relevant clinical context.

Return ONLY this JSON (no other text):
{
  "expandedQuery": "comprehensive search string with synonyms and related medical terms",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"]
}`;

  try {
    const response = await hf.chatCompletion({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 512,
      temperature: 0.3,
    });

    const text = response.choices[0].message.content.trim();

    // Robustly extract JSON from the response (handles markdown fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in LLM response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      expandedQuery: parsed.expandedQuery || `${disease} ${query}`,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    };
  } catch (err) {
    console.error('[QueryExpander] Error:', err.message, '— using basic fallback');
    // Fallback: construct minimal expansion without LLM
    return {
      expandedQuery: `${disease} ${query} treatment clinical trial research`,
      keywords: [
        disease,
        ...query.split(/\s+/).filter((w) => w.length > 3),
        'treatment',
        'therapy',
      ].slice(0, 8),
    };
  }
}
