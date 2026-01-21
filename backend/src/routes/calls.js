import express from 'express';
import twilio from 'twilio';

const router = express.Router();

// Get webhook base URL
const getWebhookUrl = () => {
  return process.env.WEBHOOK_URL || process.env.APP_URL || 'http://localhost:5001';
};

// Get Twilio capability token for browser-based calling
router.get('/token', async (req, res) => {
  try {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const identity = req.query.identity || 'support-agent';

    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY || process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_SECRET || process.env.TWILIO_AUTH_TOKEN,
      { identity }
    );

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true
    });

    token.addGrant(voiceGrant);

    res.json({
      token: token.toJwt(),
      identity
    });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all calls with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, direction, customerId } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (direction) where.direction = direction;
    if (customerId) where.customerId = customerId;

    const [calls, total] = await Promise.all([
      req.prisma.call.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true }
          },
          _count: {
            select: { transcripts: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      req.prisma.call.count({ where })
    ]);

    res.json({
      calls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get calls error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get call statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalCalls,
      completedCalls,
      transferredCalls,
      byStatus,
      avgDuration,
      bySentiment,
      recentCalls
    ] = await Promise.all([
      req.prisma.call.count(),
      req.prisma.call.count({ where: { status: 'completed' } }),
      req.prisma.call.count({ where: { wasTransferred: true } }),
      req.prisma.call.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      req.prisma.call.aggregate({
        _avg: { duration: true }
      }),
      req.prisma.call.groupBy({
        by: ['sentiment'],
        where: { sentiment: { not: null } },
        _count: { sentiment: true }
      }),
      req.prisma.call.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } }
        }
      })
    ]);

    res.json({
      totalCalls,
      completedCalls,
      transferredCalls,
      transferRate: totalCalls > 0 ? ((transferredCalls / totalCalls) * 100).toFixed(1) : 0,
      avgDuration: Math.round(avgDuration._avg.duration || 0),
      byStatus,
      bySentiment,
      recentCalls
    });
  } catch (error) {
    console.error('Get call stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single call with full transcript
router.get('/:id', async (req, res) => {
  try {
    const call = await req.prisma.call.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        ticket: {
          select: { id: true, subject: true, status: true }
        },
        transcripts: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json(call);
  } catch (error) {
    console.error('Get call error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a ticket from a call
router.post('/:id/create-ticket', async (req, res) => {
  try {
    const call = await req.prisma.call.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        transcripts: { orderBy: { timestamp: 'asc' } }
      }
    });

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Get or create customer
    let customerId = call.customerId;
    if (!customerId) {
      const customer = await req.prisma.customer.create({
        data: {
          email: `phone_${call.callerPhone.replace(/[^0-9]/g, '')}@temp.local`,
          name: `Phone Customer (${call.callerPhone})`,
          phone: call.callerPhone
        }
      });
      customerId = customer.id;
    }

    // Create ticket
    const ticket = await req.prisma.ticket.create({
      data: {
        subject: call.summary ? call.summary.substring(0, 100) : `Phone call on ${call.startedAt.toLocaleDateString()}`,
        description: call.summary || 'Customer called support. See call transcript for details.',
        source: 'phone',
        priority: call.sentiment === 'negative' ? 'high' : 'medium',
        customerId
      }
    });

    // Add transcript as first message
    if (call.transcripts.length > 0) {
      const transcriptText = call.transcripts
        .map(t => `[${t.speaker}]: ${t.content}`)
        .join('\n');

      await req.prisma.message.create({
        data: {
          ticketId: ticket.id,
          content: `**Call Transcript:**\n${transcriptText}`,
          isFromAgent: true,
          isAiGenerated: true,
          customerId
        }
      });
    }

    // Link call to ticket
    await req.prisma.call.update({
      where: { id: call.id },
      data: { ticketId: ticket.id, customerId }
    });

    res.json(ticket);
  } catch (error) {
    console.error('Create ticket from call error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Make outbound call
router.post('/outbound', async (req, res) => {
  try {
    const { toPhone, customerId } = req.body;

    if (!toPhone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Initialize Twilio client
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Check if we have a public webhook URL (not localhost)
    const webhookUrl = getWebhookUrl();
    const isPublicUrl = !webhookUrl.includes('localhost') && !webhookUrl.includes('127.0.0.1');

    let twilioCall;

    if (isPublicUrl) {
      // Use full AI voice with webhooks
      twilioCall = await client.calls.create({
        to: toPhone,
        from: process.env.TWILIO_PHONE_NUMBER,
        url: `${webhookUrl}/api/voice/incoming`,
        statusCallback: `${webhookUrl}/api/voice/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });
    } else {
      // Simple call without webhooks - just plays a message
      const twiml = `<Response>
        <Say voice="Polly.Joanna">Hello! This is a call from AI Customer Support. Thank you for being our customer. If you need assistance, please call us back or create a support ticket on our website. Goodbye!</Say>
      </Response>`;

      twilioCall = await client.calls.create({
        to: toPhone,
        from: process.env.TWILIO_PHONE_NUMBER,
        twiml: twiml
      });
    }

    // Create call record
    const call = await req.prisma.call.create({
      data: {
        twilioCallSid: twilioCall.sid,
        callerPhone: process.env.TWILIO_PHONE_NUMBER,
        calledPhone: toPhone,
        direction: 'outbound',
        status: 'initiated',
        customerId
      }
    });

    res.json({ call, twilioCallSid: twilioCall.sid });
  } catch (error) {
    console.error('Outbound call error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transcript for a call
router.get('/:id/transcript', async (req, res) => {
  try {
    const transcripts = await req.prisma.callTranscript.findMany({
      where: { callId: req.params.id },
      orderBy: { timestamp: 'asc' }
    });

    res.json(transcripts);
  } catch (error) {
    console.error('Get transcript error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a call
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.call.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Call deleted successfully' });
  } catch (error) {
    console.error('Delete call error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
