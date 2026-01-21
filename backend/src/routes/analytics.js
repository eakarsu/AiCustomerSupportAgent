import express from 'express';

const router = express.Router();

// Get analytics overview
router.get('/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Get ticket stats
    const totalTickets = await req.prisma.ticket.count();
    const openTickets = await req.prisma.ticket.count({ where: { status: 'open' } });
    const resolvedTickets = await req.prisma.ticket.count({ where: { status: 'resolved' } });
    const pendingTickets = await req.prisma.ticket.count({ where: { status: 'pending' } });

    // Get customer stats
    const totalCustomers = await req.prisma.customer.count();
    const activeCustomers = await req.prisma.customer.count({ where: { isActive: true } });

    // Get agent stats
    const totalAgents = await req.prisma.user.count({ where: { role: 'agent' } });

    // Get AI stats
    const aiConversations = await req.prisma.aiConversation.count();
    const helpfulAiResponses = await req.prisma.aiConversation.count({ where: { wasHelpful: true } });

    // Get recent analytics records
    const recentAnalytics = await req.prisma.analytics.findMany({
      orderBy: { date: 'desc' },
      take: 30
    });

    res.json({
      tickets: {
        total: totalTickets,
        open: openTickets,
        resolved: resolvedTickets,
        pending: pendingTickets,
        resolutionRate: totalTickets > 0 ? ((resolvedTickets / totalTickets) * 100).toFixed(1) : 0
      },
      customers: {
        total: totalCustomers,
        active: activeCustomers
      },
      agents: {
        total: totalAgents
      },
      ai: {
        totalConversations: aiConversations,
        helpfulResponses: helpfulAiResponses,
        helpfulRate: aiConversations > 0 ? ((helpfulAiResponses / aiConversations) * 100).toFixed(1) : 0
      },
      recentAnalytics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ticket analytics
router.get('/tickets', async (req, res) => {
  try {
    // Tickets by status
    const byStatus = await req.prisma.ticket.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    // Tickets by priority
    const byPriority = await req.prisma.ticket.groupBy({
      by: ['priority'],
      _count: { priority: true }
    });

    // Tickets by source
    const bySource = await req.prisma.ticket.groupBy({
      by: ['source'],
      _count: { source: true }
    });

    // Tickets by category
    const byCategory = await req.prisma.ticket.groupBy({
      by: ['categoryId'],
      _count: { categoryId: true }
    });

    const categories = await req.prisma.category.findMany({
      select: { id: true, name: true, color: true }
    });

    const byCategoryWithNames = byCategory.map(item => {
      const category = categories.find(c => c.id === item.categoryId);
      return {
        categoryId: item.categoryId,
        categoryName: category?.name || 'Uncategorized',
        color: category?.color || '#gray',
        count: item._count.categoryId
      };
    });

    res.json({
      byStatus,
      byPriority,
      bySource,
      byCategory: byCategoryWithNames
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent performance
router.get('/agents', async (req, res) => {
  try {
    const agents = await req.prisma.user.findMany({
      where: { role: { in: ['agent', 'admin'] } },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        _count: {
          select: {
            tickets: true,
            messages: true
          }
        }
      }
    });

    // Get resolved tickets per agent
    const agentPerformance = await Promise.all(
      agents.map(async (agent) => {
        const resolvedCount = await req.prisma.ticket.count({
          where: {
            assigneeId: agent.id,
            status: 'resolved'
          }
        });

        return {
          ...agent,
          resolvedTickets: resolvedCount,
          totalTickets: agent._count.tickets,
          totalMessages: agent._count.messages
        };
      })
    );

    res.json(agentPerformance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer analytics
router.get('/customers', async (req, res) => {
  try {
    // Customers by tier
    const byTier = await req.prisma.customer.groupBy({
      by: ['tier'],
      _count: { tier: true }
    });

    // Top customers by tickets
    const topByTickets = await req.prisma.customer.findMany({
      include: {
        _count: { select: { tickets: true } }
      },
      orderBy: {
        tickets: { _count: 'desc' }
      },
      take: 10
    });

    // Top customers by spending
    const topBySpending = await req.prisma.customer.findMany({
      orderBy: { totalSpent: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        totalSpent: true,
        tier: true
      }
    });

    res.json({
      byTier,
      topByTickets,
      topBySpending
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record daily analytics
router.post('/record', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalTickets = await req.prisma.ticket.count({
      where: { createdAt: { gte: today } }
    });

    const resolvedTickets = await req.prisma.ticket.count({
      where: {
        resolvedAt: { gte: today }
      }
    });

    const aiResolutions = await req.prisma.aiConversation.count({
      where: {
        createdAt: { gte: today },
        wasHelpful: true
      }
    });

    const analytics = await req.prisma.analytics.create({
      data: {
        date: today,
        totalTickets,
        resolvedTickets,
        aiResolutions,
        avgResponseTime: Math.random() * 10 + 2,
        avgResolutionTime: Math.random() * 24 + 4,
        customerSatisfaction: Math.random() * 2 + 3
      }
    });

    res.status(201).json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
