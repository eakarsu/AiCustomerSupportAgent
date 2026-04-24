import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, UserCircle, Trash2, Edit2, X,
  ChevronUp, ChevronDown, ArrowUpDown, Filter
} from 'lucide-react';
import { usersApi } from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';

function Team() {
  const navigate = useNavigate();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
    isActive: true
  });
  const [editData, setEditData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadData();
  }, [roleFilter, searchDebounced, sortBy, sortOrder, pagination.page, pagination.limit]);

  const loadData = async () => {
    try {
      const params = {
        search: searchDebounced,
        sortBy,
        sortOrder,
        page: pagination.page,
        limit: pagination.limit,
      };
      if (roleFilter) params.role = roleFilter;
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });

      const result = await usersApi.getAll(params);
      setUsers(result.data || result);
      if (result.pagination) {
        setPagination(prev => ({ ...prev, ...result.pagination }));
      }
    } catch (error) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (data, isEdit = false) => {
    const errors = {};
    if (!data.name || data.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Valid email is required';
    }
    if (!isEdit && (!data.password || data.password.length < 6)) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (isEdit && data.password && data.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    return errors;
  };

  const handleRowClick = (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errors = validateForm(formData, false);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      await usersApi.create(formData);
      setShowCreateModal(false);
      setFormData({ name: '', email: '', password: '', role: 'agent', isActive: true });
      setFormErrors({});
      toast.success('Team member created successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to create team member: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const errors = validateForm(editData, true);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const dataToSend = { ...editData };
      if (!dataToSend.password) {
        delete dataToSend.password;
      }
      await usersApi.update(selectedUser.id, dataToSend);
      setShowEditModal(false);
      setShowDetailModal(false);
      setFormErrors({});
      toast.success('Team member updated successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to update team member: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await usersApi.delete(selectedUser.id);
      setShowDetailModal(false);
      toast.success('Team member deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete team member');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const count = selectedIds.size;
      const promises = [...selectedIds].map(id => usersApi.delete(id));
      await Promise.all(promises);
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
      toast.success(`${count} team member(s) deleted`);
      loadData();
    } catch (error) {
      toast.error('Failed to delete team members');
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
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
    }
  };

  const openEditModal = (user) => {
    setEditData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      supervisor: 'bg-amber-100 text-amber-800',
      agent: 'bg-blue-100 text-blue-800'
    };
    return colors[role] || colors.agent;
  };

  const getStatusBadge = (isActive) => {
    return isActive
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-500';
  };

  const SortHeader = ({ field, label, className = '' }) => (
    <th
      className={`text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 cursor-pointer hover:text-indigo-600 select-none ${className}`}
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
        <SkeletonTable rows={10} columns={8} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-600 mt-1 text-sm">Manage your support team members</p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: '', email: '', password: '', role: 'agent', isActive: true });
            setFormErrors({});
            setShowCreateModal(true);
          }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 sm:p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-sm font-medium text-indigo-700">
            {selectedIds.size} member{selectedIds.size > 1 ? 's' : ''} selected
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

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search team members..."
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
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="input-field sm:w-40"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="agent">Agent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Team Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-3 sm:p-4 w-10">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedIds.size === users.length}
                    onChange={toggleSelectAll}
                    className="checkbox-primary"
                  />
                </th>
                <SortHeader field="name" label="Name" />
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden md:table-cell">Email</th>
                <SortHeader field="role" label="Role" />
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden lg:table-cell">Tickets</th>
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden lg:table-cell">Messages</th>
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600">Status</th>
                <SortHeader field="createdAt" label="Created" className="hidden md:table-cell" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedIds.has(user.id) ? 'bg-indigo-50' : ''}`}
                >
                  <td className="p-3 sm:p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      className="checkbox-primary"
                    />
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer" onClick={() => handleRowClick(user)}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <span className="text-sm font-medium text-indigo-600">
                            {user.name?.charAt(0)?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer hidden md:table-cell" onClick={() => handleRowClick(user)}>
                    <span className="text-sm text-gray-600 truncate">{user.email}</span>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer" onClick={() => handleRowClick(user)}>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer hidden lg:table-cell" onClick={() => handleRowClick(user)}>
                    <span className="text-sm text-gray-600">{user._count?.tickets || 0}</span>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer hidden lg:table-cell" onClick={() => handleRowClick(user)}>
                    <span className="text-sm text-gray-600">{user._count?.messages || 0}</span>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer" onClick={() => handleRowClick(user)}>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.isActive)}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3 sm:p-4 text-xs sm:text-sm text-gray-500 whitespace-nowrap hidden md:table-cell">
                    {formatDate(user.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="p-8 text-center text-gray-500">No team members found</div>
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
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Team Member Details" size="lg">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt="" className="w-14 h-14 rounded-full" />
                  ) : (
                    <UserCircle className="w-9 h-9 text-indigo-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEditModal(selectedUser)} className="p-2 hover:bg-indigo-50 rounded-lg transition-colors text-indigo-600" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => { setShowDetailModal(false); setShowDeleteDialog(true); }} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-xs text-gray-500">Role</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                  {selectedUser.role}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedUser.isActive)}`}>
                  {selectedUser.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tickets</p>
                <span className="text-sm font-medium text-gray-700">{selectedUser._count?.tickets || 0}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Messages</p>
                <span className="text-sm font-medium text-gray-700">{selectedUser._count?.messages || 0}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <span className="text-sm font-medium text-gray-700">{formatDate(selectedUser.createdAt)}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Updated</p>
                <span className="text-sm font-medium text-gray-700">{selectedUser.updatedAt ? formatDate(selectedUser.updatedAt) : 'N/A'}</span>
              </div>
            </div>
            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => navigate(`/team/${selectedUser.id}`)} className="btn-primary text-sm">
                View Full Details
              </button>
              <button onClick={() => setShowDetailModal(false)} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setFormErrors({}); }} title="Edit Team Member" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={editData.name || ''}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className={`input-field ${formErrors.name ? 'input-error' : ''}`}
            />
            {formErrors.name && <p className="error-text">{formErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={editData.email || ''}
              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              className={`input-field ${formErrors.email ? 'input-error' : ''}`}
            />
            {formErrors.email && <p className="error-text">{formErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
            </label>
            <input
              type="password"
              value={editData.password || ''}
              onChange={(e) => setEditData({ ...editData, password: e.target.value })}
              className={`input-field ${formErrors.password ? 'input-error' : ''}`}
              placeholder="Leave blank to keep current"
            />
            {formErrors.password && <p className="error-text">{formErrors.password}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={editData.role || 'agent'}
                onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                className="input-field"
              >
                <option value="agent">Agent</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  checked={editData.isActive ?? true}
                  onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setShowEditModal(false); setFormErrors({}); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setFormErrors({}); }} title="Add New Team Member" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`input-field ${formErrors.name ? 'input-error' : ''}`}
              placeholder="Full name"
            />
            {formErrors.name && <p className="error-text">{formErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`input-field ${formErrors.email ? 'input-error' : ''}`}
              placeholder="email@example.com"
            />
            {formErrors.email && <p className="error-text">{formErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`input-field ${formErrors.password ? 'input-error' : ''}`}
              placeholder="Minimum 6 characters"
            />
            {formErrors.password && <p className="error-text">{formErrors.password}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input-field"
              >
                <option value="agent">Agent</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setShowCreateModal(false); setFormErrors({}); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating...' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Team Member"
        message={`Are you sure you want to delete "${selectedUser?.name}"? This action cannot be undone.`}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={showBulkDeleteDialog}
        onClose={() => setShowBulkDeleteDialog(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Members"
        message={`Are you sure you want to delete ${selectedIds.size} team member(s)? This action cannot be undone.`}
      />
    </div>
  );
}

export default Team;
