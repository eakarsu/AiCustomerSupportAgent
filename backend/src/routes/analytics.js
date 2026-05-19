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

// ─── GET /api/analytics/sla-performance ──────────────────────────────────────
router.get('/sla-performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // SLA thresholds in hours by priority
    const slaThresholds = { low: 72, medium: 24, high: 8, urgent: 2 };

    const tickets = await req.prisma.ticket.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        resolvedAt: { not: null },
      },
      select: {
        id: true,
        priority: true,
        categoryId: true,
        createdAt: true,
        resolvedAt: true,
        status: true,
        category: { select: { name: true } },
      }
    });

    // Group by priority
    const byPriority = {};
    for (const [priority, slaHours] of Object.entries(slaThresholds)) {
      const group = tickets.filter(t => t.priority === priority);
      const breached = group.filter(t => {
        const resolutionHours = (new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60);
        return resolutionHours > slaHours;
      });
      byPriority[priority] = {
        total: group.length,
        breached: breached.length,
        met: group.length - breached.length,
        breachRate: group.length > 0 ? ((breached.length / group.length) * 100).toFixed(1) : '0.0',
        slaThresholdHours: slaHours,
        avgResolutionHours: group.length > 0
          ? (group.reduce((sum, t) => sum + (new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60), 0) / group.length).toFixed(1)
          : '0.0',
      };
    }

    // Group by category
    const categoryGroups = {};
    for (const ticket of tickets) {
      const catName = ticket.category?.name || 'Uncategorized';
      if (!categoryGroups[catName]) categoryGroups[catName] = { total: 0, breached: 0 };
      categoryGroups[catName].total++;
      const slaHours = slaThresholds[ticket.priority] || 24;
      const resolutionHours = (new Date(ticket.resolvedAt) - new Date(ticket.createdAt)) / (1000 * 60 * 60);
      if (resolutionHours > slaHours) categoryGroups[catName].breached++;
    }

    const byCategory = Object.entries(categoryGroups).map(([name, data]) => ({
      category: name,
      total: data.total,
      breached: data.breached,
      met: data.total - data.breached,
      breachRate: data.total > 0 ? ((data.breached / data.total) * 100).toFixed(1) : '0.0',
    })).sort((a, b) => parseFloat(b.breachRate) - parseFloat(a.breachRate));

    // Overall stats
    const totalBreached = tickets.filter(t => {
      const slaHours = slaThresholds[t.priority] || 24;
      const resolutionHours = (new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60);
      return resolutionHours > slaHours;
    }).length;

    res.json({
      overall: {
        totalTickets: tickets.length,
        totalBreached,
        totalMet: tickets.length - totalBreached,
        overallBreachRate: tickets.length > 0 ? ((totalBreached / tickets.length) * 100).toFixed(1) : '0.0',
      },
      byPriority,
      byCategory,
      period: { startDate: startDate || null, endDate: endDate || null },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/analytics/agent-leaderboard ─────────────────────────────────────
router.get('/agent-leaderboard', async (req, res) => {
  try {
    const { limit: limitParam = 20 } = req.query;
    const limit = Math.min(100, Math.max(1, parseInt(limitParam) || 20));

    const agents = await req.prisma.user.findMany({
      where: { role: { in: ['agent', 'admin'] } },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        tickets: {
          select: {
            id: true,
            status: true,
            priority: true,
            createdAt: true,
            resolvedAt: true,
            messages: {
              where: { isFromAgent: true, isInternal: false },
              select: { createdAt: true },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          }
        }
      },
      take: limit,
    });

    const leaderboard = agents.map(agent => {
      const total = agent.tickets.length;
      const resolved = agent.tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
      const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0.0';

      // Avg handle time for resolved tickets
      const resolvedTickets = agent.tickets.filter(t => t.resolvedAt);
      const avgHandleTimeHours = resolvedTickets.length > 0
        ? (resolvedTickets.reduce((sum, t) => sum + (new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60), 0) / resolvedTickets.length).toFixed(1)
        : null;

      // Avg first response time
      const ticketsWithResponse = agent.tickets.filter(t => t.messages.length > 0);
      const avgFirstResponseMinutes = ticketsWithResponse.length > 0
        ? (ticketsWithResponse.reduce((sum, t) => sum + (new Date(t.messages[0].createdAt) - new Date(t.createdAt)) / (1000 * 60), 0) / ticketsWithResponse.length).toFixed(0)
        : null;

      return {
        agentId: agent.id,
        name: agent.name,
        email: agent.email,
        avatar: agent.avatar,
        role: agent.role,
        metrics: {
          totalTickets: total,
          resolvedTickets: resolved,
          resolutionRate: `${resolutionRate}%`,
          avgHandleTimeHours: avgHandleTimeHours ? `${avgHandleTimeHours}h` : 'N/A',
          avgFirstResponseMinutes: avgFirstResponseMinutes ? `${avgFirstResponseMinutes}min` : 'N/A',
        }
      };
    }).sort((a, b) => parseFloat(b.metrics.resolutionRate) - parseFloat(a.metrics.resolutionRate));

    res.json({ leaderboard, total: leaderboard.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/analytics/kb-effectiveness ─────────────────────────────────────
router.get('/kb-effectiveness', async (req, res) => {
  try {
    const articles = await req.prisma.knowledgeArticle.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        views: true,
        helpful: true,
        notHelpful: true,
        createdAt: true,
        category: { select: { name: true } },
      },
      orderBy: { views: 'desc' },
    });

    const enriched = articles.map(article => {
      const totalVotes = (article.helpful || 0) + (article.notHelpful || 0);
      const helpfulRate = totalVotes > 0 ? (((article.helpful || 0) / totalVotes) * 100).toFixed(1) : null;

      return {
        id: article.id,
        title: article.title,
        category: article.category?.name || 'Uncategorized',
        views: article.views || 0,
        helpful: article.helpful || 0,
        notHelpful: article.notHelpful || 0,
        totalVotes,
        helpfulRate: helpfulRate ? `${helpfulRate}%` : 'No votes',
        effectiveness: helpfulRate
          ? parseFloat(helpfulRate) >= 70 ? 'effective' : parseFloat(helpfulRate) >= 40 ? 'average' : 'ineffective'
          : 'unrated',
      };
    });

    const effective = enriched.filter(a => a.effectiveness === 'effective');
    const ineffective = enriched.filter(a => a.effectiveness === 'ineffective');
    const unrated = enriched.filter(a => a.effectiveness === 'unrated');

    res.json({
      summary: {
        totalArticles: articles.length,
        effective: effective.length,
        ineffective: ineffective.length,
        unrated: unrated.length,
        topPerformers: enriched.slice(0, 5),
        needsImprovement: ineffective.slice(0, 5),
      },
      articles: enriched,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
