import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const getClient = () => new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY, defaultHeaders: { 'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000', 'X-Title': 'AI CRM Pipeline Stages' } });
const rlMap = new Map();
function rl(req, res, next) { const key = req.user ? `user:${req.user.id}` : `ip:${req.ip}`; const now = Date.now(); const e = rlMap.get(key) || { count: 0, resetAt: now + 3600000 }; if (now > e.resetAt) { e.count = 0; e.resetAt = now + 3600000; } e.count++; rlMap.set(key, e); if (e.count > 20) return res.status(429).json({ error: 'Rate limit exceeded.' }); next(); }
function parseAIJson(c) { if (!c) return { raw_response: '' }; const cb = c.match(/```(?:json)?\s*([\s\S]*?)```/); if (cb) { try { return JSON.parse(cb[1].trim()); } catch (_) {} } try { return JSON.parse(c); } catch (_) {} const jm = c.match(/\{[\s\S]*\}/); if (jm) { try { return JSON.parse(jm[0]); } catch (_) {} } return { raw_response: c }; }
async function callAI(prompt) { const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022'; const comp = await getClient().chat.completions.create({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 1024, temperature: 0.2 }); return { result: comp.choices[0]?.message?.content || '', model, usage: comp.usage }; }
async function loadStage(prisma, id, res) { const r = await prisma.crmPipelineStage.findUnique({ where: { id } }); if (!r) { res.status(404).json({ error: 'Pipeline stage not found' }); return null; } return r; }

// ── CRUD ──────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||50, skip = (page-1)*limit;
    const where = { isArchived: false }; if (req.query.pipelineId) where.pipelineId = req.query.pipelineId;
    const [data, total] = await Promise.all([req.prisma.crmPipelineStage.findMany({ where, skip, take: limit, orderBy: { order: 'asc' } }), req.prisma.crmPipelineStage.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/count', async (req, res) => {
  try { const where = { isArchived: false }; if (req.query.pipelineId) where.pipelineId = req.query.pipelineId; res.json({ count: await req.prisma.crmPipelineStage.count({ where }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q||'', page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const where = { isArchived: false, OR: [{ name: { contains: q, mode: 'insensitive' } }] };
    const [data, total] = await Promise.all([req.prisma.crmPipelineStage.findMany({ where, skip, take: limit, orderBy: { order: 'asc' } }), req.prisma.crmPipelineStage.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-pipeline/:pipelineId', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||50, skip = (page-1)*limit;
    const [data, total] = await Promise.all([req.prisma.crmPipelineStage.findMany({ where: { pipelineId: req.params.pipelineId, isArchived: false }, skip, take: limit, orderBy: { order: 'asc' } }), req.prisma.crmPipelineStage.count({ where: { pipelineId: req.params.pipelineId, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-active', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||50, skip = (page-1)*limit;
    const [data, total] = await Promise.all([req.prisma.crmPipelineStage.findMany({ where: { isActive: true, isArchived: false }, skip, take: limit, orderBy: { order: 'asc' } }), req.prisma.crmPipelineStage.count({ where: { isActive: true, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/csv', async (req, res) => {
  try {
    const data = await req.prisma.crmPipelineStage.findMany({ where: { isArchived: false }, orderBy: { order: 'asc' } });
    const fields = ['id','name','order','probability','pipelineId','isActive','createdAt','updatedAt'];
    res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="crm_pipeline_stages.csv"');
    res.send([fields.join(','), ...data.map(r => fields.map(f => `"${r[f]==null?'':String(r[f]).replace(/"/g,'""')}"`).join(','))].join('\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const [total, active, archived] = await Promise.all([req.prisma.crmPipelineStage.count(), req.prisma.crmPipelineStage.count({ where: { isActive: true } }), req.prisma.crmPipelineStage.count({ where: { isArchived: true } })]);
    const oppsByStage = await req.prisma.crmOpportunity.groupBy({ by: ['stageId'], _count: { id: true }, _sum: { amount: true }, where: { isArchived: false } }).catch(()=>[]);
    res.json({ total, active, archived, oppsByStage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/batch', async (req, res) => {
  try { const { items } = req.body; if (!Array.isArray(items)||!items.length) return res.status(400).json({ error: 'items array required' }); res.status(201).json({ count: (await req.prisma.crmPipelineStage.createMany({ data: items, skipDuplicates: true })).count }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/batch', async (req, res) => {
  try { const { items } = req.body; if (!Array.isArray(items)||!items.length) return res.status(400).json({ error: 'items array required' }); res.json({ data: await Promise.all(items.map(async ({ id, ...f }) => { if (!id) return { error: 'missing id' }; return req.prisma.crmPipelineStage.update({ where: { id }, data: f }); })) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/batch', async (req, res) => {
  try { const { ids } = req.body; if (!Array.isArray(ids)||!ids.length) return res.status(400).json({ error: 'ids array required' }); res.json({ updated: (await req.prisma.crmPipelineStage.updateMany({ where: { id: { in: ids } }, data: { isArchived: true, archivedAt: new Date() } })).count }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/import/csv', async (req, res) => {
  try {
    const { csv } = req.body; if (!csv) return res.status(400).json({ error: 'csv field required' });
    const lines = csv.split('\n').map(l=>l.trim()).filter(Boolean); if (lines.length<2) return res.status(400).json({ error: 'CSV needs header+data' });
    const headers = lines[0].split(',').map(h=>h.replace(/"/g,'').trim());
    const items = lines.slice(1).map(line => { const vals = line.match(/(".*?"|[^,]+)/g)||[]; const obj={}; headers.forEach((h,i)=>{ obj[h]=vals[i]?vals[i].replace(/^"|"$/g,'').replace(/""/g,'"'):null; }); return obj; });
    res.status(201).json({ count: (await req.prisma.crmPipelineStage.createMany({ data: items, skipDuplicates: true })).count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try { const r = await req.prisma.crmPipelineStage.findUnique({ where: { id: req.params.id } }); if (!r) return res.status(404).json({ error: 'Stage not found' }); res.json({ data: r }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json({ data: await req.prisma.crmPipelineStage.create({ data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmPipelineStage.update({ where: { id: req.params.id }, data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmPipelineStage.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/archive', async (req, res) => {
  try { res.json({ data: await req.prisma.crmPipelineStage.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/restore', async (req, res) => {
  try { res.json({ data: await req.prisma.crmPipelineStage.update({ where: { id: req.params.id }, data: { isArchived: false, archivedAt: null, isActive: true } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/history', async (req, res) => {
  try { const r = await req.prisma.crmPipelineStage.findUnique({ where: { id: req.params.id } }); if (!r) return res.status(404).json({ error: 'Stage not found' }); res.json({ data: await req.prisma.auditLog.findMany({ where: { entityId: req.params.id, entity: 'CrmPipelineStage' }, orderBy: { createdAt: 'desc' } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AI ────────────────────────────────────────────────────────────────────────

router.post('/ai/suggest-stage-criteria', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const ai = await callAI(`Suggest entry and exit criteria for this pipeline stage.\nStage: ${JSON.stringify({ name: s.name, order: s.order, probability: s.probability })}\nRespond JSON: { "entryCriteria": [...], "exitCriteria": [...], "examples": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-skipped-stages', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const ai = await callAI(`Analyze if deals are skipping this stage and what it signals.\nStage: ${JSON.stringify({ name: s.name, order: s.order, probability: s.probability })}\nRespond JSON: { "skipLikelihood": "high|medium|low", "skipReasons": [...], "impact": "...", "remediation": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-stage-conversion', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const ai = await callAI(`Predict stage conversion rates and velocity for this pipeline stage.\nStage: ${JSON.stringify({ name: s.name, probability: s.probability, order: s.order })}\nRespond JSON: { "conversionRate": 0-100, "avgDaysInStage": "...", "topConversionFactors": [...], "recommendations": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-stage-bottleneck', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const ai = await callAI(`Classify if this stage is a bottleneck in the pipeline.\nStage: ${JSON.stringify({ name: s.name, probability: s.probability, order: s.order })}\nRespond JSON: { "isBottleneck": true|false, "severity": "critical|high|medium|low", "causes": [...], "fixes": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-stage-redesign', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const ai = await callAI(`Recommend improvements to this pipeline stage definition.\nStage: ${JSON.stringify({ name: s.name, order: s.order, probability: s.probability, entryConditions: s.entryConditions, exitConditions: s.exitConditions })}\nRespond JSON: { "redesignNeeded": true|false, "suggestions": [...], "newName": "...", "newProbability": "...", "rationale": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/summarize-stage-velocity', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const ai = await callAI(`Summarize deal velocity through this pipeline stage.\nStage: ${JSON.stringify({ name: s.name, probability: s.probability })}\nRespond JSON: { "avgDaysInStage": "...", "fastestDeals": "...", "slowestDeals": "...", "velocityTrend": "improving|stable|declining", "actions": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/score-stage-discipline', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const ai = await callAI(`Score how well the sales team adheres to this stage's definition.\nStage: ${JSON.stringify({ name: s.name, entryConditions: s.entryConditions, exitConditions: s.exitConditions })}\nRespond JSON: { "disciplineScore": 0-100, "commonViolations": [...], "improvementAreas": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/validate-stage-definitions', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const ai = await callAI(`Validate the stage definitions for completeness and clarity.\nStage: ${JSON.stringify({ name: s.name, entryConditions: s.entryConditions, exitConditions: s.exitConditions, automationRules: s.automationRules })}\nRespond JSON: { "isValid": true|false, "issues": [...], "suggestions": [...], "qualityScore": 0-100 }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-stage-narrative', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const ai = await callAI(`Generate a narrative description of this pipeline stage for onboarding.\nStage: ${JSON.stringify({ name: s.name, order: s.order, probability: s.probability, entryConditions: s.entryConditions, exitConditions: s.exitConditions })}\nRespond JSON: { "narrative": "...", "purpose": "...", "keyActivities": [...], "successIndicators": [...] }`); const parsed = parseAIJson(ai.result); if (parsed.narrative) await req.prisma.crmPipelineStage.update({ where: { id: s.id }, data: { aiSummary: parsed.narrative } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-stage-exit-criteria-fit', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const { opportunityId } = req.body; let opp = null; if (opportunityId) opp = await req.prisma.crmOpportunity.findUnique({ where: { id: opportunityId } }).catch(()=>null); const ai = await callAI(`Determine if an opportunity meets the exit criteria for this stage.\nStage: ${JSON.stringify({ name: s.name, exitConditions: s.exitConditions })}\nOpportunity: ${JSON.stringify(opp || {})}\nRespond JSON: { "meetsCriteria": true|false, "metCriteria": [...], "unmetCriteria": [...], "recommendation": "advance|stay|return" }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-automation-rule', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const ai = await callAI(`Suggest automation rules for this pipeline stage.\nStage: ${JSON.stringify({ name: s.name, entryConditions: s.entryConditions, exitConditions: s.exitConditions })}\nRespond JSON: { "automationRules": [...], "triggers": [...], "actions": [...], "estimatedTimeSaved": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-stalled-stage', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const count = await req.prisma.crmOpportunity.count({ where: { stageId: s.id, isStalled: true, isArchived: false } }).catch(()=>0); const ai = await callAI(`Detect if this pipeline stage is experiencing a stall pattern.\nStage: ${JSON.stringify({ name: s.name, probability: s.probability })}\nStalledDealsCount: ${count}\nRespond JSON: { "isStageStalled": true|false, "stallPattern": "...", "impact": "...", "interventions": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-stage-merge', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const allStages = await req.prisma.crmPipelineStage.findMany({ where: { isArchived: false }, orderBy: { order: 'asc' } }).catch(()=>[]); const ai = await callAI(`Recommend if this stage should be merged with an adjacent stage.\nThis Stage: ${JSON.stringify({ name: s.name, order: s.order, probability: s.probability })}\nAll Stages: ${JSON.stringify(allStages.map(st=>({ name: st.name, order: st.order, probability: st.probability })))}\nRespond JSON: { "shouldMerge": true|false, "mergeWith": "...", "rationale": "...", "simplifiedPipeline": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-stage-health', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const ai = await callAI(`Classify the overall health of this pipeline stage.\nStage: ${JSON.stringify({ name: s.name, order: s.order, probability: s.probability, isActive: s.isActive })}\nRespond JSON: { "health": "healthy|at_risk|critical", "healthScore": 0-100, "factors": [...], "actions": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-rep-stage-skill-gap', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const ai = await callAI(`Predict skill gaps reps may have for this pipeline stage.\nStage: ${JSON.stringify({ name: s.name, entryConditions: s.entryConditions, exitConditions: s.exitConditions })}\nRespond JSON: { "commonSkillGaps": [...], "trainingTopics": [...], "coachingFocus": "...", "assessmentCriteria": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/summarize-stage-history', rl, async (req, res) => {
  try { const s = await loadStage(req.prisma, req.body.id, res); if (!s) return; const logs = await req.prisma.auditLog.findMany({ where: { entityId: s.id }, orderBy: { createdAt: 'desc' }, take: 20 }).catch(()=>[]); const ai = await callAI(`Summarize the history of changes to this pipeline stage.\nStage: ${JSON.stringify({ name: s.name })}\nLogs: ${JSON.stringify(logs)}\nRespond JSON: { "summary": "...", "keyChanges": [...], "trend": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
