import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const getClient = () => new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY, defaultHeaders: { 'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000', 'X-Title': 'AI CRM Activities' } });
const rlMap = new Map();
function rl(req, res, next) { const key = req.user ? `user:${req.user.id}` : `ip:${req.ip}`; const now = Date.now(); const e = rlMap.get(key) || { count: 0, resetAt: now + 3600000 }; if (now > e.resetAt) { e.count = 0; e.resetAt = now + 3600000; } e.count++; rlMap.set(key, e); if (e.count > 20) return res.status(429).json({ error: 'Rate limit exceeded.' }); next(); }
function parseAIJson(c) { if (!c) return { raw_response: '' }; const cb = c.match(/```(?:json)?\s*([\s\S]*?)```/); if (cb) { try { return JSON.parse(cb[1].trim()); } catch (_) {} } try { return JSON.parse(c); } catch (_) {} const jm = c.match(/\{[\s\S]*\}/); if (jm) { try { return JSON.parse(jm[0]); } catch (_) {} } return { raw_response: c }; }
async function callAI(prompt) { const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022'; const comp = await getClient().chat.completions.create({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 1024, temperature: 0.2 }); return { result: comp.choices[0]?.message?.content || '', model, usage: comp.usage }; }
async function loadAct(prisma, id, res) { const r = await prisma.crmActivity.findUnique({ where: { id } }); if (!r) { res.status(404).json({ error: 'Activity not found' }); return null; } return r; }

// ── CRUD ──────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const where = { isArchived: false };
    if (req.query.type) where.type = req.query.type;
    if (req.query.status) where.status = req.query.status;
    if (req.query.contactId) where.contactId = req.query.contactId;
    const [data, total] = await Promise.all([req.prisma.crmActivity.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmActivity.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/count', async (req, res) => {
  try { const where = { isArchived: false }; if (req.query.type) where.type = req.query.type; if (req.query.ownerId) where.ownerId = req.query.ownerId; res.json({ count: await req.prisma.crmActivity.count({ where }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q||'', page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const where = { isArchived: false, OR: [{ subject: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] };
    const [data, total] = await Promise.all([req.prisma.crmActivity.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmActivity.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-contact/:contactId', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const [data, total] = await Promise.all([req.prisma.crmActivity.findMany({ where: { contactId: req.params.contactId, isArchived: false }, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmActivity.count({ where: { contactId: req.params.contactId, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-opportunity/:opportunityId', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const [data, total] = await Promise.all([req.prisma.crmActivity.findMany({ where: { opportunityId: req.params.opportunityId, isArchived: false }, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmActivity.count({ where: { opportunityId: req.params.opportunityId, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/csv', async (req, res) => {
  try {
    const data = await req.prisma.crmActivity.findMany({ where: { isArchived: false }, orderBy: { createdAt: 'desc' } });
    const fields = ['id','type','subject','status','dueAt','completedAt','duration','outcome','contactId','accountId','opportunityId','ownerId','engagementQuality','sentiment','isCoachingMoment','createdAt'];
    res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="crm_activities.csv"');
    res.send([fields.join(','), ...data.map(r => fields.map(f=>`"${r[f]==null?'':String(r[f]).replace(/"/g,'""')}"`).join(','))].join('\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const [total, byType, coachingMoments] = await Promise.all([
      req.prisma.crmActivity.count({ where: { isArchived: false } }),
      req.prisma.crmActivity.groupBy({ by: ['type'], _count: { id: true }, where: { isArchived: false } }),
      req.prisma.crmActivity.count({ where: { isCoachingMoment: true, isArchived: false } })
    ]);
    res.json({ total, byType, coachingMoments });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/batch', async (req, res) => {
  try { const { items } = req.body; if (!Array.isArray(items)||!items.length) return res.status(400).json({ error: 'items array required' }); res.status(201).json({ count: (await req.prisma.crmActivity.createMany({ data: items, skipDuplicates: true })).count }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/batch', async (req, res) => {
  try { const { items } = req.body; if (!Array.isArray(items)||!items.length) return res.status(400).json({ error: 'items array required' }); res.json({ data: await Promise.all(items.map(async ({ id, ...f }) => { if (!id) return { error: 'missing id' }; return req.prisma.crmActivity.update({ where: { id }, data: f }); })) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/batch', async (req, res) => {
  try { const { ids } = req.body; if (!Array.isArray(ids)||!ids.length) return res.status(400).json({ error: 'ids array required' }); res.json({ updated: (await req.prisma.crmActivity.updateMany({ where: { id: { in: ids } }, data: { isArchived: true, archivedAt: new Date() } })).count }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/import/csv', async (req, res) => {
  try {
    const { csv } = req.body; if (!csv) return res.status(400).json({ error: 'csv field required' });
    const lines = csv.split('\n').map(l=>l.trim()).filter(Boolean); if (lines.length<2) return res.status(400).json({ error: 'CSV needs header+data' });
    const headers = lines[0].split(',').map(h=>h.replace(/"/g,'').trim());
    const items = lines.slice(1).map(line => { const vals = line.match(/(".*?"|[^,]+)/g)||[]; const obj={}; headers.forEach((h,i)=>{ obj[h]=vals[i]?vals[i].replace(/^"|"$/g,'').replace(/""/g,'"'):null; }); return obj; });
    res.status(201).json({ count: (await req.prisma.crmActivity.createMany({ data: items, skipDuplicates: true })).count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try { const r = await req.prisma.crmActivity.findUnique({ where: { id: req.params.id }, include: { contact: true, account: true, opportunity: true } }); if (!r) return res.status(404).json({ error: 'Activity not found' }); res.json({ data: r }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json({ data: await req.prisma.crmActivity.create({ data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmActivity.update({ where: { id: req.params.id }, data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmActivity.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/archive', async (req, res) => {
  try { res.json({ data: await req.prisma.crmActivity.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/restore', async (req, res) => {
  try { res.json({ data: await req.prisma.crmActivity.update({ where: { id: req.params.id }, data: { isArchived: false, archivedAt: null, status: 'open' } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/history', async (req, res) => {
  try { const r = await req.prisma.crmActivity.findUnique({ where: { id: req.params.id } }); if (!r) return res.status(404).json({ error: 'Activity not found' }); res.json({ data: await req.prisma.auditLog.findMany({ where: { entityId: req.params.id, entity: 'CrmActivity' }, orderBy: { createdAt: 'desc' } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AI ────────────────────────────────────────────────────────────────────────

router.post('/ai/classify-activity-type', rl, async (req, res) => {
  try { const a = await loadAct(req.prisma, req.body.id, res); if (!a) return; const ai = await callAI(`Classify the activity type.\nActivity: ${JSON.stringify({ subject: a.subject, description: a.description, type: a.type })}\nTypes: call|email|meeting|task|demo|proposal|followup\nRespond JSON: { "type": "...", "confidence": "high|medium|low", "rationale": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/summarize-activity-thread', rl, async (req, res) => {
  try {
    const { contactId, opportunityId } = req.body;
    const where = { isArchived: false, ...(contactId ? { contactId } : {}), ...(opportunityId ? { opportunityId } : {}) };
    const acts = await req.prisma.crmActivity.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20 });
    const ai = await callAI(`Summarize this thread of activities.\nActivities: ${JSON.stringify(acts)}\nRespond JSON: { "summary": "...", "lastContact": "...", "engagementTrend": "...", "openItems": [...] }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-follow-up', rl, async (req, res) => {
  try { const a = await loadAct(req.prisma, req.body.id, res); if (!a) return; const ai = await callAI(`Suggest a follow-up action after this activity.\nActivity: ${JSON.stringify({ subject: a.subject, type: a.type, outcome: a.outcome, completedAt: a.completedAt })}\nRespond JSON: { "followUpType": "...", "timing": "...", "subject": "...", "keyPoints": [...], "urgency": "high|medium|low" }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-meeting-no-show', rl, async (req, res) => {
  try { const a = await loadAct(req.prisma, req.body.id, res); if (!a) return; const ai = await callAI(`Predict the likelihood of a no-show for this meeting activity.\nActivity: ${JSON.stringify({ subject: a.subject, type: a.type, dueAt: a.dueAt, status: a.status })}\nRespond JSON: { "noShowRisk": "high|medium|low", "probability": 0-100, "riskFactors": [...], "mitigation": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/score-engagement-quality', rl, async (req, res) => {
  try { const a = await loadAct(req.prisma, req.body.id, res); if (!a) return; const ai = await callAI(`Score the quality of engagement from this activity.\nActivity: ${JSON.stringify({ subject: a.subject, type: a.type, outcome: a.outcome, duration: a.duration, description: a.description })}\nRespond JSON: { "engagementScore": 0-100, "qualityFactors": [...], "improvements": [...] }`); const parsed = parseAIJson(ai.result); if (typeof parsed.engagementScore==='number') await req.prisma.crmActivity.update({ where: { id: a.id }, data: { engagementQuality: parsed.engagementScore } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-low-value-activity', rl, async (req, res) => {
  try { const a = await loadAct(req.prisma, req.body.id, res); if (!a) return; const ai = await callAI(`Determine if this activity is low-value or busy work.\nActivity: ${JSON.stringify({ subject: a.subject, type: a.type, outcome: a.outcome, duration: a.duration })}\nRespond JSON: { "isLowValue": true|false, "reasons": [...], "betterAlternative": "...", "timeWasted": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-activity-cadence', rl, async (req, res) => {
  try { const { contactId, opportunityId } = req.body; const ai = await callAI(`Recommend an optimal activity cadence for this record.\nContactId: ${contactId||'n/a'}\nOpportunityId: ${opportunityId||'n/a'}\nRespond JSON: { "cadence": [...], "touchFrequency": "...", "channels": [...], "reasoning": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-activity-summary', rl, async (req, res) => {
  try { const a = await loadAct(req.prisma, req.body.id, res); if (!a) return; const ai = await callAI(`Generate a concise activity summary for CRM logging.\nActivity: ${JSON.stringify(a)}\nRespond JSON: { "summary": "...", "keyOutcomes": [...], "nextSteps": [...], "dealImpact": "positive|neutral|negative" }`); const parsed = parseAIJson(ai.result); if (parsed.summary) await req.prisma.crmActivity.update({ where: { id: a.id }, data: { aiSummary: parsed.summary } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-best-channel', rl, async (req, res) => {
  try { const a = await loadAct(req.prisma, req.body.id, res); if (!a) return; const ai = await callAI(`Predict the best communication channel for follow-up on this activity.\nActivity: ${JSON.stringify({ subject: a.subject, type: a.type, outcome: a.outcome })}\nRespond JSON: { "bestChannel": "email|phone|linkedin|sms|inperson", "confidence": "high|medium|low", "reasoning": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-sentiment', rl, async (req, res) => {
  try { const a = await loadAct(req.prisma, req.body.id, res); if (!a) return; const ai = await callAI(`Classify the sentiment of this activity based on outcome and description.\nActivity: ${JSON.stringify({ subject: a.subject, description: a.description, outcome: a.outcome })}\nRespond JSON: { "sentiment": "positive|neutral|negative|mixed", "confidence": "high|medium|low", "signals": [...] }`); const parsed = parseAIJson(ai.result); if (parsed.sentiment) await req.prisma.crmActivity.update({ where: { id: a.id }, data: { sentiment: parsed.sentiment } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-call-script', rl, async (req, res) => {
  try { const a = await loadAct(req.prisma, req.body.id, res); if (!a) return; const ai = await callAI(`Suggest a call script for this upcoming activity.\nActivity: ${JSON.stringify({ subject: a.subject, type: a.type, dueAt: a.dueAt })}\nRespond JSON: { "opener": "...", "agenda": [...], "talkingPoints": [...], "objectionHandling": [...], "closer": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/validate-activity-logging', rl, async (req, res) => {
  try { const a = await loadAct(req.prisma, req.body.id, res); if (!a) return; const ai = await callAI(`Validate that this activity is properly logged with sufficient detail.\nActivity: ${JSON.stringify(a)}\nRespond JSON: { "isComplete": true|false, "missingFields": [...], "qualityScore": 0-100, "recommendations": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-coaching-moment', rl, async (req, res) => {
  try { const a = await loadAct(req.prisma, req.body.id, res); if (!a) return; const ai = await callAI(`Detect if this activity contains a coaching moment for the rep.\nActivity: ${JSON.stringify({ subject: a.subject, type: a.type, outcome: a.outcome, description: a.description })}\nRespond JSON: { "isCoachingMoment": true|false, "coachingArea": "...", "observation": "...", "coachingTip": "..." }`); const parsed = parseAIJson(ai.result); if (typeof parsed.isCoachingMoment==='boolean') await req.prisma.crmActivity.update({ where: { id: a.id }, data: { isCoachingMoment: parsed.isCoachingMoment } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-activity-template', rl, async (req, res) => {
  try { const { type, context } = req.body; const ai = await callAI(`Recommend an activity template for this type of interaction.\nType: ${type||'call'}\nContext: ${context||'sales follow-up'}\nRespond JSON: { "template": { "subject": "...", "description": "...", "duration": 30, "agenda": [...] }, "variants": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/summarize-engagement-history', rl, async (req, res) => {
  try { const { contactId, opportunityId } = req.body; const where = { isArchived: false, ...(contactId ? { contactId } : {}), ...(opportunityId ? { opportunityId } : {}) }; const acts = await req.prisma.crmActivity.findMany({ where, orderBy: { createdAt: 'desc' }, take: 30 }); const ai = await callAI(`Summarize the full engagement history.\nActivities: ${JSON.stringify(acts)}\nRespond JSON: { "overallEngagement": "strong|moderate|weak", "timeline": [...], "insights": [...], "risks": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/score-activity-rep-productivity', rl, async (req, res) => {
  try { const { ownerId, periodDays } = req.body; if (!ownerId) return res.status(400).json({ error: 'ownerId required' }); const since = new Date(Date.now() - (parseInt(periodDays)||30) * 86400000); const acts = await req.prisma.crmActivity.findMany({ where: { ownerId, createdAt: { gte: since }, isArchived: false } }).catch(()=>[]); const ai = await callAI(`Score the productivity of this rep based on their activities.\nActivities: ${JSON.stringify(acts)}\nPeriodDays: ${periodDays||30}\nRespond JSON: { "productivityScore": 0-100, "activitiesPerDay": "...", "qualityScore": 0-100, "topStrengths": [...], "improvements": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
