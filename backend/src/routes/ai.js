import express from 'express';
import OpenAI from 'openai';
import { body, param, query, validationResult } from 'express-validator';

const router = express.Router();

// ─── Model ────────────────────────────────────────────────────────────────────
const MODEL = 'anthropic/claude-3-5-sonnet-20241022';

// ─── Validation helpers ───────────────────────────────────────────────────────
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

const chatValidation = [
  body('message').notEmpty().isString().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1–2000 characters'),
  body('sessionId').optional().isString().isLength({ max: 100 }),
  body('context').optional().isString().isLength({ max: 500 }),
  validateRequest,
];

const generateResponseValidation = [
  body('ticketId').notEmpty().isString().withMessage('ticketId is required'),
  body('tone').optional().isIn(['professional', 'casual', 'empathetic', 'formal', 'friendly']),
  validateRequest,
];

const sentimentValidation = [
  body('ticket_id').notEmpty().isString().withMessage('ticket_id is required'),
  validateRequest,
];

const intentValidation = [
  body('message_text').notEmpty().isString().isLength({ min: 1, max: 5000 }).withMessage('message_text is required (max 5000 chars)'),
  validateRequest,
];

// ─── OpenRouter client ────────────────────────────────────────────────────────
const getOpenRouterClient = () => new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': 'AI Customer Support Agent'
  }
});

// ─── Full-text KB search ──────────────────────────────────────────────────────
async function searchKnowledgeBase(prisma, query) {
  try {
    // Use PostgreSQL full-text search with relevance ranking
    const articles = await prisma.$queryRaw`
      SELECT
        id, title, content, summary,
        ts_rank(
          to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'') || ' ' || coalesce(summary,'')),
          plainto_tsquery('english', ${query})
        ) AS rank
      FROM "KnowledgeArticle"
      WHERE
        "isPublished" = true
        AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'') || ' ' || coalesce(summary,''))
            @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT 3
    `;
    return articles;
  } catch {
    // Fallback: naive contains search if full-text not available
    return prisma.knowledgeArticle.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } },
        ]
      },
      select: { id: true, title: true, content: true, summary: true },
      take: 3,
    });
  }
}

// ─── Helper: detect intent (shared) ──────────────────────────────────────────
async function detectIntentInternal(openrouter, message) {
  try {
    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert customer support intent classifier. Analyze the customer message and respond with ONLY a valid JSON object — no markdown, no explanation:
{
  "intent": "<one of: billing|technical|account|complaint|inquiry|other>",
  "confidence": <0.0-1.0>,
  "suggestedRouting": "<department or team>",
  "priority": "<low|medium|high|urgent>"
}`
        },
        { role: 'user', content: message }
      ],
      max_tokens: 100,
      temperature: 0,
    });

    const raw = completion.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : raw);
  } catch {
    return { intent: 'other', confidence: 0.5, suggestedRouting: 'General Support', priority: 'medium' };
  }
}

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────
router.post('/chat', chatValidation, async (req, res) => {
  try {
    const { message, sessionId, context } = req.body;
    const openrouter = getOpenRouterClient();

    const relevantArticles = await searchKnowledgeBase(req.prisma, message);

    const knowledgeContext = relevantArticles.length > 0
      ? `\n\nRelevant knowledge base articles:\n${relevantArticles.map(a => `- ${a.title}: ${a.summary || String(a.content).substring(0, 200)}`).join('\n')}`
      : '';

    const systemPrompt = `You are a helpful AI customer support assistant. Help customers professionally and empathetically.

Guidelines:
- Be concise but thorough
- Admit uncertainty and offer human escalation when needed
- Provide specific, actionable solutions
${knowledgeContext}
${context ? `\nAdditional context: ${context}` : ''}`;

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
      max_tokens: 1024,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    const intentData = await detectIntentInternal(openrouter, message);

    const conversation = await req.prisma.aiConversation.create({
      data: {
        sessionId: sessionId || 'anonymous',
        question: message,
        response,
        intent: intentData.intent,
        confidence: intentData.confidence,
      }
    });

    res.json({
      response,
      intent: intentData.intent,
      intentDetails: intentData,
      conversationId: conversation.id,
      relatedArticles: relevantArticles.map(a => ({ title: a.title })),
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/generate-response ──────────────────────────────────────────
router.post('/generate-response', generateResponseValidation, async (req, res) => {
  try {
    const { ticketId, tone } = req.body;
    const openrouter = getOpenRouterClient();

    const ticket = await req.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { customer: true, messages: { orderBy: { createdAt: 'asc' } }, category: true }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const conversationHistory = ticket.messages.map(m => `${m.isFromAgent ? 'Agent' : 'Customer'}: ${m.content}`).join('\n');

    const systemPrompt = `You are a professional customer support agent. Generate a helpful response for this support ticket.

Ticket Subject: ${ticket.subject}
Category: ${ticket.category?.name || 'General'}
Customer: ${ticket.customer.name}
Priority: ${ticket.priority}
Tone: ${tone || 'professional and friendly'}

Conversation history:
${conversationHistory}

Provide a helpful, ${tone || 'professional'} response.`;

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Generate a response.' }],
      max_tokens: 512,
      temperature: 0.7,
    });

    const generatedResponse = completion.choices[0].message.content;

    await req.prisma.aiConversation.create({
      data: {
        sessionId: `ticket-${ticketId}`,
        question: `[Ticket Response] Subject: ${ticket.subject} | Tone: ${tone || 'professional'}`,
        response: generatedResponse,
        intent: 'ticket_response_generation',
        confidence: 0.9,
      }
    });

    res.json({ response: generatedResponse, ticketId });
  } catch (error) {
    console.error('Generate Response Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/sentiment ────────────────────────────────────────────────────
// Full sentiment analysis on all ticket messages
router.post('/sentiment', sentimentValidation, async (req, res) => {
  try {
    const { ticket_id } = req.body;
    const openrouter = getOpenRouterClient();

    const ticket = await req.prisma.ticket.findUnique({
      where: { id: ticket_id },
      include: { messages: { orderBy: { createdAt: 'asc' } }, customer: { select: { name: true } } }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const conversation = ticket.messages
      .map((m, i) => `[${i + 1}] ${m.isFromAgent ? 'Agent' : 'Customer'} (${new Date(m.createdAt).toISOString()}): ${m.content}`)
      .join('\n');

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert sentiment analysis AI for customer support conversations. Respond ONLY with valid JSON — no markdown.

Analyze the full conversation and return:
{
  "score": <-1.0 to 1.0, overall sentiment>,
  "label": "<very_negative|negative|neutral|positive|very_positive>",
  "emotions": {
    "anger": <0.0-1.0>,
    "frustration": <0.0-1.0>,
    "satisfaction": <0.0-1.0>,
    "confusion": <0.0-1.0>,
    "urgency": <0.0-1.0>
  },
  "urgencyLevel": "<low|medium|high|critical>",
  "trend": "<improving|stable|deteriorating>",
  "trendExplanation": "<1 sentence>",
  "keyInsights": ["<insight1>", "<insight2>"],
  "recommendedAction": "<specific recommended action>"
}`
        },
        { role: 'user', content: `Ticket #${ticket_id}: ${ticket.subject}\n\nConversation:\n${conversation}` }
      ],
      max_tokens: 400,
      temperature: 0,
    });

    let analysis;
    try {
      const raw = completion.choices[0].message.content.trim();
      const match = raw.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(match ? match[0] : raw);
    } catch {
      analysis = { score: 0, label: 'neutral', emotions: {}, urgencyLevel: 'medium', trend: 'stable', trendExplanation: 'Unable to parse', keyInsights: [], recommendedAction: 'Manual review' };
    }

    // Persist sentiment result
    await req.prisma.aiConversation.create({
      data: {
        sessionId: `sentiment-${ticket_id}`,
        question: `[Sentiment Analysis] Ticket: ${ticket.subject}`,
        response: JSON.stringify(analysis),
        intent: 'sentiment_analysis',
        confidence: Math.abs(analysis.score),
      }
    });

    res.json({ ticketId: ticket_id, messageCount: ticket.messages.length, sentiment: analysis });
  } catch (error) {
    console.error('Sentiment Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/analyze-sentiment (legacy text-based endpoint) ──────────────
router.post('/analyze-sentiment', [
  body('text').notEmpty().isString().isLength({ min: 1, max: 5000 }),
  validateRequest,
], async (req, res) => {
  try {
    const { text } = req.body;
    const openrouter = getOpenRouterClient();

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Analyze the sentiment of the following text. Respond with only one word: positive, negative, or neutral.' },
        { role: 'user', content: text }
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const sentiment = completion.choices[0].message.content.toLowerCase().trim();
    res.json({ sentiment, text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/detect-intent ────────────────────────────────────────────────
router.post('/detect-intent', intentValidation, async (req, res) => {
  try {
    const { message_text } = req.body;
    const openrouter = getOpenRouterClient();
    const intentData = await detectIntentInternal(openrouter, message_text);
    res.json({ messageText: message_text, ...intentData });
  } catch (error) {
    console.error('Intent Detection Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/summarize-ticket ────────────────────────────────────────────
router.post('/summarize-ticket', async (req, res) => {
  try {
    const { ticketId } = req.body;
    const openrouter = getOpenRouterClient();

    const ticket = await req.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { customer: true, messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const conversationHistory = ticket.messages.map(m => `${m.isFromAgent ? 'Agent' : 'Customer'}: ${m.content}`).join('\n');

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Summarize this customer support ticket in 2-3 sentences. Focus on the main issue and current status.' },
        { role: 'user', content: `Subject: ${ticket.subject}\n\n${conversationHistory}` }
      ],
      max_tokens: 200,
      temperature: 0.5,
    });

    res.json({ summary: completion.choices[0].message.content, ticketId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/suggest-category ────────────────────────────────────────────
router.post('/suggest-category', async (req, res) => {
  try {
    const { subject, description } = req.body;
    const openrouter = getOpenRouterClient();

    const categories = await req.prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true, description: true } });
    const categoryList = categories.map(c => `- ${c.name}: ${c.description || 'No description'}`).join('\n');

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: `Suggest the most appropriate category from the list. Respond with only the category name.\n\nAvailable categories:\n${categoryList}` },
        { role: 'user', content: `Subject: ${subject}\nDescription: ${description}` }
      ],
      max_tokens: 50,
      temperature: 0,
    });

    const suggestedName = completion.choices[0].message.content.trim();
    const suggestedCategory = categories.find(c => c.name.toLowerCase() === suggestedName.toLowerCase());
    res.json({ suggestedCategory: suggestedCategory || null, suggestedName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/suggest-priority ────────────────────────────────────────────
router.post('/suggest-priority', async (req, res) => {
  try {
    const { subject, description } = req.body;
    const openrouter = getOpenRouterClient();

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Analyze the urgency of the following support ticket. Respond with only one word: low, medium, high, or urgent.' },
        { role: 'user', content: `Subject: ${subject}\nDescription: ${description}` }
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const priority = completion.choices[0].message.content.toLowerCase().trim();
    res.json({ priority });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/generate-article ────────────────────────────────────────────
router.post('/generate-article', async (req, res) => {
  try {
    const { topic, keywords } = req.body;
    const openrouter = getOpenRouterClient();

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a technical writer. Generate a helpful knowledge base article with: Title, Summary (1-2 sentences), and Content (detailed with steps where applicable).' },
        { role: 'user', content: `Topic: ${topic}\nKeywords: ${keywords?.join(', ') || 'N/A'}` }
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });

    res.json({ article: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/feedback ────────────────────────────────────────────────────
router.post('/feedback', async (req, res) => {
  try {
    const { conversationId, wasHelpful } = req.body;
    const conversation = await req.prisma.aiConversation.update({ where: { id: conversationId }, data: { wasHelpful } });
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/ai/history/:sessionId ───────────────────────────────────────────
router.get('/history/:sessionId', async (req, res) => {
  try {
    const conversations = await req.prisma.aiConversation.findMany({
      where: { sessionId: req.params.sessionId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/ai/check-escalation ────────────────────────────────────────────
const escalationValidation = [
  body('ticketId').notEmpty().isString().withMessage('ticketId is required'),
  validateRequest,
];

router.post('/check-escalation', escalationValidation, async (req, res) => {
  try {
    const { ticketId } = req.body;
    const openrouter = getOpenRouterClient();

    const ticket = await req.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: { select: { id: true, name: true, email: true, tier: true, totalSpent: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 10 },
        category: { select: { name: true } },
        assignee: { select: { id: true, name: true } },
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const recentMessages = [...ticket.messages].reverse().map(m => `${m.isFromAgent ? 'Agent' : 'Customer'}: ${m.content}`).join('\n');

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an intelligent customer support escalation system. Analyze this ticket and determine if escalation is required.

Escalation triggers: legal threats, repeated refund/cancel requests, extremely negative sentiment, high-value customers with unresolved issues, safety risks.

Respond with ONLY valid JSON:
{
  "shouldEscalate": true|false,
  "urgency": "critical"|"high"|"medium"|"none",
  "triggers": ["<trigger1>"],
  "sentiment_score": <-1.0 to 1.0>,
  "reasoning": "<2-3 sentence explanation>",
  "suggested_action": "<specific action>",
  "escalation_message": "<brief message to senior agent>"
}`
        },
        {
          role: 'user',
          content: `Ticket #${ticket.id}\nSubject: ${ticket.subject}\nPriority: ${ticket.priority}\nStatus: ${ticket.status}\nCategory: ${ticket.category?.name || 'General'}\nCustomer: ${ticket.customer.name} | Tier: ${ticket.customer.tier || 'standard'} | Total Spent: $${ticket.customer.totalSpent || 0}\n\nRecent conversation:\n${recentMessages}`
        }
      ],
      max_tokens: 400,
      temperature: 0.2,
    });

    let analysis;
    try {
      const raw = completion.choices[0].message.content.trim();
      const match = raw.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(match ? match[0] : raw);
    } catch {
      analysis = { shouldEscalate: false, urgency: 'none', triggers: [], sentiment_score: 0, reasoning: 'Unable to parse AI response', suggested_action: 'Manual review recommended', escalation_message: '' };
    }

    if (analysis.shouldEscalate) {
      const newPriority = analysis.urgency === 'critical' ? 'urgent' : analysis.urgency === 'high' ? 'high' : ticket.priority;
      await req.prisma.ticket.update({ where: { id: ticketId }, data: { priority: newPriority } });
      await req.prisma.aiConversation.create({
        data: { sessionId: `escalation-${ticketId}`, question: `[Auto-Escalation Check] Ticket: ${ticket.subject}`, response: JSON.stringify(analysis), intent: 'escalation_analysis', confidence: Math.abs(analysis.sentiment_score) }
      });
      await req.prisma.message.create({
        data: { ticketId, content: `[AI Auto-Escalation Alert]\n${analysis.escalation_message}\n\nTriggers: ${analysis.triggers.join(', ')}\nSuggested action: ${analysis.suggested_action}`, isFromAgent: true, isInternal: true }
      });
    }

    res.json({ ticketId, escalation: analysis, priorityUpdated: analysis.shouldEscalate, checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Escalation check error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
