import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const getClient = () => new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY, defaultHeaders: { 'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000', 'X-Title': 'AI CRM Calendar Sync' } });
const rlMap = new Map();
function rl(req, res, next) { const key = req.user ? `user:${req.user.id}` : `ip:${req.ip}`; const now = Date.now(); const e = rlMap.get(key) || { count: 0, resetAt: now + 3600000 }; if (now > e.resetAt) { e.count = 0; e.resetAt = now + 3600000; } e.count++; rlMap.set(key, e); if (e.count > 20) return res.status(429).json({ error: 'Rate limit exceeded.' }); next(); }
function parseAIJson(c) { if (!c) return { raw_response: '' }; const cb = c.match(/```(?:json)?\s*([\s\S]*?)```/); if (cb) { try { return JSON.parse(cb[1].trim()); } catch (_) {} } try { return JSON.parse(c); } catch (_) {} const jm = c.match(/\{[\s\S]*\}/); if (jm) { try { return JSON.parse(jm[0]); } catch (_) {} } return { raw_response: c }; }
async function callAI(prompt) { const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022'; const comp = await getClient().chat.completions.create({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 1024, temperature: 0.2 }); return { result: comp.choices[0]?.message?.content || '', model, usage: comp.usage }; }
async function loadEvent(prisma, id, res) { const r = await prisma.crmCalendarEvent.findUnique({ where: { id } }); if (!r) { res.status(404).json({ error: 'Calendar event not found' }); return null; } return r; }

// ── CRUD ──────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const where = { isArchived: false };
    if (req.query.provider) where.provider = req.query.provider;
    if (req.query.meetingType) where.meetingType = req.query.meetingType;
    if (req.query.ownerId) where.ownerId = req.query.ownerId;
    const [data, total] = await Promise.all([req.prisma.crmCalendarEvent.findMany({ where, skip, take: limit, orderBy: { startAt: 'desc' } }), req.prisma.crmCalendarEvent.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/count', async (req, res) => {
  try { const where = { isArchived: false }; if (req.query.ownerId) where.ownerId = req.query.ownerId; if (req.query.meetingType) where.meetingType = req.query.meetingType; res.json({ count: await req.prisma.crmCalendarEvent.count({ where }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q||'', page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const where = { isArchived: false, OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] };
    const [data, total] = await Promise.all([req.prisma.crmCalendarEvent.findMany({ where, skip, take: limit, orderBy: { startAt: 'desc' } }), req.prisma.crmCalendarEvent.count({ where })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-contact/:contactId', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const [data, total] = await Promise.all([req.prisma.crmCalendarEvent.findMany({ where: { contactId: req.params.contactId, isArchived: false }, skip, take: limit, orderBy: { startAt: 'desc' } }), req.prisma.crmCalendarEvent.count({ where: { contactId: req.params.contactId, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-opportunity/:opportunityId', async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20, skip = (page-1)*limit;
    const [data, total] = await Promise.all([req.prisma.crmCalendarEvent.findMany({ where: { opportunityId: req.params.opportunityId, isArchived: false }, skip, take: limit, orderBy: { startAt: 'desc' } }), req.prisma.crmCalendarEvent.count({ where: { opportunityId: req.params.opportunityId, isArchived: false } })]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/csv', async (req, res) => {
  try {
    const data = await req.prisma.crmCalendarEvent.findMany({ where: { isArchived: false }, orderBy: { startAt: 'desc' } });
    const fields = ['id','externalId','provider','title','meetingType','startAt','endAt','timezone','outcome','qualityScore','contactId','accountId','opportunityId','ownerId','isDoubleBooked','createdAt'];
    res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="crm_calendar_sync.csv"');
    res.send([fields.join(','), ...data.map(r => fields.map(f=>`"${r[f]==null?'':String(r[f]).replace(/"/g,'""')}"`).join(','))].join('\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const [total, byType, doubleBooked] = await Promise.all([
      req.prisma.crmCalendarEvent.count({ where: { isArchived: false } }),
      req.prisma.crmCalendarEvent.groupBy({ by: ['meetingType'], _count: { id: true }, where: { isArchived: false } }),
      req.prisma.crmCalendarEvent.count({ where: { isDoubleBooked: true, isArchived: false } })
    ]);
    res.json({ total, byType, doubleBooked });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/batch', async (req, res) => {
  try { const { items } = req.body; if (!Array.isArray(items)||!items.length) return res.status(400).json({ error: 'items array required' }); res.status(201).json({ count: (await req.prisma.crmCalendarEvent.createMany({ data: items, skipDuplicates: true })).count }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/batch', async (req, res) => {
  try { const { items } = req.body; if (!Array.isArray(items)||!items.length) return res.status(400).json({ error: 'items array required' }); res.json({ data: await Promise.all(items.map(async ({ id, ...f }) => { if (!id) return { error: 'missing id' }; return req.prisma.crmCalendarEvent.update({ where: { id }, data: f }); })) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/batch', async (req, res) => {
  try { const { ids } = req.body; if (!Array.isArray(ids)||!ids.length) return res.status(400).json({ error: 'ids array required' }); res.json({ updated: (await req.prisma.crmCalendarEvent.updateMany({ where: { id: { in: ids } }, data: { isArchived: true, archivedAt: new Date() } })).count }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/import/csv', async (req, res) => {
  try {
    const { csv } = req.body; if (!csv) return res.status(400).json({ error: 'csv field required' });
    const lines = csv.split('\n').map(l=>l.trim()).filter(Boolean); if (lines.length<2) return res.status(400).json({ error: 'CSV needs header+data' });
    const headers = lines[0].split(',').map(h=>h.replace(/"/g,'').trim());
    const items = lines.slice(1).map(line => { const vals = line.match(/(".*?"|[^,]+)/g)||[]; const obj={}; headers.forEach((h,i)=>{ obj[h]=vals[i]?vals[i].replace(/^"|"$/g,'').replace(/""/g,'"'):null; }); return obj; });
    res.status(201).json({ count: (await req.prisma.crmCalendarEvent.createMany({ data: items, skipDuplicates: true })).count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try { const r = await req.prisma.crmCalendarEvent.findUnique({ where: { id: req.params.id } }); if (!r) return res.status(404).json({ error: 'Event not found' }); res.json({ data: r }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json({ data: await req.prisma.crmCalendarEvent.create({ data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmCalendarEvent.update({ where: { id: req.params.id }, data: req.body }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { res.json({ data: await req.prisma.crmCalendarEvent.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/archive', async (req, res) => {
  try { res.json({ data: await req.prisma.crmCalendarEvent.update({ where: { id: req.params.id }, data: { isArchived: true, archivedAt: new Date() } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/restore', async (req, res) => {
  try { res.json({ data: await req.prisma.crmCalendarEvent.update({ where: { id: req.params.id }, data: { isArchived: false, archivedAt: null } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/history', async (req, res) => {
  try { const r = await req.prisma.crmCalendarEvent.findUnique({ where: { id: req.params.id } }); if (!r) return res.status(404).json({ error: 'Event not found' }); res.json({ data: await req.prisma.auditLog.findMany({ where: { entityId: req.params.id, entity: 'CrmCalendarEvent' }, orderBy: { createdAt: 'desc' } }) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AI ────────────────────────────────────────────────────────────────────────

router.post('/ai/suggest-meeting-time', rl, async (req, res) => {
  try { const { contactId, ownerId, durationMin } = req.body; const ai = await callAI(`Suggest optimal meeting times.\nContactId: ${contactId||'unknown'}\nOwnerId: ${ownerId||'unknown'}\nDuration: ${durationMin||30} minutes\nRespond JSON: { "suggestedSlots": [{ "day": "...", "time": "...", "timezone": "..." }], "rationale": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-conflict', rl, async (req, res) => {
  try { const ev = await loadEvent(req.prisma, req.body.id, res); if (!ev) return; const nearby = await req.prisma.crmCalendarEvent.findMany({ where: { ownerId: ev.ownerId, isArchived: false, startAt: { gte: new Date(new Date(ev.startAt).getTime() - 3600000), lte: new Date(new Date(ev.endAt).getTime() + 3600000) }, NOT: { id: ev.id } } }).catch(()=>[]); const ai = await callAI(`Detect scheduling conflicts for this meeting.\nEvent: ${JSON.stringify({ title: ev.title, startAt: ev.startAt, endAt: ev.endAt })}\nNearbyEvents: ${JSON.stringify(nearby.map(e=>({ title: e.title, startAt: e.startAt, endAt: e.endAt })))}\nRespond JSON: { "hasConflict": true|false, "conflictingEvents": [...], "severity": "hard|soft|none", "resolution": "..." }`); const parsed = parseAIJson(ai.result); if (parsed.hasConflict) await req.prisma.crmCalendarEvent.update({ where: { id: ev.id }, data: { isDoubleBooked: true } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-no-show', rl, async (req, res) => {
  try { const ev = await loadEvent(req.prisma, req.body.id, res); if (!ev) return; const ai = await callAI(`Predict the likelihood of a no-show for this meeting.\nEvent: ${JSON.stringify({ title: ev.title, meetingType: ev.meetingType, startAt: ev.startAt, provider: ev.provider })}\nRespond JSON: { "noShowRisk": "high|medium|low", "probability": 0-100, "riskFactors": [...], "mitigation": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-meeting-type', rl, async (req, res) => {
  try { const ev = await loadEvent(req.prisma, req.body.id, res); if (!ev) return; const ai = await callAI(`Classify the meeting type.\nTitle: ${ev.title}\nDescription: ${(ev.description||'').substring(0,300)}\nTypes: discovery|demo|proposal|negotiation|qbr|kickoff|checkin|internal|other\nRespond JSON: { "meetingType": "...", "confidence": "high|medium|low" }`); const parsed = parseAIJson(ai.result); if (parsed.meetingType) await req.prisma.crmCalendarEvent.update({ where: { id: ev.id }, data: { meetingType: parsed.meetingType } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-meeting-agenda', rl, async (req, res) => {
  try { const ev = await loadEvent(req.prisma, req.body.id, res); if (!ev) return; const ai = await callAI(`Recommend an agenda for this meeting.\nTitle: ${ev.title}\nType: ${ev.meetingType||'meeting'}\nDuration: ${Math.round((new Date(ev.endAt)-new Date(ev.startAt))/60000)} minutes\nRespond JSON: { "agenda": [{ "item": "...", "duration": 0, "owner": "..." }], "preWorkItems": [...], "objectives": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-meeting-prep', rl, async (req, res) => {
  try { const ev = await loadEvent(req.prisma, req.body.id, res); if (!ev) return; const ai = await callAI(`Generate meeting preparation materials for this event.\nEvent: ${JSON.stringify({ title: ev.title, meetingType: ev.meetingType, startAt: ev.startAt, contactId: ev.contactId, opportunityId: ev.opportunityId })}\nRespond JSON: { "briefing": "...", "talkingPoints": [...], "objectionAnticipation": [...], "successCriteria": "...", "questions": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/summarize-past-meetings', rl, async (req, res) => {
  try { const { contactId, opportunityId } = req.body; const where = { isArchived: false, ...(contactId ? { contactId } : {}), ...(opportunityId ? { opportunityId } : {}) }; const events = await req.prisma.crmCalendarEvent.findMany({ where, orderBy: { startAt: 'desc' }, take: 10 }); const ai = await callAI(`Summarize the meeting history.\nEvents: ${JSON.stringify(events.map(e=>({ title: e.title, meetingType: e.meetingType, outcome: e.outcome, startAt: e.startAt })))}\nRespond JSON: { "summary": "...", "totalMeetings": ${events.length}, "avgQuality": "...", "keyOutcomes": [...], "openActions": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/score-meeting-quality', rl, async (req, res) => {
  try { const ev = await loadEvent(req.prisma, req.body.id, res); if (!ev) return; const ai = await callAI(`Score the quality of this meeting.\nEvent: ${JSON.stringify({ title: ev.title, meetingType: ev.meetingType, outcome: ev.outcome, description: ev.description })}\nRespond JSON: { "qualityScore": 0-100, "objectives": "met|partial|unmet", "outcomeScore": 0-100, "improvements": [...] }`); const parsed = parseAIJson(ai.result); if (typeof parsed.qualityScore==='number') await req.prisma.crmCalendarEvent.update({ where: { id: ev.id }, data: { qualityScore: parsed.qualityScore } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-attendees', rl, async (req, res) => {
  try { const ev = await loadEvent(req.prisma, req.body.id, res); if (!ev) return; const ai = await callAI(`Suggest additional attendees for this meeting.\nEvent: ${JSON.stringify({ title: ev.title, meetingType: ev.meetingType, accountId: ev.accountId, opportunityId: ev.opportunityId })}\nRespond JSON: { "suggestedRoles": [...], "internalSuggestions": [...], "externalSuggestions": [...], "rationale": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/validate-tz-handling', rl, async (req, res) => {
  try { const ev = await loadEvent(req.prisma, req.body.id, res); if (!ev) return; const ai = await callAI(`Validate timezone handling for this calendar event.\nStartAt: ${ev.startAt}\nEndAt: ${ev.endAt}\nTimezone: ${ev.timezone||'not set'}\nAttendees: ${JSON.stringify(ev.attendees||[])}\nRespond JSON: { "isValid": true|false, "issues": [...], "suggestions": [...] }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/detect-double-booking', rl, async (req, res) => {
  try { const ev = await loadEvent(req.prisma, req.body.id, res); if (!ev) return; const ai = await callAI(`Detect double-booking issues for this event.\nEvent: ${JSON.stringify({ title: ev.title, startAt: ev.startAt, endAt: ev.endAt, ownerId: ev.ownerId, attendees: ev.attendees })}\nRespond JSON: { "isDoubleBooked": true|false, "conflicts": [...], "recommendation": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/recommend-buffer-time', rl, async (req, res) => {
  try { const ev = await loadEvent(req.prisma, req.body.id, res); if (!ev) return; const ai = await callAI(`Recommend buffer time before/after this meeting.\nEvent: ${JSON.stringify({ title: ev.title, meetingType: ev.meetingType, startAt: ev.startAt, endAt: ev.endAt })}\nRespond JSON: { "bufferBefore": 0, "bufferAfter": 0, "rationale": "...", "unit": "minutes" }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/predict-meeting-overrun', rl, async (req, res) => {
  try { const ev = await loadEvent(req.prisma, req.body.id, res); if (!ev) return; const planned = Math.round((new Date(ev.endAt)-new Date(ev.startAt))/60000); const ai = await callAI(`Predict likelihood of this meeting running over its scheduled time.\nEvent: ${JSON.stringify({ title: ev.title, meetingType: ev.meetingType, plannedDurationMin: planned })}\nRespond JSON: { "overrunRisk": "high|medium|low", "predictedExtraMins": 0, "factors": [...], "mitigation": "..." }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/classify-meeting-outcome', rl, async (req, res) => {
  try { const ev = await loadEvent(req.prisma, req.body.id, res); if (!ev) return; const ai = await callAI(`Classify the outcome of this meeting.\nEvent: ${JSON.stringify({ title: ev.title, meetingType: ev.meetingType, outcome: ev.outcome, description: ev.description })}\nOutcomes: advanced|stalled|closed_won|closed_lost|follow_up_required|no_decision|rescheduled\nRespond JSON: { "outcome": "...", "confidence": "high|medium|low", "nextSteps": [...] }`); const parsed = parseAIJson(ai.result); if (parsed.outcome) await req.prisma.crmCalendarEvent.update({ where: { id: ev.id }, data: { outcome: parsed.outcome } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/suggest-rescheduling-window', rl, async (req, res) => {
  try { const ev = await loadEvent(req.prisma, req.body.id, res); if (!ev) return; const ai = await callAI(`Suggest rescheduling windows if this meeting needs to be moved.\nEvent: ${JSON.stringify({ title: ev.title, startAt: ev.startAt, endAt: ev.endAt, timezone: ev.timezone })}\nRespond JSON: { "alternatives": [{ "day": "...", "time": "...", "timezone": "..." }], "rationale": "...", "urgency": "high|medium|low" }`); res.json({ success: true, result: parseAIJson(ai.result), model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai/generate-post-meeting-summary', rl, async (req, res) => {
  try { const ev = await loadEvent(req.prisma, req.body.id, res); if (!ev) return; const ai = await callAI(`Generate a post-meeting summary for this calendar event.\nEvent: ${JSON.stringify({ title: ev.title, meetingType: ev.meetingType, outcome: ev.outcome, description: ev.description })}\nRespond JSON: { "summary": "...", "decisions": [...], "actionItems": [...], "followUpDate": "...", "dealImpact": "positive|neutral|negative" }`); const parsed = parseAIJson(ai.result); if (parsed.summary) await req.prisma.crmCalendarEvent.update({ where: { id: ev.id }, data: { aiSummary: parsed.summary } }).catch(()=>{}); res.json({ success: true, result: parsed, model: ai.model, usage: ai.usage }); } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
