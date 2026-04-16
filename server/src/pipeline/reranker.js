const CURRENT_YEAR = new Date().getFullYear();

/**
 * Scores a single result against the expanded keywords.
 * Returns a numeric score — higher is more relevant.
 *
 * Scoring signals:
 *  1. Keyword overlap in title + abstract  (0 – 5)
 *  2. Title-specific keyword boost          (0 – 2)
 *  3. Recency (linear decay over 10 yrs)   (0 – 2)
 *  4. Citation count (log-scaled)           (0 – 2)
 *  5. Clinical trial phase bonus            (0 – 2.5)
 *  6. Has substantive abstract bonus        (0 – 0.5)
 *
 * @param {Object} result - Normalised source object
 * @param {string[]} keywords - Expanded keywords from Step 1
 * @returns {number}
 */
function scoreResult(result, keywords) {
  let score = 0;
  const kws = keywords.map((k) => k.toLowerCase());

  const bodyText = `${result.title} ${result.abstract}`.toLowerCase();
  const titleText = result.title.toLowerCase();

  // 1. Keyword overlap (proportion of keywords found anywhere in the text)
  const bodyHits = kws.filter((kw) => bodyText.includes(kw));
  score += (bodyHits.length / Math.max(kws.length, 1)) * 5;

  // 2. Title-specific bonus (keywords in title signal higher relevance)
  const titleHits = kws.filter((kw) => titleText.includes(kw));
  score += Math.min(titleHits.length * 0.5, 2);

  // 3. Recency (0 points for ≥10 years old, 2 points for current year)
  if (result.year) {
    const age = Math.max(0, CURRENT_YEAR - result.year);
    score += Math.max(0, (1 - age / 10)) * 2;
  }

  // 4. Citation count (log-scaled, only for OpenAlex)
  if (result.citationCount > 0) {
    score += Math.min(Math.log10(result.citationCount + 1) * 0.9, 2);
  }

  // 5. Clinical trial phase bonus
  const phase = (result.phase || '').toUpperCase();
  if (phase.includes('PHASE4') || phase.includes('PHASE 4')) score += 2.5;
  else if (phase.includes('PHASE3') || phase.includes('PHASE 3')) score += 2;
  else if (phase.includes('PHASE2') || phase.includes('PHASE 2')) score += 1.5;
  else if (phase.includes('PHASE1') || phase.includes('PHASE 1')) score += 1;

  // 6. Abstract quality bonus
  if (result.abstract && result.abstract.length > 150) score += 0.5;

  return score;
}

/**
 * Combines all fetched results, scores them, deduplicates by title, and
 * returns the top-N most relevant sources.
 *
 * @param {Object[]} results - Combined array from all three fetchers
 * @param {string[]} keywords - From queryExpander
 * @param {number} [topN=8] - How many results to return
 * @returns {Object[]} Top-N scored results (score field stripped)
 */
export function rerank(results, keywords, topN = 8) {
  // Deduplicate by lowercase title
  const seen = new Set();
  const unique = results.filter((r) => {
    const key = r.title.toLowerCase().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const scored = unique.map((r) => ({
    ...r,
    _score: scoreResult(r, keywords),
  }));

  scored.sort((a, b) => b._score - a._score);

  return scored
    .slice(0, topN)
    .map(({ _score, ...rest }) => rest); // strip internal score before returning
}
