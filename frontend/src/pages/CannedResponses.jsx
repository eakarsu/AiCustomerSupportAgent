import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Trash2, Edit2, ArrowUpDown,
  ChevronUp, ChevronDown, MessageSquare, Copy, Check, Hash
} from 'lucide-react';
import { cannedResponsesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';

function CannedResponses() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [formData, setFormData] = useState({
    title: '', content: '', shortcut: '', active: true
  });
  const [editData, setEditData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadData();
  }, [searchDebounced, sortBy, sortOrder, pagination.page, pagination.limit]);

  const loadData = async () => {
    try {
      const params = {
        search: searchDebounced,
        sortBy,
        sortOrder,
        page: pagination.page,
        limit: pagination.limit,
      };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });

      const result = await cannedResponsesApi.getAll(params);
      setResponses(result.data || result);
      if (result.pagination) {
        setPagination(prev => ({ ...prev, ...result.pagination }));
      }
    } catch (error) {
      toast.error('Failed to load canned responses');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (data) => {
    const errors = {};
    if (!data.title || data.title.trim().length === 0) errors.title = 'Title is required';
    if (!data.content || data.content.length < 10) errors.content = 'Content must be at least 10 characters';
    return errors;
  };

  const handleRowClick = (response) => {
    setSelectedResponse(response);
    setShowDetailModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errors = validateForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCreating(true);
    try {
      const payload = {
        ...formData,
        authorId: user?.id,
      };
      await cannedResponsesApi.create(payload);
      setShowCreateModal(false);
      setFormData({ title: '', content: '', shortcut: '', active: true });
      setFormErrors({});
      toast.success('Canned response created successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to create canned response: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const errors = validateForm(editData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await cannedResponsesApi.update(selectedResponse.id, editData);
      setShowEditModal(false);
      setShowDetailModal(false);
      setFormErrors({});
      toast.success('Canned response updated successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to update canned response');
    }
  };

  const handleDelete = async () => {
    if (!selectedResponse) return;
    try {
      await cannedResponsesApi.delete(selectedResponse.id);
      setShowDetailModal(false);
      toast.success('Canned response deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete canned response');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const deletePromises = [...selectedIds].map(id => cannedResponsesApi.delete(id));
      await Promise.all(deletePromises);
      const count = selectedIds.size;
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
      toast.success(`${count} canned response(s) deleted`);
      loadData();
    } catch (error) {
      toast.error('Failed to delete canned responses');
    }
  };

  const handleCopyToClipboard = async (content, id) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast.success('Copied to clipboard');
      // Track usage
      try {
        await cannedResponsesApi.use(id);
      } catch (_) {
        // silently ignore use tracking failures
      }
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
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
    if (selectedIds.size === responses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(responses.map(r => r.id)));
    }
  };

  const openEditModal = (response) => {
    setEditData({
      title: response.title,
      content: response.content,
      shortcut: response.shortcut || '',
      active: response.active !== undefined ? response.active : true,
    });
    setFormErrors({});
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
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-5 w-64 bg-gray-200 rounded animate-pulse" />
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Canned Responses</h1>
          <p className="text-gray-600 mt-1 text-sm">Pre-written response templates for quick replies</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            New Response
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 sm:p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-sm font-medium text-indigo-700">
            {selectedIds.size} response{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
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

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search responses by title, shortcut, or content..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="input-field pl-10"
            />
          </div>
        </div>
      </div>

      {/* Responses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-3 sm:p-4 w-10">
                  <input
                    type="checkbox"
                    checked={responses.length > 0 && selectedIds.size === responses.length}
                    onChange={toggleSelectAll}
                    className="checkbox-primary"
                  />
                </th>
                <SortHeader field="title" label="Title" />
                <SortHeader field="shortcut" label="Shortcut" />
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden lg:table-cell">Author</th>
                <SortHeader field="useCount" label="Use Count" />
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden md:table-cell">Active</th>
                <SortHeader field="createdAt" label="Created" />
                <th className="p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 w-12">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {responses.map((response) => (
                <tr
                  key={response.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedIds.has(response.id) ? 'bg-indigo-50' : ''}`}
                >
                  <td className="p-3 sm:p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(response.id)}
                      onChange={() => toggleSelect(response.id)}
                      className="checkbox-primary"
                    />
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer" onClick={() => handleRowClick(response)}>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{response.title}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">
                        {response.content?.substring(0, 60)}{response.content?.length > 60 ? '...' : ''}
                      </p>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer" onClick={() => handleRowClick(response)}>
                    {response.shortcut ? (
                      <span className="px-2 py-1 rounded-md text-xs font-mono font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        /{response.shortcut}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">--</span>
                    )}
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer hidden lg:table-cell" onClick={() => handleRowClick(response)}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-indigo-600">
                          {(response.author?.name || 'U').charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm">{response.author?.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer" onClick={() => handleRowClick(response)}>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Hash className="w-3.5 h-3.5" />
                      {response.useCount || 0}
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 hidden md:table-cell cursor-pointer" onClick={() => handleRowClick(response)}>
                    {response.active !== false ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Inactive</span>
                    )}
                  </td>
                  <td className="p-3 sm:p-4 text-xs sm:text-sm text-gray-500 whitespace-nowrap">{formatDate(response.createdAt)}</td>
                  <td className="p-3 sm:p-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(response.content, response.id); }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-indigo-600"
                      title="Copy to clipboard"
                    >
                      {copiedId === response.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {responses.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No canned responses found</p>
          </div>
        )}
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
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Canned Response Details" size="lg">
        {selectedResponse && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">{selectedResponse.title}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleCopyToClipboard(selectedResponse.content, selectedResponse.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                  title="Copy to clipboard"
                >
                  {copiedId === selectedResponse.id ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button onClick={() => openEditModal(selectedResponse)} className="p-2 hover:bg-indigo-50 rounded-lg transition-colors text-indigo-600" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => { setShowDetailModal(false); setShowDeleteDialog(true); }} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap border border-gray-100 rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
              {selectedResponse.content}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-xs text-gray-500">Shortcut</p>
                {selectedResponse.shortcut ? (
                  <span className="px-2 py-1 rounded-md text-xs font-mono font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    /{selectedResponse.shortcut}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">None</span>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Author</p>
                <span className="text-sm font-medium text-gray-700">{selectedResponse.author?.name || 'Unknown'}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`text-sm font-medium ${selectedResponse.active !== false ? 'text-green-600' : 'text-gray-500'}`}>
                  {selectedResponse.active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Use Count</p>
                <span className="text-sm font-medium text-gray-700">{selectedResponse.useCount || 0}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <span className="text-sm font-medium text-gray-700">{formatDate(selectedResponse.createdAt)}</span>
              </div>
              {selectedResponse.updatedAt && (
                <div>
                  <p className="text-xs text-gray-500">Updated</p>
                  <span className="text-sm font-medium text-gray-700">{formatDate(selectedResponse.updatedAt)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => navigate(`/canned-responses/${selectedResponse.id}`)} className="btn-primary text-sm">
                View Full Details
              </button>
              <button onClick={() => setShowDetailModal(false)} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setFormErrors({}); }} title="Edit Canned Response" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={editData.title || ''}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className={`input-field ${formErrors.title ? 'input-error' : ''}`}
            />
            {formErrors.title && <p className="error-text">{formErrors.title}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
            <textarea
              value={editData.content || ''}
              onChange={(e) => setEditData({ ...editData, content: e.target.value })}
              className={`input-field h-32 resize-none ${formErrors.content ? 'input-error' : ''}`}
            />
            {formErrors.content && <p className="error-text">{formErrors.content}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shortcut</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">/</span>
              <input
                type="text"
                value={editData.shortcut || ''}
                onChange={(e) => setEditData({ ...editData, shortcut: e.target.value.replace(/[^a-zA-Z0-9-_]/g, '') })}
                className="input-field pl-7 font-mono"
                placeholder="e.g. greeting, thanks, refund"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Letters, numbers, hyphens, and underscores only</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="block text-sm font-medium text-gray-700">Active</label>
            <button
              type="button"
              onClick={() => setEditData({ ...editData, active: !editData.active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editData.active ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editData.active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-500">{editData.active ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setShowEditModal(false); setFormErrors({}); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setFormErrors({}); }} title="Create Canned Response" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`input-field ${formErrors.title ? 'input-error' : ''}`}
              placeholder="e.g. Greeting, Refund Policy, Escalation"
            />
            {formErrors.title && <p className="error-text">{formErrors.title}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className={`input-field h-32 resize-none ${formErrors.content ? 'input-error' : ''}`}
              placeholder="Write the response template here..."
            />
            {formErrors.content && <p className="error-text">{formErrors.content}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shortcut</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">/</span>
              <input
                type="text"
                value={formData.shortcut}
                onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/[^a-zA-Z0-9-_]/g, '') })}
                className="input-field pl-7 font-mono"
                placeholder="e.g. greeting, thanks, refund"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Letters, numbers, hyphens, and underscores only. Type /shortcut to insert this response quickly.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="block text-sm font-medium text-gray-700">Active</label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, active: !formData.active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.active ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-500">{formData.active ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setShowCreateModal(false); setFormErrors({}); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={creating} className="btn-primary">{creating ? 'Creating...' : 'Create Response'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Canned Response"
        message={`Are you sure you want to delete "${selectedResponse?.title}"? This action cannot be undone.`}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={showBulkDeleteDialog}
        onClose={() => setShowBulkDeleteDialog(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Responses"
        message={`Are you sure you want to delete ${selectedIds.size} canned response(s)? This action cannot be undone.`}
      />
    </div>
  );
}

export default CannedResponses;
