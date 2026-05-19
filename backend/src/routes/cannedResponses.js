import express from 'express';
import OpenAI from 'openai';
import { body, validationResult } from 'express-validator';

const MODEL = 'anthropic/claude-3-5-sonnet-20241022';

const getOpenRouterClient = () => new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': 'AI Customer Support Agent'
  }
});

const router = express.Router();

// Get all canned responses
router.get('/', async (req, res) => {
  try {
    const { search, isActive } = req.query;
    const where = {};

    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { shortcut: { contains: search, mode: 'insensitive' } }
      ];
    }

    const responses = await req.prisma.cannedResponse.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { useCount: 'desc' }
    });

    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single canned response
router.get('/:id', async (req, res) => {
  try {
    const response = await req.prisma.cannedResponse.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, name: true, avatar: true, email: true } }
      }
    });

    if (!response) {
      return res.status(404).json({ error: 'Canned response not found' });
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create canned response
router.post('/', async (req, res) => {
  try {
    const { title, content, shortcut, authorId } = req.body;

    const response = await req.prisma.cannedResponse.create({
      data: {
        title,
        content,
        shortcut,
        authorId
      },
      include: {
        author: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update canned response
router.put('/:id', async (req, res) => {
  try {
    const { title, content, shortcut, isActive } = req.body;

    const response = await req.prisma.cannedResponse.update({
      where: { id: req.params.id },
      data: { title, content, shortcut, isActive },
      include: {
        author: { select: { id: true, name: true } }
      }
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete canned response
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.cannedResponse.delete({ where: { id: req.params.id } });
    res.json({ message: 'Canned response deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Increment use count
router.post('/:id/use', async (req, res) => {
  try {
    const response = await req.prisma.cannedResponse.update({
      where: { id: req.params.id },
      data: { useCount: { increment: 1 } }
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/canned-responses/ai-improve ───────────────────────────────────
router.post('/ai-improve', [
  body('response_text').notEmpty().isString().isLength({ min: 10, max: 5000 }).withMessage('response_text is required (10-5000 chars)'),
  body('context').optional().isString().isLength({ max: 1000 }),
  body('tone').optional().isIn(['professional', 'casual', 'empathetic', 'formal', 'friendly']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array().map(e => ({ field: e.path, message: e.msg })) });

  try {
    const { response_text, context, tone = 'professional' } = req.body;
    const openrouter = getOpenRouterClient();

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert customer support communication specialist. Improve canned responses to be more effective, empathetic, and personalized. Respond ONLY with valid JSON:
{
  "improvedText": "<the improved response>",
  "changes": ["<change made1>", "<change made2>"],
  "personalizationVariables": ["{{customer_name}}", "{{ticket_id}}"],
  "toneScore": <0-100>,
  "clarityScore": <0-100>,
  "empathyScore": <0-100>,
  "improvements": "<brief explanation of what was improved>"
}`
        },
        {
          role: 'user',
          content: `Original response:
${response_text}

${context ? `Context: ${context}` : ''}
Target tone: ${tone}

Improve this canned response to be more effective. Add personalization variables like {{customer_name}}, {{ticket_number}}, {{product_name}} where appropriate.`
        }
      ],
      max_tokens: 600,
      temperature: 0.5,
    });

    let result;
    try {
      const raw = completion.choices[0].message.content.trim();
      const match = raw.match(/\{[\s\S]*\}/);
      result = JSON.parse(match ? match[0] : raw);
    } catch {
      result = { improvedText: completion.choices[0].message.content, changes: [], personalizationVariables: [], improvements: 'Unable to parse structured response' };
    }

    res.json({ original: response_text, ...result });
  } catch (error) {
    console.error('Canned response AI improve error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
