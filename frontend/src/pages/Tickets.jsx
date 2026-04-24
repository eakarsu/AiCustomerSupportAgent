import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, UserCircle, Trash2, Sparkles, Download,
  FileText, ChevronUp, ChevronDown, Edit2, X, ArrowUpDown,
  CheckSquare, Square, MoreHorizontal, Filter
} from 'lucide-react';
import { ticketsApi, categoriesApi, customersApi, usersApi, aiApi, downloadBlob, generatePdfFromData } from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';

function Tickets() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', categoryId: '' });
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [formData, setFormData] = useState({ subject: '', description: '', customerId: '', categoryId: '', priority: 'medium', assigneeId: '' });
  const [editData, setEditData] = useState({});
  const [bulkUpdateData, setBulkUpdateData] = useState({ status: '', priority: '', assigneeId: '' });
  const [formErrors, setFormErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [suggestingAi, setSuggestingAi] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadData();
  }, [filters, searchDebounced, sortBy, sortOrder, pagination.page, pagination.limit]);

  useEffect(() => {
    loadDropdowns();
  }, []);

  const loadDropdowns = async () => {
    try {
      const [categoriesData, customersData, agentsData] = await Promise.all([
        categoriesApi.getAll(),
        customersApi.getAll({ limit: 100 }),
        usersApi.getAll({ role: 'agent' })
      ]);
      setCategories(categoriesData);
      setCustomers(customersData.data || customersData);
      setAgents(agentsData);
    } catch (error) {
      console.error('Failed to load dropdowns:', error);
    }
  };

  const loadData = async () => {
    try {
      const params = {
        ...filters,
        search: searchDebounced,
        sortBy,
        sortOrder,
        page: pagination.page,
        limit: pagination.limit,
      };
      // Remove empty params
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });

      const result = await ticketsApi.getAll(params);
      setTickets(result.data || result);
      if (result.pagination) {
        setPagination(prev => ({ ...prev, ...result.pagination }));
      }
    } catch (error) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (data) => {
    const errors = {};
    if (!data.subject || data.subject.length < 3) errors.subject = 'Subject must be at least 3 characters';
    if (!data.description || data.description.length < 10) errors.description = 'Description must be at least 10 characters';
    if (!data.customerId) errors.customerId = 'Customer is required';
    return errors;
  };

  const handleRowClick = (ticket) => {
    setSelectedTicket(ticket);
    setShowDetailModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errors = validateForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCreating(true);
    try {
      await ticketsApi.create(formData);
      setShowCreateModal(false);
      setFormData({ subject: '', description: '', customerId: '', categoryId: '', priority: 'medium', assigneeId: '' });
      setFormErrors({});
      toast.success('Ticket created successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to create ticket: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await ticketsApi.update(selectedTicket.id, editData);
      setShowEditModal(false);
      setShowDetailModal(false);
      toast.success('Ticket updated successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to update ticket');
    }
  };

  const handleDelete = async () => {
    if (!selectedTicket) return;
    try {
      await ticketsApi.delete(selectedTicket.id);
      setShowDetailModal(false);
      toast.success('Ticket deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete ticket');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const result = await ticketsApi.bulkDelete([...selectedIds]);
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
      toast.success(`${result.count} tickets deleted`);
      loadData();
    } catch (error) {
      toast.error('Failed to delete tickets');
    }
  };

  const handleBulkUpdate = async (e) => {
    e.preventDefault();
    const data = {};
    if (bulkUpdateData.status) data.status = bulkUpdateData.status;
    if (bulkUpdateData.priority) data.priority = bulkUpdateData.priority;
    if (bulkUpdateData.assigneeId) data.assigneeId = bulkUpdateData.assigneeId;

    if (Object.keys(data).length === 0) {
      toast.warning('Select at least one field to update');
      return;
    }

    try {
      const result = await ticketsApi.bulkUpdate([...selectedIds], data);
      setSelectedIds(new Set());
      setShowBulkUpdateModal(false);
      setBulkUpdateData({ status: '', priority: '', assigneeId: '' });
      toast.success(`${result.count} tickets updated`);
      loadData();
    } catch (error) {
      toast.error('Failed to update tickets');
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await ticketsApi.exportCsv(filters);
      downloadBlob(blob, 'tickets-export.csv');
      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const handleExportPdf = async () => {
    try {
      const pdfData = await ticketsApi.exportPdf(filters);
      generatePdfFromData(pdfData);
      toast.success('PDF report generated');
    } catch (error) {
      toast.error('Failed to generate PDF');
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
      toast.info('AI suggestions applied');
    } catch (error) {
      toast.error('AI suggestion failed');
    } finally {
      setSuggestingAi(false);
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === tickets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tickets.map(t => t.id)));
    }
  };

  const openEditModal = (ticket) => {
    setEditData({
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      categoryId: ticket.categoryId || '',
      assigneeId: ticket.assigneeId || '',
    });
    setShowEditModal(true);
  };

  const SortHeader = ({ field, label }) => (
    <th
      className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 cursor-pointer hover:text-indigo-600 select-none"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortBy === field ? (
          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-gray-300" />
        )}
      </div>
    </th>
  );

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <SkeletonTable rows={10} columns={7} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-600 mt-1 text-sm">Manage customer support tickets</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export buttons */}
          <button onClick={handleExportCsv} className="btn-secondary flex items-center gap-1 text-sm" title="Export CSV">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={handleExportPdf} className="btn-secondary flex items-center gap-1 text-sm" title="Export PDF">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 sm:p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-sm font-medium text-indigo-700">
            {selectedIds.size} ticket{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkUpdateModal(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
            >
              Bulk Update
            </button>
            <button
              onClick={() => setShowBulkDeleteDialog(true)}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Bulk Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden btn-secondary flex items-center gap-2 justify-center"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row gap-3 sm:gap-4`}>
            <select
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPagination(p => ({ ...p, page: 1 })); }}
              className="input-field sm:w-36"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={filters.priority}
              onChange={(e) => { setFilters({ ...filters, priority: e.target.value }); setPagination(p => ({ ...p, page: 1 })); }}
              className="input-field sm:w-36"
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select
              value={filters.categoryId}
              onChange={(e) => { setFilters({ ...filters, categoryId: e.target.value }); setPagination(p => ({ ...p, page: 1 })); }}
              className="input-field sm:w-44"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-3 sm:p-4 w-10">
                  <input
                    type="checkbox"
                    checked={tickets.length > 0 && selectedIds.size === tickets.length}
                    onChange={toggleSelectAll}
                    className="checkbox-primary"
                  />
                </th>
                <SortHeader field="subject" label="Ticket" />
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden md:table-cell">Customer</th>
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden lg:table-cell">Category</th>
                <SortHeader field="status" label="Status" />
                <SortHeader field="priority" label="Priority" />
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden lg:table-cell">Assignee</th>
                <SortHeader field="createdAt" label="Created" />
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedIds.has(ticket.id) ? 'bg-indigo-50' : ''}`}
                >
                  <td className="p-3 sm:p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(ticket.id)}
                      onChange={() => toggleSelect(ticket.id)}
                      className="checkbox-primary"
                    />
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer" onClick={() => handleRowClick(ticket)}>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{ticket.subject}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">{ticket.description}</p>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer hidden md:table-cell" onClick={() => handleRowClick(ticket)}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserCircle className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{ticket.customer?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer hidden lg:table-cell" onClick={() => handleRowClick(ticket)}>
                    {ticket.category && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${ticket.category.color}20`, color: ticket.category.color }}>
                        {ticket.category.name}
                      </span>
                    )}
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer" onClick={() => handleRowClick(ticket)}>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium status-${ticket.status}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer" onClick={() => handleRowClick(ticket)}>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium priority-${ticket.priority}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="p-3 sm:p-4 hidden lg:table-cell cursor-pointer" onClick={() => handleRowClick(ticket)}>
                    {ticket.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-indigo-600">{ticket.assignee.name.charAt(0)}</span>
                        </div>
                        <span className="text-sm">{ticket.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="p-3 sm:p-4 text-xs sm:text-sm text-gray-500 whitespace-nowrap">{formatDate(ticket.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tickets.length === 0 && (
          <div className="p-8 text-center text-gray-500">No tickets found</div>
        )}
        {/* Pagination */}
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onLimitChange={(l) => setPagination(prev => ({ ...prev, limit: l, page: 1 }))}
        />
      </div>

      {/* Row Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Ticket Details" size="lg">
        {selectedTicket && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEditModal(selectedTicket)} className="p-2 hover:bg-indigo-50 rounded-lg transition-colors text-indigo-600" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => { setShowDetailModal(false); setShowDeleteDialog(true); }} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium status-${selectedTicket.status}`}>{selectedTicket.status}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Priority</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium priority-${selectedTicket.priority}`}>{selectedTicket.priority}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Source</p>
                <span className="text-sm font-medium text-gray-700">{selectedTicket.source}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Customer</p>
                <span className="text-sm font-medium text-gray-700">{selectedTicket.customer?.name || 'N/A'}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <span className="text-sm font-medium text-gray-700">{selectedTicket.category?.name || 'N/A'}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Assignee</p>
                <span className="text-sm font-medium text-gray-700">{selectedTicket.assignee?.name || 'Unassigned'}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <span className="text-sm font-medium text-gray-700">{formatDate(selectedTicket.createdAt)}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Updated</p>
                <span className="text-sm font-medium text-gray-700">{formatDate(selectedTicket.updatedAt)}</span>
              </div>
            </div>
            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => navigate(`/tickets/${selectedTicket.id}`)} className="btn-primary text-sm">
                View Full Details
              </button>
              <button onClick={() => setShowDetailModal(false)} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Ticket" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input type="text" value={editData.subject || ''} onChange={(e) => setEditData({ ...editData, subject: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={editData.description || ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="input-field h-24 resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={editData.status || ''} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className="input-field">
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={editData.priority || ''} onChange={(e) => setEditData({ ...editData, priority: e.target.value })} className="input-field">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={editData.categoryId || ''} onChange={(e) => setEditData({ ...editData, categoryId: e.target.value })} className="input-field">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
              <select value={editData.assigneeId || ''} onChange={(e) => setEditData({ ...editData, assigneeId: e.target.value })} className="input-field">
                <option value="">Unassigned</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Ticket" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className={`input-field ${formErrors.subject ? 'input-error' : ''}`}
            />
            {formErrors.subject && <p className="error-text">{formErrors.subject}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`input-field h-32 resize-none ${formErrors.description ? 'input-error' : ''}`}
            />
            {formErrors.description && <p className="error-text">{formErrors.description}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className={`input-field ${formErrors.customerId ? 'input-error' : ''}`}
            >
              <option value="">Select customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
            </select>
            {formErrors.customerId && <p className="error-text">{formErrors.customerId}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} className="input-field">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="input-field">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
            <select value={formData.assigneeId} onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })} className="input-field">
              <option value="">Unassigned</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
            <button
              type="button" onClick={handleAiSuggest}
              disabled={suggestingAi || !formData.subject || !formData.description}
              className="btn-secondary flex items-center gap-2 justify-center text-sm"
            >
              <Sparkles className="w-4 h-4" />
              {suggestingAi ? 'Analyzing...' : 'AI Suggest'}
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={creating} className="btn-primary">{creating ? 'Creating...' : 'Create Ticket'}</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Bulk Update Modal */}
      <Modal isOpen={showBulkUpdateModal} onClose={() => setShowBulkUpdateModal(false)} title={`Update ${selectedIds.size} Tickets`}>
        <form onSubmit={handleBulkUpdate} className="space-y-4">
          <p className="text-sm text-gray-600">Leave fields empty to keep current values.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={bulkUpdateData.status} onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, status: e.target.value })} className="input-field">
              <option value="">No change</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select value={bulkUpdateData.priority} onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, priority: e.target.value })} className="input-field">
              <option value="">No change</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <select value={bulkUpdateData.assigneeId} onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, assigneeId: e.target.value })} className="input-field">
              <option value="">No change</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowBulkUpdateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Update All</button>
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

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={showBulkDeleteDialog}
        onClose={() => setShowBulkDeleteDialog(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Tickets"
        message={`Are you sure you want to delete ${selectedIds.size} ticket(s)? This action cannot be undone.`}
      />
    </div>
  );
}

export default Tickets;
