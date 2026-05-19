// Custom Views: 4 endpoints for support-domain visualizations and operations.
// Synthesizes data deterministically so the UI always has something to render.
import express from 'express';

const router = express.Router();

// In-memory stores for non-viz features (process-lifetime persistence)
const triageRules = [
  { id: 'r-1001', name: 'High-priority outage', match: 'outage|down|503', matchType: 'regex', priority: 'urgent', queue: 'Tier-2', weight: 90, enabled: true, createdAt: new Date(Date.now() - 86400000 * 12).toISOString() },
  { id: 'r-1002', name: 'Billing keywords', match: 'invoice|refund|charge', matchType: 'regex', priority: 'high', queue: 'Billing', weight: 70, enabled: true, createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: 'r-1003', name: 'How-to questions', match: 'how do i|how can i', matchType: 'keyword', priority: 'low', queue: 'Tier-1', weight: 20, enabled: true, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'r-1004', name: 'VIP customer mention', match: 'enterprise|sla|premium', matchType: 'keyword', priority: 'high', queue: 'VIP', weight: 80, enabled: false, createdAt: new Date(Date.now() - 86400000 * 1).toISOString() },
];

const macroSends = [];
let macroSendIdCounter = 5000;

const cannedMacros = [
  { id: 'm-1', name: 'Acknowledge & investigate', body: 'Thanks for reaching out — we are investigating and will update you within 1 business hour.' },
  { id: 'm-2', name: 'Request more details', body: 'Could you share a screenshot and the exact time you saw the issue?' },
  { id: 'm-3', name: 'Refund initiated', body: 'A refund has been initiated and should appear on your statement in 3–5 business days.' },
  { id: 'm-4', name: 'Resolved – please confirm', body: 'We believe this is now resolved. Please reply if you continue to see the issue.' },
  { id: 'm-5', name: 'Escalated to Tier-2', body: 'Your ticket has been escalated to our Tier-2 team for deeper investigation.' },
];

// Seeded ticket pool used by Kanban and Bulk Macro Reply
function seedTickets() {
  const statuses = ['new', 'in-progress', 'waiting', 'resolved'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const subjects = [
    'Cannot log in to dashboard', 'Refund request for order #4421', 'Email notifications not sending',
    'Mobile app crashes on launch', 'How do I export reports?', 'API returning 503 intermittently',
    'Billing invoice incorrect amount', 'Need to upgrade plan', 'Password reset email not received',
    'SSO with Okta failing', 'Dashboard widgets not loading', 'Webhook delivery delayed',
    'Two-factor auth lockout', 'Custom domain SSL renewal', 'CSV import truncates rows',
    'Slow page load on Reports tab', 'Permission denied on shared folder', 'API rate limit too low for our plan',
    'Outage in eu-west-1 region', 'Mobile push notifications missing',
  ];
  const customers = ['Acme Co', 'Globex', 'Initech', 'Umbrella', 'Stark Industries', 'Wayne Enterprises', 'Wonka Corp', 'Cyberdyne'];
  const tickets = [];
  for (let i = 0; i < 24; i++) {
    const status = statuses[i % statuses.length];
    const priority = priorities[(i * 3) % priorities.length];
    tickets.push({
      id: `T-${1000 + i}`,
      subject: subjects[i % subjects.length],
      customer: customers[i % customers.length],
      priority,
      status,
      assignee: ['Alice', 'Bob', 'Carla', 'Diego', 'Eve'][i % 5],
      queue: ['Tier-1', 'Tier-2', 'Billing', 'VIP'][i % 4],
      createdAt: new Date(Date.now() - (i + 1) * 3600 * 1000).toISOString(),
      firstResponseMinutes: 5 + ((i * 13) % 240),
    });
  }
  return tickets;
}
const SEED_TICKETS = seedTickets();

// VIZ 1: Ticket Kanban grouped by status
router.get('/kanban', (req, res) => {
  const columns = ['new', 'in-progress', 'waiting', 'resolved'].map((status) => ({
    status,
    label: status.replace('-', ' '),
    tickets: SEED_TICKETS.filter((t) => t.status === status).map((t) => ({
      id: t.id, subject: t.subject, customer: t.customer, priority: t.priority,
      assignee: t.assignee, queue: t.queue, createdAt: t.createdAt,
    })),
  }));
  res.json({ ok: true, columns, total: SEED_TICKETS.length, generatedAt: new Date().toISOString() });
});

// VIZ 2: Response time distribution per agent (boxplot-style: min, q1, median, q3, max)
router.get('/response-times', (req, res) => {
  const byAgent = {};
  for (const t of SEED_TICKETS) {
    (byAgent[t.assignee] = byAgent[t.assignee] || []).push(t.firstResponseMinutes);
  }
  // Add a few more synthesized data points per agent for nicer distributions
  Object.keys(byAgent).forEach((agent, ai) => {
    for (let i = 0; i < 8; i++) {
      byAgent[agent].push(10 + ((ai * 17 + i * 11) % 220));
    }
  });
  function quantile(arr, q) {
    const sorted = [...arr].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
  }
  const series = Object.entries(byAgent).map(([agent, samples]) => {
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const median = quantile(samples, 0.5);
    const q1 = quantile(samples, 0.25);
    const q3 = quantile(samples, 0.75);
    return {
      agent,
      min: Math.round(min),
      q1: Math.round(q1),
      median: Math.round(median),
      q3: Math.round(q3),
      max: Math.round(max),
      // recharts-friendly fields for stacked bar boxplot visualization
      lowerWhisker: Math.round(q1 - min),
      box: Math.round(q3 - q1),
      upperWhisker: Math.round(max - q3),
      sampleCount: samples.length,
    };
  });
  res.json({ ok: true, series, unit: 'minutes', generatedAt: new Date().toISOString() });
});

// NON-VIZ 1: Triage Rules CRUD + match preview
router.get('/triage-rules', (req, res) => {
  res.json({ ok: true, rules: triageRules });
});

router.post('/triage-rules', (req, res) => {
  const { name, match, matchType = 'keyword', priority = 'medium', queue = 'Tier-1', weight = 50, enabled = true } = req.body || {};
  if (!name || !match) return res.status(400).json({ error: 'name and match are required' });
  const rule = {
    id: `r-${Date.now()}`,
    name, match, matchType, priority, queue,
    weight: Number(weight) || 50,
    enabled: !!enabled,
    createdAt: new Date().toISOString(),
  };
  triageRules.unshift(rule);
  res.status(201).json({ ok: true, rule });
});

router.put('/triage-rules/:id', (req, res) => {
  const idx = triageRules.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'rule not found' });
  triageRules[idx] = { ...triageRules[idx], ...(req.body || {}), id: triageRules[idx].id };
  res.json({ ok: true, rule: triageRules[idx] });
});

router.delete('/triage-rules/:id', (req, res) => {
  const idx = triageRules.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'rule not found' });
  const [removed] = triageRules.splice(idx, 1);
  res.json({ ok: true, removed });
});

// Preview which seed tickets a rule would match
router.post('/triage-rules/preview', (req, res) => {
  const { match, matchType = 'keyword' } = req.body || {};
  if (!match) return res.status(400).json({ error: 'match expression required' });
  let matcher;
  try {
    matcher = matchType === 'regex' ? new RegExp(match, 'i') : null;
  } catch (e) {
    return res.status(400).json({ error: `invalid regex: ${e.message}` });
  }
  const matches = SEED_TICKETS.filter((t) => {
    const hay = `${t.subject} ${t.customer}`.toLowerCase();
    if (matcher) return matcher.test(hay);
    return match.toLowerCase().split(/\s+/).some((kw) => kw && hay.includes(kw));
  }).map((t) => ({ id: t.id, subject: t.subject, customer: t.customer, priority: t.priority }));
  res.json({ ok: true, matches, count: matches.length, scanned: SEED_TICKETS.length });
});

// NON-VIZ 2: Bulk Macro Reply
router.get('/macros', (req, res) => {
  res.json({ ok: true, macros: cannedMacros, tickets: SEED_TICKETS.map((t) => ({ id: t.id, subject: t.subject, customer: t.customer, status: t.status, priority: t.priority })) });
});

router.post('/macros/bulk-send', (req, res) => {
  const { ticketIds = [], macroId, userId } = req.body || {};
  if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
    return res.status(400).json({ error: 'ticketIds[] is required' });
  }
  const macro = cannedMacros.find((m) => m.id === macroId);
  if (!macro) return res.status(400).json({ error: 'unknown macroId' });
  const sentAt = new Date().toISOString();
  const records = ticketIds.map((tid) => {
    const rec = {
      id: `ms-${++macroSendIdCounter}`,
      macro_id: macro.id,
      macro_name: macro.name,
      ticket_id: tid,
      user_id: userId || null,
      sent_at: sentAt,
    };
    macroSends.push(rec);
    return rec;
  });
  res.status(201).json({ ok: true, sent: records.length, records, table: 'macro_sends' });
});

router.get('/macros/history', (req, res) => {
  res.json({ ok: true, table: 'macro_sends', count: macroSends.length, records: macroSends.slice(-50).reverse() });
});

router.get('/health', (req, res) => {
  res.json({ ok: true, feature: 'custom-views', endpoints: ['/kanban', '/response-times', '/triage-rules', '/triage-rules/preview', '/macros', '/macros/bulk-send', '/macros/history'] });
});

export default router;
