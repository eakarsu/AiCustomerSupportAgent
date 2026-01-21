import express from 'express';

const router = express.Router();

// Get all customers
router.get('/', async (req, res) => {
  try {
    const { tier, isActive, search } = req.query;
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

    const customers = await req.prisma.customer.findMany({
      where,
      include: {
        _count: { select: { tickets: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(customers);
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
      data: {
        email,
        name,
        phone,
        company,
        notes,
        tier: tier || 'standard',
        avatar
      }
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
      data: {
        email,
        name,
        phone,
        company,
        notes,
        tier,
        isActive,
        totalSpent,
        avatar
      }
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
