import express from 'express';
import OpenAI from 'openai';
import { body, validationResult } from 'express-validator';
import { parseAIJson } from '../utils/parseAIJson.js';

const router = express.Router();

const MODEL = 'anthropic/claude-3-5-sonnet-20241022';

// Store an AI feature result row (uses AiConversation as a generic results table).
async function storeAIResult(prisma, { sessionId, feature, question, response, parsed, intent, confidence }) {
  try {
    return await prisma.aiConversation.create({
      data: {
        sessionId: sessionId || `${feature}-${Date.now()}`,
        question: question || `[${feature}]`,
        response: typeof response === 'string' ? response : JSON.stringify(response),
        intent: intent || feature,
        confidence: typeof confidence === 'number' ? confidence : (parsed?.confidence ?? null),
      },
    });
  } catch (e) {
    return null;
  }
}

const getOpenRouterClient = () => new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': 'AI Customer Support Agent'
  }
});

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
}

// ─── POST /api/ai/ticket-priority-predictor ───────────────────────────────────
router.post('/ticket-priority-predictor', [
  body('ticket_id').notEmpty().isString().withMessage('ticket_id is required'),
  validateRequest,
], async (req, res) => {
  try {
    const { ticket_id } = req.body;
    const openrouter = getOpenRouterClient();

    const ticket = await req.prisma.ticket.findUnique({
      where: { id: ticket_id },
      include: {
        customer: { select: { id: true, name: true, tier: true, totalSpent: true, createdAt: true } },
        messages: { orderBy: { createdAt: 'asc' } },
        category: { select: { name: true, description: true } },
        assignee: { select: { name: true } },
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Get customer ticket history
    const customerHistory = await req.prisma.ticket.findMany({
      where: { customerId: ticket.customerId, id: { not: ticket_id } },
      select: { status: true, priority: true, createdAt: true, resolvedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const conversation = ticket.messages.map(m => `${m.isFromAgent ? 'Agent' : 'Customer'}: ${m.content}`).join('\n');
    const avgResolutionDays = customerHistory
      .filter(t => t.resolvedAt)
      .map(t => (new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60 * 24))
      .reduce((sum, d, _, arr) => sum + d / arr.length, 0);

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert at predicting support ticket priority and SLA risk. Respond ONLY with valid JSON:
{
  "predictedPriority": "<low|medium|high|urgent>",
  "currentPriority": "<current priority>",
  "priorityChange": "<increase|decrease|maintain>",
  "slaBreach": {
    "risk": "<low|medium|high|critical>",
    "riskPercentage": <0-100>,
    "estimatedBreachHours": <number or null>,
    "reasons": ["<reason1>"]
  },
  "customerRiskFactors": ["<factor1>"],
  "recommendedActions": ["<action1>"],
  "reasoning": "<2-3 sentence explanation>"
}`
        },
        {
          role: 'user',
          content: `Ticket #${ticket_id}
Subject: ${ticket.subject}
Current Priority: ${ticket.priority}
Status: ${ticket.status}
Category: ${ticket.category?.name || 'General'}
Created: ${ticket.createdAt}

Customer: ${ticket.customer.name}
Customer Tier: ${ticket.customer.tier || 'standard'}
Total Spent: $${ticket.customer.totalSpent || 0}
Previous Tickets: ${customerHistory.length} (avg resolution: ${avgResolutionDays.toFixed(1)} days)
Previous Escalations: ${customerHistory.filter(t => t.priority === 'urgent').length}

Conversation:
${conversation}`
        }
      ],
      max_tokens: 400,
      temperature: 0.2,
    });

    let prediction;
    try {
      const raw = completion.choices[0].message.content.trim();
      const match = raw.match(/\{[\s\S]*\}/);
      prediction = JSON.parse(match ? match[0] : raw);
    } catch {
      prediction = { predictedPriority: ticket.priority, priorityChange: 'maintain', slaBreach: { risk: 'medium', riskPercentage: 50, reasons: [] }, recommendedActions: [], reasoning: 'Unable to parse AI response' };
    }

    // Auto-update priority if AI predicts higher urgency
    const priorityRank = { low: 1, medium: 2, high: 3, urgent: 4 };
    if (priorityRank[prediction.predictedPriority] > priorityRank[ticket.priority]) {
      await req.prisma.ticket.update({ where: { id: ticket_id }, data: { priority: prediction.predictedPriority } });
    }

    res.json({ ticketId: ticket_id, prediction, priorityAutoUpdated: priorityRank[prediction.predictedPriority] > priorityRank[ticket.priority] });
  } catch (error) {
    console.error('Priority predictor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/churn-risk ──────────────────────────────────────────────────
router.post('/churn-risk', [
  body('customer_id').notEmpty().isString().withMessage('customer_id is required'),
  validateRequest,
], async (req, res) => {
  try {
    const { customer_id } = req.body;
    const openrouter = getOpenRouterClient();

    const customer = await req.prisma.customer.findUnique({
      where: { id: customer_id },
      include: {
        tickets: {
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 5 }, category: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }
      }
    });

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const ticketSummary = customer.tickets.map(t => ({
      subject: t.subject,
      priority: t.priority,
      status: t.status,
      category: t.category?.name,
      messageCount: t.messages.length,
      createdAt: t.createdAt,
      resolvedAt: t.resolvedAt,
      daysToResolve: t.resolvedAt ? ((new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60 * 24)).toFixed(1) : null,
    }));

    const unresolvedCount = customer.tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length;
    const escalatedCount = customer.tickets.filter(t => t.priority === 'urgent').length;

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a customer success expert specializing in churn prediction. Respond ONLY with valid JSON:
{
  "churnRisk": "<low|medium|high|critical>",
  "riskScore": <0-100>,
  "churnSignals": ["<signal1>", "<signal2>"],
  "positiveSignals": ["<positive1>"],
  "retentionActions": [
    {"action": "<action>", "priority": "<high|medium|low>", "timeframe": "<immediate|this_week|this_month>"}
  ],
  "estimatedChurnProbability": <0.0-1.0>,
  "recommendedOutreach": "<specific outreach message or approach>",
  "reasoning": "<2-3 sentence analysis>"
}`
        },
        {
          role: 'user',
          content: `Customer: ${customer.name} (${customer.email})
Tier: ${customer.tier || 'standard'}
Total Spent: $${customer.totalSpent || 0}
Customer Since: ${customer.createdAt}
Is Active: ${customer.isActive}
Company: ${customer.company || 'N/A'}

Support History (${customer.tickets.length} tickets):
- Unresolved: ${unresolvedCount}
- Escalated (urgent): ${escalatedCount}

Recent Tickets:
${JSON.stringify(ticketSummary.slice(0, 10), null, 2)}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    let analysis;
    try {
      const raw = completion.choices[0].message.content.trim();
      const match = raw.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(match ? match[0] : raw);
    } catch {
      analysis = { churnRisk: 'medium', riskScore: 50, churnSignals: [], positiveSignals: [], retentionActions: [], reasoning: 'Unable to parse response' };
    }

    res.json({ customerId: customer_id, customerName: customer.name, analysis });
  } catch (error) {
    console.error('Churn risk error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/agent-coaching ─────────────────────────────────────────────
router.post('/agent-coaching', [
  body('conversation_id').notEmpty().isString().withMessage('conversation_id is required'),
  validateRequest,
], async (req, res) => {
  try {
    const { conversation_id } = req.body;
    const openrouter = getOpenRouterClient();

    // conversation_id maps to a ticket id — analyze agent messages within that ticket
    const ticket = await req.prisma.ticket.findUnique({
      where: { id: conversation_id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        assignee: { select: { id: true, name: true, email: true } },
        customer: { select: { name: true, tier: true } },
        category: { select: { name: true } },
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket/conversation not found' });

    const agentMessages = ticket.messages.filter(m => m.isFromAgent && !m.isInternal);
    if (agentMessages.length === 0) {
      return res.status(400).json({ error: 'No agent messages found in this conversation to analyze' });
    }

    const fullConversation = ticket.messages
      .filter(m => !m.isInternal)
      .map(m => `${m.isFromAgent ? `Agent (${ticket.assignee?.name || 'Agent'})` : `Customer (${ticket.customer.name})`}: ${m.content}`)
      .join('\n\n');

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert customer support quality analyst and coach. Analyze agent performance and provide specific, constructive coaching feedback. Respond ONLY with valid JSON:
{
  "overallScore": <0-100>,
  "grade": "<A|B|C|D|F>",
  "metrics": {
    "empathy": <0-100>,
    "accuracy": <0-100>,
    "clarity": <0-100>,
    "efficiency": <0-100>,
    "resolution": <0-100>,
    "professionalism": <0-100>
  },
  "strengths": ["<strength1>", "<strength2>"],
  "areasForImprovement": ["<area1>", "<area2>"],
  "specificFeedback": [
    {"type": "positive|improvement", "quote": "<exact agent quote>", "feedback": "<specific feedback>"}
  ],
  "coachingActions": ["<action1>", "<action2>"],
  "suggestedResponseExamples": ["<better phrasing example>"],
  "csat_prediction": <1-5>,
  "summary": "<2-3 sentence overall assessment>"
}`
        },
        {
          role: 'user',
          content: `Agent: ${ticket.assignee?.name || 'Unknown'}
Ticket: ${ticket.subject}
Category: ${ticket.category?.name || 'General'}
Customer Tier: ${ticket.customer.tier || 'standard'}
Ticket Priority: ${ticket.priority}
Final Status: ${ticket.status}
Agent Messages: ${agentMessages.length}

Full Conversation:
${fullConversation}`
        }
      ],
      max_tokens: 600,
      temperature: 0.4,
    });

    let coaching;
    try {
      const raw = completion.choices[0].message.content.trim();
      const match = raw.match(/\{[\s\S]*\}/);
      coaching = JSON.parse(match ? match[0] : raw);
    } catch {
      coaching = { overallScore: 70, grade: 'B', metrics: {}, strengths: [], areasForImprovement: [], coachingActions: [], summary: 'Unable to parse coaching response' };
    }

    res.json({
      conversationId: conversation_id,
      agentName: ticket.assignee?.name || 'Unknown',
      ticketSubject: ticket.subject,
      coaching,
    });
  } catch (error) {
    console.error('Agent coaching error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/smart-canned-suggester ─────────────────────────────────────
router.post('/smart-canned-suggester', [
  body('ticket_id').notEmpty().isString().withMessage('ticket_id is required'),
  validateRequest,
], async (req, res) => {
  try {
    const { ticket_id } = req.body;
    const openrouter = getOpenRouterClient();

    const [ticket, cannedResponses] = await Promise.all([
      req.prisma.ticket.findUnique({
        where: { id: ticket_id },
        include: {
          customer: { select: { name: true, tier: true } },
          messages: { orderBy: { createdAt: 'asc' }, take: 20 },
          category: { select: { name: true } },
        },
      }),
      req.prisma.cannedResponse.findMany({
        where: { isActive: true },
        select: { id: true, title: true, content: true, shortcut: true, useCount: true },
        take: 50,
      }),
    ]);

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (cannedResponses.length === 0) return res.json({ ticketId: ticket_id, suggestions: [], message: 'No canned responses available' });

    const conversation = ticket.messages
      .map(m => `${m.isFromAgent ? 'Agent' : 'Customer'}: ${m.content}`)
      .join('\n');

    const cannedList = cannedResponses
      .map(r => `[id=${r.id}] ${r.title} (used ${r.useCount}x): ${String(r.content).substring(0, 200)}`)
      .join('\n\n');

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You match support tickets to the most relevant canned responses. Respond ONLY with valid JSON (no markdown):
{
  "suggestions": [
    {
      "cannedResponseId": "<id>",
      "title": "<title>",
      "matchScore": <0.0-1.0>,
      "reasoning": "<1-2 sentence why this fits>",
      "suggestedEdits": "<optional small edits to personalize, or empty string>"
    }
  ],
  "noMatchReason": "<empty if matches found, otherwise reason>"
}
Rank by match score. Limit to top 3 suggestions.`,
        },
        {
          role: 'user',
          content: `Ticket: ${ticket.subject}
Category: ${ticket.category?.name || 'General'}
Customer: ${ticket.customer.name} (${ticket.customer.tier || 'standard'})

Conversation:
${conversation}

Available canned responses:
${cannedList}`,
        },
      ],
      max_tokens: 700,
      temperature: 0.3,
    });

    const raw = completion.choices[0].message.content;
    const parsed = parseAIJson(raw) || { suggestions: [], noMatchReason: 'Unable to parse AI response' };

    await storeAIResult(req.prisma, { sessionId: `canned-suggest-${ticket_id}`, feature: 'smart_canned_suggester', question: `[Canned Suggester] ${ticket.subject}`, response: parsed, intent: 'canned_response_suggestion' });

    res.json({ ticketId: ticket_id, ticketSubject: ticket.subject, suggestions: parsed.suggestions || [], noMatchReason: parsed.noMatchReason || '' });
  } catch (error) {
    console.error('Smart canned suggester error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/clv-scoring ─────────────────────────────────────────────────
router.post('/clv-scoring', [
  body('customer_id').notEmpty().isString().withMessage('customer_id is required'),
  validateRequest,
], async (req, res) => {
  try {
    const { customer_id } = req.body;
    const openrouter = getOpenRouterClient();

    const customer = await req.prisma.customer.findUnique({
      where: { id: customer_id },
      include: {
        tickets: {
          select: { id: true, status: true, priority: true, createdAt: true, resolvedAt: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const tenureDays = Math.max(1, Math.floor((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
    const ticketsPerYear = (customer.tickets.length / tenureDays) * 365;
    const escalationRate = customer.tickets.filter(t => t.priority === 'urgent').length / Math.max(1, customer.tickets.length);

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a customer-success analyst. Compute CLV scoring for prioritization.
Respond ONLY with valid JSON (no markdown):
{
  "clvScore": <0-100>,
  "clvTier": "<bronze|silver|gold|platinum>",
  "estimatedLifetimeValueUSD": <number>,
  "supportPriorityBoost": "<none|small|medium|large>",
  "automaticPriorityRecommendation": "<low|medium|high|urgent>",
  "rationale": "<1-2 sentences>",
  "retentionFactors": ["<factor1>"],
  "growthOpportunities": ["<opportunity1>"]
}`,
        },
        {
          role: 'user',
          content: `Customer: ${customer.name}
Tier: ${customer.tier || 'standard'}
Total Spent: $${customer.totalSpent || 0}
Tenure: ${tenureDays} days
Tickets total: ${customer.tickets.length}
Tickets/year (annualized): ${ticketsPerYear.toFixed(1)}
Escalation rate: ${(escalationRate * 100).toFixed(1)}%
Active: ${customer.isActive}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content;
    const parsed = parseAIJson(raw) || { clvScore: 50, clvTier: 'silver', supportPriorityBoost: 'none', rationale: 'Unable to parse' };

    await storeAIResult(req.prisma, { sessionId: `clv-${customer_id}`, feature: 'clv_scoring', question: `[CLV] ${customer.name}`, response: parsed, intent: 'clv_scoring' });

    res.json({ customerId: customer_id, customerName: customer.name, metrics: { tenureDays, ticketsPerYear: Number(ticketsPerYear.toFixed(2)), escalationRate: Number(escalationRate.toFixed(3)) }, scoring: parsed });
  } catch (error) {
    console.error('CLV scoring error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/faq-builder ─────────────────────────────────────────────────
router.post('/faq-builder', [
  body('category_id').optional().isString(),
  body('limit').optional().isInt({ min: 1, max: 200 }),
  validateRequest,
], async (req, res) => {
  try {
    const { category_id, limit = 50 } = req.body;
    const openrouter = getOpenRouterClient();

    const where = { status: { in: ['resolved', 'closed'] } };
    if (category_id) where.categoryId = category_id;

    const tickets = await req.prisma.ticket.findMany({
      where,
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 10 },
        category: { select: { name: true } },
      },
      orderBy: { resolvedAt: 'desc' },
      take: limit,
    });

    if (tickets.length === 0) return res.json({ faqs: [], message: 'No resolved tickets available to build FAQ from.' });

    const condensed = tickets.map(t => ({
      subject: t.subject,
      category: t.category?.name || 'General',
      lastAgentReply: [...t.messages].reverse().find(m => m.isFromAgent)?.content?.substring(0, 400) || '',
      firstCustomerMsg: t.messages.find(m => !m.isFromAgent)?.content?.substring(0, 400) || t.description?.substring(0, 400) || '',
    }));

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a knowledge-base FAQ author. Cluster the provided resolved tickets and write FAQ entries.
Respond ONLY with valid JSON (no markdown):
{
  "faqs": [
    {
      "question": "<concise customer-facing question>",
      "answer": "<clear 2-4 sentence answer>",
      "category": "<category name>",
      "ticketsCovered": <number>,
      "tags": ["<tag1>"]
    }
  ],
  "clustersIdentified": <number>,
  "summary": "<1-2 sentence summary of patterns found>"
}
Aim for 5-10 high-quality FAQs. Combine duplicates.`,
        },
        {
          role: 'user',
          content: `Resolved tickets to analyze (${condensed.length}):
${JSON.stringify(condensed, null, 2)}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.4,
    });

    const raw = completion.choices[0].message.content;
    const parsed = parseAIJson(raw) || { faqs: [], summary: 'Unable to parse AI response' };

    await storeAIResult(req.prisma, { sessionId: `faq-${Date.now()}`, feature: 'faq_builder', question: `[FAQ Builder] ${tickets.length} tickets`, response: parsed, intent: 'faq_generation' });

    res.json({ ticketCountAnalyzed: tickets.length, ...parsed });
  } catch (error) {
    console.error('FAQ builder error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/translate ───────────────────────────────────────────────────
router.post('/translate', [
  body('text').notEmpty().isString().isLength({ min: 1, max: 10000 }).withMessage('text is required (max 10000 chars)'),
  body('target_language').notEmpty().isString().isLength({ min: 2, max: 50 }).withMessage('target_language is required'),
  body('source_language').optional().isString().isLength({ max: 50 }),
  body('context').optional().isString().isLength({ max: 500 }),
  validateRequest,
], async (req, res) => {
  try {
    const { text, target_language, source_language = 'auto', context = '' } = req.body;
    const openrouter = getOpenRouterClient();

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a professional translator for customer-support communications.
Respond ONLY with valid JSON (no markdown):
{
  "detectedLanguage": "<ISO code or language name>",
  "targetLanguage": "${target_language}",
  "translation": "<translated text, preserving tone and intent>",
  "supportTerminologyNotes": ["<note about any tricky terms>"],
  "preservedQuotedStrings": ["<any product names, IDs, or codes left untranslated>"],
  "confidence": <0.0-1.0>
}
Maintain a professional support tone. Preserve order numbers, IDs, URLs, code identifiers.`,
        },
        {
          role: 'user',
          content: `Source language: ${source_language}
Target language: ${target_language}
Context: ${context || 'customer-support message'}

Text to translate:
"""
${text}
"""`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content;
    const parsed = parseAIJson(raw) || { translation: raw, detectedLanguage: source_language, targetLanguage: target_language, confidence: 0.5 };

    await storeAIResult(req.prisma, { sessionId: `translate-${Date.now()}`, feature: 'multilingual_translate', question: `[Translate] ${source_language}->${target_language}`, response: parsed, intent: 'translation', confidence: parsed.confidence });

    res.json({ originalText: text, ...parsed });
  } catch (error) {
    console.error('Translate error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/closure-predictor ──────────────────────────────────────────
router.post('/closure-predictor', [
  body('ticket_id').notEmpty().isString().withMessage('ticket_id is required'),
  validateRequest,
], async (req, res) => {
  try {
    const { ticket_id } = req.body;
    const openrouter = getOpenRouterClient();

    const ticket = await req.prisma.ticket.findUnique({
      where: { id: ticket_id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        customer: { select: { name: true, tier: true } },
        category: { select: { name: true } },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const ageHours = (Date.now() - new Date(ticket.createdAt).getTime()) / 36e5;
    const lastMessage = ticket.messages[ticket.messages.length - 1];
    const hoursSinceLastMessage = lastMessage ? (Date.now() - new Date(lastMessage.createdAt).getTime()) / 36e5 : ageHours;
    const lastWasAgent = lastMessage?.isFromAgent;

    const conversation = ticket.messages
      .map(m => `${m.isFromAgent ? 'Agent' : 'Customer'} (${new Date(m.createdAt).toISOString()}): ${m.content}`)
      .join('\n');

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You predict whether a support ticket will close on time, stall, or auto-close cold.
Respond ONLY with valid JSON (no markdown):
{
  "closureLikelihoodNext24h": <0.0-1.0>,
  "closureLikelihoodNext7d": <0.0-1.0>,
  "atRiskOfStalling": true|false,
  "atRiskOfAutoClose": true|false,
  "predictedOutcome": "<resolved|stalled|auto_closed|escalated>",
  "stallReasons": ["<reason1>"],
  "recommendedFollowUpAction": "<specific action>",
  "recommendedFollowUpTiming": "<within_2h|within_24h|within_3d|none>",
  "reasoning": "<2-3 sentence analysis>"
}`,
        },
        {
          role: 'user',
          content: `Ticket: ${ticket.subject}
Status: ${ticket.status}
Priority: ${ticket.priority}
Category: ${ticket.category?.name || 'General'}
Customer: ${ticket.customer.name} (${ticket.customer.tier || 'standard'})
Age: ${ageHours.toFixed(1)} hours
Hours since last message: ${hoursSinceLastMessage.toFixed(1)}
Last message from: ${lastWasAgent ? 'Agent' : 'Customer'}
Total messages: ${ticket.messages.length}

Conversation:
${conversation}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content;
    const parsed = parseAIJson(raw) || { predictedOutcome: 'resolved', closureLikelihoodNext24h: 0.5, closureLikelihoodNext7d: 0.7, atRiskOfStalling: false, atRiskOfAutoClose: false, reasoning: 'Unable to parse' };

    await storeAIResult(req.prisma, { sessionId: `closure-${ticket_id}`, feature: 'closure_predictor', question: `[Closure Predictor] ${ticket.subject}`, response: parsed, intent: 'closure_prediction' });

    res.json({ ticketId: ticket_id, metrics: { ageHours: Number(ageHours.toFixed(1)), hoursSinceLastMessage: Number(hoursSinceLastMessage.toFixed(1)), totalMessages: ticket.messages.length, lastFromAgent: lastWasAgent }, prediction: parsed });
  } catch (error) {
    console.error('Closure predictor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/call-transcript-analyzer ───────────────────────────────────
router.post('/call-transcript-analyzer', [
  body('call_id').notEmpty().isString().withMessage('call_id is required'),
  validateRequest,
], async (req, res) => {
  try {
    const { call_id } = req.body;
    const openrouter = getOpenRouterClient();

    const call = await req.prisma.call.findUnique({
      where: { id: call_id },
      include: {
        transcripts: { orderBy: { timestamp: 'asc' } },
        customer: { select: { id: true, name: true, tier: true } },
        ticket: { select: { id: true, subject: true } },
      },
    });
    if (!call) return res.status(404).json({ error: 'Call not found' });

    if (!call.transcripts || call.transcripts.length === 0) {
      return res.status(400).json({ error: 'No transcript segments found for this call. Upload transcripts first.' });
    }

    const transcript = call.transcripts.map(t => `${t.speaker} (${new Date(t.timestamp).toISOString()}): ${t.content}`).join('\n');

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You analyze customer-support call transcripts. Respond ONLY with valid JSON (no markdown):
{
  "summary": "<2-3 sentence summary>",
  "issuesIdentified": ["<issue1>", "<issue2>"],
  "actionItems": [
    {"action": "<action>", "owner": "<agent|customer|other>", "deadline": "<eg ISO date or descriptor>"}
  ],
  "sentiment": {
    "overall": "<very_negative|negative|neutral|positive|very_positive>",
    "score": <-1.0 to 1.0>,
    "trend": "<improving|stable|deteriorating>"
  },
  "topicsDiscussed": ["<topic1>"],
  "suggestedTags": ["<tag1>"],
  "ticketNoteDraft": "<concise note suitable for adding to a CRM ticket>",
  "wasResolved": true|false,
  "followUpRequired": true|false,
  "csat_prediction": <1-5>
}`,
        },
        {
          role: 'user',
          content: `Call ID: ${call.id}
Direction: ${call.direction}
Customer: ${call.customer?.name || 'Unknown'} (${call.customer?.tier || 'standard'})
Linked ticket: ${call.ticket?.subject || 'None'}
Duration: ${call.duration || 0}s
Transcript:
${transcript}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const raw = completion.choices[0].message.content;
    const parsed = parseAIJson(raw) || { summary: raw, sentiment: { overall: 'neutral', score: 0 }, actionItems: [], wasResolved: false };

    // Persist summary on the call
    try {
      await req.prisma.call.update({
        where: { id: call_id },
        data: {
          summary: parsed.summary || raw.substring(0, 1000),
          sentiment: parsed.sentiment?.overall || null,
        },
      });
    } catch (_) {}

    await storeAIResult(req.prisma, { sessionId: `call-analyze-${call_id}`, feature: 'call_transcript_analyzer', question: `[Call Analyzer] call=${call_id}`, response: parsed, intent: 'call_analysis' });

    res.json({ callId: call_id, transcriptSegments: call.transcripts.length, analysis: parsed });
  } catch (error) {
    console.error('Call transcript analyzer error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/sla-smart-scheduling ───────────────────────────────────────
router.post('/sla-smart-scheduling', [
  body('ticket_id').notEmpty().isString().withMessage('ticket_id is required'),
  body('agent_calendars').optional().isArray(),
  body('holidays').optional().isArray(),
  validateRequest,
], async (req, res) => {
  try {
    const { ticket_id, agent_calendars = [], holidays = [] } = req.body;
    const openrouter = getOpenRouterClient();

    const ticket = await req.prisma.ticket.findUnique({
      where: { id: ticket_id },
      include: {
        customer: { select: { name: true, tier: true } },
        category: { select: { name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const queueDepth = await req.prisma.ticket.count({
      where: { status: { in: ['open', 'in_progress'] } },
    });

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You schedule support response times intelligently considering SLA, holidays, queue depth, and agent availability.
Respond ONLY with valid JSON (no markdown):
{
  "recommendedFirstResponseBy": "<ISO timestamp>",
  "recommendedResolutionBy": "<ISO timestamp>",
  "slaTier": "<critical|high|standard|low>",
  "queueRiskAssessment": "<low|medium|high>",
  "recommendedAssignee": "<agent name or current>",
  "rationale": "<2-3 sentence explanation>",
  "holidayAdjustments": "<short note or 'none'>",
  "escalationTriggerAt": "<ISO timestamp>",
  "businessHoursOnly": true|false
}`,
        },
        {
          role: 'user',
          content: `Now: ${new Date().toISOString()}
Ticket: ${ticket.subject}
Priority: ${ticket.priority}
Category: ${ticket.category?.name || 'General'}
Customer: ${ticket.customer.name} (${ticket.customer.tier || 'standard'})
Current assignee: ${ticket.assignee?.name || 'Unassigned'}
Queue depth (open + in_progress): ${queueDepth}
Agent calendars: ${JSON.stringify(agent_calendars).substring(0, 1000)}
Holidays: ${JSON.stringify(holidays).substring(0, 500)}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content;
    const parsed = parseAIJson(raw) || { slaTier: 'standard', queueRiskAssessment: 'medium', rationale: 'Unable to parse' };

    await storeAIResult(req.prisma, { sessionId: `sla-${ticket_id}`, feature: 'sla_smart_scheduling', question: `[SLA Scheduling] ${ticket.subject}`, response: parsed, intent: 'sla_scheduling' });

    res.json({ ticketId: ticket_id, queueDepth, schedule: parsed });
  } catch (error) {
    console.error('SLA scheduling error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/auto-tag-ticket ─────────────────────────────────────────────
// Multi-label taxonomic tagging for tickets (free-text input — does not require DB row)
router.post('/auto-tag-ticket', [
  body('subject').notEmpty().isString().isLength({ min: 1, max: 500 }).withMessage('subject is required'),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('candidate_tags').optional().isArray(),
  validateRequest,
], async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI features unavailable: OPENROUTER_API_KEY is not configured.' });
    }
    const { subject, description, candidate_tags } = req.body;
    const openrouter = getOpenRouterClient();

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You assign multiple taxonomic tags to a customer-support ticket. Tags are short, lowercase, dash-separated keywords (e.g. "billing", "refund-request", "account-access").
Respond ONLY with valid JSON (no markdown):
{
  "tags": [
    {"tag": "<tag>", "confidence": <0-1>, "reason": "<short reason>"}
  ],
  "primaryTag": "<the single best tag>",
  "ticketType": "<question|incident|task|problem|feature_request|complaint>",
  "urgencySignals": ["<signal1>"],
  "summary": "<one-sentence summary>"
}`,
        },
        {
          role: 'user',
          content: `Subject: ${subject}
Description: ${description || '(none)'}
${Array.isArray(candidate_tags) && candidate_tags.length ? `Candidate tag pool (prefer these when applicable): ${candidate_tags.join(', ')}` : ''}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content;
    const parsed = parseAIJson(raw) || { tags: [], primaryTag: null, summary: raw };

    await storeAIResult(req.prisma, { sessionId: `auto-tag-${Date.now()}`, feature: 'auto_tag_ticket', question: `[Auto Tag] ${subject}`, response: parsed, intent: 'auto_tagging' });

    res.json({ subject, analysis: parsed });
  } catch (error) {
    console.error('Auto-tag ticket error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/extract-call-transcript-action-items ────────────────────────
// Extract structured action items from a free-text call transcript (no DB row required).
router.post('/extract-call-transcript-action-items', [
  body('transcript').notEmpty().isString().isLength({ min: 1, max: 20000 }).withMessage('transcript is required'),
  body('participants').optional().isArray(),
  validateRequest,
], async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI features unavailable: OPENROUTER_API_KEY is not configured.' });
    }
    const { transcript, participants } = req.body;
    const openrouter = getOpenRouterClient();

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You extract concrete action items from a customer-support call transcript.
Respond ONLY with valid JSON (no markdown):
{
  "actionItems": [
    {
      "action": "<imperative phrase>",
      "owner": "<agent|customer|manager|other>",
      "deadline": "<ISO date or descriptor like 'within 24h' or null>",
      "priority": "<low|medium|high|urgent>",
      "dependencies": ["<dep>"]
    }
  ],
  "openCommitments": ["<commitment1>"],
  "followUpsRequired": true|false,
  "summary": "<one-paragraph recap>"
}`,
        },
        {
          role: 'user',
          content: `${Array.isArray(participants) && participants.length ? `Participants: ${participants.join(', ')}\n\n` : ''}Transcript:\n${transcript}`,
        },
      ],
      max_tokens: 700,
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content;
    const parsed = parseAIJson(raw) || { actionItems: [], summary: raw };

    await storeAIResult(req.prisma, { sessionId: `call-action-items-${Date.now()}`, feature: 'extract_call_transcript_action_items', question: `[Call Action Items]`, response: parsed, intent: 'action_item_extraction' });

    res.json({ analysis: parsed });
  } catch (error) {
    console.error('Extract action items error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
