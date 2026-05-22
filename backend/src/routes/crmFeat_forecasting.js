import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const getClient = () => new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY, defaultHeaders: { 'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000', 'X-Title': 'AI CRM Forecasting' } });
const rlMap = new Map();
function rl(req, res, next) { const key = req.user ? `user:${req.user.id}` : `ip:${req.ip}`; const now = Date.now(); const e = rlMap.get(key) || { count: 0, resetAt: now + 3600000 }; if (now > e.resetAt) { e.count = 0; e.resetAt = now + 3600000; } e.count++; rlMap.set(key, e); if (e.count > 20) return res.status(429).json({ error: 'Rate limit exceeded.' }); next(); }
function parseAIJson(c) { if (!c) return { raw_response: '' }; const cb = c.match(/```(?:json)?\s*([\s\S]*?)```/); if (cb) { try { return JSON.parse(cb[1].trim()); } catch (_) {} } try { return JSON.parse(c); } catch (_) {} const jm = c.match(/\{[\s\S]*\}/); if (jm) { try { return JSON.parse(jm[0]); } catch (_) {} } return { raw_response: c }; }
async function callAI(prompt) { const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022'; const comp = await getClient().chat.completions.create({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 1024, temperature: 0.2 }); return { result: comp.choices[0]?.message?.content || '', model, usage: comp.usage }; }
async function loadForecast(prisma, id, res) { const r = await prisma.crmForecast.findUnique({ where: { id } }); if (!r) { res.status(404).json({ error: 'Forecast not found' }); return null; } return r; }

// ── CRUD ──────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const where = { isArchived: false };
    if (req.query.period) where.period = req.query.period;
    if (req.query.ownerId) where.ownerId = req.query.ownerId;
    if (req.query.teamId) where.teamId = req.query.teamId;
    const [data, total] = await Promise.all([req.prisma.crmForecast.findMany({ where, skip, take: limit, orderBy: { periodStart: 'desc' } }), req.prisma.crmForecast.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/count', async (req, res) => {
  try { const where = { isArchived: false }; if (req.query.period) where.period = req.query.period; if (req.query.teamId) where.teamId = req.query.teamId; res.json({ count: await req.prisma.crmForecast.count({ where }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q||'', page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const where = { isArchived: false, OR: [{ period: { contains: q, mode: 'insensitive' } }, { ownerId: { contains: q, mode: 'insensitive' } }] };
    const [data, total] = await Promise.all([req.prisma.crmForecast.findMany({ where, skip, take: limit, orderBy: { periodStart: 'desc' } }), req.prisma.crmForecast.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-period/:period', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const [data, total] = await Promise.all([req.prisma.crmForecast.findMany({ where: { period: req.params.period, isArchived: false }, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmForecast.count({ where: { period: req.params.period, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-team/:teamId', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const [data, total] = await Promise.all([req.prisma.crmForecast.findMany({ where: { teamId: req.params.teamId, isArchived: false }, skip, take: limit, orderBy: { periodStart: 'desc' } }), req.prisma.crmForecast.count({ where: { teamId: req.params.teamId, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/csv', async (req, res) => {
  try {
    const data = await req.prisma.crmForecast.findMany({ where: { isArchived: false }, orderBy: { periodStart: 'desc' } });
    const fields = ['id','period','periodStart','periodEnd','ownerId','teamId','commitAmount','bestCaseAmount','pipelineAmount','closedAmount','quotaAmount','attainmentPct','forecastAccuracy','isSandbagged','createdAt'];
    res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="crm_forecasts.csv"');
    res.send([fields.join(','), ...data.map(r => fields.map(f=>`"${r[f]==null?'':String(r[f]).replace(/"/g,'""')}"`).join(','))].join('\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const forecasts = await req.prisma.crmForecast.findMany({ where: { isArchived: false }, orderBy: { periodStart: 'desc' }, take: 10 });
    const pipeline = await req.prisma.crmOpportunity.aggregate({ _sum: { amount: true }, where: { isArchived: false } }).catch(()=>({ _sum: { amount: 0 } }));
    res.json({ recentForecasts: forecasts, totalPipeline: pipeline._sum.amount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/batch', async (req, res) => {
  try { const { items } = req.body; if (!Array.isArray(items)||!items.length) return res.status(400).json({ error: 'items array required' }); res.status(201).json({ count: (await req.prisma.crmForecast.createMany({ data: items, skipDuplicates: true })).count }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/batch', async (req, res) => {
  try { const { items } = req.body; if (!Array.isArray(items)||!items.length) return res.status(400).json({ error: 'items array required' }); res.json({ data: await Promise.all(items.map(async ({ id, ...f }) => { if (!id) return { error: 'missing id' }; return req.prisma.crmForecast.update({ where: { id }, data: f }); })) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/batch', async (req, res) => {
  try { const { ids } = req.body; if (!Array.isArray(ids)||!ids.length) return res.status(400).json({ error: 'ids array required' }); res.json({ updated: (await req.prisma.crmForecast.updateMany({ where: { id: { in: ids } }, data: { isArchived: true, archivedAt: new Date() } })).count }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/import/csv', async (req, res) => {
  try {
    const { csv } = req.body; if (!csv) return res.status(400).json({ error: 'csv field required' });
    const lines = csv.split('\n').map(l=>l.trim()).filter(Boolean); if (lines.length<2) return res.status(400).json({ error: 'CSV needs header+data' });
    const headers = lines[0].split(',').map(h=>h.replace(/"/g,'').trim());
    const items = lines.slice(1).map(line => { const vals = line.match(/(".*?"|[^,]+)/g)||[]; const obj={}; headers.forEach((h,i)=>{ obj[h]=vals[i]?vals[i].replace(/^"|"$/g,'').replace(/""/g,'"'):null; }); return obj; });
    res.status(201).json({ count: (await req.prisma.crmForecast.createMany({ data: items, skipDuplicates: true })).count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try { const r = await req.prisma.crmForecast.findUnique({ where: { id: req.params.id } }); if (!r) return res.status(404).json({ error: 'Forecast not found' }); res.json({ data: r }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json({ data: await req.prisma.crmForecast.create({ data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmForecast.update({ where: { id: req.params.id }, data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmForecast.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/archive', async (req, res) => {
  try { res.json({ data: await req.prisma.crmForecast.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/restore', async (req, res) => {
  try { res.json({ data: await req.prisma.crmForecast.update({ where: { id: req.params.id }, data: { isArchived: false, archivedAt: null } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/history', async (req, res) => {
  try { const r = await req.prisma.crmForecast.findUnique({ where: { id: req.params.id } }); if (!r) return res.status(404).json({ error: 'Forecast not found' }); res.json({ data: await req.prisma.auditLog.findMany({ where: { entityId: req.params.id, entity: 'CrmForecast' }, orderBy: { createdAt: 'desc' } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AI ────────────────────────────────────────────────────────────────────────

router.post('/ai/predict-quarter-attainment', rl, async (req, res) => {
  try { const f = await loadForecast(req.prisma, req.body.id, res); if (!f) return; const ai = await callAI(`Predict quarter attainment for this forecast.\nForecast: ${JSON.stringify({ period: f.period, quotaAmount: f.quotaAmount, commitAmount: f.commitAmount, bestCaseAmount: f.bestCaseAmount, closedAmount: f.closedAmount, pipelineAmount: f.pipelineAmount })}\nRespond JSON: { "predictedAttainment": 0-200, "attainmentTier": "above_quota|at_quota|below_quota|at_risk", "confidence": "high|medium|low", "gap": 0, "actions": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-commit-quality', rl, async (req, res) => {
  try { const f = await loadForecast(req.prisma, req.body.id, res); if (!f) return; const ai = await callAI(`Classify the quality of this forecast commit.\nForecast: ${JSON.stringify({ commitAmount: f.commitAmount, bestCaseAmount: f.bestCaseAmount, closedAmount: f.closedAmount, isSandbagged: f.isSandbagged })}\nRespond JSON: { "commitQuality": "high|medium|low|sandbagged|overstated", "confidence": "high|medium|low", "factors": [...], "adjustments": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-forecast-adjustment', rl, async (req, res) => {
  try { const f = await loadForecast(req.prisma, req.body.id, res); if (!f) return; const ai = await callAI(`Suggest adjustments to this forecast based on pipeline signals.\nForecast: ${JSON.stringify(f)}\nRespond JSON: { "adjustedCommit": 0, "adjustedBestCase": 0, "adjustmentRationale": "...", "riskFactors": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-sandbag', rl, async (req, res) => {
  try { const f = await loadForecast(req.prisma, req.body.id, res); if (!f) return; const ai = await callAI(`Detect sandbagging in this forecast.\nForecast: ${JSON.stringify({ commitAmount: f.commitAmount, bestCaseAmount: f.bestCaseAmount, pipelineAmount: f.pipelineAmount, closedAmount: f.closedAmount, forecastAccuracy: f.forecastAccuracy, isSandbagged: f.isSandbagged })}\nRespond JSON: { "isSandbagged": true|false, "sandbagSignals": [...], "estimatedSandbagAmount": 0, "confidence": "high|medium|low" }`); const parsed = parseAIJson(ai.result); if (typeof parsed.isSandbagged==='boolean') await req.prisma.crmForecast.update({ where: { id: f.id }, data: { isSandbagged: parsed.isSandbagged } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-pull-forward', rl, async (req, res) => {
  try { const f = await loadForecast(req.prisma, req.body.id, res); if (!f) return; const opps = await req.prisma.crmOpportunity.findMany({ where: { isArchived: false, forecastCategory: { in: ['pipeline','best_case'] }, ownerId: f.ownerId || undefined }, orderBy: { amount: 'desc' }, take: 10 }).catch(()=>[]); const ai = await callAI(`Recommend which opportunities to pull forward to meet this quarter's forecast.\nForecast: ${JSON.stringify({ period: f.period, quotaAmount: f.quotaAmount, commitAmount: f.commitAmount, closedAmount: f.closedAmount })}\nPipeline Opps: ${JSON.stringify(opps.map(o=>({ name: o.name, amount: o.amount, closeDate: o.closeDate, probability: o.probability })))}\nRespond JSON: { "pullForwardCandidates": [...], "totalPullForwardValue": 0, "actions": [...], "forecastedGap": 0 }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/score-rep-forecast-accuracy', rl, async (req, res) => {
  try { const { ownerId } = req.body; if (!ownerId) return res.status(400).json({ error: 'ownerId required' }); const forecasts = await req.prisma.crmForecast.findMany({ where: { ownerId, isArchived: false }, orderBy: { periodStart: 'desc' }, take: 8 }); const ai = await callAI(`Score this rep's historical forecast accuracy.\nForecasts: ${JSON.stringify(forecasts.map(f=>({ period: f.period, commitAmount: f.commitAmount, closedAmount: f.closedAmount, forecastAccuracy: f.forecastAccuracy })))}\nRespond JSON: { "accuracyScore": 0-100, "avgVariancePct": 0, "pattern": "conservative|accurate|aggressive", "trend": "improving|stable|declining", "coaching": [...] }`); const parsed = parseAIJson(ai.result); if (forecasts.length > 0 && typeof parsed.accuracyScore==='number') { await req.prisma.crmForecast.update({ where: { id: forecasts[0].id }, data: { forecastAccuracy: parsed.accuracyScore } }).catch(()=>{}); } res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-forecast-narrative', rl, async (req, res) => {
  try { const f = await loadForecast(req.prisma, req.body.id, res); if (!f) return; const ai = await callAI(`Generate a narrative summary of this forecast for leadership review.\nForecast: ${JSON.stringify(f)}\nRespond JSON: { "narrative": "...", "headline": "...", "risks": [...], "opportunities": [...], "confidence": "high|medium|low" }`); const parsed = parseAIJson(ai.result); if (parsed.narrative) await req.prisma.crmForecast.update({ where: { id: f.id }, data: { aiNarrative: parsed.narrative } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-pipe-coverage', rl, async (req, res) => {
  try { const f = await loadForecast(req.prisma, req.body.id, res); if (!f) return; const coverage = f.quotaAmount && f.pipelineAmount ? (f.pipelineAmount / f.quotaAmount) * 100 : null; const ai = await callAI(`Analyze pipeline coverage for this forecast period.\nForecast: ${JSON.stringify({ period: f.period, quotaAmount: f.quotaAmount, pipelineAmount: f.pipelineAmount, closedAmount: f.closedAmount })}\nCurrent Coverage: ${coverage ? coverage.toFixed(1)+'%' : 'unknown'}\nRespond JSON: { "coverageRatio": 0, "coverageTier": "healthy|at_risk|critical", "recommendation": "...", "requiredPipelineBuild": 0 }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-deal-forecast-category', rl, async (req, res) => {
  try { const { opportunityId } = req.body; if (!opportunityId) return res.status(400).json({ error: 'opportunityId required' }); const opp = await req.prisma.crmOpportunity.findUnique({ where: { id: opportunityId } }); if (!opp) return res.status(404).json({ error: 'Opportunity not found' }); const ai = await callAI(`Classify the forecast category for this opportunity.\nOpp: ${JSON.stringify({ name: opp.name, amount: opp.amount, probability: opp.probability, closeDate: opp.closeDate, isStalled: opp.isStalled, forecastCategory: opp.forecastCategory })}\nCategories: commit|best_case|pipeline|omitted\nRespond JSON: { "forecastCategory": "...", "confidence": "high|medium|low", "rationale": "..." }`); const parsed = parseAIJson(ai.result); if (parsed.forecastCategory) await req.prisma.crmOpportunity.update({ where: { id: opportunityId }, data: { forecastCategory: parsed.forecastCategory } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/summarize-waterfall-movements', rl, async (req, res) => {
  try { const f = await loadForecast(req.prisma, req.body.id, res); if (!f) return; const ai = await callAI(`Summarize the waterfall movements in this forecast.\nForecast: ${JSON.stringify({ period: f.period, waterfallData: f.waterfallData, commitAmount: f.commitAmount, closedAmount: f.closedAmount, pipelineAmount: f.pipelineAmount })}\nRespond JSON: { "summary": "...", "wins": [...], "losses": [...], "slips": [...], "newPipe": [...], "netMovement": 0 }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-pipeline-build-action', rl, async (req, res) => {
  try { const f = await loadForecast(req.prisma, req.body.id, res); if (!f) return; const ai = await callAI(`Suggest pipeline build actions for this forecast period.\nForecast: ${JSON.stringify({ period: f.period, quotaAmount: f.quotaAmount, pipelineAmount: f.pipelineAmount, closedAmount: f.closedAmount })}\nRespond JSON: { "pipelineGap": 0, "actions": [...], "targetICPs": [...], "campaigns": [...], "timeline": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/validate-forecast-roll-up', rl, async (req, res) => {
  try { const { period, teamId } = req.body; if (!period) return res.status(400).json({ error: 'period required' }); const forecasts = await req.prisma.crmForecast.findMany({ where: { period, ...(teamId ? { teamId } : {}), isArchived: false } }); const ai = await callAI(`Validate the forecast roll-up for this period.\nPeriod: ${period}\nIndividual Forecasts: ${JSON.stringify(forecasts.map(f=>({ ownerId: f.ownerId, commitAmount: f.commitAmount, bestCaseAmount: f.bestCaseAmount, pipelineAmount: f.pipelineAmount })))}\nRespond JSON: { "totalCommit": 0, "totalBestCase": 0, "totalPipeline": 0, "isValid": true|false, "discrepancies": [...], "rollUpConfidence": "high|medium|low" }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-late-stage-slip', rl, async (req, res) => {
  try { const f = await loadForecast(req.prisma, req.body.id, res); if (!f) return; const lateOpps = await req.prisma.crmOpportunity.findMany({ where: { isArchived: false, forecastCategory: 'commit', closeDate: { lte: new Date(f.periodEnd) }, isStalled: true } }).catch(()=>[]); const ai = await callAI(`Detect late-stage slippage risk in this forecast.\nForecast: ${JSON.stringify({ period: f.period, commitAmount: f.commitAmount })}\nStalledCommitDeals: ${JSON.stringify(lateOpps.map(o=>({ name: o.name, amount: o.amount, closeDate: o.closeDate })))}\nRespond JSON: { "slipRisk": "high|medium|low", "atRiskAmount": 0, "slipCandidates": [...], "mitigation": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-forecast-cadence', rl, async (req, res) => {
  try { const { ownerId, period } = req.body; const ai = await callAI(`Recommend a forecast review cadence for this rep/team.\nOwnerId: ${ownerId||'team'}\nPeriod: ${period||'Q1'}\nRespond JSON: { "cadence": [...], "checkpointDates": [...], "reviewFormat": "...", "escalationThreshold": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-bookings-vs-billings', rl, async (req, res) => {
  try { const f = await loadForecast(req.prisma, req.body.id, res); if (!f) return; const ai = await callAI(`Predict the gap between bookings and billings for this forecast period.\nForecast: ${JSON.stringify({ period: f.period, commitAmount: f.commitAmount, closedAmount: f.closedAmount, quotaAmount: f.quotaAmount })}\nRespond JSON: { "predictedBookings": 0, "predictedBillings": 0, "gap": 0, "gapDrivers": [...], "revenueRecognitionNotes": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-board-forecast', rl, async (req, res) => {
  try { const f = await loadForecast(req.prisma, req.body.id, res); if (!f) return; const ai = await callAI(`Generate a board-level forecast presentation for this period.\nForecast: ${JSON.stringify(f)}\nRespond JSON: { "headline": "...", "quarterSummary": "...", "keyMetrics": { "quota": 0, "commit": 0, "bestCase": 0, "closedToDate": 0 }, "risks": [...], "opportunities": [...], "guidance": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
