import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const getClient = () => new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY, defaultHeaders: { 'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000', 'X-Title': 'AI CRM Quotes' } });
const rlMap = new Map();
function rl(req, res, next) { const key = req.user ? `user:${req.user.id}` : `ip:${req.ip}`; const now = Date.now(); const e = rlMap.get(key) || { count: 0, resetAt: now + 3600000 }; if (now > e.resetAt) { e.count = 0; e.resetAt = now + 3600000; } e.count++; rlMap.set(key, e); if (e.count > 20) return res.status(429).json({ error: 'Rate limit exceeded.' }); next(); }
function parseAIJson(c) { if (!c) return { raw_response: '' }; const cb = c.match(/```(?:json)?\s*([\s\S]*?)```/); if (cb) { try { return JSON.parse(cb[1].trim()); } catch (_) {} } try { return JSON.parse(c); } catch (_) {} const jm = c.match(/\{[\s\S]*\}/); if (jm) { try { return JSON.parse(jm[0]); } catch (_) {} } return { raw_response: c }; }
async function callAI(prompt) { const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022'; const comp = await getClient().chat.completions.create({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 1024, temperature: 0.2 }); return { result: comp.choices[0]?.message?.content || '', model, usage: comp.usage }; }
async function loadQuote(prisma, id, res) { const r = await prisma.crmQuote.findUnique({ where: { id } }); if (!r) { res.status(404).json({ error: 'Quote not found' }); return null; } return r; }

// ── CRUD ──────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const where = { isArchived: false };
    if (req.query.status) where.status = req.query.status;
    if (req.query.opportunityId) where.opportunityId = req.query.opportunityId;
    const [data, total] = await Promise.all([req.prisma.crmQuote.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmQuote.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/count', async (req, res) => {
  try { const where = { isArchived: false }; if (req.query.status) where.status = req.query.status; if (req.query.ownerId) where.ownerId = req.query.ownerId; res.json({ count: await req.prisma.crmQuote.count({ where }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q||'', page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const where = { isArchived: false, OR: [{ name: { contains: q, mode: 'insensitive' } }, { quoteNumber: { contains: q, mode: 'insensitive' } }] };
    const [data, total] = await Promise.all([req.prisma.crmQuote.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmQuote.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-opportunity/:opportunityId', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const [data, total] = await Promise.all([req.prisma.crmQuote.findMany({ where: { opportunityId: req.params.opportunityId, isArchived: false }, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmQuote.count({ where: { opportunityId: req.params.opportunityId, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-account/:accountId', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const [data, total] = await Promise.all([req.prisma.crmQuote.findMany({ where: { accountId: req.params.accountId, isArchived: false }, skip, take: limit, orderBy: { createdAt: 'desc' } }), req.prisma.crmQuote.count({ where: { accountId: req.params.accountId, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/csv', async (req, res) => {
  try {
    const data = await req.prisma.crmQuote.findMany({ where: { isArchived: false }, orderBy: { createdAt: 'desc' } });
    const fields = ['id','quoteNumber','name','status','contactId','accountId','opportunityId','subtotal','discount','tax','total','validUntil','marginScore','acceptanceProbability','createdAt'];
    res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="crm_quotes.csv"');
    res.send([fields.join(','), ...data.map(r => fields.map(f=>`"${r[f]==null?'':String(r[f]).replace(/"/g,'""')}"`).join(','))].join('\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const [total, byStatus, totalValue] = await Promise.all([
      req.prisma.crmQuote.count({ where: { isArchived: false } }),
      req.prisma.crmQuote.groupBy({ by: ['status'], _count: { id: true }, _sum: { total: true }, where: { isArchived: false } }),
      req.prisma.crmQuote.aggregate({ _sum: { total: true }, where: { isArchived: false } })
    ]);
    res.json({ total, byStatus, totalPipelineValue: totalValue._sum.total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/batch', async (req, res) => {
  try { const { items } = req.body; if (!Array.isArray(items)||!items.length) return res.status(400).json({ error: 'items array required' }); res.status(201).json({ count: (await req.prisma.crmQuote.createMany({ data: items, skipDuplicates: true })).count }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/batch', async (req, res) => {
  try { const { items } = req.body; if (!Array.isArray(items)||!items.length) return res.status(400).json({ error: 'items array required' }); res.json({ data: await Promise.all(items.map(async ({ id, ...f }) => { if (!id) return { error: 'missing id' }; return req.prisma.crmQuote.update({ where: { id }, data: f }); })) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/batch', async (req, res) => {
  try { const { ids } = req.body; if (!Array.isArray(ids)||!ids.length) return res.status(400).json({ error: 'ids array required' }); res.json({ updated: (await req.prisma.crmQuote.updateMany({ where: { id: { in: ids } }, data: { isArchived: true, archivedAt: new Date() } })).count }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/import/csv', async (req, res) => {
  try {
    const { csv } = req.body; if (!csv) return res.status(400).json({ error: 'csv field required' });
    const lines = csv.split('\n').map(l=>l.trim()).filter(Boolean); if (lines.length<2) return res.status(400).json({ error: 'CSV needs header+data' });
    const headers = lines[0].split(',').map(h=>h.replace(/"/g,'').trim());
    const items = lines.slice(1).map(line => { const vals = line.match(/(".*?"|[^,]+)/g)||[]; const obj={}; headers.forEach((h,i)=>{ obj[h]=vals[i]?vals[i].replace(/^"|"$/g,'').replace(/""/g,'"'):null; }); return obj; });
    res.status(201).json({ count: (await req.prisma.crmQuote.createMany({ data: items, skipDuplicates: true })).count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try { const r = await req.prisma.crmQuote.findUnique({ where: { id: req.params.id }, include: { contact: true, account: true, opportunity: true } }); if (!r) return res.status(404).json({ error: 'Quote not found' }); res.json({ data: r }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json({ data: await req.prisma.crmQuote.create({ data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmQuote.update({ where: { id: req.params.id }, data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmQuote.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/archive', async (req, res) => {
  try { res.json({ data: await req.prisma.crmQuote.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/restore', async (req, res) => {
  try { res.json({ data: await req.prisma.crmQuote.update({ where: { id: req.params.id }, data: { isArchived: false, archivedAt: null, status: 'draft' } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/history', async (req, res) => {
  try { const r = await req.prisma.crmQuote.findUnique({ where: { id: req.params.id } }); if (!r) return res.status(404).json({ error: 'Quote not found' }); res.json({ data: await req.prisma.auditLog.findMany({ where: { entityId: req.params.id, entity: 'CrmQuote' }, orderBy: { createdAt: 'desc' } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AI ────────────────────────────────────────────────────────────────────────

router.post('/ai/suggest-pricing', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const ai = await callAI(`Suggest optimal pricing for this quote.\nQuote: ${JSON.stringify({ name: q.name, lineItems: q.lineItems, total: q.total, discount: q.discount })}\nRespond JSON: { "suggestedTotal": 0, "suggestedDiscount": 0, "rationale": "...", "pricingStrategy": "value|competitive|penetration" }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-quote-narrative', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const ai = await callAI(`Generate an executive narrative for this quote.\nQuote: ${JSON.stringify({ name: q.name, total: q.total, lineItems: q.lineItems })}\nRespond JSON: { "narrative": "...", "valueProposition": "...", "roi": "...", "differentiators": [...] }`); const parsed = parseAIJson(ai.result); if (parsed.narrative) await req.prisma.crmQuote.update({ where: { id: q.id }, data: { aiSummary: parsed.narrative } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-quote-acceptance', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const ai = await callAI(`Predict the likelihood of this quote being accepted.\nQuote: ${JSON.stringify({ total: q.total, discount: q.discount, validUntil: q.validUntil, status: q.status })}\nRespond JSON: { "acceptanceProbability": 0-100, "factors": [...], "risks": [...], "recommendations": [...] }`); const parsed = parseAIJson(ai.result); if (typeof parsed.acceptanceProbability==='number') await req.prisma.crmQuote.update({ where: { id: q.id }, data: { acceptanceProbability: parsed.acceptanceProbability } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-discount-request', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const { requestedDiscount } = req.body; const ai = await callAI(`Classify this discount request and advise on approval.\nQuote Total: ${q.total}\nCurrent Discount: ${q.discount||0}%\nRequested Discount: ${requestedDiscount||0}%\nRespond JSON: { "classification": "standard|above_standard|exceptional", "approvalLevel": "rep|manager|vp|ceo", "margin_impact": "...", "recommendation": "approve|negotiate|deny" }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-bundle', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const ai = await callAI(`Recommend product bundle additions for this quote.\nQuote: ${JSON.stringify({ name: q.name, lineItems: q.lineItems, total: q.total })}\nRespond JSON: { "bundles": [...], "topRecommendation": "...", "estimatedUplift": 0, "rationale": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/score-quote-margin', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const ai = await callAI(`Score the margin health of this quote.\nQuote: ${JSON.stringify({ subtotal: q.subtotal, discount: q.discount, total: q.total, lineItems: q.lineItems })}\nRespond JSON: { "marginScore": 0-100, "marginPct": 0, "marginTier": "excellent|good|acceptable|below_target", "risks": [...] }`); const parsed = parseAIJson(ai.result); if (typeof parsed.marginScore==='number') await req.prisma.crmQuote.update({ where: { id: q.id }, data: { marginScore: parsed.marginScore } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-pricing-leak', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const ai = await callAI(`Detect pricing leaks (unauthorized discounts, missing line items) in this quote.\nQuote: ${JSON.stringify({ lineItems: q.lineItems, discount: q.discount, total: q.total })}\nRespond JSON: { "leaksDetected": true|false, "leaks": [...], "estimatedLeakage": 0, "actions": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/validate-line-items', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const ai = await callAI(`Validate the line items in this quote for completeness and accuracy.\nLine Items: ${JSON.stringify(q.lineItems)}\nTotal: ${q.total}\nRespond JSON: { "isValid": true|false, "issues": [...], "missingItems": [...], "totalCheck": "match|mismatch", "qualityScore": 0-100 }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-proposal-from-quote', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const ai = await callAI(`Generate a professional proposal document from this quote.\nQuote: ${JSON.stringify({ name: q.name, total: q.total, lineItems: q.lineItems, validUntil: q.validUntil })}\nRespond JSON: { "title": "...", "executiveSummary": "...", "solution": "...", "pricing": "...", "timeline": "...", "terms": "...", "nextSteps": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/summarize-quote-history', rl, async (req, res) => {
  try { const { opportunityId, accountId } = req.body; const where = { isArchived: false, ...(opportunityId ? { opportunityId } : {}), ...(accountId ? { accountId } : {}) }; const quotes = await req.prisma.crmQuote.findMany({ where, orderBy: { createdAt: 'desc' }, take: 10 }); const ai = await callAI(`Summarize the quoting history.\nQuotes: ${JSON.stringify(quotes.map(q=>({ name: q.name, status: q.status, total: q.total, discount: q.discount, createdAt: q.createdAt })))}\nRespond JSON: { "summary": "...", "trend": "...", "avgDealSize": 0, "winRate": 0, "insights": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-renewal-uplift', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const ai = await callAI(`Predict renewal uplift opportunity for this quote.\nQuote: ${JSON.stringify({ total: q.total, lineItems: q.lineItems, status: q.status })}\nRespond JSON: { "renewalUpliftPct": 0, "upliftOpportunity": 0, "drivers": [...], "risks": [...], "strategy": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-cross-sell-line', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const ai = await callAI(`Recommend cross-sell line items to add to this quote.\nExisting Line Items: ${JSON.stringify(q.lineItems)}\nRespond JSON: { "crossSellItems": [...], "topItem": "...", "estimatedUplift": 0, "rationale": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-approval-route', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const ai = await callAI(`Suggest the approval routing for this quote.\nQuote: ${JSON.stringify({ total: q.total, discount: q.discount, marginScore: q.marginScore })}\nRespond JSON: { "approvalRoute": [...], "requiredApprovers": [...], "estimatedApprovalTime": "...", "urgency": "high|medium|low" }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-quote-stage', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const ai = await callAI(`Classify the current stage of this quote.\nQuote: ${JSON.stringify({ status: q.status, sentAt: q.sentAt, approvedAt: q.approvedAt, acceptedAt: q.acceptedAt, rejectedAt: q.rejectedAt })}\nStages: draft|sent|negotiating|pending_approval|approved|accepted|rejected|expired\nRespond JSON: { "stage": "...", "confidence": "high|medium|low", "daysInStage": "...", "nextAction": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-missing-skus', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const ai = await callAI(`Detect missing SKUs or incomplete line items in this quote.\nLine Items: ${JSON.stringify(q.lineItems)}\nRespond JSON: { "missingSkus": [...], "incompleteItems": [...], "recommendations": [...], "completenessScore": 0-100 }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-tnc-summary', rl, async (req, res) => {
  try { const q = await loadQuote(req.prisma, req.body.id, res); if (!q) return; const { terms } = req.body; const ai = await callAI(`Generate a plain-language summary of the terms and conditions for this quote.\nQuote: ${q.name}\nTerms: ${terms||'standard enterprise terms'}\nRespond JSON: { "summary": "...", "keyTerms": [...], "obligations": [...], "restrictedUses": [...], "renewalTerms": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
