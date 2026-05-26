import {
  getJobOpportunitiesOverview,
  getCardBreakdown,
  getCrManagerOverview,
  getMomTable,
  getFilterOptions,
} from '../services/jobOpportunitiesPipeline.js';

export async function getOverview(req, res) {
  try {
    const data = await getJobOpportunitiesOverview(req.query);
    const { _meta, ...publicData } = data;
    res.json(publicData);
  } catch (error) {
    console.error('jobOpportunities overview:', error);
    res.status(500).json({ error: 'Failed to load overview' });
  }
}

export async function getBreakdown(req, res) {
  try {
    const { cardKey } = req.params;
    const data = await getCardBreakdown(cardKey, req.query);
    res.json(data);
  } catch (error) {
    console.error('jobOpportunities breakdown:', error);
    res.status(500).json({ error: 'Failed to load breakdown' });
  }
}

export async function getCrManagers(req, res) {
  try {
    res.json(await getCrManagerOverview(req.query));
  } catch (error) {
    console.error('jobOpportunities crManagers:', error);
    res.status(500).json({ error: 'Failed to load CR managers' });
  }
}

export async function getMom(req, res) {
  try {
    const { search, ...rest } = req.query;
    res.json(await getMomTable({ ...rest, search }));
  } catch (error) {
    console.error('jobOpportunities mom:', error);
    res.status(500).json({ error: 'Failed to load MoM table' });
  }
}

export async function getFilters(req, res) {
  try {
    res.json(await getFilterOptions());
  } catch (error) {
    console.error('jobOpportunities filters:', error);
    res.status(500).json({ error: 'Failed to load filter options' });
  }
}
