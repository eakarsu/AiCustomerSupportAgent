import express from 'express';
import twilio from 'twilio';
import OpenAI from 'openai';

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

// Initialize OpenRouter client for AI responses
const getOpenRouterClient = () => {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:5001',
      'X-Title': 'AI Customer Support Agent'
    }
  });
};

// Store conversation context per call
const callContexts = new Map();

// Get webhook base URL
const getWebhookUrl = () => {
  return process.env.WEBHOOK_URL || process.env.APP_URL || 'http://localhost:5001';
};

// Handle incoming calls
router.post('/incoming', async (req, res) => {
  try {
    const { CallSid, From, To, Direction } = req.body;

    console.log(`Incoming call: ${CallSid} from ${From}`);

    // Check if call already exists (outbound calls create record first)
    let call = await req.prisma.call.findFirst({
      where: { twilioCallSid: CallSid }
    });

    let customer = null;

    if (call) {
      // Existing call (outbound) - get customer if linked
      if (call.customerId) {
        customer = await req.prisma.customer.findUnique({
          where: { id: call.customerId }
        });
      }
      // Update status
      await req.prisma.call.update({
        where: { id: call.id },
        data: { status: 'in-progress' }
      });
    } else {
      // New call (inbound) - try to find customer by phone number
      customer = await req.prisma.customer.findFirst({
        where: { phone: From }
      });

      // Create call record
      call = await req.prisma.call.create({
        data: {
          twilioCallSid: CallSid,
          callerPhone: From,
          calledPhone: To,
          direction: Direction?.toLowerCase() || 'inbound',
          status: 'in-progress',
          customerId: customer?.id
        }
      });
    }

    // Initialize conversation context
    callContexts.set(CallSid, {
      callId: call.id,
      customerId: customer?.id,
      customerName: customer?.name || 'Customer',
      messages: [],
      turnCount: 0
    });

    // Create TwiML response
    const twiml = new VoiceResponse();

    // Greet the caller
    const greeting = customer
      ? `Hello ${customer.name}! Thank you for calling our support line. How can I help you today?`
      : `Hello! Thank you for calling our customer support. How can I help you today?`;

    twiml.say({ voice: 'Polly.Joanna' }, greeting);

    // Save greeting to transcript
    await req.prisma.callTranscript.create({
      data: {
        callId: call.id,
        speaker: 'ai',
        content: greeting,
        confidence: 1.0
      }
    });

    // Gather speech input
    const gather = twiml.gather({
      input: 'speech',
      action: `${getWebhookUrl()}/api/voice/respond`,
      method: 'POST',
      speechTimeout: 'auto',
      speechModel: 'phone_call',
      enhanced: true,
      language: 'en-US'
    });

    gather.say({ voice: 'Polly.Joanna' }, '');

    // If no input, prompt again
    twiml.say({ voice: 'Polly.Joanna' }, "I didn't hear anything. Please tell me how I can help you.");
    twiml.redirect(`${getWebhookUrl()}/api/voice/incoming`);

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Voice incoming error:', error);
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna' }, 'Sorry, we are experiencing technical difficulties. Please try again later.');
    twiml.hangup();
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Handle speech input and generate AI response
router.post('/respond', async (req, res) => {
  try {
    const { CallSid, SpeechResult, Confidence } = req.body;

    console.log(`Speech received for ${CallSid}: ${SpeechResult}`);

    const context = callContexts.get(CallSid);
    if (!context) {
      throw new Error('Call context not found');
    }

    // Get the call record
    const call = await req.prisma.call.findFirst({
      where: { twilioCallSid: CallSid }
    });

    if (!call) {
      throw new Error('Call not found');
    }

    // Save customer speech to transcript
    await req.prisma.callTranscript.create({
      data: {
        callId: call.id,
        speaker: 'customer',
        content: SpeechResult || 'Unable to transcribe',
        confidence: parseFloat(Confidence) || 0.5
      }
    });

    // Add to conversation context
    context.messages.push({ role: 'user', content: SpeechResult });
    context.turnCount++;

    // Search knowledge base for relevant articles
    const relevantArticles = await req.prisma.knowledgeArticle.findMany({
      where: {
        isPublished: true,
        OR: SpeechResult?.split(' ').slice(0, 3).map(word => ({
          OR: [
            { title: { contains: word, mode: 'insensitive' } },
            { content: { contains: word, mode: 'insensitive' } }
          ]
        })) || []
      },
      select: { title: true, content: true, summary: true },
      take: 2
    });

    const knowledgeContext = relevantArticles.length > 0
      ? `\n\nRelevant knowledge base info:\n${relevantArticles.map(a => `- ${a.title}: ${a.summary || a.content.substring(0, 150)}`).join('\n')}`
      : '';

    // Generate AI response
    const openrouter = getOpenRouterClient();

    const systemPrompt = `You are a helpful AI phone support agent. You are having a phone conversation with a customer.

Key guidelines:
- Keep responses concise and conversational (2-3 sentences max)
- Be warm, friendly, and professional
- If you can help, provide clear instructions
- If you cannot help or the issue is complex, offer to transfer to a human agent
- Use natural speech patterns suitable for phone conversation
- Do NOT use markdown, bullet points, or formatting - this is voice only
- Customer name: ${context.customerName}
${knowledgeContext}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.messages.slice(-6) // Keep last 6 turns for context
    ];

    const completion = await openrouter.chat.completions.create({
      model: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
      messages,
      max_tokens: 200,
      temperature: 0.7
    });

    let aiResponse = completion.choices[0].message.content;

    // Save AI response to transcript
    await req.prisma.callTranscript.create({
      data: {
        callId: call.id,
        speaker: 'ai',
        content: aiResponse,
        confidence: 1.0
      }
    });

    // Add AI response to context
    context.messages.push({ role: 'assistant', content: aiResponse });

    // Detect if customer wants to speak to a human
    const wantsHuman = /transfer|human|agent|person|operator|representative|speak to someone/i.test(SpeechResult);

    // Detect goodbye/end of call
    const wantsToEnd = /goodbye|bye|thank you|that's all|that is all|nothing else|I'm good|i'm done/i.test(SpeechResult);

    const twiml = new VoiceResponse();

    if (wantsHuman) {
      // Transfer to human
      twiml.say({ voice: 'Polly.Joanna' }, "I'll transfer you to a human agent now. Please hold.");

      await req.prisma.call.update({
        where: { id: call.id },
        data: { wasTransferred: true, transferredTo: 'human_agent' }
      });

      // In a real scenario, you would dial another number or put in queue
      twiml.say({ voice: 'Polly.Joanna' }, "Unfortunately, no agents are available at the moment. Please call back during business hours or leave a message after the tone.");
      twiml.record({
        action: `${getWebhookUrl()}/api/voice/recording`,
        maxLength: 120,
        transcribe: true
      });

    } else if (wantsToEnd || context.turnCount >= 10) {
      // End the call
      twiml.say({ voice: 'Polly.Joanna' }, aiResponse);
      twiml.say({ voice: 'Polly.Joanna' }, "Thank you for calling. Have a great day! Goodbye.");
      twiml.hangup();

      // Summarize and close the call
      await summarizeCall(call.id, req.prisma, openrouter);

    } else {
      // Continue conversation
      twiml.say({ voice: 'Polly.Joanna' }, aiResponse);

      // Gather more speech
      const gather = twiml.gather({
        input: 'speech',
        action: `${getWebhookUrl()}/api/voice/respond`,
        method: 'POST',
        speechTimeout: 'auto',
        speechModel: 'phone_call',
        enhanced: true,
        language: 'en-US'
      });

      gather.say({ voice: 'Polly.Joanna' }, '');

      // Timeout fallback
      twiml.say({ voice: 'Polly.Joanna' }, "Are you still there? Is there anything else I can help you with?");
      twiml.redirect(`${getWebhookUrl()}/api/voice/respond`);
    }

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Voice respond error:', error);
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna' }, 'I apologize, I encountered an error. Let me try again.');
    twiml.redirect(`${getWebhookUrl()}/api/voice/incoming`);
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Handle call status updates
router.post('/status', async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;

    console.log(`Call status update: ${CallSid} - ${CallStatus}`);

    const call = await req.prisma.call.findFirst({
      where: { twilioCallSid: CallSid }
    });

    if (call) {
      const updateData = {
        status: CallStatus
      };

      if (CallStatus === 'completed') {
        updateData.endedAt = new Date();
        updateData.duration = parseInt(CallDuration) || 0;

        // Clean up context
        callContexts.delete(CallSid);
      }

      await req.prisma.call.update({
        where: { id: call.id },
        data: updateData
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Status update error:', error);
    res.sendStatus(500);
  }
});

// Handle recording completion
router.post('/recording', async (req, res) => {
  try {
    const { CallSid, RecordingUrl, TranscriptionText } = req.body;

    const call = await req.prisma.call.findFirst({
      where: { twilioCallSid: CallSid }
    });

    if (call) {
      await req.prisma.call.update({
        where: { id: call.id },
        data: {
          recordingUrl: RecordingUrl
        }
      });

      if (TranscriptionText) {
        await req.prisma.callTranscript.create({
          data: {
            callId: call.id,
            speaker: 'customer',
            content: `[Voicemail] ${TranscriptionText}`,
            confidence: 0.8
          }
        });
      }
    }

    const twiml = new VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna' }, "Thank you for your message. Goodbye!");
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Recording error:', error);
    res.sendStatus(500);
  }
});

// Helper function to summarize call
async function summarizeCall(callId, prisma, openrouter) {
  try {
    const transcripts = await prisma.callTranscript.findMany({
      where: { callId },
      orderBy: { timestamp: 'asc' }
    });

    if (transcripts.length === 0) return;

    const conversation = transcripts
      .map(t => `${t.speaker === 'ai' ? 'Agent' : 'Customer'}: ${t.content}`)
      .join('\n');

    const completion = await openrouter.chat.completions.create({
      model: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'system',
          content: 'Summarize this phone support call in 2-3 sentences. Focus on the main issue and resolution.'
        },
        { role: 'user', content: conversation }
      ],
      max_tokens: 150,
      temperature: 0.5
    });

    const summary = completion.choices[0].message.content;

    // Detect sentiment
    const sentimentCompletion = await openrouter.chat.completions.create({
      model: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'system',
          content: 'Analyze the overall sentiment of this customer support call. Respond with only one word: positive, negative, or neutral.'
        },
        { role: 'user', content: conversation }
      ],
      max_tokens: 10,
      temperature: 0
    });

    const sentiment = sentimentCompletion.choices[0].message.content.toLowerCase().trim();

    await prisma.call.update({
      where: { id: callId },
      data: { summary, sentiment }
    });
  } catch (error) {
    console.error('Summarize call error:', error);
  }
}

export default router;
