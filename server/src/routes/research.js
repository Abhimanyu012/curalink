import { Router } from 'express';
import mongoose from 'mongoose';
import { expandQuery } from '../pipeline/queryExpander.js';
import { fetchClinicalTrials } from '../pipeline/fetchers/clinicalTrials.js';
import { fetchPubMed } from '../pipeline/fetchers/pubmed.js';
import { fetchOpenAlex } from '../pipeline/fetchers/openAlex.js';
import { rerank } from '../pipeline/reranker.js';
import { generateResponse } from '../pipeline/generator.js';
import { Conversation } from '../models/Conversation.js';

const router = Router();

/**
 * Helper to write an SSE event to the response.
 */
function sendEvent(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * POST /api/research
 *
 * Body: {
 *   patientName: string,
 *   disease: string,       ← required
 *   query: string,         ← required
 *   location?: string,
 *   history?: { role, content }[],
 *   sessionId?: string,
 * }
 *
 * Responds as Server-Sent Events (text/event-stream).
 * Event types: progress | result | error | done
 */
router.post('/', async (req, res) => {
  const {
    patientName,
    disease,
    query,
    location,
    history = [],
    sessionId,
  } = req.body;

  if (!disease?.trim() || !query?.trim()) {
    return res
      .status(400)
      .json({ error: '`disease` and `query` are required fields.' });
  }

  // ── Set up SSE ─────────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  const progress = (data) => sendEvent(res, 'progress', data);

  try {
    // ── Step 1: Query Expansion ──────────────────────────────────────────────
    progress({ step: 'expanding', message: '🔍 Expanding your medical query...' });

    const { expandedQuery, keywords } = await expandQuery({
      disease,
      query,
      location,
    });

    progress({
      step: 'expanded',
      message: `✅ Query expanded (${keywords.length} keywords identified)`,
      expandedQuery,
      keywords,
    });

    // ── Step 2: Parallel Broad Retrieval ─────────────────────────────────────
    progress({
      step: 'fetching',
      message: '📡 Retrieving from ClinicalTrials.gov, PubMed & OpenAlex...',
    });

    const [clinicalResults, pubmedResults, openAlexResults] = await Promise.all([
      fetchClinicalTrials({ disease, expandedQuery }),
      fetchPubMed({ expandedQuery }),
      fetchOpenAlex({ expandedQuery }),
    ]);

    const totalFetched =
      clinicalResults.length + pubmedResults.length + openAlexResults.length;

    progress({
      step: 'fetched',
      message: `✅ Retrieved ${totalFetched} sources — ${clinicalResults.length} trials · ${pubmedResults.length} PubMed · ${openAlexResults.length} OpenAlex`,
      counts: {
        clinicalTrials: clinicalResults.length,
        pubmed: pubmedResults.length,
        openAlex: openAlexResults.length,
      },
    });

    // ── Step 3: Re-Ranking ───────────────────────────────────────────────────
    progress({ step: 'ranking', message: '⚖️  Re-ranking results for relevance...' });

    const allResults = [...clinicalResults, ...pubmedResults, ...openAlexResults];
    const topSources = rerank(allResults, keywords, 8);

    progress({
      step: 'ranked',
      message: `✅ Selected top ${topSources.length} sources for analysis`,
    });

    // ── Step 4: LLM Generation ───────────────────────────────────────────────
    const patientContext = {
      patientName: patientName || 'Patient',
      disease,
      query,
      location,
      history,
    };

    const result = await generateResponse({
      patientContext,
      topSources,
      onProgress: progress,
    });

    // ── Persist to MongoDB (best-effort) ─────────────────────────────────────
    if (mongoose.connection.readyState === 1) {
      const sid = sessionId || new mongoose.Types.ObjectId().toString();
      try {
        await Conversation.findOneAndUpdate(
          { sessionId: sid },
          {
            $set: { patientContext: { patientName, disease, location } },
            $push: {
              messages: {
                $each: [
                  { role: 'user', content: query },
                  {
                    role: 'assistant',
                    content: JSON.stringify(result).slice(0, 4000),
                  },
                ],
              },
            },
          },
          { upsert: true, new: true }
        );
      } catch (dbErr) {
        console.warn('[DB] Conversation save failed (non-fatal):', dbErr.message);
      }
    }

    // ── Emit final result ─────────────────────────────────────────────────────
    sendEvent(res, 'result', {
      success: true,
      data: result,
      topSources,
      expandedQuery,
      keywords,
    });

    sendEvent(res, 'done', { message: 'Pipeline complete' });
    res.end();
  } catch (err) {
    console.error('[Research Route] Pipeline error:', err.message);
    sendEvent(res, 'error', {
      error: err.message || 'An unexpected error occurred in the pipeline.',
    });
    res.end();
  }
});

export default router;
