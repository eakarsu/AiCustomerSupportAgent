import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

// ─── OpenRouter client ────────────────────────────────────────────────────────
const getOpenRouterClient = () => new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': 'AI Customer Support Agent - CRM Contacts'
  }
});

// ─── Rate limiter (in-memory, 20 AI calls/hour per key) ──────────────────────
const crmContactsRlMap = new Map();
function crmContactsRateLimit(req, res, next) {
  const key = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 20;
  const entry = crmContactsRlMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count++;
  crmContactsRlMap.set(key, entry);
  if (entry.count > limit) return res.status(429).json({ error: 'Rate limit exceeded. Max 20 AI calls per hour.' });
  next();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseAIJson(content) {
  if (!content) return { raw_response: '' };
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch (e) {} }
  try { return JSON.parse(content); } catch (e) {}
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch (e) {} }
  return { raw_response: content };
}

async function callAI(prompt) {
  const client = getOpenRouterClient();
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1024,
    temperature: 0.2
  });
  const content = completion.choices[0]?.message?.content || '';
  return { result: content, model, usage: completion.usage };
}

async function loadContact(prisma, id, res) {
  const contact = await prisma.crmContact.findUnique({ where: { id } });
  if (!contact) { res.status(404).json({ error: 'Contact not found' }); return null; }
  return contact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRUD — 18 endpoints
// ═══════════════════════════════════════════════════════════════════════════════

// 1. GET / — list
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const where = { isArchived: false };
    if (req.query.status) where.status = req.query.status;
    const [data, total] = await Promise.all([
      req.prisma.crmContact.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      req.prisma.crmContact.count({ where })
    ]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. GET /count
router.get('/count', async (req, res) => {
  try {
    const where = { isArchived: false };
    if (req.query.status) where.status = req.query.status;
    if (req.query.accountId) where.accountId = req.query.accountId;
    const count = await req.prisma.crmContact.count({ where });
    res.json({ count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. GET /search
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      req.prisma.crmContact.findMany({
        where: {
          isArchived: false,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { title: { contains: q, mode: 'insensitive' } }
          ]
        },
        skip, take: limit, orderBy: { createdAt: 'desc' }
      }),
      req.prisma.crmContact.count({
        where: {
          isArchived: false,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { title: { contains: q, mode: 'insensitive' } }
          ]
        }
      })
    ]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. GET /by-account/:accountId
router.get('/by-account/:accountId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      req.prisma.crmContact.findMany({ where: { accountId: req.params.accountId, isArchived: false }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      req.prisma.crmContact.count({ where: { accountId: req.params.accountId, isArchived: false } })
    ]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. GET /by-owner/:ownerId
router.get('/by-owner/:ownerId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      req.prisma.crmContact.findMany({ where: { ownerId: req.params.ownerId, isArchived: false }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      req.prisma.crmContact.count({ where: { ownerId: req.params.ownerId, isArchived: false } })
    ]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. GET /export/csv
router.get('/export/csv', async (req, res) => {
  try {
    const data = await req.prisma.crmContact.findMany({ where: { isArchived: false }, orderBy: { createdAt: 'desc' } });
    const fields = ['id','firstName','lastName','email','phone','title','department','accountId','status','leadSource','engagementScore','leadFitScore','createdAt','updatedAt'];
    const header = fields.join(',');
    const rows = data.map(r => fields.map(f => { const v = r[f] == null ? '' : String(r[f]).replace(/"/g,'""'); return `"${v}"`; }).join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="crm_contacts.csv"');
    res.send([header, ...rows].join('\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. GET /stats/summary
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, active, archived, byPersona] = await Promise.all([
      req.prisma.crmContact.count(),
      req.prisma.crmContact.count({ where: { status: 'active', isArchived: false } }),
      req.prisma.crmContact.count({ where: { isArchived: true } }),
      req.prisma.crmContact.groupBy({ by: ['buyerPersona'], _count: { id: true }, where: { isArchived: false } })
    ]);
    res.json({ total, active, archived, byPersona });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 8. POST /batch
router.post('/batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items array required' });
    const data = await req.prisma.crmContact.createMany({ data: items, skipDuplicates: true });
    res.status(201).json({ count: data.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 9. PUT /batch
router.put('/batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items array required' });
    const results = await Promise.all(items.map(async ({ id, ...fields }) => {
      if (!id) return { error: 'missing id' };
      return req.prisma.crmContact.update({ where: { id }, data: fields });
    }));
    res.json({ data: results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 10. DELETE /batch
router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    const data = await req.prisma.crmContact.updateMany({ where: { id: { in: ids } }, data: { isArchived: true, archivedAt: new Date() } });
    res.json({ updated: data.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 11. POST /import/csv
router.post('/import/csv', async (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'csv field required' });
    const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return res.status(400).json({ error: 'CSV must have header + at least one row' });
    const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim());
    const items = lines.slice(1).map(line => {
      const values = line.match(/(".*?"|[^,]+)/g) || [];
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] ? values[i].replace(/^"|"$/g,'').replace(/""/g,'"') : null; });
      return obj;
    });
    const data = await req.prisma.crmContact.createMany({ data: items, skipDuplicates: true });
    res.status(201).json({ count: data.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 12. GET /:id
router.get('/:id', async (req, res) => {
  try {
    const contact = await req.prisma.crmContact.findUnique({ where: { id: req.params.id }, include: { account: true } });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json({ data: contact });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 13. POST /
router.post('/', async (req, res) => {
  try {
    const contact = await req.prisma.crmContact.create({ data: req.body });
    res.status(201).json({ data: contact });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 14. PUT /:id
router.put('/:id', async (req, res) => {
  try {
    const contact = await req.prisma.crmContact.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: contact });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 15. DELETE /:id (soft-delete)
router.delete('/:id', async (req, res) => {
  try {
    const contact = await req.prisma.crmContact.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } });
    res.json({ data: contact });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 16. POST /:id/archive
router.post('/:id/archive', async (req, res) => {
  try {
    const contact = await req.prisma.crmContact.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } });
    res.json({ data: contact });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 17. POST /:id/restore
router.post('/:id/restore', async (req, res) => {
  try {
    const contact = await req.prisma.crmContact.update({ where: { id: req.params.id }, data: { isArchived: false, archivedAt: null, status: 'active' } });
    res.json({ data: contact });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 18. GET /:id/history
router.get('/:id/history', async (req, res) => {
  try {
    const contact = await req.prisma.crmContact.findUnique({ where: { id: req.params.id } });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    const logs = await req.prisma.auditLog.findMany({ where: { entityId: req.params.id, entity: 'CrmContact' }, orderBy: { createdAt: 'desc' } });
    res.json({ data: logs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI — 16 verbs
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/ai/enrich-from-name', crmContactsRateLimit, async (req, res) => {
  try {
    const { id, name, company } = req.body;
    const prompt = `Enrich a CRM contact from name and company context.\nName: ${name || 'unknown'}\nCompany: ${company || 'unknown'}\nRespond JSON: { "title": "...", "department": "...", "industry": "...", "linkedinHint": "...", "enrichmentConfidence": "high|medium|low" }`;
    const ai = await callAI(prompt);
    const parsed = parseAIJson(ai.result);
    if (id) await req.prisma.crmContact.update({ where: { id }, data: { enrichedAt: new Date() } }).catch(() => {});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-merge-candidates', crmContactsRateLimit, async (req, res) => {
  try {
    const contact = await loadContact(req.prisma, req.body.id, res);
    if (!contact) return;
    const prompt = `Given this contact, describe criteria for detecting duplicate/merge candidates.\nContact: ${JSON.stringify({ firstName: contact.firstName, lastName: contact.lastName, email: contact.email, phone: contact.phone })}\nRespond JSON: { "mergeSignals": [...], "deduplicationRules": [...], "confidence": "high|medium|low" }`;
    const ai = await callAI(prompt);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-buyer-persona', crmContactsRateLimit, async (req, res) => {
  try {
    const contact = await loadContact(req.prisma, req.body.id, res);
    if (!contact) return;
    const prompt = `Classify the buyer persona for this contact.\nContact: ${JSON.stringify({ title: contact.title, department: contact.department, leadSource: contact.leadSource })}\nPersonas: Champion, Economic Buyer, Technical Evaluator, End User, Influencer\nRespond JSON: { "persona": "...", "confidence": "high|medium|low", "rationale": "..." }`;
    const ai = await callAI(prompt);
    const parsed = parseAIJson(ai.result);
    if (parsed.persona) await req.prisma.crmContact.update({ where: { id: contact.id }, data: { buyerPersona: parsed.persona } }).catch(() => {});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-buyer-intent', crmContactsRateLimit, async (req, res) => {
  try {
    const contact = await loadContact(req.prisma, req.body.id, res);
    if (!contact) return;
    const prompt = `Predict the buyer intent level for this contact.\nContact: ${JSON.stringify({ title: contact.title, status: contact.status, lastActivityAt: contact.lastActivityAt, engagementScore: contact.engagementScore })}\nRespond JSON: { "intentLevel": "high|medium|low|none", "buyingSignals": [...], "timeToDecision": "...", "recommendedAction": "..." }`;
    const ai = await callAI(prompt);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/score-engagement', crmContactsRateLimit, async (req, res) => {
  try {
    const contact = await loadContact(req.prisma, req.body.id, res);
    if (!contact) return;
    const prompt = `Score engagement level for this CRM contact.\nContact: ${JSON.stringify({ status: contact.status, lastActivityAt: contact.lastActivityAt, leadSource: contact.leadSource })}\nRespond JSON: { "engagementScore": 0-100, "tier": "hot|warm|cold|dead", "factors": [...], "nextRecommendation": "..." }`;
    const ai = await callAI(prompt);
    const parsed = parseAIJson(ai.result);
    if (typeof parsed.engagementScore === 'number') await req.prisma.crmContact.update({ where: { id: contact.id }, data: { engagementScore: parsed.engagementScore } }).catch(() => {});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-dead-contact', crmContactsRateLimit, async (req, res) => {
  try {
    const contact = await loadContact(req.prisma, req.body.id, res);
    if (!contact) return;
    const prompt = `Determine if this contact is "dead" (unresponsive, churned, or otherwise unworkable).\nContact: ${JSON.stringify({ status: contact.status, lastActivityAt: contact.lastActivityAt, engagementScore: contact.engagementScore })}\nRespond JSON: { "isDead": true|false, "confidence": "high|medium|low", "reasons": [...], "reactivationPossibility": "high|low|none" }`;
    const ai = await callAI(prompt);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-next-touch', crmContactsRateLimit, async (req, res) => {
  try {
    const contact = await loadContact(req.prisma, req.body.id, res);
    if (!contact) return;
    const prompt = `Suggest the optimal next touch for this contact.\nContact: ${JSON.stringify({ title: contact.title, department: contact.department, lastActivityAt: contact.lastActivityAt, buyerPersona: contact.buyerPersona })}\nRespond JSON: { "channel": "email|phone|linkedin|inperson", "timing": "...", "messageTheme": "...", "talkingPoints": [...] }`;
    const ai = await callAI(prompt);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/summarize-contact-history', crmContactsRateLimit, async (req, res) => {
  try {
    const contact = await loadContact(req.prisma, req.body.id, res);
    if (!contact) return;
    const activities = await req.prisma.crmActivity.findMany({ where: { contactId: contact.id }, orderBy: { createdAt: 'desc' }, take: 20 }).catch(() => []);
    const prompt = `Summarize the relationship history for this contact.\nContact: ${JSON.stringify({ firstName: contact.firstName, lastName: contact.lastName, title: contact.title })}\nActivities (recent 20): ${JSON.stringify(activities)}\nRespond JSON: { "summary": "...", "keyMilestones": [...], "relationshipHealth": "strong|neutral|weak", "openItems": [...] }`;
    const ai = await callAI(prompt);
    const parsed = parseAIJson(ai.result);
    if (parsed.summary) await req.prisma.crmContact.update({ where: { id: contact.id }, data: { aiSummary: parsed.summary } }).catch(() => {});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-icebreaker', crmContactsRateLimit, async (req, res) => {
  try {
    const contact = await loadContact(req.prisma, req.body.id, res);
    if (!contact) return;
    const prompt = `Generate a personalized icebreaker for a first outreach to this contact.\nContact: ${JSON.stringify({ firstName: contact.firstName, title: contact.title, department: contact.department, buyerPersona: contact.buyerPersona })}\nRespond JSON: { "icebreaker": "...", "hook": "...", "valueProposition": "...", "callToAction": "..." }`;
    const ai = await callAI(prompt);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-channel-preference', crmContactsRateLimit, async (req, res) => {
  try {
    const contact = await loadContact(req.prisma, req.body.id, res);
    if (!contact) return;
    const prompt = `Classify the preferred communication channel for this contact based on available signals.\nContact: ${JSON.stringify({ title: contact.title, department: contact.department, leadSource: contact.leadSource })}\nRespond JSON: { "preferredChannel": "email|phone|linkedin|sms|inperson", "confidence": "high|medium|low", "alternativeChannels": [...] }`;
    const ai = await callAI(prompt);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-best-time', crmContactsRateLimit, async (req, res) => {
  try {
    const contact = await loadContact(req.prisma, req.body.id, res);
    if (!contact) return;
    const prompt = `Predict the best time to contact this person.\nContact: ${JSON.stringify({ title: contact.title, department: contact.department })}\nRespond JSON: { "bestDays": [...], "bestHoursLocal": "...", "timezone": "...", "rationale": "..." }`;
    const ai = await callAI(prompt);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/validate-email', crmContactsRateLimit, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const prompt = `Validate and assess deliverability risk for this email address: ${email}\nRespond JSON: { "isValid": true|false, "format": "valid|invalid", "domainReputation": "good|neutral|poor|unknown", "deliverabilityRisk": "low|medium|high", "suggestions": [...] }`;
    const ai = await callAI(prompt);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-job-change', crmContactsRateLimit, async (req, res) => {
  try {
    const contact = await loadContact(req.prisma, req.body.id, res);
    if (!contact) return;
    const prompt = `Based on this contact's profile, assess the likelihood of a recent job change.\nContact: ${JSON.stringify({ firstName: contact.firstName, lastName: contact.lastName, title: contact.title, department: contact.department, updatedAt: contact.updatedAt })}\nRespond JSON: { "jobChangeLikelihood": "high|medium|low", "signals": [...], "recommendedAction": "verify|reach_out|monitor" }`;
    const ai = await callAI(prompt);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-relationship-map', crmContactsRateLimit, async (req, res) => {
  try {
    const contact = await loadContact(req.prisma, req.body.id, res);
    if (!contact) return;
    const accountContacts = contact.accountId ? await req.prisma.crmContact.findMany({ where: { accountId: contact.accountId, isArchived: false }, select: { id: true, firstName: true, lastName: true, title: true, department: true }, take: 20 }).catch(() => []) : [];
    const prompt = `Suggest a relationship map / org chart structure for this account based on known contacts.\nPrimary Contact: ${JSON.stringify({ title: contact.title, department: contact.department })}\nOther Contacts: ${JSON.stringify(accountContacts)}\nRespond JSON: { "nodes": [...], "relationships": [...], "powerCenter": "...", "blindSpots": [...] }`;
    const ai = await callAI(prompt);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-outreach-email', crmContactsRateLimit, async (req, res) => {
  try {
    const contact = await loadContact(req.prisma, req.body.id, res);
    if (!contact) return;
    const { context } = req.body;
    const prompt = `Generate a personalized outreach email for this contact.\nContact: ${JSON.stringify({ firstName: contact.firstName, title: contact.title, department: contact.department, buyerPersona: contact.buyerPersona })}\nContext: ${context || 'cold outreach'}\nRespond JSON: { "subject": "...", "body": "...", "ps": "...", "sendAt": "..." }`;
    const ai = await callAI(prompt);
    res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/score-lead-fit', crmContactsRateLimit, async (req, res) => {
  try {
    const contact = await loadContact(req.prisma, req.body.id, res);
    if (!contact) return;
    const prompt = `Score how well this contact fits your Ideal Customer Profile (ICP).\nContact: ${JSON.stringify({ title: contact.title, department: contact.department, leadSource: contact.leadSource })}\nRespond JSON: { "fitScore": 0-100, "tier": "A|B|C|D", "icpMatchFactors": [...], "gaps": [...] }`;
    const ai = await callAI(prompt);
    const parsed = parseAIJson(ai.result);
    if (typeof parsed.fitScore === 'number') await req.prisma.crmContact.update({ where: { id: contact.id }, data: { leadFitScore: parsed.fitScore } }).catch(() => {});
    res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
