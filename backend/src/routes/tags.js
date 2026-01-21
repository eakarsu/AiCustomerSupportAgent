import express from 'express';

const router = express.Router();

// Get all tags
router.get('/', async (req, res) => {
  try {
    const tags = await req.prisma.tag.findMany({
      include: {
        _count: { select: { tickets: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single tag
router.get('/:id', async (req, res) => {
  try {
    const tag = await req.prisma.tag.findUnique({
      where: { id: req.params.id },
      include: {
        tickets: {
          include: {
            ticket: {
              include: {
                customer: { select: { name: true, email: true } },
                assignee: { select: { name: true } },
                category: { select: { name: true, color: true } }
              }
            }
          },
          take: 20
        },
        _count: { select: { tickets: true } }
      }
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json(tag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create tag
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;

    const tag = await req.prisma.tag.create({
      data: {
        name,
        color: color || '#3b82f6'
      }
    });

    res.status(201).json(tag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update tag
router.put('/:id', async (req, res) => {
  try {
    const { name, color } = req.body;

    const tag = await req.prisma.tag.update({
      where: { id: req.params.id },
      data: { name, color }
    });

    res.json(tag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete tag
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.tag.delete({ where: { id: req.params.id } });
    res.json({ message: 'Tag deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
