import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCircle, Mail, Ticket, MessageSquare, BookOpen, Clock } from 'lucide-react';
import { usersApi } from '../services/api';

function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const data = await usersApi.getById(id);
      setUser(data);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      agent: 'bg-blue-100 text-blue-800',
      supervisor: 'bg-amber-100 text-amber-800'
    };
    return colors[role] || colors.agent;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">User not found</p>
        <button onClick={() => navigate('/team')} className="btn-primary mt-4">
          Back to Team
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/team')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Team
      </button>

      <div className="grid grid-cols-3 gap-8">
        {/* User Info */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-20 h-20 rounded-full" />
                ) : (
                  <UserCircle className="w-12 h-12 text-indigo-600" />
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                {user.role}
              </span>
              {!user.isActive && (
                <span className="ml-2 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                  Inactive
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-5 h-5" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Clock className="w-5 h-5" />
                <span>Joined {formatDate(user.createdAt)}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-indigo-600">{user._count?.tickets || 0}</p>
                  <p className="text-sm text-gray-500">Tickets</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{user._count?.messages || 0}</p>
                  <p className="text-sm text-gray-500">Messages</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{user._count?.knowledgeBase || 0}</p>
                  <p className="text-sm text-gray-500">Articles</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-600">{user._count?.responses || 0}</p>
                  <p className="text-sm text-gray-500">Responses</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                Assigned Tickets
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {user.tickets && user.tickets.length > 0 ? (
                user.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{ticket.subject}</p>
                        <p className="text-sm text-gray-500">
                          {ticket.customer?.name} - {formatDate(ticket.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
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
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No assigned tickets
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDetail;
