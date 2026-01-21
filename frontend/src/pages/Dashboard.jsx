import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  Users,
  Folder,
  Tag,
  BookOpen,
  MessageSquare,
  UserCircle,
  Bot,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { dashboardApi } from '../services/api';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to AI Customer Support Agent</p>
      </div>

      {/* Quick Stats */}
      {overview && (
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div
            onClick={() => navigate('/tickets?status=open')}
            className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm">Open Tickets</p>
                <p className="text-3xl font-bold mt-1">{overview.stats.tickets.open}</p>
              </div>
              <Ticket className="w-12 h-12 text-indigo-200" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-indigo-100 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>{overview.stats.tickets.total} total tickets</span>
            </div>
          </div>

          <div
            onClick={() => navigate('/tickets?status=resolved')}
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Resolved</p>
                <p className="text-3xl font-bold mt-1">{overview.stats.tickets.resolved}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-emerald-200" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-emerald-100 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>{Math.round((overview.stats.tickets.resolved / overview.stats.tickets.total) * 100) || 0}% resolution rate</span>
            </div>
          </div>

          <div
            onClick={() => navigate('/tickets?status=pending')}
            className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Pending</p>
                <p className="text-3xl font-bold mt-1">{overview.stats.tickets.pending}</p>
              </div>
              <Clock className="w-12 h-12 text-amber-200" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-amber-100 text-sm">
              <Clock className="w-4 h-4" />
              <span>Awaiting response</span>
            </div>
          </div>

          <div
            onClick={() => navigate('/customers')}
            className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-6 text-white cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-rose-100 text-sm">Customers</p>
                <p className="text-3xl font-bold mt-1">{overview.stats.customers}</p>
              </div>
              <Users className="w-12 h-12 text-rose-200" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-rose-100 text-sm">
              <Users className="w-4 h-4" />
              <span>{overview.stats.agents} agents active</span>
            </div>
          </div>
        </div>
      )}

      {/* Feature Cards */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Access</h2>
      <div className="grid grid-cols-3 gap-6 mb-8">
        {cards.map((card) => {
          const Icon = iconMap[card.icon] || Folder;
          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card.href)}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover"
            >
              <div className="flex items-start justify-between">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${card.color}15` }}
                >
                  <Icon className="w-6 h-6" style={{ color: card.color }} />
                </div>
                <span className="text-2xl font-bold" style={{ color: card.color }}>
                  {card.count}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4">{card.title}</h3>
              <p className="text-gray-500 text-sm mt-1">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Tickets */}
      {overview && overview.recentTickets.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Recent Tickets</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {overview.recentTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    {ticket.customer?.avatar ? (
                      <img src={ticket.customer.avatar} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <UserCircle className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{ticket.subject}</p>
                    <p className="text-sm text-gray-500">{ticket.customer?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {ticket.category && (
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
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
                  <span className={`px-2 py-1 rounded-full text-xs font-medium priority-${ticket.priority}`}>
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
