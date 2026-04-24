import express from 'express';

const router = express.Router();

// Get all tickets with pagination, search, sort
router.get('/', async (req, res) => {
  try {
    const {
      status, priority, categoryId, assigneeId,
      page = 1, limit = 20,
      search, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;
    if (assigneeId) where.assigneeId = assigneeId;

    // Search across subject, description, customer name
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Validate sortBy
    const allowedSortFields = ['createdAt', 'updatedAt', 'subject', 'status', 'priority'];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    const [tickets, total] = await Promise.all([
      req.prisma.ticket.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true, avatar: true } },
          assignee: { select: { id: true, name: true, avatar: true } },
          category: { select: { id: true, name: true, color: true } },
          tags: { include: { tag: true } },
          _count: { select: { messages: true } }
        },
        orderBy: { [orderField]: order },
        skip,
        take: limitNum,
      }),
      req.prisma.ticket.count({ where }),
    ]);

    res.json({
      data: tickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CSV Export
router.get('/export/csv', async (req, res) => {
  try {
    const { status, priority, categoryId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;

    const tickets = await req.prisma.ticket.findMany({
      where,
      include: {
        customer: { select: { name: true, email: true } },
        assignee: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['ID', 'Subject', 'Description', 'Status', 'Priority', 'Customer', 'Customer Email', 'Assignee', 'Category', 'Source', 'Created At'];
    const csvRows = [headers.join(',')];

    for (const t of tickets) {
      csvRows.push([
        t.id,
        `"${(t.subject || '').replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""').substring(0, 200)}"`,
        t.status,
        t.priority,
        `"${t.customer?.name || ''}"`,
        t.customer?.email || '',
        `"${t.assignee?.name || 'Unassigned'}"`,
        `"${t.category?.name || ''}"`,
        t.source,
        new Date(t.createdAt).toISOString(),
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=tickets-export.csv');
    res.send(csvRows.join('\n'));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PDF Export (JSON structure for client-side PDF generation)
router.get('/export/pdf', async (req, res) => {
  try {
    const { status, priority, categoryId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;

    const tickets = await req.prisma.ticket.findMany({
      where,
      include: {
        customer: { select: { name: true, email: true } },
        assignee: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pdfData = {
      title: 'Tickets Report',
      generatedAt: new Date().toISOString(),
      totalRecords: tickets.length,
      columns: ['Subject', 'Status', 'Priority', 'Customer', 'Assignee', 'Category', 'Created'],
      rows: tickets.map(t => ([
        t.subject,
        t.status,
        t.priority,
        t.customer?.name || '',
        t.assignee?.name || 'Unassigned',
        t.category?.name || '',
        new Date(t.createdAt).toLocaleDateString(),
      ])),
    };

    res.json(pdfData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete tickets
router.post('/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Provide an array of ticket IDs' });
    }

    // Delete related records first
    await req.prisma.ticketTag.deleteMany({ where: { ticketId: { in: ids } } });
    await req.prisma.message.deleteMany({ where: { ticketId: { in: ids } } });

    const result = await req.prisma.ticket.deleteMany({
      where: { id: { in: ids } }
    });

    res.json({ message: `${result.count} tickets deleted`, count: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update tickets
router.post('/bulk/update', async (req, res) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Provide an array of ticket IDs' });
    }

    const updateData = {};
    if (data.status) updateData.status = data.status;
    if (data.priority) updateData.priority = data.priority;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.status === 'resolved') updateData.resolvedAt = new Date();

    const result = await req.prisma.ticket.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    res.json({ message: `${result.count} tickets updated`, count: result.count });
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
      data: { ticketId: req.params.id, tagId }
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
