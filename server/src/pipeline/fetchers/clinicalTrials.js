import axios from 'axios';

const BASE_URL = 'https://clinicaltrials.gov/api/v2/studies';

/**
 * Fetches clinical trials from ClinicalTrials.gov v2 API.
 *
 * @param {{ disease: string, expandedQuery: string }} params
 * @returns {Promise<Array>} Normalised trial objects
 */
export async function fetchClinicalTrials({ disease, expandedQuery }) {
  try {
    const { data } = await axios.get(BASE_URL, {
      params: {
        'query.cond': disease,
        'query.term': expandedQuery,
        pageSize: 50,
        format: 'json',
        fields: [
          'NCTId',
          'BriefTitle',
          'OverallStatus',
          'Phase',
          'Condition',
          'InterventionName',
          'BriefSummary',
          'StartDate',
          'StudyFirstPostDate',
          'LastUpdatePostDate',
        ].join(','),
      },
      timeout: 15_000,
    });

    const studies = data.studies || [];

    return studies
      .map((study) => {
        const proto = study.protocolSection || {};
        const id = proto.identificationModule?.nctId || '';
        if (!id) return null;

        const title =
          proto.identificationModule?.briefTitle || 'Untitled Trial';
        const status =
          proto.statusModule?.overallStatus || 'Unknown';
        const phases = proto.designModule?.phases || [];
        const phase = phases.length ? phases.join(', ') : 'N/A';
        const conditions = (
          proto.conditionsModule?.conditions || []
        ).join(', ');
        const interventions = (
          proto.armsInterventionsModule?.interventions || []
        )
          .map((i) => i.name)
          .join(', ');
        const abstract =
          proto.descriptionModule?.briefSummary || '';
        const rawDate =
          proto.statusModule?.lastUpdatePostDateStruct?.date ||
          proto.statusModule?.studyFirstPostDateStruct?.date ||
          '';
        const year = rawDate ? parseInt(rawDate.split('-')[0], 10) : null;

        return {
          id,
          title,
          status,
          phase,
          conditions,
          interventions,
          abstract,
          year,
          url: `https://clinicaltrials.gov/study/${id}`,
          source: 'ClinicalTrials',
          citationCount: 0,
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.error('[ClinicalTrials] Fetch error:', err.message);
    return [];
  }
}
