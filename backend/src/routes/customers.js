import express from 'express';

const router = express.Router();

// Get all customers with pagination, search, sort
router.get('/', async (req, res) => {
  try {
    const {
      tier, isActive, search,
      page = 1, limit = 20,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const where = {};
    if (tier) where.tier = tier;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const allowedSortFields = ['createdAt', 'name', 'email', 'company', 'tier', 'totalSpent'];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    const [customers, total] = await Promise.all([
      req.prisma.customer.findMany({
        where,
        include: { _count: { select: { tickets: true } } },
        orderBy: { [orderField]: order },
        skip,
        take: limitNum,
      }),
      req.prisma.customer.count({ where }),
    ]);

    res.json({
      data: customers,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CSV Export
router.get('/export/csv', async (req, res) => {
  try {
    const customers = await req.prisma.customer.findMany({
      include: { _count: { select: { tickets: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['ID', 'Name', 'Email', 'Phone', 'Company', 'Tier', 'Total Spent', 'Tickets', 'Active', 'Created At'];
    const csvRows = [headers.join(',')];
    for (const c of customers) {
      csvRows.push([
        c.id, `"${c.name}"`, c.email, c.phone || '', `"${c.company || ''}"`,
        c.tier, c.totalSpent, c._count.tickets, c.isActive,
        new Date(c.createdAt).toISOString(),
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers-export.csv');
    res.send(csvRows.join('\n'));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PDF Export
router.get('/export/pdf', async (req, res) => {
  try {
    const { tier } = req.query;
    const where = {};
    if (tier) where.tier = tier;

    const customers = await req.prisma.customer.findMany({
      where,
      include: { _count: { select: { tickets: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const pdfData = {
      title: 'Customers Report',
      generatedAt: new Date().toISOString(),
      totalRecords: customers.length,
      columns: ['Name', 'Email', 'Phone', 'Company', 'Tier', 'Total Spent', 'Tickets', 'Active', 'Created'],
      rows: customers.map(c => ([
        c.name,
        c.email,
        c.phone || '',
        c.company || '',
        c.tier,
        `$${c.totalSpent.toFixed(2)}`,
        c._count.tickets.toString(),
        c.isActive ? 'Yes' : 'No',
        new Date(c.createdAt).toLocaleDateString(),
      ])),
    };

    res.json(pdfData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete
router.post('/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Provide an array of customer IDs' });
    }
    const result = await req.prisma.customer.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${result.count} customers deleted`, count: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update
router.post('/bulk/update', async (req, res) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Provide an array of customer IDs' });
    }
    const updateData = {};
    if (data.tier) updateData.tier = data.tier;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    const result = await req.prisma.customer.updateMany({ where: { id: { in: ids } }, data: updateData });
    res.json({ message: `${result.count} customers updated`, count: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await req.prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        tickets: {
          include: {
            category: { select: { name: true, color: true } },
            assignee: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: { select: { tickets: true, messages: true } }
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const { email, name, phone, company, notes, tier, avatar } = req.body;
    const customer = await req.prisma.customer.create({
      data: { email, name, phone, company, notes, tier: tier || 'standard', avatar }
    });
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const { email, name, phone, company, notes, tier, isActive, totalSpent, avatar } = req.body;
    const customer = await req.prisma.customer.update({
      where: { id: req.params.id },
      data: { email, name, phone, company, notes, tier, isActive, totalSpent, avatar }
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer tickets
router.get('/:id/tickets', async (req, res) => {
  try {
    const tickets = await req.prisma.ticket.findMany({
      where: { customerId: req.params.id },
      include: {
        category: { select: { name: true, color: true } },
        assignee: { select: { name: true, avatar: true } },
        _count: { select: { messages: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
