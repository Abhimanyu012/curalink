import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const ESEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const EFETCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetches PubMed articles using Entrez esearch → efetch.
 *
 * @param {{ expandedQuery: string }} params
 * @returns {Promise<Array>} Normalised article objects
 */
export async function fetchPubMed({ expandedQuery }) {
  try {
    // ── Step 1: Get PMIDs ──────────────────────────────────
    const searchRes = await axios.get(ESEARCH, {
      params: {
        db: 'pubmed',
        term: expandedQuery,
        retmax: 50,
        retmode: 'json',
        sort: 'relevance',
      },
      timeout: 15_000,
    });

    const pmids = searchRes.data?.esearchresult?.idlist || [];
    if (pmids.length === 0) return [];

    // Politeness delay required by NCBI guidelines
    await sleep(350);

    // ── Step 2: Fetch abstracts ────────────────────────────
    const fetchRes = await axios.get(EFETCH, {
      params: {
        db: 'pubmed',
        id: pmids.join(','),
        retmode: 'xml',
        rettype: 'abstract',
      },
      timeout: 20_000,
    });

    const parsed = await parseStringPromise(fetchRes.data, {
      explicitArray: false,
      trim: true,
    });

    const raw = parsed?.PubmedArticleSet?.PubmedArticle;
    if (!raw) return [];
    const articles = Array.isArray(raw) ? raw : [raw];

    return articles
      .map((article) => {
        const medline = article?.MedlineCitation;
        const art = medline?.Article;
        if (!art) return null;

        const pmid =
          typeof medline.PMID === 'object'
            ? medline.PMID._
            : medline.PMID || '';

        // Title (can be an object with mixed content)
        const rawTitle = art.ArticleTitle;
        const title =
          typeof rawTitle === 'object' ? rawTitle._ || 'Untitled' : rawTitle || 'Untitled';

        // Authors
        const authorList = art.AuthorList?.Author;
        let authors = 'Unknown';
        if (authorList) {
          const arr = Array.isArray(authorList) ? authorList : [authorList];
          authors = arr
            .slice(0, 4)
            .map((a) => `${a.LastName || ''} ${a.Initials || ''}`.trim())
            .filter(Boolean)
            .join(', ');
          if (arr.length > 4) authors += ' et al.';
        }

        // Abstract — can be string, object, or array of labelled sections
        const rawAbstract = art.Abstract?.AbstractText;
        let abstract = '';
        if (typeof rawAbstract === 'string') {
          abstract = rawAbstract;
        } else if (Array.isArray(rawAbstract)) {
          abstract = rawAbstract
            .map((t) => (typeof t === 'object' ? t._ || '' : t))
            .join(' ');
        } else if (rawAbstract?._) {
          abstract = rawAbstract._;
        }

        // Year
        const pubDate = art.Journal?.JournalIssue?.PubDate;
        const year = pubDate?.Year ? parseInt(pubDate.Year, 10) : null;

        return {
          id: `pmid_${pmid}`,
          title,
          authors,
          abstract,
          year,
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
          source: 'PubMed',
          citationCount: 0,
          phase: null,
          status: null,
        };
      })
      .filter((a) => a && a.id !== 'pmid_');
  } catch (err) {
    console.error('[PubMed] Fetch error:', err.message);
    return [];
  }
}
