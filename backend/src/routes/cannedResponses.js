import express from 'express';

const router = express.Router();

// Get all canned responses
router.get('/', async (req, res) => {
  try {
    const { search, isActive } = req.query;
    const where = {};

    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { shortcut: { contains: search, mode: 'insensitive' } }
      ];
    }

    const responses = await req.prisma.cannedResponse.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { useCount: 'desc' }
    });

    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single canned response
router.get('/:id', async (req, res) => {
  try {
    const response = await req.prisma.cannedResponse.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, name: true, avatar: true, email: true } }
      }
    });

    if (!response) {
      return res.status(404).json({ error: 'Canned response not found' });
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create canned response
router.post('/', async (req, res) => {
  try {
    const { title, content, shortcut, authorId } = req.body;

    const response = await req.prisma.cannedResponse.create({
      data: {
        title,
        content,
        shortcut,
        authorId
      },
      include: {
        author: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update canned response
router.put('/:id', async (req, res) => {
  try {
    const { title, content, shortcut, isActive } = req.body;

    const response = await req.prisma.cannedResponse.update({
      where: { id: req.params.id },
      data: { title, content, shortcut, isActive },
      include: {
        author: { select: { id: true, name: true } }
      }
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete canned response
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.cannedResponse.delete({ where: { id: req.params.id } });
    res.json({ message: 'Canned response deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Increment use count
router.post('/:id/use', async (req, res) => {
  try {
    const response = await req.prisma.cannedResponse.update({
      where: { id: req.params.id },
      data: { useCount: { increment: 1 } }
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
