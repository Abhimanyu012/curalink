import axios from 'axios';

const BASE_URL = 'https://api.openalex.org/works';

/**
 * Reconstructs plain text from OpenAlex's inverted-index abstract format.
 * @param {Record<string, number[]> | null} invertedIndex
 */
function reconstructAbstract(invertedIndex) {
  if (!invertedIndex) return '';
  const positions = [];
  for (const [word, locs] of Object.entries(invertedIndex)) {
    for (const pos of locs) {
      positions.push({ pos, word });
    }
  }
  positions.sort((a, b) => a.pos - b.pos);
  return positions.map((p) => p.word).join(' ');
}

/**
 * Fetches published works from OpenAlex.
 *
 * @param {{ expandedQuery: string }} params
 * @returns {Promise<Array>} Normalised work objects
 */
export async function fetchOpenAlex({ expandedQuery }) {
  try {
    const { data } = await axios.get(BASE_URL, {
      params: {
        search: expandedQuery,
        'per-page': 50,
        select: [
          'id',
          'title',
          'authorships',
          'abstract_inverted_index',
          'publication_year',
          'doi',
          'cited_by_count',
          'primary_location',
        ].join(','),
        sort: 'relevance_score:desc',
      },
      headers: {
        // OpenAlex requests a contact email in User-Agent
        'User-Agent': 'Curalink/1.0 (mailto:curalink@example.com)',
      },
      timeout: 15_000,
    });

    return (data.results || []).map((work) => {
      const abstract = reconstructAbstract(work.abstract_inverted_index);

      const authorships = work.authorships || [];
      const authors =
        authorships
          .slice(0, 4)
          .map((a) => a.author?.display_name || 'Unknown')
          .join(', ') + (authorships.length > 4 ? ' et al.' : '');

      const doi = work.doi || '';
      const url =
        doi ||
        work.primary_location?.landing_page_url ||
        `https://openalex.org/${work.id}`;

      return {
        id: work.id || '',
        title: work.title || 'Untitled',
        authors,
        abstract,
        year: work.publication_year || null,
        url,
        source: 'OpenAlex',
        citationCount: work.cited_by_count || 0,
        phase: null,
        status: null,
      };
    });
  } catch (err) {
    console.error('[OpenAlex] Fetch error:', err.message);
    return [];
  }
}
