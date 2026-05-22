import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const getClient = () => new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY, defaultHeaders: { 'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000', 'X-Title': 'AI CRM Email Sync' } });
const rlMap = new Map();
function rl(req, res, next) { const key = req.user ? `user:${req.user.id}` : `ip:${req.ip}`; const now = Date.now(); const e = rlMap.get(key) || { count: 0, resetAt: now + 3600000 }; if (now > e.resetAt) { e.count = 0; e.resetAt = now + 3600000; } e.count++; rlMap.set(key, e); if (e.count > 20) return res.status(429).json({ error: 'Rate limit exceeded.' }); next(); }
function parseAIJson(c) { if (!c) return { raw_response: '' }; const cb = c.match(/```(?:json)?\s*([\s\S]*?)```/); if (cb) { try { return JSON.parse(cb[1].trim()); } catch (_) {} } try { return JSON.parse(c); } catch (_) {} const jm = c.match(/\{[\s\S]*\}/); if (jm) { try { return JSON.parse(jm[0]); } catch (_) {} } return { raw_response: c }; }
async function callAI(prompt) { const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022'; const comp = await getClient().chat.completions.create({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 1024, temperature: 0.2 }); return { result: comp.choices[0]?.message?.content || '', model, usage: comp.usage }; }
async function loadEmail(prisma, id, res) { const r = await prisma.crmEmailSync.findUnique({ where: { id } }); if (!r) { res.status(404).json({ error: 'Email not found' }); return null; } return r; }

// ── CRUD ──────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const where = { isArchived: false };
    if (req.query.direction) where.direction = req.query.direction;
    if (req.query.contactId) where.contactId = req.query.contactId;
    if (req.query.threadId) where.threadId = req.query.threadId;
    const [data, total] = await Promise.all([req.prisma.crmEmailSync.findMany({ where, skip, take: limit, orderBy: { syncedAt: 'desc' } }), req.prisma.crmEmailSync.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/count', async (req, res) => {
  try { const where = { isArchived: false }; if (req.query.direction) where.direction = req.query.direction; if (req.query.contactId) where.contactId = req.query.contactId; res.json({ count: await req.prisma.crmEmailSync.count({ where }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q||'', page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const where = { isArchived: false, OR: [{ subject: { contains: q, mode: 'insensitive' } }, { fromAddress: { contains: q, mode: 'insensitive' } }, { body: { contains: q, mode: 'insensitive' } }] };
    const [data, total] = await Promise.all([req.prisma.crmEmailSync.findMany({ where, skip, take: limit, orderBy: { syncedAt: 'desc' } }), req.prisma.crmEmailSync.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-contact/:contactId', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const [data, total] = await Promise.all([req.prisma.crmEmailSync.findMany({ where: { contactId: req.params.contactId, isArchived: false }, skip, take: limit, orderBy: { syncedAt: 'desc' } }), req.prisma.crmEmailSync.count({ where: { contactId: req.params.contactId, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-thread/:threadId', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const [data, total] = await Promise.all([req.prisma.crmEmailSync.findMany({ where: { threadId: req.params.threadId, isArchived: false }, skip, take: limit, orderBy: { syncedAt: 'asc' } }), req.prisma.crmEmailSync.count({ where: { threadId: req.params.threadId, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/csv', async (req, res) => {
  try {
    const data = await req.prisma.crmEmailSync.findMany({ where: { isArchived: false }, orderBy: { syncedAt: 'desc' } });
    const fields = ['id','messageId','threadId','subject','fromAddress','direction','status','intent','sentiment','contactId','accountId','opportunityId','syncedAt'];
    res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="crm_email_sync.csv"');
    res.send([fields.join(','), ...data.map(r => fields.map(f=>`"${r[f]==null?'':String(r[f]).replace(/"/g,'""')}"`).join(','))].join('\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const [total, inbound, outbound, bounced] = await Promise.all([
      req.prisma.crmEmailSync.count({ where: { isArchived: false } }),
      req.prisma.crmEmailSync.count({ where: { direction: 'inbound', isArchived: false } }),
      req.prisma.crmEmailSync.count({ where: { direction: 'outbound', isArchived: false } }),
      req.prisma.crmEmailSync.count({ where: { bouncedAt: { not: null }, isArchived: false } })
    ]);
    res.json({ total, inbound, outbound, bounced });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/batch', async (req, res) => {
  try { const { items } = req.body; if (!Array.isArray(items)||!items.length) return res.status(400).json({ error: 'items array required' }); res.status(201).json({ count: (await req.prisma.crmEmailSync.createMany({ data: items, skipDuplicates: true })).count }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/batch', async (req, res) => {
  try { const { items } = req.body; if (!Array.isArray(items)||!items.length) return res.status(400).json({ error: 'items array required' }); res.json({ data: await Promise.all(items.map(async ({ id, ...f }) => { if (!id) return { error: 'missing id' }; return req.prisma.crmEmailSync.update({ where: { id }, data: f }); })) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/batch', async (req, res) => {
  try { const { ids } = req.body; if (!Array.isArray(ids)||!ids.length) return res.status(400).json({ error: 'ids array required' }); res.json({ updated: (await req.prisma.crmEmailSync.updateMany({ where: { id: { in: ids } }, data: { isArchived: true, archivedAt: new Date() } })).count }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/import/csv', async (req, res) => {
  try {
    const { csv } = req.body; if (!csv) return res.status(400).json({ error: 'csv field required' });
    const lines = csv.split('\n').map(l=>l.trim()).filter(Boolean); if (lines.length<2) return res.status(400).json({ error: 'CSV needs header+data' });
    const headers = lines[0].split(',').map(h=>h.replace(/"/g,'').trim());
    const items = lines.slice(1).map(line => { const vals = line.match(/(".*?"|[^,]+)/g)||[]; const obj={}; headers.forEach((h,i)=>{ obj[h]=vals[i]?vals[i].replace(/^"|"$/g,'').replace(/""/g,'"'):null; }); return obj; });
    res.status(201).json({ count: (await req.prisma.crmEmailSync.createMany({ data: items, skipDuplicates: true })).count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try { const r = await req.prisma.crmEmailSync.findUnique({ where: { id: req.params.id } }); if (!r) return res.status(404).json({ error: 'Email not found' }); res.json({ data: r }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json({ data: await req.prisma.crmEmailSync.create({ data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmEmailSync.update({ where: { id: req.params.id }, data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmEmailSync.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/archive', async (req, res) => {
  try { res.json({ data: await req.prisma.crmEmailSync.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/restore', async (req, res) => {
  try { res.json({ data: await req.prisma.crmEmailSync.update({ where: { id: req.params.id }, data: { isArchived: false, archivedAt: null } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/history', async (req, res) => {
  try { const r = await req.prisma.crmEmailSync.findUnique({ where: { id: req.params.id } }); if (!r) return res.status(404).json({ error: 'Email not found' }); res.json({ data: await req.prisma.auditLog.findMany({ where: { entityId: req.params.id, entity: 'CrmEmailSync' }, orderBy: { createdAt: 'desc' } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AI ────────────────────────────────────────────────────────────────────────

router.post('/ai/classify-email-intent', rl, async (req, res) => {
  try { const em = await loadEmail(req.prisma, req.body.id, res); if (!em) return; const ai = await callAI(`Classify the intent of this email.\nSubject: ${em.subject}\nBody: ${(em.body||'').substring(0,500)}\nRespond JSON: { "intent": "inquiry|buying_signal|objection|complaint|follow_up|out_of_office|other", "confidence": "high|medium|low", "signals": [...] }`); const parsed = parseAIJson(ai.result); if (parsed.intent) await req.prisma.crmEmailSync.update({ where: { id: em.id }, data: { intent: parsed.intent } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-reply', rl, async (req, res) => {
  try { const em = await loadEmail(req.prisma, req.body.id, res); if (!em) return; const ai = await callAI(`Suggest a reply to this email.\nFrom: ${em.fromAddress}\nSubject: ${em.subject}\nBody: ${(em.body||'').substring(0,800)}\nRespond JSON: { "subject": "...", "body": "...", "tone": "professional|casual|empathetic", "keyPoints": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/summarize-thread', rl, async (req, res) => {
  try { const { threadId } = req.body; if (!threadId) return res.status(400).json({ error: 'threadId required' }); const emails = await req.prisma.crmEmailSync.findMany({ where: { threadId, isArchived: false }, orderBy: { syncedAt: 'asc' }, take: 20 }); const ai = await callAI(`Summarize this email thread.\nEmails: ${JSON.stringify(emails.map(e=>({ from: e.fromAddress, subject: e.subject, body: (e.body||'').substring(0,300), direction: e.direction, syncedAt: e.syncedAt })))}\nRespond JSON: { "summary": "...", "status": "active|resolved|stalled", "keyDecisions": [...], "nextActions": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-response-likelihood', rl, async (req, res) => {
  try { const em = await loadEmail(req.prisma, req.body.id, res); if (!em) return; const ai = await callAI(`Predict the likelihood of a reply to this email.\nSubject: ${em.subject}\nDirection: ${em.direction}\nSentiment: ${em.sentiment||'unknown'}\nRespond JSON: { "responseLikelihood": "high|medium|low", "probability": 0-100, "factors": [...], "followUpTiming": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-out-of-office', rl, async (req, res) => {
  try { const em = await loadEmail(req.prisma, req.body.id, res); if (!em) return; const ai = await callAI(`Detect if this email is an out-of-office auto-reply.\nSubject: ${em.subject}\nBody: ${(em.body||'').substring(0,400)}\nRespond JSON: { "isOutOfOffice": true|false, "returnDate": "...|unknown", "alternateContact": "...|none", "confidence": "high|medium|low" }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/score-email-quality', rl, async (req, res) => {
  try { const em = await loadEmail(req.prisma, req.body.id, res); if (!em) return; const ai = await callAI(`Score the quality and effectiveness of this outbound email.\nSubject: ${em.subject}\nBody: ${(em.body||'').substring(0,600)}\nRespond JSON: { "qualityScore": 0-100, "clarity": 0-100, "personalization": 0-100, "callToAction": "clear|weak|missing", "improvements": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-send-time', rl, async (req, res) => {
  try { const { contactId, timezone } = req.body; const ai = await callAI(`Recommend the optimal send time for an outbound email to this contact.\nContactId: ${contactId||'unknown'}\nTimezone: ${timezone||'unknown'}\nRespond JSON: { "bestDays": [...], "bestHours": "...", "timezone": "...", "rationale": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-follow-up', rl, async (req, res) => {
  try { const em = await loadEmail(req.prisma, req.body.id, res); if (!em) return; const ai = await callAI(`Generate a follow-up email for this unanswered message.\nOriginal Subject: ${em.subject}\nOriginal Body: ${(em.body||'').substring(0,500)}\nRespond JSON: { "subject": "...", "body": "...", "followUpType": "gentle|firm|final", "timing": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-buying-signal', rl, async (req, res) => {
  try { const em = await loadEmail(req.prisma, req.body.id, res); if (!em) return; const ai = await callAI(`Detect buying signals in this email.\nSubject: ${em.subject}\nBody: ${(em.body||'').substring(0,600)}\nRespond JSON: { "hasBuyingSignal": true|false, "signalStrength": "strong|moderate|weak", "signals": [...], "recommendedAction": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-email-stage-relevance', rl, async (req, res) => {
  try { const em = await loadEmail(req.prisma, req.body.id, res); if (!em) return; const ai = await callAI(`Classify the pipeline stage relevance of this email.\nSubject: ${em.subject}\nBody: ${(em.body||'').substring(0,500)}\nRespond JSON: { "relevantStage": "prospecting|discovery|proposal|negotiation|closed_won|closed_lost|other", "confidence": "high|medium|low", "rationale": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/validate-email-deliverability', rl, async (req, res) => {
  try { const { email } = req.body; if (!email) return res.status(400).json({ error: 'email required' }); const ai = await callAI(`Validate the deliverability of this email address: ${email}\nRespond JSON: { "isValid": true|false, "deliverabilityRisk": "low|medium|high", "domainReputation": "good|neutral|poor|unknown", "issues": [...], "suggestions": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/summarize-sender-history', rl, async (req, res) => {
  try { const { fromAddress } = req.body; if (!fromAddress) return res.status(400).json({ error: 'fromAddress required' }); const emails = await req.prisma.crmEmailSync.findMany({ where: { fromAddress, isArchived: false }, orderBy: { syncedAt: 'desc' }, take: 20 }); const ai = await callAI(`Summarize the email history from this sender.\nSender: ${fromAddress}\nEmails: ${JSON.stringify(emails.map(e=>({ subject: e.subject, direction: e.direction, sentiment: e.sentiment, syncedAt: e.syncedAt })))}\nRespond JSON: { "summary": "...", "communicationStyle": "...", "engagementLevel": "high|medium|low", "keyThemes": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-bounce-rate', rl, async (req, res) => {
  try { const { emailList } = req.body; if (!Array.isArray(emailList)) return res.status(400).json({ error: 'emailList array required' }); const ai = await callAI(`Predict the bounce rate for this list of email addresses.\nEmails: ${JSON.stringify(emailList.slice(0,50))}\nRespond JSON: { "predictedBounceRate": 0-100, "highRiskEmails": [...], "recommendations": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-template-variant', rl, async (req, res) => {
  try { const em = await loadEmail(req.prisma, req.body.id, res); if (!em) return; const ai = await callAI(`Recommend template variants to improve this email's performance.\nSubject: ${em.subject}\nBody: ${(em.body||'').substring(0,600)}\nRespond JSON: { "variants": [{ "label": "...", "subject": "...", "openingLine": "...", "cta": "..." }], "hypothesis": "...", "expectedImprovement": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-objection', rl, async (req, res) => {
  try { const em = await loadEmail(req.prisma, req.body.id, res); if (!em) return; const ai = await callAI(`Detect objections in this email.\nSubject: ${em.subject}\nBody: ${(em.body||'').substring(0,600)}\nRespond JSON: { "hasObjection": true|false, "objectionType": "price|timing|fit|competitor|authority|need|other", "objectionText": "...", "suggestedResponse": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-reply-draft', rl, async (req, res) => {
  try { const em = await loadEmail(req.prisma, req.body.id, res); if (!em) return; const { tone, context } = req.body; const ai = await callAI(`Generate a reply draft for this email.\nFrom: ${em.fromAddress}\nSubject: ${em.subject}\nBody: ${(em.body||'').substring(0,600)}\nTone: ${tone||'professional'}\nContext: ${context||'sales follow-up'}\nRespond JSON: { "subject": "Re: ${em.subject}", "body": "...", "highlights": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
