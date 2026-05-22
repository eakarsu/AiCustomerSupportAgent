import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const getOpenRouterClient = () => new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: { 'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000', 'X-Title': 'AI CRM Accounts' }
});

const crmAccountsRlMap = new Map();
function crmAccountsRateLimit(req, res, next) {
  const key = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
  const now = Date.now();
  const entry = crmAccountsRlMap.get(key) || { count: 0, resetAt: now + 3600000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 3600000; }
  entry.count++;
  crmAccountsRlMap.set(key, entry);
  if (entry.count > 20) return res.status(429).json({ error: 'Rate limit exceeded. Max 20 AI calls per hour.' });
  next();
}

function parseAIJson(content) {
  if (!content) return { raw_response: '' };
  const cb = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (cb) { try { return JSON.parse(cb[1].trim()); } catch (e) {} }
  try { return JSON.parse(content); } catch (e) {}
  const jm = content.match(/\{[\s\S]*\}/);
  if (jm) { try { return JSON.parse(jm[0]); } catch (e) {} }
  return { raw_response: content };
}

async function callAI(prompt) {
  const client = getOpenRouterClient();
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
  const completion = await client.chat.completions.create({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 1024, temperature: 0.2 });
  return { result: completion.choices[0]?.message?.content || '', model, usage: completion.usage };
}

async function loadAccount(prisma, id, res) {
  const rec = await prisma.crmAccount.findUnique({ where: { id } });
  if (!rec) { res.status(404).json({ error: 'Account not found' }); return null; }
  return rec;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20; const skip = (page - 1) * limit;
    const where = { isArchived: false };
    if (req.query.status) where.status = req.query.status;
    const [data, total] = await Promise.all([req.prisma.crmAccount.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmAccount.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/count', async (req, res) => {
  try {
    const where = { isArchived: false };
    if (req.query.status) where.status = req.query.status;
    if (req.query.industry) where.industry = req.query.industry;
    const count = await req.prisma.crmAccount.count({ where });
    res.json({ count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || ''; const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20; const skip = (page - 1) * limit;
    const where = { isArchived: false, OR: [{ name: { contains: q, mode: 'insensitive' } }, { domain: { contains: q, mode: 'insensitive' } }, { industry: { contains: q, mode: 'insensitive' } }] };
    const [data, total] = await Promise.all([req.prisma.crmAccount.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmAccount.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-parent/:parentAccountId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20; const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([req.prisma.crmAccount.findMany({ where: { parentAccountId: req.params.parentAccountId, isArchived: false }, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmAccount.count({ where: { parentAccountId: req.params.parentAccountId, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-owner/:ownerId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20; const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([req.prisma.crmAccount.findMany({ where: { ownerId: req.params.ownerId, isArchived: false }, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmAccount.count({ where: { ownerId: req.params.ownerId, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/csv', async (req, res) => {
  try {
    const data = await req.prisma.crmAccount.findMany({ where: { isArchived: false }, orderBy: { createdAt: 'desc' } });
    const fields = ['id','name','domain','industry','accountTier','parentAccountId','employeeCount','annualRevenue','status','healthScore','createdAt','updatedAt'];
    const header = fields.join(',');
    const rows = data.map(r => fields.map(f => { const v = r[f] == null ? '' : String(r[f]).replace(/"/g,'""'); return `"${v}"`; }).join(','));
    res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="crm_accounts.csv"');
    res.send([header,...rows].join('\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const [total, active, archived, byTier] = await Promise.all([
      req.prisma.crmAccount.count(),
      req.prisma.crmAccount.count({ where: { status: 'active', isArchived: false } }),
      req.prisma.crmAccount.count({ where: { isArchived: true } }),
      req.prisma.crmAccount.groupBy({ by: ['accountTier'], _count: { id: true }, where: { isArchived: false } })
    ]);
    res.json({ total, active, archived, byTier });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items array required' });
    const data = await req.prisma.crmAccount.createMany({ data: items, skipDuplicates: true });
    res.status(201).json({ count: data.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items array required' });
    const results = await Promise.all(items.map(async ({ id, ...fields }) => { if (!id) return { error: 'missing id' }; return req.prisma.crmAccount.update({ where: { id }, data: fields }); }));
    res.json({ data: results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required' });
    const data = await req.prisma.crmAccount.updateMany({ where: { id: { in: ids } }, data: { isArchived: true, archivedAt: new Date() } });
    res.json({ updated: data.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/import/csv', async (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'csv field required' });
    const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return res.status(400).json({ error: 'CSV must have header + data' });
    const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim());
    const items = lines.slice(1).map(line => { const vals = line.match(/(".*?"|[^,]+)/g) || []; const obj = {}; headers.forEach((h,i) => { obj[h] = vals[i] ? vals[i].replace(/^"|"$/g,'').replace(/""/g,'"') : null; }); return obj; });
    const data = await req.prisma.crmAccount.createMany({ data: items, skipDuplicates: true });
    res.status(201).json({ count: data.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const rec = await req.prisma.crmAccount.findUnique({ where: { id: req.params.id }, include: { parentAccount: true, childAccounts: true, contacts: { take: 10 } } });
    if (!rec) return res.status(404).json({ error: 'Account not found' });
    res.json({ data: rec });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json({ data: await req.prisma.crmAccount.create({ data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmAccount.update({ where: { id: req.params.id }, data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmAccount.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/archive', async (req, res) => {
  try { res.json({ data: await req.prisma.crmAccount.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/restore', async (req, res) => {
  try { res.json({ data: await req.prisma.crmAccount.update({ where: { id: req.params.id }, data: { isArchived: false, archivedAt: null, status: 'active' } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/history', async (req, res) => {
  try {
    const rec = await req.prisma.crmAccount.findUnique({ where: { id: req.params.id } });
    if (!rec) return res.status(404).json({ error: 'Account not found' });
    const logs = await req.prisma.auditLog.findMany({ where: { entityId: req.params.id, entity: 'CrmAccount' }, orderBy: { createdAt: 'desc' } });
    res.json({ data: logs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AI ────────────────────────────────────────────────────────────────────────

router.post('/ai/classify-industry', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Classify the industry for this company.\nAccount: ${JSON.stringify({ name: rec.name, domain: rec.domain, employeeCount: rec.employeeCount })}\nRespond JSON: { "industry": "...", "subIndustry": "...", "naicsCode": "...", "confidence": "high|medium|low" }`);
    const parsed = parseAIJson(ai.result);
    if (parsed.industry) await req.prisma.crmAccount.update({ where: { id: rec.id }, data: { industry: parsed.industry } }).catch(() => {});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-account-hierarchy', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Suggest parent-child account hierarchy structure for this account.\nAccount: ${JSON.stringify({ name: rec.name, domain: rec.domain, industry: rec.industry, parentAccountId: rec.parentAccountId })}\nRespond JSON: { "suggestedParent": "...", "suggestedChildren": [...], "hierarchyType": "subsidiary|division|branch", "rationale": "..." }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-expansion-revenue', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Predict expansion revenue potential for this account.\nAccount: ${JSON.stringify({ name: rec.name, industry: rec.industry, annualRevenue: rec.annualRevenue, accountTier: rec.accountTier, healthScore: rec.healthScore })}\nRespond JSON: { "expansionPotential": 0-100, "estimatedUplift": "...", "drivers": [...], "riskFactors": [...] }`);
    const parsed = parseAIJson(ai.result);
    if (typeof parsed.estimatedUplift === 'number') await req.prisma.crmAccount.update({ where: { id: rec.id }, data: { expansionRevenue: parsed.estimatedUplift } }).catch(() => {});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/score-strategic-account', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Score the strategic importance of this account.\nAccount: ${JSON.stringify({ name: rec.name, industry: rec.industry, annualRevenue: rec.annualRevenue, accountTier: rec.accountTier })}\nRespond JSON: { "strategicScore": 0-100, "tier": "strategic|enterprise|growth|standard", "factors": [...], "investmentLevel": "high|medium|low" }`);
    const parsed = parseAIJson(ai.result);
    if (typeof parsed.strategicScore === 'number') await req.prisma.crmAccount.update({ where: { id: rec.id }, data: { strategicScore: parsed.strategicScore } }).catch(() => {});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-stalled-relationship', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Detect if the relationship with this account is stalled.\nAccount: ${JSON.stringify({ name: rec.name, healthScore: rec.healthScore, status: rec.status })}\nRespond JSON: { "isStalled": true|false, "stallSignals": [...], "daysSinceLastActivity": "unknown", "reEngagementStrategy": "..." }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/summarize-account-health', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Summarize the health of this customer account.\nAccount: ${JSON.stringify(rec)}\nRespond JSON: { "healthSummary": "...", "healthScore": 0-100, "redFlags": [...], "greenFlags": [...], "recommendations": [...] }`);
    const parsed = parseAIJson(ai.result);
    if (typeof parsed.healthScore === 'number') await req.prisma.crmAccount.update({ where: { id: rec.id }, data: { healthScore: parsed.healthScore, aiSummary: parsed.healthSummary || null } }).catch(() => {});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-account-plan', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Generate a strategic account plan for this customer.\nAccount: ${JSON.stringify(rec)}\nRespond JSON: { "objectives": [...], "stakeholderMap": [...], "initiatives": [...], "milestones": [...], "risks": [...] }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-cross-sell', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Recommend cross-sell opportunities for this account.\nAccount: ${JSON.stringify({ name: rec.name, industry: rec.industry, accountTier: rec.accountTier, annualRevenue: rec.annualRevenue })}\nRespond JSON: { "crossSellOpportunities": [...], "topRecommendation": "...", "estimatedValue": "...", "nextAction": "..." }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-churn-account-level', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Predict churn risk for this account.\nAccount: ${JSON.stringify({ name: rec.name, industry: rec.industry, healthScore: rec.healthScore, status: rec.status, churnRisk: rec.churnRisk })}\nRespond JSON: { "churnRisk": 0-100, "churnTier": "critical|high|medium|low", "churnDrivers": [...], "retentionActions": [...] }`);
    const parsed = parseAIJson(ai.result);
    if (typeof parsed.churnRisk === 'number') await req.prisma.crmAccount.update({ where: { id: rec.id }, data: { churnRisk: parsed.churnRisk } }).catch(() => {});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-account-tier', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Classify the account tier for this customer.\nAccount: ${JSON.stringify({ name: rec.name, annualRevenue: rec.annualRevenue, employeeCount: rec.employeeCount, industry: rec.industry })}\nRespond JSON: { "tier": "enterprise|strategic|growth|standard|smb", "confidence": "high|medium|low", "rationale": "..." }`);
    const parsed = parseAIJson(ai.result);
    if (parsed.tier) await req.prisma.crmAccount.update({ where: { id: rec.id }, data: { accountTier: parsed.tier } }).catch(() => {});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-org-change', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Detect signals of organizational change at this account that may affect the deal.\nAccount: ${JSON.stringify({ name: rec.name, industry: rec.industry, updatedAt: rec.updatedAt })}\nRespond JSON: { "changeDetected": true|false, "changeType": "leadership|restructure|acquisition|layoffs|growth", "impactLevel": "high|medium|low", "recommendedAction": "..." }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-multi-thread-contacts', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const contacts = await req.prisma.crmContact.findMany({ where: { accountId: rec.id, isArchived: false }, select: { id: true, firstName: true, lastName: true, title: true, department: true }, take: 20 }).catch(() => []);
    const ai = await callAI(`Suggest a multi-threading strategy to cover key stakeholders at this account.\nAccount: ${rec.name}\nKnown Contacts: ${JSON.stringify(contacts)}\nRespond JSON: { "coveredRoles": [...], "missingRoles": [...], "multiThreadScore": 0-100, "outreachPlan": [...] }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-qbr-narrative', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Generate a Quarterly Business Review (QBR) narrative for this account.\nAccount: ${JSON.stringify(rec)}\nRespond JSON: { "executiveSummary": "...", "accomplishments": [...], "challenges": [...], "roadmap": [...], "successMetrics": [...] }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/validate-firmographics', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Validate the firmographic data for this account and flag inconsistencies.\nAccount: ${JSON.stringify({ name: rec.name, domain: rec.domain, industry: rec.industry, employeeCount: rec.employeeCount, annualRevenue: rec.annualRevenue })}\nRespond JSON: { "isValid": true|false, "issues": [...], "corrections": [...], "dataQualityScore": 0-100 }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/score-fit-to-icp', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Score this account's fit to the Ideal Customer Profile (ICP).\nAccount: ${JSON.stringify({ name: rec.name, industry: rec.industry, employeeCount: rec.employeeCount, annualRevenue: rec.annualRevenue, accountTier: rec.accountTier })}\nRespond JSON: { "icpFitScore": 0-100, "icpTier": "A|B|C|D", "matchedCriteria": [...], "missedCriteria": [...] }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-segment-move', crmAccountsRateLimit, async (req, res) => {
  try {
    const rec = await loadAccount(req.prisma, req.body.id, res); if (!rec) return;
    const ai = await callAI(`Recommend whether this account should be moved to a different segment/tier.\nAccount: ${JSON.stringify({ name: rec.name, accountTier: rec.accountTier, industry: rec.industry, annualRevenue: rec.annualRevenue, healthScore: rec.healthScore, churnRisk: rec.churnRisk })}\nRespond JSON: { "currentSegment": "...", "recommendedSegment": "...", "shouldMove": true|false, "rationale": "...", "actions": [...] }`);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
