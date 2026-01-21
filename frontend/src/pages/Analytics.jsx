import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Users,
  Ticket,
  Clock,
  CheckCircle,
  Bot,
  Star
} from 'lucide-react';
import { analyticsApi } from '../services/api';

function Analytics() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [ticketStats, setTicketStats] = useState(null);
  const [agentStats, setAgentStats] = useState([]);
  const [customerStats, setCustomerStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overviewData, ticketData, agentData, customerData] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getTickets(),
        analyticsApi.getAgents(),
        analyticsApi.getCustomers()
      ]);
      setOverview(overviewData);
      setTicketStats(ticketData);
      setAgentStats(agentData);
      setCustomerStats(customerData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Insights and performance metrics</p>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div
            onClick={() => navigate('/tickets')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Ticket className="w-6 h-6 text-indigo-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{overview.tickets.total}</p>
            <p className="text-gray-500 text-sm">Total Tickets</p>
          </div>

          <div
            onClick={() => navigate('/tickets?status=resolved')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-green-600 font-medium">{overview.tickets.resolutionRate}%</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{overview.tickets.resolved}</p>
            <p className="text-gray-500 text-sm">Resolved Tickets</p>
          </div>

          <div
            onClick={() => navigate('/customers')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{overview.customers.total}</p>
            <p className="text-gray-500 text-sm">Total Customers</p>
          </div>

          <div
            onClick={() => navigate('/ai-chat')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-purple-600 font-medium">{overview.ai.helpfulRate}%</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{overview.ai.totalConversations}</p>
            <p className="text-gray-500 text-sm">AI Conversations</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Tickets by Status */}
        {ticketStats && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Status</h3>
            <div className="space-y-4">
              {ticketStats.byStatus.map((item) => {
                const colors = {
                  open: 'bg-yellow-500',
                  pending: 'bg-blue-500',
                  resolved: 'bg-green-500',
                  closed: 'bg-gray-500'
                };
                const total = ticketStats.byStatus.reduce((sum, i) => sum + i._count.status, 0);
                const percentage = total > 0 ? (item._count.status / total) * 100 : 0;

                return (
                  <div
                    key={item.status}
                    onClick={() => navigate(`/tickets?status=${item.status}`)}
                    className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-gray-600">{item.status}</span>
                      <span className="font-medium">{item._count.status}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${colors[item.status]} h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tickets by Priority */}
        {ticketStats && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Priority</h3>
            <div className="space-y-4">
              {ticketStats.byPriority.map((item) => {
                const colors = {
                  low: 'bg-gray-500',
                  medium: 'bg-blue-500',
                  high: 'bg-orange-500',
                  urgent: 'bg-red-500'
                };
                const total = ticketStats.byPriority.reduce((sum, i) => sum + i._count.priority, 0);
                const percentage = total > 0 ? (item._count.priority / total) * 100 : 0;

                return (
                  <div
                    key={item.priority}
                    onClick={() => navigate(`/tickets?priority=${item.priority}`)}
                    className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-gray-600">{item.priority}</span>
                      <span className="font-medium">{item._count.priority}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${colors[item.priority]} h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Agent Performance */}
      {agentStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Agent Performance</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4 text-sm font-medium text-gray-600">Agent</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Total Tickets</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Resolved</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Messages</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Resolution Rate</th>
              </tr>
            </thead>
            <tbody>
              {agentStats.map((agent) => {
                const rate = agent.totalTickets > 0
                  ? ((agent.resolvedTickets / agent.totalTickets) * 100).toFixed(0)
                  : 0;

                return (
                  <tr
                    key={agent.id}
                    onClick={() => navigate(`/team/${agent.id}`)}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-600">
                            {agent.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{agent.name}</p>
                          <p className="text-sm text-gray-500">{agent.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">{agent.totalTickets}</td>
                    <td className="p-4 text-green-600 font-medium">{agent.resolvedTickets}</td>
                    <td className="p-4 text-gray-600">{agent.totalMessages}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${rate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Tiers */}
      {customerStats && (
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customers by Tier</h3>
            <div className="space-y-4">
              {customerStats.byTier.map((item) => {
                const colors = {
                  standard: 'bg-gray-500',
                  premium: 'bg-blue-500',
                  enterprise: 'bg-purple-500',
                  vip: 'bg-amber-500'
                };
                const total = customerStats.byTier.reduce((sum, i) => sum + i._count.tier, 0);
                const percentage = total > 0 ? (item._count.tier / total) * 100 : 0;

                return (
                  <div
                    key={item.tier}
                    onClick={() => navigate(`/customers?tier=${item.tier}`)}
                    className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-gray-600">{item.tier}</span>
                      <span className="font-medium">{item._count.tier}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${colors[item.tier]} h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers by Spending</h3>
            <div className="space-y-3">
              {customerStats.topBySpending.slice(0, 5).map((customer, index) => (
                <div
                  key={customer.id}
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.company || customer.email}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600">${customer.totalSpent.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
