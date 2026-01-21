import express from 'express';

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await req.prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { tickets: true, knowledgeArticles: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single category
router.get('/:id', async (req, res) => {
  try {
    const category = await req.prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        tickets: {
          include: {
            customer: { select: { name: true, email: true } },
            assignee: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        knowledgeArticles: {
          select: { id: true, title: true, views: true },
          take: 10
        },
        _count: { select: { tickets: true, knowledgeArticles: true } }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create category
router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    const category = await req.prisma.category.create({
      data: {
        name,
        description,
        color: color || '#6366f1',
        icon
      }
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color, icon, isActive } = req.body;

    const category = await req.prisma.category.update({
      where: { id: req.params.id },
      data: { name, description, color, icon, isActive }
    });

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.category.delete({ where: { id: req.params.id } });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
