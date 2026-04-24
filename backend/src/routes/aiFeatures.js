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

const getModel = () => process.env.OPENROUTER_MODEL || process.env.AI_MODEL || 'anthropic/claude-3-haiku';

// ==================== AI TICKET CLASSIFIER ====================

// Classify a ticket
router.post('/classify-ticket', async (req, res) => {
  try {
    const { subject, description, ticketId } = req.body;
    const openrouter = getOpenRouterClient();

    // Get categories for classification
    const categories = await req.prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true }
    });

    // Get tags for classification
    const tags = await req.prisma.tag.findMany({
      select: { id: true, name: true }
    });

    const categoryList = categories.map(c => c.name).join(', ');
    const tagList = tags.map(t => t.name).join(', ');

    const systemPrompt = `You are an expert AI ticket classifier for a customer support system. Your job is to deeply analyze support tickets and provide accurate, detailed classification to help support teams prioritize and route tickets effectively.

## Your Classification Expertise
- You understand customer intent, emotional tone, and business impact
- You identify technical vs. billing vs. general inquiries with high accuracy
- You detect urgency signals like deadlines, threats to leave, legal mentions, or revenue impact
- You recognize patterns that indicate escalation potential

## Available Categories
${categoryList}

## Available Tags
${tagList}

## Classification Guidelines

**Priority Levels:**
- "urgent": System down, security breach, legal threats, VIP customers blocked, revenue-impacting issues
- "high": Major feature broken, billing errors, multiple users affected, customer threatening to cancel
- "medium": Feature requests, non-critical bugs, general configuration help, single user issues
- "low": General inquiries, documentation requests, feedback, nice-to-have improvements

**Sentiment Analysis:**
- "positive": Customer is polite, appreciative, or constructive
- "neutral": Factual tone, standard inquiry, no strong emotion
- "negative": Frustrated, upset, disappointed, using strong language, threatening action

**Urgency Score (1-10):**
- 1-3: No time pressure, can wait days
- 4-5: Normal priority, should be handled within standard SLA
- 6-7: Important, customer expressed time sensitivity
- 8-9: Very urgent, business impact or deadline mentioned
- 10: Critical emergency, immediate attention required

**Confidence Score:**
- 0.9-1.0: Very clear classification, strong signals in text
- 0.7-0.89: Good classification but some ambiguity
- 0.5-0.69: Moderate confidence, could belong to multiple categories
- Below 0.5: Unclear, needs human review

Analyze the ticket thoroughly. Select up to 3 relevant tags. Provide clear reasoning explaining WHY you chose this classification, referencing specific keywords or phrases from the ticket.

Respond ONLY in valid JSON format:
{
  "suggestedCategory": "category name from the available list",
  "suggestedPriority": "low|medium|high|urgent",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation citing specific evidence from the ticket text",
  "sentiment": "positive|neutral|negative",
  "urgencyScore": 1-10
}`;

    const completion = await openrouter.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Subject: ${subject}\n\nDescription: ${description}` }
      ],
      max_tokens: 1500,
      temperature: 0.3
    });

    let result;
    try {
      const content = completion.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (e) {
      result = {
        suggestedCategory: 'General Inquiry',
        suggestedPriority: 'medium',
        suggestedTags: [],
        confidence: 0.7,
        reasoning: completion.choices[0].message.content,
        sentiment: 'neutral',
        urgencyScore: 5
      };
    }

    // Save classification
    const classification = await req.prisma.aiTicketClassification.create({
      data: {
        ticketId: ticketId || null,
        subject,
        description,
        suggestedCategory: result.suggestedCategory,
        suggestedPriority: result.suggestedPriority,
        suggestedTags: result.suggestedTags || [],
        confidence: result.confidence || 0.8,
        reasoning: result.reasoning,
        sentiment: result.sentiment,
        urgencyScore: result.urgencyScore || 5
      }
    });

    res.json({
      success: true,
      classification,
      aiResponse: result
    });
  } catch (error) {
    console.error('Classify Ticket Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all classifications
router.get('/classifications', async (req, res) => {
  try {
    const classifications = await req.prisma.aiTicketClassification.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ticket: {
          select: { id: true, subject: true, status: true }
        }
      }
    });
    res.json(classifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get classification by ID
router.get('/classifications/:id', async (req, res) => {
  try {
    const classification = await req.prisma.aiTicketClassification.findUnique({
      where: { id: req.params.id },
      include: {
        ticket: true
      }
    });
    if (!classification) {
      return res.status(404).json({ error: 'Classification not found' });
    }
    res.json(classification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete classification
router.delete('/classifications/:id', async (req, res) => {
  try {
    await req.prisma.aiTicketClassification.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AI RESOLUTION PREDICTOR ====================

// Predict resolution
router.post('/predict-resolution', async (req, res) => {
  try {
    const { subject, description, ticketId } = req.body;
    const openrouter = getOpenRouterClient();

    const systemPrompt = `You are an expert AI resolution predictor for a customer support system. Your role is to analyze support tickets and predict the most effective resolution path, estimated timeline, and actionable steps for support agents.

## Your Prediction Expertise
- You have deep knowledge of common support patterns and their resolutions
- You understand technical troubleshooting workflows, billing dispute processes, and account management procedures
- You can estimate realistic resolution times based on issue complexity
- You identify when issues need escalation vs. can be resolved at first contact

## Resolution Prediction Guidelines

**Predicted Resolution:**
Write a comprehensive, actionable resolution that a support agent could follow. Include:
- The root cause analysis (what likely caused this issue)
- The specific fix or action needed
- Any preventive measures to avoid recurrence
- What to communicate to the customer

**Estimated Time (in hours):**
- < 1 hour: Simple fixes like password resets, account updates, quick configuration changes
- 1-4 hours: Moderate issues requiring investigation, billing adjustments, feature explanations
- 4-24 hours: Complex bugs, multi-step processes, requires coordination with other teams
- 24-72 hours: Major issues requiring engineering, policy exceptions, or management approval
- 72+ hours: Feature requests, infrastructure changes, legal/compliance matters

**Suggested Steps:**
Provide 4-7 clear, sequential steps an agent should follow. Each step should be:
- Specific and actionable (not vague like "investigate")
- In logical order (diagnosis before fix)
- Include verification steps (confirm the fix worked)

**Predicted Outcome:**
- "success": High confidence the issue can be fully resolved with the suggested steps
- "partial": The issue can be partially addressed but may need follow-up or a workaround
- "escalation_needed": The issue is too complex, sensitive, or requires specialized access/authority

**Similar Issues Note:**
Mention common patterns this ticket resembles and what typically works for similar cases.

Respond ONLY in valid JSON format:
{
  "predictedResolution": "Comprehensive resolution description with root cause and fix",
  "estimatedTimeHours": number,
  "suggestedSteps": ["Step 1: ...", "Step 2: ...", "Step 3: ...", "Step 4: ..."],
  "confidence": 0.0-1.0,
  "predictedOutcome": "success|partial|escalation_needed",
  "similarIssuesNote": "Pattern recognition and historical context"
}`;

    const completion = await openrouter.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Subject: ${subject}\n\nDescription: ${description}` }
      ],
      max_tokens: 1500,
      temperature: 0.4
    });

    let result;
    try {
      const content = completion.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (e) {
      result = {
        predictedResolution: completion.choices[0].message.content,
        estimatedTimeHours: 24,
        suggestedSteps: ['Review ticket details', 'Contact customer', 'Provide solution'],
        confidence: 0.7,
        predictedOutcome: 'success'
      };
    }

    // Save prediction
    const prediction = await req.prisma.aiResolutionPrediction.create({
      data: {
        ticketId: ticketId || null,
        subject,
        description,
        predictedResolution: result.predictedResolution,
        estimatedTimeHours: result.estimatedTimeHours || 24,
        suggestedSteps: result.suggestedSteps || [],
        confidence: result.confidence || 0.8,
        predictedOutcome: result.predictedOutcome
      }
    });

    res.json({
      success: true,
      prediction,
      aiResponse: result
    });
  } catch (error) {
    console.error('Predict Resolution Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all predictions
router.get('/predictions', async (req, res) => {
  try {
    const predictions = await req.prisma.aiResolutionPrediction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ticket: {
          select: { id: true, subject: true, status: true }
        }
      }
    });
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get prediction by ID
router.get('/predictions/:id', async (req, res) => {
  try {
    const prediction = await req.prisma.aiResolutionPrediction.findUnique({
      where: { id: req.params.id },
      include: {
        ticket: true
      }
    });
    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found' });
    }
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete prediction
router.delete('/predictions/:id', async (req, res) => {
  try {
    await req.prisma.aiResolutionPrediction.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AI KNOWLEDGE SUGGESTER ====================

// Suggest knowledge
router.post('/suggest-knowledge', async (req, res) => {
  try {
    const { query, ticketId } = req.body;
    const openrouter = getOpenRouterClient();

    // Search knowledge base
    const articles = await req.prisma.knowledgeArticle.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query.split(' ')[0], mode: 'insensitive' } },
          { content: { contains: query.split(' ')[0], mode: 'insensitive' } }
        ]
      },
      select: { id: true, title: true, content: true, summary: true },
      take: 5
    });

    const articlesContext = articles.length > 0
      ? articles.map(a => `Title: ${a.title}\nSummary: ${a.summary || a.content.substring(0, 200)}`).join('\n\n')
      : 'No existing articles found.';

    const systemPrompt = `You are an expert AI knowledge assistant for a customer support system. Your role is to find the most relevant knowledge base articles and generate comprehensive, helpful answers to customer and agent queries.

## Your Knowledge Expertise
- You synthesize information from multiple sources to create clear, complete answers
- You identify the most relevant articles even when queries use different terminology
- You provide step-by-step instructions when applicable
- You note when information might be outdated or when the customer should verify with a human agent

## Available Knowledge Base Articles
${articlesContext}

## Response Guidelines

**Generated Answer:**
- Provide a thorough, well-structured answer that directly addresses the query
- Use clear, simple language appropriate for both customers and support agents
- Include step-by-step instructions when the query involves a process
- If the knowledge base doesn't fully cover the topic, provide the best available information and clearly note what additional help may be needed
- Format the answer in a readable way with logical flow

**Article Suggestions:**
- Rank articles by relevance score (1.0 = perfect match, 0.5 = partially relevant)
- Explain WHY each article is relevant to the specific query
- Only include articles that would genuinely help answer the question

**Confidence Score:**
- 0.9-1.0: Answer is well-supported by knowledge base articles
- 0.7-0.89: Good answer but based on partial information
- 0.5-0.69: Answer is extrapolated, may need verification
- Below 0.5: Limited knowledge available, recommend human follow-up

**Additional Resources:**
- Suggest related topics the user might also want to explore
- Recommend contacting specific teams if the query requires specialized help

Respond ONLY in valid JSON format:
{
  "suggestedArticles": [{"id": "article_id", "title": "title", "relevanceScore": 0.0-1.0, "reason": "Specific reason why this article helps"}],
  "generatedAnswer": "Comprehensive, well-structured answer to the query",
  "confidence": 0.0-1.0,
  "additionalResources": ["Related topic or resource suggestion 1", "Related topic or resource suggestion 2"]
}`;

    const completion = await openrouter.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      max_tokens: 1500,
      temperature: 0.5
    });

    let result;
    try {
      const content = completion.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (e) {
      result = {
        suggestedArticles: articles.map(a => ({ id: a.id, title: a.title, relevanceScore: 0.7, reason: 'Keyword match' })),
        generatedAnswer: completion.choices[0].message.content,
        confidence: 0.7
      };
    }

    // Save suggestion
    const suggestion = await req.prisma.aiKnowledgeSuggestion.create({
      data: {
        query,
        ticketId: ticketId || null,
        suggestedArticles: result.suggestedArticles || [],
        generatedAnswer: result.generatedAnswer,
        confidence: result.confidence || 0.8
      }
    });

    res.json({
      success: true,
      suggestion,
      aiResponse: result,
      matchedArticles: articles
    });
  } catch (error) {
    console.error('Suggest Knowledge Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all suggestions
router.get('/knowledge-suggestions', async (req, res) => {
  try {
    const suggestions = await req.prisma.aiKnowledgeSuggestion.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ticket: {
          select: { id: true, subject: true }
        }
      }
    });
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get suggestion by ID
router.get('/knowledge-suggestions/:id', async (req, res) => {
  try {
    const suggestion = await req.prisma.aiKnowledgeSuggestion.findUnique({
      where: { id: req.params.id },
      include: {
        ticket: true
      }
    });
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    res.json(suggestion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete suggestion
router.delete('/knowledge-suggestions/:id', async (req, res) => {
  try {
    await req.prisma.aiKnowledgeSuggestion.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark suggestion helpful
router.post('/knowledge-suggestions/:id/feedback', async (req, res) => {
  try {
    const { wasHelpful } = req.body;
    const suggestion = await req.prisma.aiKnowledgeSuggestion.update({
      where: { id: req.params.id },
      data: { wasHelpful }
    });
    res.json(suggestion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AI QUALITY SCORER ====================

// Score quality
router.post('/score-quality', async (req, res) => {
  try {
    const { ticketId, responseText, agentName } = req.body;
    const openrouter = getOpenRouterClient();

    let ticketContext = '';
    if (ticketId) {
      const ticket = await req.prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { messages: true, customer: true }
      });
      if (ticket) {
        ticketContext = `
Ticket Subject: ${ticket.subject}
Customer: ${ticket.customer.name}
Conversation:
${ticket.messages.map(m => `${m.isFromAgent ? 'Agent' : 'Customer'}: ${m.content}`).join('\n')}
`;
      }
    }

    const systemPrompt = `You are an expert AI quality analyst for customer support responses. Your role is to evaluate support agent responses with detailed, actionable scoring and feedback that helps agents improve their communication skills.

## Quality Evaluation Framework

${ticketContext}

## Response to Evaluate:
"${responseText}"

## Scoring Criteria (0.0 - 10.0 scale):

**Clarity Score:**
- 9-10: Crystal clear, well-organized, easy to follow, no ambiguity
- 7-8: Clear overall but could be more concise or better structured
- 5-6: Understandable but contains jargon, run-on sentences, or unclear instructions
- 3-4: Confusing, poorly organized, customer likely needs to ask follow-up questions
- 1-2: Incomprehensible, contradictory, or completely unclear

**Helpfulness Score:**
- 9-10: Fully addresses the issue, provides solution AND preventive advice, anticipates follow-up questions
- 7-8: Addresses the main issue with a good solution
- 5-6: Partially addresses the issue, missing important details
- 3-4: Vague or generic response, doesn't really solve the problem
- 1-2: Unhelpful, dismissive, or irrelevant to the customer's question

**Professionalism Score:**
- 9-10: Warm, empathetic, appropriate tone, proper grammar, branded voice
- 7-8: Professional and polite, minor tone issues
- 5-6: Acceptable but lacks warmth or empathy
- 3-4: Casual, uses slang, grammatical errors, slightly rude
- 1-2: Unprofessional, rude, dismissive, or inappropriate

**Completeness Score:**
- 9-10: Covers all aspects, includes next steps, sets expectations, provides relevant links/resources
- 7-8: Covers the main issue well but misses some edge cases
- 5-6: Addresses the core question but leaves gaps
- 3-4: Incomplete, customer will likely need to follow up
- 1-2: Barely addresses the question, most information missing

**Overall Score:**
Weighted average considering all criteria, but also factor in:
- Whether the response would resolve the customer's issue in one interaction (first-contact resolution)
- Whether it builds customer trust and satisfaction
- Whether it follows support best practices

## Feedback Guidelines:
- Provide specific, constructive feedback referencing exact phrases from the response
- Highlight 2-3 strengths with specific examples
- Suggest 3-5 concrete, actionable improvements
- If the response is poor, explain what a better response would look like

Respond ONLY in valid JSON format:
{
  "overallScore": 0.0-10.0,
  "clarityScore": 0.0-10.0,
  "helpfulnessScore": 0.0-10.0,
  "professionalismScore": 0.0-10.0,
  "completenessScore": 0.0-10.0,
  "feedback": "Detailed overall assessment with specific examples from the response",
  "improvements": ["Specific improvement 1", "Specific improvement 2", "Specific improvement 3"],
  "strengths": ["Specific strength 1", "Specific strength 2"]
}`;

    const completion = await openrouter.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Please provide a detailed quality analysis of this support response.' }
      ],
      max_tokens: 1500,
      temperature: 0.3
    });

    let result;
    try {
      const content = completion.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (e) {
      result = {
        overallScore: 7.5,
        clarityScore: 7.5,
        helpfulnessScore: 7.5,
        professionalismScore: 8.0,
        completenessScore: 7.0,
        feedback: completion.choices[0].message.content,
        improvements: ['Consider adding more detail', 'Include next steps']
      };
    }

    // Save score
    const score = await req.prisma.aiQualityScore.create({
      data: {
        ticketId: ticketId || null,
        responseId: null,
        overallScore: result.overallScore || 7.5,
        clarityScore: result.clarityScore || 7.5,
        helpfulnessScore: result.helpfulnessScore || 7.5,
        professionalismScore: result.professionalismScore || 8.0,
        completenessScore: result.completenessScore || 7.0,
        feedback: result.feedback,
        improvements: result.improvements || []
      }
    });

    res.json({
      success: true,
      score,
      aiResponse: result
    });
  } catch (error) {
    console.error('Score Quality Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all quality scores
router.get('/quality-scores', async (req, res) => {
  try {
    const scores = await req.prisma.aiQualityScore.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ticket: {
          select: { id: true, subject: true }
        }
      }
    });
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get score by ID
router.get('/quality-scores/:id', async (req, res) => {
  try {
    const score = await req.prisma.aiQualityScore.findUnique({
      where: { id: req.params.id },
      include: {
        ticket: true
      }
    });
    if (!score) {
      return res.status(404).json({ error: 'Score not found' });
    }
    res.json(score);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete score
router.delete('/quality-scores/:id', async (req, res) => {
  try {
    await req.prisma.aiQualityScore.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AI ESCALATION ROUTER ====================

// Route escalation
router.post('/route-escalation', async (req, res) => {
  try {
    const { subject, description, ticketId, customerTier } = req.body;
    const openrouter = getOpenRouterClient();

    // Get available teams/agents
    const agents = await req.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true }
    });

    const agentList = agents.map(a => `${a.name} (${a.role})`).join(', ');

    const systemPrompt = `You are an expert AI escalation router for a customer support system. Your critical role is to analyze support tickets and make intelligent routing decisions to ensure the right team handles each issue with appropriate urgency.

## Available Agents & Supervisors
${agentList}

## Customer Information
- Customer Tier: ${customerTier || 'standard'}
- Tier Priorities: VIP > Enterprise > Premium > Standard (higher tiers get faster, more senior attention)

## Escalation Decision Framework

**When to Escalate (shouldEscalate: true):**
- Legal threats, regulatory complaints (GDPR, CCPA), or mentions of lawyers
- Security breaches, data exposure, or unauthorized access reports
- VIP/Enterprise customers expressing dissatisfaction or threatening to cancel
- Issues affecting multiple users or causing system-wide impact
- Billing disputes over significant amounts (>$500) or repeated billing errors
- Customer has been waiting excessively or bounced between agents
- Abusive or threatening behavior toward staff
- Issues requiring management approval or policy exceptions
- Customer explicitly requesting a supervisor/manager

**When NOT to Escalate (shouldEscalate: false):**
- Standard inquiries that frontline agents can handle
- Simple password resets, account updates, or configuration help
- General product questions or feature inquiries
- Low-impact issues with clear resolution paths

## Team Routing Guidelines:
- **Technical Support**: Bugs, errors, API issues, integration problems, performance issues
- **Billing & Finance**: Payment disputes, refunds, subscription changes, pricing questions
- **Account Management**: Account access, security concerns, data requests, account closures
- **Engineering**: System-wide bugs, infrastructure issues, feature-breaking problems
- **Management/Leadership**: Legal threats, VIP complaints, policy exceptions, PR risks
- **Security Team**: Data breaches, unauthorized access, vulnerability reports

## Urgency Levels:
- "critical": Immediate response needed (security breach, system down, legal deadline)
- "high": Within 1-2 hours (VIP unhappy, revenue at risk, multiple users affected)
- "medium": Within 4-8 hours (standard issues with some time sensitivity)
- "low": Within 24-48 hours (general inquiries, feature requests, feedback)

## Risk Score Guidelines (0.0-1.0):
- 0.8-1.0: High risk of churn, legal action, public complaint, or significant revenue loss
- 0.5-0.79: Moderate risk, customer dissatisfied but salvageable
- 0.2-0.49: Low risk, routine issue
- 0.0-0.19: No risk, positive or neutral interaction

## Sentiment Detection:
- "angry": All caps, exclamation marks, threats, profanity, ultimatums
- "negative": Expressed frustration, disappointment, complained about service
- "neutral": Factual, standard inquiry tone
- "positive": Polite, patient, appreciative

Respond ONLY in valid JSON format:
{
  "shouldEscalate": true/false,
  "escalationReason": "Detailed explanation of why escalation is/isn't needed, citing specific evidence",
  "suggestedTeam": "Team name",
  "suggestedAgent": "Specific agent name if applicable, or null",
  "urgencyLevel": "low|medium|high|critical",
  "customerSentiment": "positive|neutral|negative|angry",
  "riskScore": 0.0-1.0,
  "confidence": 0.0-1.0,
  "recommendedAction": "Specific first action the assigned team/agent should take"
}`;

    const completion = await openrouter.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Subject: ${subject}\n\nDescription: ${description}` }
      ],
      max_tokens: 1500,
      temperature: 0.3
    });

    let result;
    try {
      const content = completion.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (e) {
      result = {
        shouldEscalate: false,
        escalationReason: completion.choices[0].message.content,
        urgencyLevel: 'medium',
        riskScore: 0.5,
        confidence: 0.7
      };
    }

    // Save routing
    const routing = await req.prisma.aiEscalationRouting.create({
      data: {
        ticketId: ticketId || null,
        subject,
        description,
        shouldEscalate: result.shouldEscalate || false,
        escalationReason: result.escalationReason,
        suggestedTeam: result.suggestedTeam,
        suggestedAgent: result.suggestedAgent,
        urgencyLevel: result.urgencyLevel || 'medium',
        customerSentiment: result.customerSentiment,
        riskScore: result.riskScore || 0.5,
        confidence: result.confidence || 0.8
      }
    });

    res.json({
      success: true,
      routing,
      aiResponse: result
    });
  } catch (error) {
    console.error('Route Escalation Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all routings
router.get('/escalation-routings', async (req, res) => {
  try {
    const routings = await req.prisma.aiEscalationRouting.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ticket: {
          select: { id: true, subject: true, status: true }
        }
      }
    });
    res.json(routings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get routing by ID
router.get('/escalation-routings/:id', async (req, res) => {
  try {
    const routing = await req.prisma.aiEscalationRouting.findUnique({
      where: { id: req.params.id },
      include: {
        ticket: true
      }
    });
    if (!routing) {
      return res.status(404).json({ error: 'Routing not found' });
    }
    res.json(routing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete routing
router.delete('/escalation-routings/:id', async (req, res) => {
  try {
    await req.prisma.aiEscalationRouting.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AI SHOPPING ASSISTANT ====================

// Chat with shopping assistant
router.post('/shopping-chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const openrouter = getOpenRouterClient();

    // Get products for context
    const products = await req.prisma.product.findMany({
      where: { isActive: true },
      take: 20
    });

    // Get cart for session
    let cart = await req.prisma.shoppingCart.findFirst({
      where: { sessionId }
    });

    const productCatalog = products.map(p =>
      `- ${p.name}: $${p.price} (${p.category}) - ${p.description.substring(0, 100)}...`
    ).join('\n');

    const cartContext = cart ? `Current cart: ${JSON.stringify(cart.items)}` : 'Cart is empty';

    const systemPrompt = `You are a friendly, knowledgeable AI shopping assistant for an e-commerce store. You help customers discover products, make informed purchasing decisions, and have a delightful shopping experience.

## Your Personality
- Warm, enthusiastic, and helpful (like a great in-store shopping advisor)
- You ask clarifying questions to better understand customer needs
- You provide honest recommendations based on customer requirements and budget
- You proactively mention relevant deals, bundles, or complementary products
- You use conversational language, not robotic responses

## Product Catalog
${productCatalog}

## Shopping Context
${cartContext}

## What You Can Help With:
1. **Product Discovery**: Help customers find exactly what they need based on their requirements, budget, and preferences
2. **Product Comparisons**: Compare features, prices, and reviews of similar products
3. **Personalized Recommendations**: Suggest products based on customer's stated needs, budget, or past interests
4. **Product Details**: Answer specific questions about features, specifications, compatibility, and availability
5. **Cart Management**: Help add/remove items, suggest quantities, and review cart contents
6. **Order Status**: Help customers check on existing orders and shipping status
7. **Gift Suggestions**: Recommend products for specific occasions, recipients, or budgets
8. **Deals & Bundles**: Highlight relevant promotions, bundle deals, or cost-saving options

## Response Guidelines:
- Keep responses conversational, helpful, and concise (2-4 sentences for simple queries, more for detailed recommendations)
- When recommending products, explain WHY each product fits the customer's needs
- Mention price, key features, and stock availability when discussing products
- If a product is low in stock, mention urgency
- If you can't find an exact match, suggest the closest alternatives
- Always be honest - don't oversell or make claims not supported by product data

## Intent Classification:
- "browse": Customer is casually looking around
- "search": Customer is looking for something specific
- "add_to_cart": Customer wants to add an item
- "checkout": Customer is ready to purchase
- "order_status": Customer asking about an existing order
- "return": Customer wants to return/exchange
- "general": General questions, greetings, or off-topic

Respond ONLY in valid JSON format:
{
  "response": "Your friendly, helpful response to the customer",
  "intent": "browse|search|add_to_cart|checkout|order_status|return|general",
  "productRecommendations": [{"name": "exact product name from catalog", "reason": "Why this product fits their needs"}],
  "cartAction": {"action": "add|remove|update|clear", "product": "name", "quantity": 1},
  "confidence": 0.0-1.0
}`;

    const completion = await openrouter.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    let result;
    try {
      const content = completion.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (e) {
      result = {
        response: completion.choices[0].message.content,
        intent: 'general',
        confidence: 0.7
      };
    }

    // Save conversation
    const conversation = await req.prisma.aiShoppingConversation.create({
      data: {
        sessionId: sessionId || 'anonymous',
        customerMessage: message,
        assistantResponse: result.response,
        intent: result.intent,
        productRecommendations: result.productRecommendations || [],
        cartActions: result.cartAction || null,
        confidence: result.confidence || 0.8
      }
    });

    res.json({
      success: true,
      conversation,
      aiResponse: result
    });
  } catch (error) {
    console.error('Shopping Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get shopping conversations
router.get('/shopping-conversations', async (req, res) => {
  try {
    const conversations = await req.prisma.aiShoppingConversation.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversation by ID
router.get('/shopping-conversations/:id', async (req, res) => {
  try {
    const conversation = await req.prisma.aiShoppingConversation.findUnique({
      where: { id: req.params.id }
    });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete conversation
router.delete('/shopping-conversations/:id', async (req, res) => {
  try {
    await req.prisma.aiShoppingConversation.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PRODUCTS ====================

// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await req.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product by ID
router.get('/products/:id', async (req, res) => {
  try {
    const product = await req.prisma.product.findUnique({
      where: { id: req.params.id }
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
router.post('/products', async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, stock, tags } = req.body;
    const product = await req.prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        category,
        imageUrl,
        stock: parseInt(stock) || 0,
        tags: tags || []
      }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put('/products/:id', async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, stock, tags, isActive } = req.body;
    const product = await req.prisma.product.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        price: price ? parseFloat(price) : undefined,
        category,
        imageUrl,
        stock: stock !== undefined ? parseInt(stock) : undefined,
        tags,
        isActive
      }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
  try {
    await req.prisma.product.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ORDERS ====================

// Get all orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await req.prisma.order.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await req.prisma.order.findUnique({
      where: { id: req.params.id }
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create order
router.post('/orders', async (req, res) => {
  try {
    const { customerEmail, customerName, items, totalAmount, shippingAddress, notes } = req.body;
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const order = await req.prisma.order.create({
      data: {
        orderNumber,
        customerEmail,
        customerName,
        items,
        totalAmount: parseFloat(totalAmount),
        shippingAddress,
        notes
      }
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order
router.put('/orders/:id', async (req, res) => {
  try {
    const { status, trackingNumber, notes } = req.body;
    const order = await req.prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        trackingNumber,
        notes
      }
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete order
router.delete('/orders/:id', async (req, res) => {
  try {
    await req.prisma.order.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
