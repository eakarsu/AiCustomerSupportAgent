import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const getClient = () => new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY, defaultHeaders: { 'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000', 'X-Title': 'AI CRM Opportunities' } });
const rlMap = new Map();
function rl(req, res, next) {
  const key = req.user ? `user:${req.user.id}` : `ip:${req.ip}`; const now = Date.now();
  const e = rlMap.get(key) || { count: 0, resetAt: now + 3600000 };
  if (now > e.resetAt) { e.count = 0; e.resetAt = now + 3600000; } e.count++; rlMap.set(key, e);
  if (e.count > 20) return res.status(429).json({ error: 'Rate limit exceeded.' }); next();
}
function parseAIJson(c) {
  if (!c) return { raw_response: '' }; const cb = c.match(/```(?:json)?\s*([\s\S]*?)```/); if (cb) { try { return JSON.parse(cb[1].trim()); } catch (_) {} }
  try { return JSON.parse(c); } catch (_) {} const jm = c.match(/\{[\s\S]*\}/); if (jm) { try { return JSON.parse(jm[0]); } catch (_) {} } return { raw_response: c };
}
async function callAI(prompt) {
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
  const comp = await getClient().chat.completions.create({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 1024, temperature: 0.2 });
  return { result: comp.choices[0]?.message?.content || '', model, usage: comp.usage };
}
async function loadOpp(prisma, id, res) {
  const r = await prisma.crmOpportunity.findUnique({ where: { id } }); if (!r) { res.status(404).json({ error: 'Opportunity not found' }); return null; } return r;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const where = { isArchived: false };
    if (req.query.stageId) where.stageId = req.query.stageId;
    if (req.query.accountId) where.accountId = req.query.accountId;
    if (req.query.ownerId) where.ownerId = req.query.ownerId;
    const [data, total] = await Promise.all([req.prisma.crmOpportunity.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmOpportunity.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/count', async (req, res) => {
  try {
    const where = { isArchived: false };
    if (req.query.stageId) where.stageId = req.query.stageId;
    if (req.query.ownerId) where.ownerId = req.query.ownerId;
    res.json({ count: await req.prisma.crmOpportunity.count({ where }) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q||'', page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const where = { isArchived: false, OR: [{ name: { contains: q, mode: 'insensitive' } }, { type: { contains: q, mode: 'insensitive' } }] };
    const [data, total] = await Promise.all([req.prisma.crmOpportunity.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmOpportunity.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-account/:accountId', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const [data, total] = await Promise.all([req.prisma.crmOpportunity.findMany({ where: { accountId: req.params.accountId, isArchived: false }, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmOpportunity.count({ where: { accountId: req.params.accountId, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-contact/:contactId', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const [data, total] = await Promise.all([req.prisma.crmOpportunity.findMany({ where: { contactId: req.params.contactId, isArchived: false }, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmOpportunity.count({ where: { contactId: req.params.contactId, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/csv', async (req, res) => {
  try {
    const data = await req.prisma.crmOpportunity.findMany({ where: { isArchived: false }, orderBy: { createdAt: 'desc' } });
    const fields = ['id','name','accountId','contactId','stageId','amount','closeDate','probability','forecastCategory','winProbScore','dealRiskScore','isStalled','createdAt','updatedAt'];
    const header = fields.join(',');
    const rows = data.map(r => fields.map(f => { const v = r[f]==null?'':String(r[f]).replace(/"/g,'""'); return `"${v}"`; }).join(','));
    res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="crm_opportunities.csv"'); res.send([header,...rows].join('\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const [total, stalled, byForecast] = await Promise.all([
      req.prisma.crmOpportunity.count({ where: { isArchived: false } }),
      req.prisma.crmOpportunity.count({ where: { isStalled: true, isArchived: false } }),
      req.prisma.crmOpportunity.groupBy({ by: ['forecastCategory'], _count: { id: true }, _sum: { amount: true }, where: { isArchived: false } })
    ]);
    res.json({ total, stalled, byForecast });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/batch', async (req, res) => {
  try {
    const { items } = req.body; if (!Array.isArray(items)||!items.length) return res.status(400).json({ error: 'items array required' });
    res.status(201).json({ count: (await req.prisma.crmOpportunity.createMany({ data: items, skipDuplicates: true })).count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/batch', async (req, res) => {
  try {
    const { items } = req.body; if (!Array.isArray(items)||!items.length) return res.status(400).json({ error: 'items array required' });
    res.json({ data: await Promise.all(items.map(async ({ id, ...f }) => { if (!id) return { error: 'missing id' }; return req.prisma.crmOpportunity.update({ where: { id }, data: f }); })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body; if (!Array.isArray(ids)||!ids.length) return res.status(400).json({ error: 'ids array required' });
    res.json({ updated: (await req.prisma.crmOpportunity.updateMany({ where: { id: { in: ids } }, data: { isArchived: true, archivedAt: new Date() } })).count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/import/csv', async (req, res) => {
  try {
    const { csv } = req.body; if (!csv) return res.status(400).json({ error: 'csv field required' });
    const lines = csv.split('\n').map(l=>l.trim()).filter(Boolean); if (lines.length<2) return res.status(400).json({ error: 'CSV needs header+data' });
    const headers = lines[0].split(',').map(h=>h.replace(/"/g,'').trim());
    const items = lines.slice(1).map(line => { const vals = line.match(/(".*?"|[^,]+)/g)||[]; const obj={}; headers.forEach((h,i)=>{ obj[h]=vals[i]?vals[i].replace(/^"|"$/g,'').replace(/""/g,'"'):null; }); return obj; });
    res.status(201).json({ count: (await req.prisma.crmOpportunity.createMany({ data: items, skipDuplicates: true })).count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await req.prisma.crmOpportunity.findUnique({ where: { id: req.params.id }, include: { account: true, contact: true, stage: true } });
    if (!r) return res.status(404).json({ error: 'Opportunity not found' }); res.json({ data: r });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json({ data: await req.prisma.crmOpportunity.create({ data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmOpportunity.update({ where: { id: req.params.id }, data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmOpportunity.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/archive', async (req, res) => {
  try { res.json({ data: await req.prisma.crmOpportunity.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/restore', async (req, res) => {
  try { res.json({ data: await req.prisma.crmOpportunity.update({ where: { id: req.params.id }, data: { isArchived: false, archivedAt: null } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/history', async (req, res) => {
  try {
    const r = await req.prisma.crmOpportunity.findUnique({ where: { id: req.params.id } }); if (!r) return res.status(404).json({ error: 'Opportunity not found' });
    res.json({ data: await req.prisma.auditLog.findMany({ where: { entityId: req.params.id, entity: 'CrmOpportunity' }, orderBy: { createdAt: 'desc' } }) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AI ────────────────────────────────────────────────────────────────────────

router.post('/ai/predict-close-date', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Predict the actual close date for this opportunity.\nOpp: ${JSON.stringify({ name: opp.name, amount: opp.amount, probability: opp.probability, closeDate: opp.closeDate, isStalled: opp.isStalled })}\nRespond JSON: { "predictedCloseDate": "YYYY-MM-DD", "confidence": "high|medium|low", "rationale": "...", "riskFactors": [...] }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/score-win-probability', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Score the win probability for this opportunity.\nOpp: ${JSON.stringify(opp)}\nRespond JSON: { "winProbability": 0-100, "confidence": "high|medium|low", "positiveFactors": [...], "negativeFactors": [...] }`);
    const parsed = parseAIJson(ai.result);
    if (typeof parsed.winProbability==='number') await req.prisma.crmOpportunity.update({ where: { id: opp.id }, data: { winProbScore: parsed.winProbability } }).catch(()=>{});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-stage-fit', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Assess if this opportunity is correctly placed in its current pipeline stage.\nOpp: ${JSON.stringify({ name: opp.name, stageId: opp.stageId, probability: opp.probability, amount: opp.amount, nextStep: opp.nextStep })}\nRespond JSON: { "stageFit": "correct|too_early|too_late", "confidence": "high|medium|low", "suggestedStage": "...", "rationale": "..." }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-next-best-action', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Suggest the next best action to advance this opportunity.\nOpp: ${JSON.stringify({ name: opp.name, amount: opp.amount, closeDate: opp.closeDate, probability: opp.probability, nextStep: opp.nextStep, isStalled: opp.isStalled })}\nRespond JSON: { "nextAction": "...", "channel": "...", "timing": "...", "talkingPoints": [...], "urgency": "high|medium|low" }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-stalled-opp', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Detect if this opportunity is stalled.\nOpp: ${JSON.stringify({ name: opp.name, stageId: opp.stageId, closeDate: opp.closeDate, updatedAt: opp.updatedAt, isStalled: opp.isStalled })}\nRespond JSON: { "isStalled": true|false, "stallReason": "...", "daysSinceUpdate": "...", "recoveryActions": [...] }`);
    const parsed = parseAIJson(ai.result);
    if (typeof parsed.isStalled==='boolean') await req.prisma.crmOpportunity.update({ where: { id: opp.id }, data: { isStalled: parsed.isStalled } }).catch(()=>{});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-deal-coach', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Provide deal coaching advice for this opportunity.\nOpp: ${JSON.stringify({ name: opp.name, amount: opp.amount, probability: opp.probability, isStalled: opp.isStalled, dealRiskScore: opp.dealRiskScore, isSingleThread: opp.isSingleThread })}\nRespond JSON: { "coachingAdvice": "...", "dealRisks": [...], "coachingActions": [...], "priority": "high|medium|low" }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-deal-summary', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Generate a comprehensive deal summary for this opportunity.\nOpp: ${JSON.stringify(opp)}\nRespond JSON: { "summary": "...", "status": "...", "keyDecisions": [...], "openIssues": [...], "winTheme": "..." }`);
    const parsed = parseAIJson(ai.result);
    if (parsed.summary) await req.prisma.crmOpportunity.update({ where: { id: opp.id }, data: { aiSummary: parsed.summary } }).catch(()=>{});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-discount-needed', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Predict whether a discount will be needed to close this deal.\nOpp: ${JSON.stringify({ name: opp.name, amount: opp.amount, probability: opp.probability, closeDate: opp.closeDate })}\nRespond JSON: { "discountLikelihood": "high|medium|low", "estimatedDiscountPct": "...", "triggers": [...], "mitigation": "..." }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-loss-reason', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Classify the primary loss reason for this opportunity.\nOpp: ${JSON.stringify({ name: opp.name, lossReason: opp.lossReason, amount: opp.amount, forecastCategory: opp.forecastCategory })}\nRespond JSON: { "primaryLossReason": "price|competitor|timing|champion_left|no_decision|fit|unknown", "secondaryReasons": [...], "preventable": true|false, "learnings": [...] }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/summarize-opp-history', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const acts = await req.prisma.crmActivity.findMany({ where: { opportunityId: opp.id }, orderBy: { createdAt: 'desc' }, take: 20 }).catch(()=>[]);
    const ai = await callAI(`Summarize the history of this opportunity.\nOpp: ${JSON.stringify({ name: opp.name, amount: opp.amount, probability: opp.probability })}\nActivities: ${JSON.stringify(acts)}\nRespond JSON: { "summary": "...", "timeline": [...], "momentum": "positive|neutral|negative", "openItems": [...] }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/score-deal-risk', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Score the overall risk of this deal.\nOpp: ${JSON.stringify({ name: opp.name, amount: opp.amount, closeDate: opp.closeDate, isStalled: opp.isStalled, isSingleThread: opp.isSingleThread, probability: opp.probability })}\nRespond JSON: { "riskScore": 0-100, "riskTier": "critical|high|medium|low", "riskFactors": [...], "mitigationActions": [...] }`);
    const parsed = parseAIJson(ai.result);
    if (typeof parsed.riskScore==='number') await req.prisma.crmOpportunity.update({ where: { id: opp.id }, data: { dealRiskScore: parsed.riskScore } }).catch(()=>{});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-single-thread', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Determine if this opportunity is single-threaded (relying on one stakeholder).\nOpp: ${JSON.stringify({ name: opp.name, contactId: opp.contactId, isSingleThread: opp.isSingleThread })}\nRespond JSON: { "isSingleThread": true|false, "risk": "high|medium|low", "multiThreadStrategy": "...", "keyPersonsToAdd": [...] }`);
    const parsed = parseAIJson(ai.result);
    if (typeof parsed.isSingleThread==='boolean') await req.prisma.crmOpportunity.update({ where: { id: opp.id }, data: { isSingleThread: parsed.isSingleThread } }).catch(()=>{});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-multi-thread-strategy', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Suggest a multi-threading strategy for this opportunity.\nOpp: ${JSON.stringify({ name: opp.name, amount: opp.amount, accountId: opp.accountId })}\nRespond JSON: { "currentCoverage": "...", "missingPersonas": [...], "outreachPlan": [...], "multiThreadScore": 0-100 }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-pull-forward', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Assess the likelihood of pulling this opportunity forward to close earlier.\nOpp: ${JSON.stringify({ name: opp.name, amount: opp.amount, closeDate: opp.closeDate, probability: opp.probability, isStalled: opp.isStalled })}\nRespond JSON: { "pullForwardLikelihood": "high|medium|low", "daysEarliestPossible": "...", "incentives": [...], "risks": [...] }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-engagement-cadence', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Recommend an engagement cadence for this opportunity.\nOpp: ${JSON.stringify({ name: opp.name, amount: opp.amount, closeDate: opp.closeDate, probability: opp.probability })}\nRespond JSON: { "cadence": [...], "touchFrequency": "...", "channels": [...], "urgency": "high|medium|low" }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-mutual-action-plan', rl, async (req, res) => {
  try {
    const opp = await loadOpp(req.prisma, req.body.id, res); if (!opp) return;
    const ai = await callAI(`Generate a mutual action plan (MAP) for closing this opportunity.\nOpp: ${JSON.stringify({ name: opp.name, amount: opp.amount, closeDate: opp.closeDate, nextStep: opp.nextStep })}\nRespond JSON: { "mapItems": [{ "action": "...", "owner": "...", "dueDate": "...", "status": "..." }], "goLiveDate": "...", "successCriteria": [...] }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
