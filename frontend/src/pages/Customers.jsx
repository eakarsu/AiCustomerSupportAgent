import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, UserCircle, Mail, Phone, Building, Trash2, Edit2,
  Download, FileText, ChevronUp, ChevronDown, ArrowUpDown, Filter, X
} from 'lucide-react';
import { customersApi, downloadBlob, generatePdfFromData } from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';

function Customers() {
  const navigate = useNavigate();
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', company: '', tier: 'standard', notes: ''
  });
  const [editData, setEditData] = useState({});
  const [bulkUpdateData, setBulkUpdateData] = useState({ tier: '', isActive: '' });
  const [formErrors, setFormErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadData();
  }, [tierFilter, searchDebounced, sortBy, sortOrder, pagination.page, pagination.limit]);

  const loadData = async () => {
    try {
      const params = {
        search: searchDebounced,
        tier: tierFilter,
        sortBy,
        sortOrder,
        page: pagination.page,
        limit: pagination.limit,
      };
      // Remove empty params
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });

      const result = await customersApi.getAll(params);
      setCustomers(result.data || result);
      if (result.pagination) {
        setPagination(prev => ({ ...prev, ...result.pagination }));
      }
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (data) => {
    const errors = {};
    if (!data.name || data.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Valid email is required';
    if (data.phone && !/^[+]?[\d\s()-]{7,20}$/.test(data.phone)) errors.phone = 'Invalid phone number format';
    return errors;
  };

  const handleRowClick = (customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errors = validateForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCreating(true);
    try {
      await customersApi.create(formData);
      setShowCreateModal(false);
      setFormData({ name: '', email: '', phone: '', company: '', tier: 'standard', notes: '' });
      setFormErrors({});
      toast.success('Customer created successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to create customer: ' + error.message);
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
      await customersApi.update(selectedCustomer.id, editData);
      setShowEditModal(false);
      setShowDetailModal(false);
      setFormErrors({});
      toast.success('Customer updated successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to update customer: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    try {
      await customersApi.delete(selectedCustomer.id);
      setShowDetailModal(false);
      setShowDeleteDialog(false);
      toast.success('Customer deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const result = await customersApi.bulkDelete([...selectedIds]);
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
      toast.success(`${result.count} customer${result.count !== 1 ? 's' : ''} deleted`);
      loadData();
    } catch (error) {
      toast.error('Failed to delete customers');
    }
  };

  const handleBulkUpdate = async (e) => {
    e.preventDefault();
    const data = {};
    if (bulkUpdateData.tier) data.tier = bulkUpdateData.tier;
    if (bulkUpdateData.isActive !== '') data.isActive = bulkUpdateData.isActive === 'true';

    if (Object.keys(data).length === 0) {
      toast.warning('Select at least one field to update');
      return;
    }

    try {
      const result = await customersApi.bulkUpdate([...selectedIds], data);
      setSelectedIds(new Set());
      setShowBulkUpdateModal(false);
      setBulkUpdateData({ tier: '', isActive: '' });
      toast.success(`${result.count} customer${result.count !== 1 ? 's' : ''} updated`);
      loadData();
    } catch (error) {
      toast.error('Failed to update customers');
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await customersApi.exportCsv();
      downloadBlob(blob, 'customers-export.csv');
      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const handleExportPdf = async () => {
    try {
      const params = {};
      if (tierFilter) params.tier = tierFilter;
      const pdfData = await customersApi.exportPdf(params);
      generatePdfFromData(pdfData);
      toast.success('PDF report generated');
    } catch (error) {
      toast.error('Failed to generate PDF');
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
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map(c => c.id)));
    }
  };

  const openEditModal = (customer) => {
    setEditData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      company: customer.company || '',
      tier: customer.tier,
      notes: customer.notes || '',
      isActive: customer.isActive,
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const getTierColor = (tier) => {
    const colors = {
      standard: 'bg-gray-100 text-gray-800',
      premium: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800',
      vip: 'bg-amber-100 text-amber-800'
    };
    return colors[tier] || colors.standard;
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1 text-sm">Manage your customer database</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleExportCsv} className="btn-secondary flex items-center gap-1 text-sm" title="Export CSV">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={handleExportPdf} className="btn-secondary flex items-center gap-1 text-sm" title="Export PDF">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={() => { setFormData({ name: '', email: '', phone: '', company: '', tier: 'standard', notes: '' }); setFormErrors({}); setShowCreateModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            New Customer
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 sm:p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-sm font-medium text-indigo-700">
            {selectedIds.size} customer{selectedIds.size > 1 ? 's' : ''} selected
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
              placeholder="Search customers by name, email, or company..."
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
              value={tierFilter}
              onChange={(e) => { setTierFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="input-field sm:w-40"
            >
              <option value="">All Tiers</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
              <option value="vip">VIP</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-3 sm:p-4 w-10">
                  <input
                    type="checkbox"
                    checked={customers.length > 0 && selectedIds.size === customers.length}
                    onChange={toggleSelectAll}
                    className="checkbox-primary"
                  />
                </th>
                <SortHeader field="name" label="Customer" />
                <SortHeader field="email" label="Email" className="hidden md:table-cell" />
                <SortHeader field="company" label="Company" className="hidden lg:table-cell" />
                <SortHeader field="tier" label="Tier" />
                <SortHeader field="totalSpent" label="Total Spent" className="hidden md:table-cell" />
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden lg:table-cell">Tickets</th>
                <SortHeader field="createdAt" label="Joined" className="hidden lg:table-cell" />
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedIds.has(customer.id) ? 'bg-indigo-50' : ''}`}
                >
                  <td className="p-3 sm:p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(customer.id)}
                      onChange={() => toggleSelect(customer.id)}
                      className="checkbox-primary"
                    />
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer" onClick={() => handleRowClick(customer)}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        {customer.avatar ? (
                          <img src={customer.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium text-indigo-600">{customer.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{customer.name}</p>
                        <p className="text-xs text-gray-500 md:hidden truncate">{customer.email}</p>
                      </div>
                      {!customer.isActive && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 flex-shrink-0">Inactive</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer hidden md:table-cell" onClick={() => handleRowClick(customer)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{customer.email}</span>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer hidden lg:table-cell" onClick={() => handleRowClick(customer)}>
                    {customer.company ? (
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate">{customer.company}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">--</span>
                    )}
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer" onClick={() => handleRowClick(customer)}>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(customer.tier)}`}>
                      {customer.tier}
                    </span>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer hidden md:table-cell" onClick={() => handleRowClick(customer)}>
                    <span className="text-sm font-medium text-green-600">{formatCurrency(customer.totalSpent)}</span>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer hidden lg:table-cell" onClick={() => handleRowClick(customer)}>
                    <span className="text-sm text-gray-600">{customer._count?.tickets || 0}</span>
                  </td>
                  <td className="p-3 sm:p-4 text-xs sm:text-sm text-gray-500 whitespace-nowrap hidden lg:table-cell">{formatDate(customer.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {customers.length === 0 && (
          <div className="p-8 text-center text-gray-500">No customers found</div>
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
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Customer Details" size="lg">
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {selectedCustomer.avatar ? (
                    <img src={selectedCustomer.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <UserCircle className="w-9 h-9 text-indigo-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedCustomer.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTierColor(selectedCustomer.tier)}`}>
                    {selectedCustomer.tier}
                  </span>
                  {!selectedCustomer.isActive && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Inactive</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEditModal(selectedCustomer)} className="p-2 hover:bg-indigo-50 rounded-lg transition-colors text-indigo-600" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => { setShowDetailModal(false); setShowDeleteDialog(true); }} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-700">{selectedCustomer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-700">{selectedCustomer.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Company</p>
                  <p className="text-sm font-medium text-gray-700">{selectedCustomer.company || 'Not provided'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Spent</p>
                <p className="text-sm font-semibold text-green-600">{formatCurrency(selectedCustomer.totalSpent)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tickets</p>
                <p className="text-sm font-medium text-gray-700">{selectedCustomer._count?.tickets || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedCustomer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                  {selectedCustomer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Joined</p>
                <p className="text-sm font-medium text-gray-700">{formatDate(selectedCustomer.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm font-medium text-gray-700">{formatDate(selectedCustomer.updatedAt)}</p>
              </div>
            </div>

            {selectedCustomer.notes && (
              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{selectedCustomer.notes}</p>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => navigate(`/customers/${selectedCustomer.id}`)} className="btn-primary text-sm">
                View Full Details
              </button>
              <button onClick={() => setShowDetailModal(false)} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setFormErrors({}); }} title="Edit Customer" size="lg">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={editData.phone || ''}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                className={`input-field ${formErrors.phone ? 'input-error' : ''}`}
              />
              {formErrors.phone && <p className="error-text">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={editData.company || ''}
                onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
              <select value={editData.tier || 'standard'} onChange={(e) => setEditData({ ...editData, tier: e.target.value })} className="input-field">
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
                <option value="vip">VIP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={editData.isActive === true ? 'true' : 'false'} onChange={(e) => setEditData({ ...editData, isActive: e.target.value === 'true' })} className="input-field">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={editData.notes || ''}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              className="input-field h-24 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setShowEditModal(false); setFormErrors({}); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setFormErrors({}); }} title="Add New Customer" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`input-field ${formErrors.name ? 'input-error' : ''}`}
              placeholder="John Doe"
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
              placeholder="john@example.com"
            />
            {formErrors.email && <p className="error-text">{formErrors.email}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`input-field ${formErrors.phone ? 'input-error' : ''}`}
                placeholder="+1 (555) 123-4567"
              />
              {formErrors.phone && <p className="error-text">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="input-field"
                placeholder="Acme Inc."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
            <select
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
              className="input-field"
            >
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
              <option value="vip">VIP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field h-24 resize-none"
              placeholder="Any additional notes about this customer..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setShowCreateModal(false); setFormErrors({}); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? 'Creating...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Update Modal */}
      <Modal isOpen={showBulkUpdateModal} onClose={() => setShowBulkUpdateModal(false)} title={`Update ${selectedIds.size} Customer${selectedIds.size > 1 ? 's' : ''}`}>
        <form onSubmit={handleBulkUpdate} className="space-y-4">
          <p className="text-sm text-gray-600">Leave fields empty to keep current values.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
            <select value={bulkUpdateData.tier} onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, tier: e.target.value })} className="input-field">
              <option value="">No change</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
              <option value="vip">VIP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={bulkUpdateData.isActive} onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, isActive: e.target.value })} className="input-field">
              <option value="">No change</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
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
        title="Delete Customer"
        message={`Are you sure you want to delete "${selectedCustomer?.name}"? This will also delete all associated data. This action cannot be undone.`}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={showBulkDeleteDialog}
        onClose={() => setShowBulkDeleteDialog(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Customers"
        message={`Are you sure you want to delete ${selectedIds.size} customer(s)? This will also delete all associated data. This action cannot be undone.`}
      />
    </div>
  );
}

export default Customers;
