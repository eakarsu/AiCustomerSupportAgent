import express from 'express';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const where = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const users = await req.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { tickets: true, messages: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        tickets: {
          include: {
            customer: { select: { name: true, email: true } },
            category: { select: { name: true, color: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: { tickets: true, messages: true, responses: true, knowledgeBase: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { email, password, name, role, avatar } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await req.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'agent',
        avatar
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { email, name, role, avatar, isActive, password } = req.body;
    const data = { email, name, role, avatar, isActive };

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await req.prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's tickets
router.get('/:id/tickets', async (req, res) => {
  try {
    const { status } = req.query;
    const where = { assigneeId: req.params.id };

    if (status) where.status = status;

    const tickets = await req.prisma.ticket.findMany({
      where,
      include: {
        customer: { select: { name: true, email: true, avatar: true } },
        category: { select: { name: true, color: true } },
        _count: { select: { messages: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
