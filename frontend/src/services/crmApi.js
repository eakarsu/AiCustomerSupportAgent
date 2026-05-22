const API_BASE = '/api';

async function fetchApi(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  const ct = response.headers.get('content-type');
  if (ct && ct.includes('text/csv')) return response.blob();
  return response.json();
}

function buildQs(params) {
  const q = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== '' && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `?${q}` : '';
}

// ── CRM Contacts ──────────────────────────────────────────────────────────────
export const crmContactsApi = {
  list: (p) => fetchApi(`/crm/contacts${buildQs(p)}`),
  get: (id) => fetchApi(`/crm/contacts/${id}`),
  create: (data) => fetchApi('/crm/contacts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/crm/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/crm/contacts/${id}`, { method: 'DELETE' }),
  archive: (id) => fetchApi(`/crm/contacts/${id}/archive`, { method: 'POST' }),
  restore: (id) => fetchApi(`/crm/contacts/${id}/restore`, { method: 'POST' }),
  history: (id) => fetchApi(`/crm/contacts/${id}/history`),
  search: (p) => fetchApi(`/crm/contacts/search${buildQs(p)}`),
  exportCsv: () => fetchApi('/crm/contacts/export/csv'),
  stats: () => fetchApi('/crm/contacts/stats/summary'),
  // AI
  aiEnrich: (data) => fetchApi('/crm/contacts/ai/enrich-from-name', { method: 'POST', body: JSON.stringify(data) }),
  aiMergeCandidates: (id) => fetchApi('/crm/contacts/ai/suggest-merge-candidates', { method: 'POST', body: JSON.stringify({ id }) }),
  aiBuyerPersona: (id) => fetchApi('/crm/contacts/ai/classify-buyer-persona', { method: 'POST', body: JSON.stringify({ id }) }),
  aiBuyerIntent: (id) => fetchApi('/crm/contacts/ai/predict-buyer-intent', { method: 'POST', body: JSON.stringify({ id }) }),
  aiScoreEngagement: (id) => fetchApi('/crm/contacts/ai/score-engagement', { method: 'POST', body: JSON.stringify({ id }) }),
  aiDeadContact: (id) => fetchApi('/crm/contacts/ai/detect-dead-contact', { method: 'POST', body: JSON.stringify({ id }) }),
  aiNextTouch: (id) => fetchApi('/crm/contacts/ai/suggest-next-touch', { method: 'POST', body: JSON.stringify({ id }) }),
  aiSummarize: (id) => fetchApi('/crm/contacts/ai/summarize-contact-history', { method: 'POST', body: JSON.stringify({ id }) }),
  aiIcebreaker: (id) => fetchApi('/crm/contacts/ai/generate-icebreaker', { method: 'POST', body: JSON.stringify({ id }) }),
  aiChannelPref: (id) => fetchApi('/crm/contacts/ai/classify-channel-preference', { method: 'POST', body: JSON.stringify({ id }) }),
  aiBestTime: (id) => fetchApi('/crm/contacts/ai/predict-best-time', { method: 'POST', body: JSON.stringify({ id }) }),
  aiValidateEmail: (email) => fetchApi('/crm/contacts/ai/validate-email', { method: 'POST', body: JSON.stringify({ email }) }),
  aiJobChange: (id) => fetchApi('/crm/contacts/ai/detect-job-change', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRelationshipMap: (id) => fetchApi('/crm/contacts/ai/suggest-relationship-map', { method: 'POST', body: JSON.stringify({ id }) }),
  aiOutreachEmail: (id, context) => fetchApi('/crm/contacts/ai/generate-outreach-email', { method: 'POST', body: JSON.stringify({ id, context }) }),
  aiLeadFit: (id) => fetchApi('/crm/contacts/ai/score-lead-fit', { method: 'POST', body: JSON.stringify({ id }) }),
};

// ── CRM Accounts ─────────────────────────────────────────────────────────────
export const crmAccountsApi = {
  list: (p) => fetchApi(`/crm/accounts${buildQs(p)}`),
  get: (id) => fetchApi(`/crm/accounts/${id}`),
  create: (data) => fetchApi('/crm/accounts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/crm/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/crm/accounts/${id}`, { method: 'DELETE' }),
  archive: (id) => fetchApi(`/crm/accounts/${id}/archive`, { method: 'POST' }),
  restore: (id) => fetchApi(`/crm/accounts/${id}/restore`, { method: 'POST' }),
  search: (p) => fetchApi(`/crm/accounts/search${buildQs(p)}`),
  exportCsv: () => fetchApi('/crm/accounts/export/csv'),
  stats: () => fetchApi('/crm/accounts/stats/summary'),
  // AI
  aiScoreHealth: (id) => fetchApi('/crm/accounts/ai/score-account-health', { method: 'POST', body: JSON.stringify({ id }) }),
  aiChurnRisk: (id) => fetchApi('/crm/accounts/ai/predict-churn-risk', { method: 'POST', body: JSON.stringify({ id }) }),
  aiUpsell: (id) => fetchApi('/crm/accounts/ai/identify-upsell-opportunities', { method: 'POST', body: JSON.stringify({ id }) }),
  aiAccountPlan: (id) => fetchApi('/crm/accounts/ai/generate-account-plan', { method: 'POST', body: JSON.stringify({ id }) }),
  aiCompetitorMap: (id) => fetchApi('/crm/accounts/ai/map-competitor-landscape', { method: 'POST', body: JSON.stringify({ id }) }),
  aiSummarize: (id) => fetchApi('/crm/accounts/ai/summarize-account', { method: 'POST', body: JSON.stringify({ id }) }),
  aiSegment: (id) => fetchApi('/crm/accounts/ai/segment-account', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRiskFlags: (id) => fetchApi('/crm/accounts/ai/flag-account-risks', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRelationshipStrength: (id) => fetchApi('/crm/accounts/ai/assess-relationship-strength', { method: 'POST', body: JSON.stringify({ id }) }),
  aiQBRAgenda: (id) => fetchApi('/crm/accounts/ai/generate-qbr-agenda', { method: 'POST', body: JSON.stringify({ id }) }),
  aiExpansionRevenue: (id) => fetchApi('/crm/accounts/ai/forecast-expansion-revenue', { method: 'POST', body: JSON.stringify({ id }) }),
  aiWhiteSpace: (id) => fetchApi('/crm/accounts/ai/detect-white-space', { method: 'POST', body: JSON.stringify({ id }) }),
  aiTechStack: (id) => fetchApi('/crm/accounts/ai/infer-tech-stack', { method: 'POST', body: JSON.stringify({ id }) }),
  aiNegotiationTips: (id) => fetchApi('/crm/accounts/ai/suggest-negotiation-tips', { method: 'POST', body: JSON.stringify({ id }) }),
  aiOrgChart: (id) => fetchApi('/crm/accounts/ai/generate-org-chart-hints', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRecommendActions: (id) => fetchApi('/crm/accounts/ai/recommend-actions', { method: 'POST', body: JSON.stringify({ id }) }),
};

// ── CRM Opportunities ─────────────────────────────────────────────────────────
export const crmOpportunitiesApi = {
  list: (p) => fetchApi(`/crm/opportunities${buildQs(p)}`),
  get: (id) => fetchApi(`/crm/opportunities/${id}`),
  create: (data) => fetchApi('/crm/opportunities', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/crm/opportunities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/crm/opportunities/${id}`, { method: 'DELETE' }),
  archive: (id) => fetchApi(`/crm/opportunities/${id}/archive`, { method: 'POST' }),
  restore: (id) => fetchApi(`/crm/opportunities/${id}/restore`, { method: 'POST' }),
  search: (p) => fetchApi(`/crm/opportunities/search${buildQs(p)}`),
  exportCsv: () => fetchApi('/crm/opportunities/export/csv'),
  stats: () => fetchApi('/crm/opportunities/stats/summary'),
  // AI
  aiWinProb: (id) => fetchApi('/crm/opportunities/ai/predict-win-probability', { method: 'POST', body: JSON.stringify({ id }) }),
  aiSlippage: (id) => fetchApi('/crm/opportunities/ai/detect-deal-slippage', { method: 'POST', body: JSON.stringify({ id }) }),
  aiNextSteps: (id) => fetchApi('/crm/opportunities/ai/recommend-next-steps', { method: 'POST', body: JSON.stringify({ id }) }),
  aiCompetitorAnalysis: (id) => fetchApi('/crm/opportunities/ai/analyze-competitor-threats', { method: 'POST', body: JSON.stringify({ id }) }),
  aiDealCoach: (id) => fetchApi('/crm/opportunities/ai/generate-deal-coaching', { method: 'POST', body: JSON.stringify({ id }) }),
  aiObjHandling: (id) => fetchApi('/crm/opportunities/ai/suggest-objection-handling', { method: 'POST', body: JSON.stringify({ id }) }),
  aiClosingScript: (id) => fetchApi('/crm/opportunities/ai/generate-closing-script', { method: 'POST', body: JSON.stringify({ id }) }),
  aiDealSummary: (id) => fetchApi('/crm/opportunities/ai/summarize-deal', { method: 'POST', body: JSON.stringify({ id }) }),
  aiCloseDate: (id) => fetchApi('/crm/opportunities/ai/predict-close-date', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRiskScore: (id) => fetchApi('/crm/opportunities/ai/score-deal-risk', { method: 'POST', body: JSON.stringify({ id }) }),
  aiUpsellInDeal: (id) => fetchApi('/crm/opportunities/ai/identify-upsell-in-deal', { method: 'POST', body: JSON.stringify({ id }) }),
  aiPricingSuggestion: (id) => fetchApi('/crm/opportunities/ai/suggest-pricing-strategy', { method: 'POST', body: JSON.stringify({ id }) }),
  aiStakeholderMap: (id) => fetchApi('/crm/opportunities/ai/map-stakeholders', { method: 'POST', body: JSON.stringify({ id }) }),
  aiMeetingPrep: (id) => fetchApi('/crm/opportunities/ai/generate-meeting-prep', { method: 'POST', body: JSON.stringify({ id }) }),
  aiHealthScore: (id) => fetchApi('/crm/opportunities/ai/score-deal-health', { method: 'POST', body: JSON.stringify({ id }) }),
  aiAlternativeApproach: (id) => fetchApi('/crm/opportunities/ai/suggest-alternative-approach', { method: 'POST', body: JSON.stringify({ id }) }),
};

// ── CRM Pipeline Stages ───────────────────────────────────────────────────────
export const crmPipelineStagesApi = {
  list: (p) => fetchApi(`/crm/pipelineStages${buildQs(p)}`),
  get: (id) => fetchApi(`/crm/pipelineStages/${id}`),
  create: (data) => fetchApi('/crm/pipelineStages', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/crm/pipelineStages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/crm/pipelineStages/${id}`, { method: 'DELETE' }),
  reorder: (data) => fetchApi('/crm/pipelineStages/reorder', { method: 'POST', body: JSON.stringify(data) }),
  stats: () => fetchApi('/crm/pipelineStages/stats/summary'),
  // AI
  aiOptimize: (id) => fetchApi('/crm/pipelineStages/ai/optimize-stage', { method: 'POST', body: JSON.stringify({ id }) }),
  aiBottleneck: (id) => fetchApi('/crm/pipelineStages/ai/detect-bottleneck', { method: 'POST', body: JSON.stringify({ id }) }),
  aiConversionTips: (id) => fetchApi('/crm/pipelineStages/ai/suggest-conversion-tips', { method: 'POST', body: JSON.stringify({ id }) }),
  aiExitCriteria: (id) => fetchApi('/crm/pipelineStages/ai/generate-exit-criteria', { method: 'POST', body: JSON.stringify({ id }) }),
  aiPipelineHealth: () => fetchApi('/crm/pipelineStages/ai/assess-pipeline-health', { method: 'POST', body: JSON.stringify({}) }),
  aiWinRatePredict: (id) => fetchApi('/crm/pipelineStages/ai/predict-win-rate', { method: 'POST', body: JSON.stringify({ id }) }),
  aiStageName: (data) => fetchApi('/crm/pipelineStages/ai/suggest-stage-name', { method: 'POST', body: JSON.stringify(data) }),
  aiPipelineGaps: () => fetchApi('/crm/pipelineStages/ai/identify-pipeline-gaps', { method: 'POST', body: JSON.stringify({}) }),
};

// ── CRM Activities ────────────────────────────────────────────────────────────
export const crmActivitiesApi = {
  list: (p) => fetchApi(`/crm/activities${buildQs(p)}`),
  get: (id) => fetchApi(`/crm/activities/${id}`),
  create: (data) => fetchApi('/crm/activities', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/crm/activities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/crm/activities/${id}`, { method: 'DELETE' }),
  search: (p) => fetchApi(`/crm/activities/search${buildQs(p)}`),
  stats: () => fetchApi('/crm/activities/stats/summary'),
  // AI
  aiSummarize: (id) => fetchApi('/crm/activities/ai/summarize-activity', { method: 'POST', body: JSON.stringify({ id }) }),
  aiSentiment: (id) => fetchApi('/crm/activities/ai/analyze-sentiment', { method: 'POST', body: JSON.stringify({ id }) }),
  aiActionItems: (id) => fetchApi('/crm/activities/ai/extract-action-items', { method: 'POST', body: JSON.stringify({ id }) }),
  aiClassify: (id) => fetchApi('/crm/activities/ai/classify-activity', { method: 'POST', body: JSON.stringify({ id }) }),
  aiFollowUp: (id) => fetchApi('/crm/activities/ai/suggest-follow-up', { method: 'POST', body: JSON.stringify({ id }) }),
  aiDraftEmail: (id) => fetchApi('/crm/activities/ai/draft-follow-up-email', { method: 'POST', body: JSON.stringify({ id }) }),
  aiMeetingNotes: (id) => fetchApi('/crm/activities/ai/generate-meeting-notes', { method: 'POST', body: JSON.stringify({ id }) }),
  aiScoreCall: (id) => fetchApi('/crm/activities/ai/score-call-quality', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRiskSignals: (id) => fetchApi('/crm/activities/ai/detect-risk-signals', { method: 'POST', body: JSON.stringify({ id }) }),
  aiPatterns: (p) => fetchApi('/crm/activities/ai/identify-activity-patterns', { method: 'POST', body: JSON.stringify(p) }),
  aiOptimalSchedule: (id) => fetchApi('/crm/activities/ai/suggest-optimal-schedule', { method: 'POST', body: JSON.stringify({ id }) }),
  aiTopics: (id) => fetchApi('/crm/activities/ai/extract-discussion-topics', { method: 'POST', body: JSON.stringify({ id }) }),
  aiCoachingTips: (id) => fetchApi('/crm/activities/ai/generate-coaching-tips', { method: 'POST', body: JSON.stringify({ id }) }),
  aiBuyerSignals: (id) => fetchApi('/crm/activities/ai/detect-buyer-signals', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRelationshipInsights: (p) => fetchApi('/crm/activities/ai/generate-relationship-insights', { method: 'POST', body: JSON.stringify(p) }),
  aiAnomalies: (p) => fetchApi('/crm/activities/ai/detect-activity-anomalies', { method: 'POST', body: JSON.stringify(p) }),
};

// ── CRM Email Sync ────────────────────────────────────────────────────────────
export const crmEmailSyncApi = {
  list: (p) => fetchApi(`/crm/emailSync${buildQs(p)}`),
  get: (id) => fetchApi(`/crm/emailSync/${id}`),
  create: (data) => fetchApi('/crm/emailSync', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/crm/emailSync/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/crm/emailSync/${id}`, { method: 'DELETE' }),
  search: (p) => fetchApi(`/crm/emailSync/search${buildQs(p)}`),
  stats: () => fetchApi('/crm/emailSync/stats/summary'),
  // AI
  aiClassify: (id) => fetchApi('/crm/emailSync/ai/classify-email', { method: 'POST', body: JSON.stringify({ id }) }),
  aiSentiment: (id) => fetchApi('/crm/emailSync/ai/analyze-email-sentiment', { method: 'POST', body: JSON.stringify({ id }) }),
  aiSummarize: (id) => fetchApi('/crm/emailSync/ai/summarize-email-thread', { method: 'POST', body: JSON.stringify({ id }) }),
  aiDraftReply: (id) => fetchApi('/crm/emailSync/ai/draft-reply', { method: 'POST', body: JSON.stringify({ id }) }),
  aiExtractEntities: (id) => fetchApi('/crm/emailSync/ai/extract-entities', { method: 'POST', body: JSON.stringify({ id }) }),
  aiDetectIntent: (id) => fetchApi('/crm/emailSync/ai/detect-intent', { method: 'POST', body: JSON.stringify({ id }) }),
  aiPrioritize: (id) => fetchApi('/crm/emailSync/ai/prioritize-email', { method: 'POST', body: JSON.stringify({ id }) }),
  aiLinkToDeal: (id) => fetchApi('/crm/emailSync/ai/link-to-deal', { method: 'POST', body: JSON.stringify({ id }) }),
  aiFollowUpReminder: (id) => fetchApi('/crm/emailSync/ai/generate-follow-up-reminder', { method: 'POST', body: JSON.stringify({ id }) }),
  aiSpamCheck: (id) => fetchApi('/crm/emailSync/ai/detect-spam-or-auto', { method: 'POST', body: JSON.stringify({ id }) }),
  aiActionItems: (id) => fetchApi('/crm/emailSync/ai/extract-action-items', { method: 'POST', body: JSON.stringify({ id }) }),
  aiOpportunitySignals: (id) => fetchApi('/crm/emailSync/ai/detect-opportunity-signals', { method: 'POST', body: JSON.stringify({ id }) }),
  aiLanguage: (id) => fetchApi('/crm/emailSync/ai/detect-language-and-translate', { method: 'POST', body: JSON.stringify({ id }) }),
  aiWritingQuality: (id) => fetchApi('/crm/emailSync/ai/score-writing-quality', { method: 'POST', body: JSON.stringify({ id }) }),
  aiNextBestAction: (id) => fetchApi('/crm/emailSync/ai/suggest-next-best-action', { method: 'POST', body: JSON.stringify({ id }) }),
  aiContactMatch: (id) => fetchApi('/crm/emailSync/ai/match-to-contact', { method: 'POST', body: JSON.stringify({ id }) }),
};

// ── CRM Calendar Sync ─────────────────────────────────────────────────────────
export const crmCalendarSyncApi = {
  list: (p) => fetchApi(`/crm/calendarSync${buildQs(p)}`),
  get: (id) => fetchApi(`/crm/calendarSync/${id}`),
  create: (data) => fetchApi('/crm/calendarSync', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/crm/calendarSync/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/crm/calendarSync/${id}`, { method: 'DELETE' }),
  search: (p) => fetchApi(`/crm/calendarSync/search${buildQs(p)}`),
  stats: () => fetchApi('/crm/calendarSync/stats/summary'),
  // AI
  aiMeetingPrep: (id) => fetchApi('/crm/calendarSync/ai/generate-meeting-prep', { method: 'POST', body: JSON.stringify({ id }) }),
  aiSummarizeMeeting: (id) => fetchApi('/crm/calendarSync/ai/summarize-meeting', { method: 'POST', body: JSON.stringify({ id }) }),
  aiAgenda: (id) => fetchApi('/crm/calendarSync/ai/generate-agenda', { method: 'POST', body: JSON.stringify({ id }) }),
  aiActionItems: (id) => fetchApi('/crm/calendarSync/ai/extract-action-items', { method: 'POST', body: JSON.stringify({ id }) }),
  aiClassify: (id) => fetchApi('/crm/calendarSync/ai/classify-meeting', { method: 'POST', body: JSON.stringify({ id }) }),
  aiOptimalTime: (p) => fetchApi('/crm/calendarSync/ai/suggest-optimal-meeting-time', { method: 'POST', body: JSON.stringify(p) }),
  aiSentiment: (id) => fetchApi('/crm/calendarSync/ai/analyze-meeting-sentiment', { method: 'POST', body: JSON.stringify({ id }) }),
  aiLinkToDeal: (id) => fetchApi('/crm/calendarSync/ai/link-to-deal', { method: 'POST', body: JSON.stringify({ id }) }),
  aiFollowUp: (id) => fetchApi('/crm/calendarSync/ai/draft-follow-up', { method: 'POST', body: JSON.stringify({ id }) }),
  aiConflictCheck: (id) => fetchApi('/crm/calendarSync/ai/detect-scheduling-conflicts', { method: 'POST', body: JSON.stringify({ id }) }),
  aiBuyerSignals: (id) => fetchApi('/crm/calendarSync/ai/detect-buyer-signals', { method: 'POST', body: JSON.stringify({ id }) }),
  aiParticipantInsights: (id) => fetchApi('/crm/calendarSync/ai/generate-participant-insights', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRecurring: (id) => fetchApi('/crm/calendarSync/ai/suggest-recurring-pattern', { method: 'POST', body: JSON.stringify({ id }) }),
  aiROI: (id) => fetchApi('/crm/calendarSync/ai/assess-meeting-roi', { method: 'POST', body: JSON.stringify({ id }) }),
  aiDecisionReadiness: (id) => fetchApi('/crm/calendarSync/ai/assess-decision-readiness', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRisks: (id) => fetchApi('/crm/calendarSync/ai/flag-meeting-risks', { method: 'POST', body: JSON.stringify({ id }) }),
};

// ── CRM Quotes ────────────────────────────────────────────────────────────────
export const crmQuotesApi = {
  list: (p) => fetchApi(`/crm/quotes${buildQs(p)}`),
  get: (id) => fetchApi(`/crm/quotes/${id}`),
  create: (data) => fetchApi('/crm/quotes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/crm/quotes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/crm/quotes/${id}`, { method: 'DELETE' }),
  archive: (id) => fetchApi(`/crm/quotes/${id}/archive`, { method: 'POST' }),
  restore: (id) => fetchApi(`/crm/quotes/${id}/restore`, { method: 'POST' }),
  send: (id) => fetchApi(`/crm/quotes/${id}/send`, { method: 'POST' }),
  accept: (id) => fetchApi(`/crm/quotes/${id}/accept`, { method: 'POST' }),
  reject: (id) => fetchApi(`/crm/quotes/${id}/reject`, { method: 'POST' }),
  search: (p) => fetchApi(`/crm/quotes/search${buildQs(p)}`),
  exportCsv: () => fetchApi('/crm/quotes/export/csv'),
  stats: () => fetchApi('/crm/quotes/stats/summary'),
  // AI
  aiGenerateQuote: (data) => fetchApi('/crm/quotes/ai/generate-quote', { method: 'POST', body: JSON.stringify(data) }),
  aiOptimizePricing: (id) => fetchApi('/crm/quotes/ai/optimize-pricing', { method: 'POST', body: JSON.stringify({ id }) }),
  aiWinProbability: (id) => fetchApi('/crm/quotes/ai/predict-win-probability', { method: 'POST', body: JSON.stringify({ id }) }),
  aiDiscountSuggest: (id) => fetchApi('/crm/quotes/ai/suggest-discount', { method: 'POST', body: JSON.stringify({ id }) }),
  aiExecutiveSummary: (id) => fetchApi('/crm/quotes/ai/generate-executive-summary', { method: 'POST', body: JSON.stringify({ id }) }),
  aiCompetitorPricing: (id) => fetchApi('/crm/quotes/ai/analyze-competitor-pricing', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRiskFlags: (id) => fetchApi('/crm/quotes/ai/flag-quote-risks', { method: 'POST', body: JSON.stringify({ id }) }),
  aiPersonalize: (id) => fetchApi('/crm/quotes/ai/personalize-quote', { method: 'POST', body: JSON.stringify({ id }) }),
  aiCoverLetter: (id) => fetchApi('/crm/quotes/ai/generate-cover-letter', { method: 'POST', body: JSON.stringify({ id }) }),
  aiUpsellItems: (id) => fetchApi('/crm/quotes/ai/suggest-upsell-items', { method: 'POST', body: JSON.stringify({ id }) }),
  aiNegotiationRange: (id) => fetchApi('/crm/quotes/ai/suggest-negotiation-range', { method: 'POST', body: JSON.stringify({ id }) }),
  aiExpiryOptimal: (id) => fetchApi('/crm/quotes/ai/suggest-optimal-expiry', { method: 'POST', body: JSON.stringify({ id }) }),
  aiLineItemNarrative: (id) => fetchApi('/crm/quotes/ai/generate-line-item-narrative', { method: 'POST', body: JSON.stringify({ id }) }),
  aiCloseScript: (id) => fetchApi('/crm/quotes/ai/generate-closing-script', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRejectReasons: (id) => fetchApi('/crm/quotes/ai/analyze-rejection-reasons', { method: 'POST', body: JSON.stringify({ id }) }),
  aiContractDraft: (id) => fetchApi('/crm/quotes/ai/draft-contract-terms', { method: 'POST', body: JSON.stringify({ id }) }),
};

// ── CRM Forecasting ───────────────────────────────────────────────────────────
export const crmForecastingApi = {
  list: (p) => fetchApi(`/crm/forecasting${buildQs(p)}`),
  get: (id) => fetchApi(`/crm/forecasting/${id}`),
  create: (data) => fetchApi('/crm/forecasting', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/crm/forecasting/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/crm/forecasting/${id}`, { method: 'DELETE' }),
  stats: () => fetchApi('/crm/forecasting/stats/summary'),
  // AI
  aiForecast: (data) => fetchApi('/crm/forecasting/ai/generate-forecast', { method: 'POST', body: JSON.stringify(data) }),
  aiQuotaAttainment: (id) => fetchApi('/crm/forecasting/ai/predict-quota-attainment', { method: 'POST', body: JSON.stringify({ id }) }),
  aiPipelineCoverage: (id) => fetchApi('/crm/forecasting/ai/analyze-pipeline-coverage', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRevenueTrend: (id) => fetchApi('/crm/forecasting/ai/detect-revenue-trends', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRiskScenarios: (id) => fetchApi('/crm/forecasting/ai/simulate-risk-scenarios', { method: 'POST', body: JSON.stringify({ id }) }),
  aiCallForecast: (id) => fetchApi('/crm/forecasting/ai/call-forecast', { method: 'POST', body: JSON.stringify({ id }) }),
  aiSeasonality: (id) => fetchApi('/crm/forecasting/ai/detect-seasonality', { method: 'POST', body: JSON.stringify({ id }) }),
  aiSlippage: (id) => fetchApi('/crm/forecasting/ai/detect-forecast-slippage', { method: 'POST', body: JSON.stringify({ id }) }),
  aiTopDealRisk: (id) => fetchApi('/crm/forecasting/ai/flag-top-deal-risks', { method: 'POST', body: JSON.stringify({ id }) }),
  aiCommitAnalysis: (id) => fetchApi('/crm/forecasting/ai/analyze-commit-accuracy', { method: 'POST', body: JSON.stringify({ id }) }),
  aiTeamPerformance: (id) => fetchApi('/crm/forecasting/ai/benchmark-team-performance', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRecommendActions: (id) => fetchApi('/crm/forecasting/ai/recommend-actions', { method: 'POST', body: JSON.stringify({ id }) }),
  aiInsights: (id) => fetchApi('/crm/forecasting/ai/generate-forecast-insights', { method: 'POST', body: JSON.stringify({ id }) }),
  aiNewBusiness: (id) => fetchApi('/crm/forecasting/ai/predict-new-business', { method: 'POST', body: JSON.stringify({ id }) }),
  aiExpansion: (id) => fetchApi('/crm/forecasting/ai/predict-expansion-revenue', { method: 'POST', body: JSON.stringify({ id }) }),
  aiRollup: (id) => fetchApi('/crm/forecasting/ai/generate-rollup-summary', { method: 'POST', body: JSON.stringify({ id }) }),
};
