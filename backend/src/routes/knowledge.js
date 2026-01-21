import express from 'express';

const router = express.Router();

// Get all articles
router.get('/', async (req, res) => {
  try {
    const { categoryId, search, isPublished } = req.query;
    const where = {};

    if (categoryId) where.categoryId = categoryId;
    if (isPublished !== undefined) where.isPublished = isPublished === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } }
      ];
    }

    const articles = await req.prisma.knowledgeArticle.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        category: { select: { id: true, name: true, color: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single article
router.get('/:id', async (req, res) => {
  try {
    const article = await req.prisma.knowledgeArticle.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, name: true, avatar: true, email: true } },
        category: { select: { id: true, name: true, color: true, description: true } }
      }
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment views
    await req.prisma.knowledgeArticle.update({
      where: { id: req.params.id },
      data: { views: { increment: 1 } }
    });

    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create article
router.post('/', async (req, res) => {
  try {
    const { title, content, summary, categoryId, authorId, isPublished } = req.body;

    const article = await req.prisma.knowledgeArticle.create({
      data: {
        title,
        content,
        summary,
        categoryId,
        authorId,
        isPublished: isPublished !== false
      },
      include: {
        author: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } }
      }
    });

    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update article
router.put('/:id', async (req, res) => {
  try {
    const { title, content, summary, categoryId, isPublished } = req.body;

    const article = await req.prisma.knowledgeArticle.update({
      where: { id: req.params.id },
      data: { title, content, summary, categoryId, isPublished },
      include: {
        author: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } }
      }
    });

    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete article
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.knowledgeArticle.delete({ where: { id: req.params.id } });
    res.json({ message: 'Article deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark article as helpful
router.post('/:id/helpful', async (req, res) => {
  try {
    const { isHelpful } = req.body;

    const article = await req.prisma.knowledgeArticle.update({
      where: { id: req.params.id },
      data: isHelpful ? { helpful: { increment: 1 } } : { notHelpful: { increment: 1 } }
    });

    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search articles for AI
router.get('/search/ai', async (req, res) => {
  try {
    const { query } = req.query;

    const articles = await req.prisma.knowledgeArticle.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        title: true,
        content: true,
        summary: true
      },
      take: 5
    });

    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
