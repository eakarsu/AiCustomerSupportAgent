import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, UserCircle, Trash2, Sparkles } from 'lucide-react';
import { ticketsApi, categoriesApi, customersApi, usersApi, aiApi } from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

function Tickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', categoryId: '' });
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    customerId: '',
    categoryId: '',
    priority: 'medium',
    assigneeId: ''
  });
  const [creating, setCreating] = useState(false);
  const [suggestingAi, setSuggestingAi] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      const [ticketsData, categoriesData, customersData, agentsData] = await Promise.all([
        ticketsApi.getAll(filters),
        categoriesApi.getAll(),
        customersApi.getAll(),
        usersApi.getAll({ role: 'agent' })
      ]);
      setTickets(ticketsData);
      setCategories(categoriesData);
      setCustomers(customersData);
      setAgents(agentsData);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (id) => {
    navigate(`/tickets/${id}`);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await ticketsApi.create(formData);
      setShowCreateModal(false);
      setFormData({
        subject: '',
        description: '',
        customerId: '',
        categoryId: '',
        priority: 'medium',
        assigneeId: ''
      });
      loadData();
    } catch (error) {
      console.error('Failed to create ticket:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTicket) return;
    try {
      await ticketsApi.delete(selectedTicket.id);
      loadData();
    } catch (error) {
      console.error('Failed to delete ticket:', error);
    }
  };

  const handleAiSuggest = async () => {
    if (!formData.subject || !formData.description) return;
    setSuggestingAi(true);
    try {
      const [categoryRes, priorityRes] = await Promise.all([
        aiApi.suggestCategory(formData.subject, formData.description),
        aiApi.suggestPriority(formData.subject, formData.description)
      ]);
      setFormData(prev => ({
        ...prev,
        categoryId: categoryRes.suggestedCategory?.id || prev.categoryId,
        priority: priorityRes.priority || prev.priority
      }));
    } catch (error) {
      console.error('AI suggestion failed:', error);
    } finally {
      setSuggestingAi(false);
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
    ticket.customer?.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-600 mt-1">Manage customer support tickets</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input-field w-40"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="input-field w-40"
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <select
            value={filters.categoryId}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
            className="input-field w-48"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left p-4 text-sm font-medium text-gray-600">Ticket</th>
              <th className="text-left p-4 text-sm font-medium text-gray-600">Customer</th>
              <th className="text-left p-4 text-sm font-medium text-gray-600">Category</th>
              <th className="text-left p-4 text-sm font-medium text-gray-600">Status</th>
              <th className="text-left p-4 text-sm font-medium text-gray-600">Priority</th>
              <th className="text-left p-4 text-sm font-medium text-gray-600">Assignee</th>
              <th className="text-left p-4 text-sm font-medium text-gray-600">Created</th>
              <th className="text-left p-4 text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="table-row border-b border-gray-100"
              >
                <td className="p-4 cursor-pointer" onClick={() => handleRowClick(ticket.id)}>
                  <div>
                    <p className="font-medium text-gray-900">{ticket.subject}</p>
                    <p className="text-sm text-gray-500 truncate max-w-xs">{ticket.description}</p>
                  </div>
                </td>
                <td className="p-4 cursor-pointer" onClick={() => handleRowClick(ticket.id)}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <UserCircle className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{ticket.customer?.name}</p>
                      <p className="text-xs text-gray-500">{ticket.customer?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 cursor-pointer" onClick={() => handleRowClick(ticket.id)}>
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
                </td>
                <td className="p-4 cursor-pointer" onClick={() => handleRowClick(ticket.id)}>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium status-${ticket.status}`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="p-4 cursor-pointer" onClick={() => handleRowClick(ticket.id)}>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium priority-${ticket.priority}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="p-4 cursor-pointer" onClick={() => handleRowClick(ticket.id)}>
                  {ticket.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-indigo-600">
                          {ticket.assignee.name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm">{ticket.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Unassigned</span>
                  )}
                </td>
                <td className="p-4 text-sm text-gray-500">{formatDate(ticket.createdAt)}</td>
                <td className="p-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTicket(ticket);
                      setShowDeleteDialog(true);
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTickets.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No tickets found
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Ticket"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field h-32 resize-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className="input-field"
              required
            >
              <option value="">Select customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="input-field"
              >
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="input-field"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
            <select
              value={formData.assigneeId}
              onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
              className="input-field"
            >
              <option value="">Unassigned</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleAiSuggest}
              disabled={suggestingAi || !formData.subject || !formData.description}
              className="btn-secondary flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {suggestingAi ? 'Analyzing...' : 'AI Suggest Category & Priority'}
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Ticket"
        message={`Are you sure you want to delete "${selectedTicket?.subject}"? This action cannot be undone.`}
      />
    </div>
  );
}

export default Tickets;
