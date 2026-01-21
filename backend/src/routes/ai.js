import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

// Initialize OpenRouter client
const getOpenRouterClient = () => {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'AI Customer Support Agent'
    }
  });
};

// Chat with AI assistant
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, context } = req.body;
    const openrouter = getOpenRouterClient();

    // Search knowledge base for relevant articles
    const relevantArticles = await req.prisma.knowledgeArticle.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: message.split(' ')[0], mode: 'insensitive' } },
          { content: { contains: message.split(' ')[0], mode: 'insensitive' } }
        ]
      },
      select: { title: true, content: true, summary: true },
      take: 3
    });

    const knowledgeContext = relevantArticles.length > 0
      ? `\n\nRelevant knowledge base articles:\n${relevantArticles.map(a => `- ${a.title}: ${a.summary || a.content.substring(0, 200)}`).join('\n')}`
      : '';

    const systemPrompt = `You are a helpful AI customer support assistant. You help customers with their questions and issues in a professional, friendly, and efficient manner.

Key guidelines:
- Be concise but thorough in your responses
- If you don't know something, admit it and offer to connect them with a human agent
- Always maintain a helpful and empathetic tone
- Provide specific solutions when possible
- If the issue is complex, break it down into steps
${knowledgeContext}

${context ? `Additional context: ${context}` : ''}`;

    const completion = await openrouter.chat.completions.create({
      model: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1024,
      temperature: 0.7
    });

    const response = completion.choices[0].message.content;

    // Detect intent
    const intent = await detectIntent(openrouter, message);

    // Save conversation
    const conversation = await req.prisma.aiConversation.create({
      data: {
        sessionId: sessionId || 'anonymous',
        question: message,
        response,
        intent,
        confidence: 0.85
      }
    });

    res.json({
      response,
      intent,
      conversationId: conversation.id,
      relatedArticles: relevantArticles.map(a => ({ title: a.title }))
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate AI response for ticket
router.post('/generate-response', async (req, res) => {
  try {
    const { ticketId, tone } = req.body;
    const openrouter = getOpenRouterClient();

    const ticket = await req.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: true,
        messages: { orderBy: { createdAt: 'asc' } },
        category: true
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const conversationHistory = ticket.messages
      .map(m => `${m.isFromAgent ? 'Agent' : 'Customer'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `You are a professional customer support agent. Generate a helpful response for the following support ticket.

Ticket Subject: ${ticket.subject}
Category: ${ticket.category?.name || 'General'}
Customer: ${ticket.customer.name}
Priority: ${ticket.priority}

Tone: ${tone || 'professional and friendly'}

Conversation history:
${conversationHistory}

Provide a helpful, ${tone || 'professional'} response that addresses the customer's concerns.`;

    const completion = await openrouter.chat.completions.create({
      model: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate a response for this ticket.' }
      ],
      max_tokens: 512,
      temperature: 0.7
    });

    res.json({
      response: completion.choices[0].message.content,
      ticketId
    });
  } catch (error) {
    console.error('Generate Response Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze sentiment
router.post('/analyze-sentiment', async (req, res) => {
  try {
    const { text } = req.body;
    const openrouter = getOpenRouterClient();

    const completion = await openrouter.chat.completions.create({
      model: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'system',
          content: 'Analyze the sentiment of the following text. Respond with only one word: positive, negative, or neutral.'
        },
        { role: 'user', content: text }
      ],
      max_tokens: 10,
      temperature: 0
    });

    const sentiment = completion.choices[0].message.content.toLowerCase().trim();

    res.json({ sentiment, text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Summarize ticket
router.post('/summarize-ticket', async (req, res) => {
  try {
    const { ticketId } = req.body;
    const openrouter = getOpenRouterClient();

    const ticket = await req.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: true,
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const conversationHistory = ticket.messages
      .map(m => `${m.isFromAgent ? 'Agent' : 'Customer'}: ${m.content}`)
      .join('\n');

    const completion = await openrouter.chat.completions.create({
      model: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'system',
          content: 'Summarize the following customer support ticket conversation in 2-3 sentences. Focus on the main issue and current status.'
        },
        { role: 'user', content: `Subject: ${ticket.subject}\n\n${conversationHistory}` }
      ],
      max_tokens: 200,
      temperature: 0.5
    });

    res.json({
      summary: completion.choices[0].message.content,
      ticketId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suggest category
router.post('/suggest-category', async (req, res) => {
  try {
    const { subject, description } = req.body;
    const openrouter = getOpenRouterClient();

    const categories = await req.prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true }
    });

    const categoryList = categories.map(c => `- ${c.name}: ${c.description || 'No description'}`).join('\n');

    const completion = await openrouter.chat.completions.create({
      model: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'system',
          content: `Based on the ticket subject and description, suggest the most appropriate category from the following list. Respond with only the category name.\n\nAvailable categories:\n${categoryList}`
        },
        { role: 'user', content: `Subject: ${subject}\nDescription: ${description}` }
      ],
      max_tokens: 50,
      temperature: 0
    });

    const suggestedName = completion.choices[0].message.content.trim();
    const suggestedCategory = categories.find(
      c => c.name.toLowerCase() === suggestedName.toLowerCase()
    );

    res.json({
      suggestedCategory: suggestedCategory || null,
      suggestedName
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suggest priority
router.post('/suggest-priority', async (req, res) => {
  try {
    const { subject, description } = req.body;
    const openrouter = getOpenRouterClient();

    const completion = await openrouter.chat.completions.create({
      model: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'system',
          content: 'Analyze the urgency of the following support ticket and suggest a priority level. Respond with only one word: low, medium, high, or urgent.'
        },
        { role: 'user', content: `Subject: ${subject}\nDescription: ${description}` }
      ],
      max_tokens: 10,
      temperature: 0
    });

    const priority = completion.choices[0].message.content.toLowerCase().trim();

    res.json({ priority });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate knowledge article
router.post('/generate-article', async (req, res) => {
  try {
    const { topic, keywords } = req.body;
    const openrouter = getOpenRouterClient();

    const completion = await openrouter.chat.completions.create({
      model: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'system',
          content: 'You are a technical writer. Generate a helpful knowledge base article with the following structure: Title, Summary (1-2 sentences), and Content (detailed explanation with steps if applicable).'
        },
        { role: 'user', content: `Topic: ${topic}\nKeywords: ${keywords?.join(', ') || 'N/A'}` }
      ],
      max_tokens: 1024,
      temperature: 0.7
    });

    res.json({
      article: completion.choices[0].message.content
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark AI response as helpful
router.post('/feedback', async (req, res) => {
  try {
    const { conversationId, wasHelpful } = req.body;

    const conversation = await req.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { wasHelpful }
    });

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI conversation history
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

// Helper function to detect intent
async function detectIntent(openrouter, message) {
  try {
    const completion = await openrouter.chat.completions.create({
      model: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'system',
          content: 'Classify the intent of the following customer message. Respond with only one of these categories: billing, technical_support, general_inquiry, complaint, feature_request, account_issue, shipping, refund, other.'
        },
        { role: 'user', content: message }
      ],
      max_tokens: 20,
      temperature: 0
    });

    return completion.choices[0].message.content.toLowerCase().trim();
  } catch (error) {
    return 'general_inquiry';
  }
}

export default router;
