import express from 'express';

const router = express.Router();

// Get dashboard overview
router.get('/overview', async (req, res) => {
  try {
    // Get counts
    const [
      totalTickets,
      openTickets,
      pendingTickets,
      resolvedTickets,
      totalCustomers,
      totalAgents,
      totalArticles,
      totalResponses
    ] = await Promise.all([
      req.prisma.ticket.count(),
      req.prisma.ticket.count({ where: { status: 'open' } }),
      req.prisma.ticket.count({ where: { status: 'pending' } }),
      req.prisma.ticket.count({ where: { status: 'resolved' } }),
      req.prisma.customer.count(),
      req.prisma.user.count({ where: { role: { in: ['agent', 'admin'] } } }),
      req.prisma.knowledgeArticle.count({ where: { isPublished: true } }),
      req.prisma.cannedResponse.count({ where: { isActive: true } })
    ]);

    // Get recent tickets
    const recentTickets = await req.prisma.ticket.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, avatar: true } },
        assignee: { select: { name: true, avatar: true } },
        category: { select: { name: true, color: true } }
      }
    });

    // Get tickets by priority
    const ticketsByPriority = await req.prisma.ticket.groupBy({
      by: ['priority'],
      _count: { priority: true }
    });

    // Get categories with counts
    const categories = await req.prisma.category.findMany({
      include: {
        _count: { select: { tickets: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      stats: {
        tickets: {
          total: totalTickets,
          open: openTickets,
          pending: pendingTickets,
          resolved: resolvedTickets
        },
        customers: totalCustomers,
        agents: totalAgents,
        articles: totalArticles,
        cannedResponses: totalResponses
      },
      recentTickets,
      ticketsByPriority: ticketsByPriority.reduce((acc, item) => {
        acc[item.priority] = item._count.priority;
        return acc;
      }, {}),
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        ticketCount: c._count.tickets
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard cards data
router.get('/cards', async (req, res) => {
  try {
    const [
      ticketCount,
      customerCount,
      categoryCount,
      tagCount,
      articleCount,
      responseCount,
      userCount,
      aiConversationCount
    ] = await Promise.all([
      req.prisma.ticket.count(),
      req.prisma.customer.count(),
      req.prisma.category.count({ where: { isActive: true } }),
      req.prisma.tag.count(),
      req.prisma.knowledgeArticle.count({ where: { isPublished: true } }),
      req.prisma.cannedResponse.count({ where: { isActive: true } }),
      req.prisma.user.count({ where: { isActive: true } }),
      req.prisma.aiConversation.count()
    ]);

    const openTickets = await req.prisma.ticket.count({ where: { status: 'open' } });

    res.json({
      cards: [
        {
          id: 'tickets',
          title: 'Tickets',
          count: ticketCount,
          subtitle: `${openTickets} open`,
          icon: 'ticket',
          color: '#6366f1',
          href: '/tickets'
        },
        {
          id: 'customers',
          title: 'Customers',
          count: customerCount,
          subtitle: 'Total customers',
          icon: 'users',
          color: '#10b981',
          href: '/customers'
        },
        {
          id: 'categories',
          title: 'Categories',
          count: categoryCount,
          subtitle: 'Active categories',
          icon: 'folder',
          color: '#f59e0b',
          href: '/categories'
        },
        {
          id: 'tags',
          title: 'Tags',
          count: tagCount,
          subtitle: 'Total tags',
          icon: 'tag',
          color: '#ec4899',
          href: '/tags'
        },
        {
          id: 'knowledge',
          title: 'Knowledge Base',
          count: articleCount,
          subtitle: 'Published articles',
          icon: 'book',
          color: '#8b5cf6',
          href: '/knowledge'
        },
        {
          id: 'responses',
          title: 'Canned Responses',
          count: responseCount,
          subtitle: 'Active templates',
          icon: 'message-square',
          color: '#06b6d4',
          href: '/canned-responses'
        },
        {
          id: 'team',
          title: 'Team Members',
          count: userCount,
          subtitle: 'Active users',
          icon: 'user-group',
          color: '#84cc16',
          href: '/team'
        },
        {
          id: 'ai',
          title: 'AI Conversations',
          count: aiConversationCount,
          subtitle: 'Total AI chats',
          icon: 'cpu',
          color: '#f43f5e',
          href: '/ai-chat'
        },
        {
          id: 'analytics',
          title: 'Analytics',
          count: '-',
          subtitle: 'View insights',
          icon: 'chart-bar',
          color: '#0ea5e9',
          href: '/analytics'
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
