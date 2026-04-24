import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket, Users, Folder, Tag, BookOpen, MessageSquare,
  UserCircle, Bot, BarChart3, TrendingUp, Clock, CheckCircle,
  Tags, Lightbulb, Star, Route, ShoppingCart, Sparkles, Brain
} from 'lucide-react';
import { dashboardApi } from '../services/api';
import { SkeletonDashboard } from '../components/Skeleton';

const iconMap = {
  ticket: Ticket,
  users: Users,
  folder: Folder,
  tag: Tag,
  book: BookOpen,
  'message-square': MessageSquare,
  'user-group': UserCircle,
  cpu: Bot,
  'chart-bar': BarChart3,
};

// Map card titles to routes
const cardRouteMap = {
  'Tickets': '/tickets',
  'Customers': '/customers',
  'Categories': '/categories',
  'Tags': '/tags',
  'Knowledge Base': '/knowledge',
  'Canned Responses': '/canned-responses',
  'Team': '/team',
  'AI Chat': '/ai-chat',
  'Analytics': '/analytics',
  'Phone Calls': '/calls',
  'Settings': '/settings',
};

const aiFeatureCards = [
  {
    id: 'ai-classifier',
    title: 'AI Ticket Classifier',
    subtitle: 'Auto-classify tickets by category, priority & sentiment',
    icon: Tags,
    href: '/ai-classifier',
    gradient: 'from-indigo-500 to-purple-600',
    bgLight: 'bg-indigo-100',
    iconColor: 'text-indigo-600'
  },
  {
    id: 'ai-predictor',
    title: 'AI Resolution Predictor',
    subtitle: 'Predict resolutions and estimate resolution time',
    icon: Lightbulb,
    href: '/ai-predictor',
    gradient: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-100',
    iconColor: 'text-amber-600'
  },
  {
    id: 'ai-knowledge',
    title: 'AI Knowledge Suggester',
    subtitle: 'Get AI-powered article suggestions & answers',
    icon: BookOpen,
    href: '/ai-knowledge',
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-100',
    iconColor: 'text-emerald-600'
  },
  {
    id: 'ai-quality',
    title: 'AI Quality Scorer',
    subtitle: 'Evaluate and score response quality',
    icon: Star,
    href: '/ai-quality',
    gradient: 'from-yellow-500 to-amber-600',
    bgLight: 'bg-yellow-100',
    iconColor: 'text-yellow-600'
  },
  {
    id: 'ai-escalation',
    title: 'AI Escalation Router',
    subtitle: 'Intelligently route escalations to teams',
    icon: Route,
    href: '/ai-escalation',
    gradient: 'from-red-500 to-rose-600',
    bgLight: 'bg-red-100',
    iconColor: 'text-red-600'
  },
  {
    id: 'ai-shopping',
    title: 'AI Shopping Assistant',
    subtitle: 'E-commerce chatbot for product recommendations',
    icon: ShoppingCart,
    href: '/ai-shopping',
    gradient: 'from-pink-500 to-rose-600',
    bgLight: 'bg-pink-100',
    iconColor: 'text-pink-600'
  },
];

function Dashboard() {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cardsData, overviewData] = await Promise.all([
        dashboardApi.getCards(),
        dashboardApi.getOverview()
      ]);
      setCards(cardsData.cards);
      setOverview(overviewData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (href) => {
    navigate(href);
  };

  const handleQuickAccessClick = (card) => {
    const route = cardRouteMap[card.title] || card.href;
    if (route) {
      navigate(route);
    }
  };

  if (loading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Welcome to AI Customer Support Agent</p>
      </div>

      {/* Quick Stats - Responsive grid */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div
            onClick={() => navigate('/tickets?status=open')}
            className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 sm:p-6 text-white cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-xs sm:text-sm">Open Tickets</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{overview.stats.tickets.open}</p>
              </div>
              <Ticket className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-200" />
            </div>
            <div className="mt-3 sm:mt-4 flex items-center gap-2 text-indigo-100 text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>{overview.stats.tickets.total} total tickets</span>
            </div>
          </div>

          <div
            onClick={() => navigate('/tickets?status=resolved')}
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 sm:p-6 text-white cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs sm:text-sm">Resolved</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{overview.stats.tickets.resolved}</p>
              </div>
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-200" />
            </div>
            <div className="mt-3 sm:mt-4 flex items-center gap-2 text-emerald-100 text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>{Math.round((overview.stats.tickets.resolved / overview.stats.tickets.total) * 100) || 0}% resolution rate</span>
            </div>
          </div>

          <div
            onClick={() => navigate('/tickets?status=pending')}
            className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 sm:p-6 text-white cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-xs sm:text-sm">Pending</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{overview.stats.tickets.pending}</p>
              </div>
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-amber-200" />
            </div>
            <div className="mt-3 sm:mt-4 flex items-center gap-2 text-amber-100 text-xs sm:text-sm">
              <Clock className="w-4 h-4" />
              <span>Awaiting response</span>
            </div>
          </div>

          <div
            onClick={() => navigate('/customers')}
            className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-4 sm:p-6 text-white cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-rose-100 text-xs sm:text-sm">Customers</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{overview.stats.customers}</p>
              </div>
              <Users className="w-10 h-10 sm:w-12 sm:h-12 text-rose-200" />
            </div>
            <div className="mt-3 sm:mt-4 flex items-center gap-2 text-rose-100 text-xs sm:text-sm">
              <Users className="w-4 h-4" />
              <span>{overview.stats.agents} agents active</span>
            </div>
          </div>
        </div>
      )}

      {/* AI Features Section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">AI-Powered Features</h2>
            <p className="text-xs sm:text-sm text-gray-500">Advanced AI tools powered by OpenRouter</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {aiFeatureCards.map((card) => (
            <div
              key={card.id}
              onClick={() => handleCardClick(card.href)}
              className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${card.bgLight} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <card.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${card.iconColor}`} />
                </div>
                <Sparkles className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">{card.title}</h3>
              <p className="text-xs sm:text-sm text-gray-500">{card.subtitle}</p>
              <div className={`mt-3 sm:mt-4 h-1 rounded-full bg-gradient-to-r ${card.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Access Feature Cards */}
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Quick Access</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {cards.map((card) => {
          const Icon = iconMap[card.icon] || Folder;
          return (
            <div
              key={card.id}
              onClick={() => handleQuickAccessClick(card)}
              className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 card-hover"
            >
              <div className="flex items-start justify-between">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${card.color}15` }}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: card.color }} />
                </div>
                <span className="text-xl sm:text-2xl font-bold" style={{ color: card.color }}>
                  {card.count}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mt-3 sm:mt-4">{card.title}</h3>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Tickets */}
      {overview && overview.recentTickets.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Tickets</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {overview.recentTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                className="p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="hidden sm:flex w-10 h-10 bg-gray-100 rounded-full items-center justify-center flex-shrink-0">
                    {ticket.customer?.avatar ? (
                      <img src={ticket.customer.avatar} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <UserCircle className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{ticket.subject}</p>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{ticket.customer?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                  {ticket.category && (
                    <span
                      className="hidden md:inline px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${ticket.category.color}20`,
                        color: ticket.category.color
                      }}
                    >
                      {ticket.category.name}
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium status-${ticket.status}`}>
                    {ticket.status}
                  </span>
                  <span className={`hidden sm:inline px-2 py-1 rounded-full text-xs font-medium priority-${ticket.priority}`}>
                    {ticket.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
