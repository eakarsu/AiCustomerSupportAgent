import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Trash2, Edit2, ChevronUp, ChevronDown,
  ArrowUpDown, Folder, Ticket, BookOpen
} from 'lucide-react';
import { categoriesApi } from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';

function Categories() {
  const navigate = useNavigate();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#6366f1' });
  const [editData, setEditData] = useState({ name: '', description: '', color: '#6366f1' });
  const [formErrors, setFormErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (data) => {
    const errors = {};
    if (!data.name || data.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    return errors;
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...categories];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
        case 'ticketsCount': valA = a._count?.tickets || 0; valB = b._count?.tickets || 0; break;
        case 'articlesCount': valA = a._count?.knowledgeArticles || 0; valB = b._count?.knowledgeArticles || 0; break;
        case 'createdAt': default: valA = new Date(a.createdAt).getTime(); valB = new Date(b.createdAt).getTime(); break;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [categories, search, sortBy, sortOrder]);

  const handleRowClick = (category) => { setSelectedCategory(category); setShowDetailModal(true); };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errors = validateForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      await categoriesApi.create({ name: formData.name.trim(), description: formData.description.trim() || undefined, color: formData.color });
      setShowCreateModal(false);
      setFormData({ name: '', description: '', color: '#6366f1' });
      setFormErrors({});
      toast.success('Category created successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to create category: ' + error.message);
    } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const errors = validateForm(editData);
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      await categoriesApi.update(selectedCategory.id, { name: editData.name.trim(), description: editData.description.trim() || undefined, color: editData.color });
      setShowEditModal(false); setShowDetailModal(false); setEditErrors({});
      toast.success('Category updated successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to update category: ' + error.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    try {
      await categoriesApi.delete(selectedCategory.id);
      setShowDetailModal(false);
      toast.success('Category deleted');
      loadData();
    } catch (error) { toast.error('Failed to delete category'); }
  };

  const openEditModal = (category) => {
    setEditData({ name: category.name, description: category.description || '', color: category.color || '#6366f1' });
    setEditErrors({});
    setShowEditModal(true);
  };

  const toggleSort = (field) => {
    if (sortBy === field) { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }
    else { setSortBy(field); setSortOrder('asc'); }
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

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <SkeletonTable rows={8} columns={6} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1 text-sm">Organize tickets by category</p>
        </div>
        <button
          onClick={() => { setFormData({ name: '', description: '', color: '#6366f1' }); setFormErrors({}); setShowCreateModal(true); }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          New Category
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <SortHeader field="name" label="Name" />
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden md:table-cell">Description</th>
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600">Color</th>
                <SortHeader field="ticketsCount" label="Tickets" />
                <SortHeader field="articlesCount" label="Articles" />
                <SortHeader field="createdAt" label="Created" />
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((category) => (
                <tr key={category.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleRowClick(category)}>
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${category.color}20` }}>
                        <Folder className="w-4 h-4" style={{ color: category.color }} />
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{category.name}</span>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 hidden md:table-cell">
                    <p className="text-sm text-gray-500 truncate max-w-xs">{category.description || '--'}</p>
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0" style={{ backgroundColor: category.color }} />
                      <span className="text-xs text-gray-500 hidden sm:inline">{category.color}</span>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Ticket className="w-3.5 h-3.5" /><span>{category._count?.tickets || 0}</span>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <BookOpen className="w-3.5 h-3.5" /><span>{category._count?.knowledgeArticles || 0}</span>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 text-xs sm:text-sm text-gray-500 whitespace-nowrap">{formatDate(category.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredAndSorted.length === 0 && (
          <div className="p-8 text-center text-gray-500">{search ? 'No categories match your search' : 'No categories found'}</div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Category Details" size="lg">
        {selectedCategory && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${selectedCategory.color}20` }}>
                  <Folder className="w-6 h-6" style={{ color: selectedCategory.color }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedCategory.name}</h3>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEditModal(selectedCategory)} className="p-2 hover:bg-indigo-50 rounded-lg transition-colors text-indigo-600" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => { setShowDetailModal(false); setShowDeleteDialog(true); }} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {selectedCategory.description && (
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{selectedCategory.description}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-xs text-gray-500">Color</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: selectedCategory.color }} />
                  <span className="text-sm font-medium text-gray-700">{selectedCategory.color}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tickets</p>
                <span className="text-sm font-medium text-gray-700">{selectedCategory._count?.tickets || 0}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Articles</p>
                <span className="text-sm font-medium text-gray-700">{selectedCategory._count?.knowledgeArticles || 0}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className="text-sm font-medium text-gray-700">{selectedCategory.isActive !== false ? 'Active' : 'Inactive'}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <span className="text-sm font-medium text-gray-700">{formatDate(selectedCategory.createdAt)}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Updated</p>
                <span className="text-sm font-medium text-gray-700">{selectedCategory.updatedAt ? formatDate(selectedCategory.updatedAt) : 'N/A'}</span>
              </div>
            </div>
            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => navigate(`/categories/${selectedCategory.id}`)} className="btn-primary text-sm">View Full Details</button>
              <button onClick={() => setShowDetailModal(false)} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Category">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={`input-field ${formErrors.name ? 'input-error' : ''}`} placeholder="e.g. Billing" />
            {formErrors.name && <p className="error-text">{formErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field h-24 resize-none" placeholder="Optional description for this category" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-12 h-10 rounded cursor-pointer border border-gray-200" />
              <input type="text" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="input-field flex-1" placeholder="#6366f1" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Category'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Category">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className={`input-field ${editErrors.name ? 'input-error' : ''}`} />
            {editErrors.name && <p className="error-text">{editErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="input-field h-24 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={editData.color} onChange={(e) => setEditData({ ...editData, color: e.target.value })} className="w-12 h-10 rounded cursor-pointer border border-gray-200" />
              <input type="text" value={editData.color} onChange={(e) => setEditData({ ...editData, color: e.target.value })} className="input-field flex-1" placeholder="#6366f1" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${selectedCategory?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}

export default Categories;
