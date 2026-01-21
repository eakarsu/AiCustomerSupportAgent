import express from 'express';

const router = express.Router();

// Get all tickets
router.get('/', async (req, res) => {
  try {
    const { status, priority, categoryId, assigneeId } = req.query;
    const where = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;
    if (assigneeId) where.assigneeId = assigneeId;

    const tickets = await req.prisma.ticket.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, avatar: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        category: { select: { id: true, name: true, color: true } },
        tags: { include: { tag: true } },
        _count: { select: { messages: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single ticket
router.get('/:id', async (req, res) => {
  try {
    const ticket = await req.prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true, role: true } },
        category: true,
        tags: { include: { tag: true } },
        messages: {
          include: {
            senderUser: { select: { id: true, name: true, avatar: true } },
            customer: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create ticket
router.post('/', async (req, res) => {
  try {
    const { subject, description, customerId, categoryId, priority, source, assigneeId } = req.body;

    const ticket = await req.prisma.ticket.create({
      data: {
        subject,
        description,
        customerId,
        categoryId,
        priority: priority || 'medium',
        source: source || 'web',
        assigneeId
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true, color: true } }
      }
    });

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update ticket
router.put('/:id', async (req, res) => {
  try {
    const { status, priority, categoryId, assigneeId, subject, description } = req.body;
    const data = {};

    if (status) data.status = status;
    if (priority) data.priority = priority;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (assigneeId !== undefined) data.assigneeId = assigneeId;
    if (subject) data.subject = subject;
    if (description) data.description = description;

    if (status === 'resolved') {
      data.resolvedAt = new Date();
    }

    const ticket = await req.prisma.ticket.update({
      where: { id: req.params.id },
      data,
      include: {
        customer: true,
        assignee: { select: { id: true, name: true, avatar: true } },
        category: true
      }
    });

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete ticket
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.ticket.delete({ where: { id: req.params.id } });
    res.json({ message: 'Ticket deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add message to ticket
router.post('/:id/messages', async (req, res) => {
  try {
    const { content, isFromAgent, senderId, customerId, isAiGenerated, sentiment } = req.body;

    const message = await req.prisma.message.create({
      data: {
        content,
        isFromAgent: isFromAgent || false,
        isAiGenerated: isAiGenerated || false,
        sentiment,
        ticketId: req.params.id,
        senderId,
        customerId
      },
      include: {
        senderUser: { select: { id: true, name: true, avatar: true } },
        customer: { select: { id: true, name: true, avatar: true } }
      }
    });

    // Update ticket timestamp
    await req.prisma.ticket.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() }
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add tag to ticket
router.post('/:id/tags', async (req, res) => {
  try {
    const { tagId } = req.body;

    await req.prisma.ticketTag.create({
      data: {
        ticketId: req.params.id,
        tagId
      }
    });

    res.status(201).json({ message: 'Tag added' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove tag from ticket
router.delete('/:id/tags/:tagId', async (req, res) => {
  try {
    await req.prisma.ticketTag.delete({
      where: {
        ticketId_tagId: {
          ticketId: req.params.id,
          tagId: req.params.tagId
        }
      }
    });

    res.json({ message: 'Tag removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
