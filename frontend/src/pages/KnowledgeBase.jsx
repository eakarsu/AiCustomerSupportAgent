import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Trash2, Sparkles, Edit2, ArrowUpDown,
  ChevronUp, ChevronDown, Filter, BookOpen, Eye, ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { knowledgeApi, categoriesApi, aiApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';

function KnowledgeBase() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ categoryId: '' });
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [formData, setFormData] = useState({
    title: '', content: '', categoryId: '', tags: '', published: true
  });
  const [editData, setEditData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
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
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesData = await categoriesApi.getAll();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load categories:', error);
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
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });

      const result = await knowledgeApi.getAll(params);
      setArticles(result.data || result);
      if (result.pagination) {
        setPagination(prev => ({ ...prev, ...result.pagination }));
      }
    } catch (error) {
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (data) => {
    const errors = {};
    if (!data.title || data.title.length < 3) errors.title = 'Title must be at least 3 characters';
    if (!data.content || data.content.length < 10) errors.content = 'Content must be at least 10 characters';
    return errors;
  };

  const handleRowClick = (article) => {
    setSelectedArticle(article);
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
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      await knowledgeApi.create(payload);
      setShowCreateModal(false);
      setFormData({ title: '', content: '', categoryId: '', tags: '', published: true });
      setFormErrors({});
      toast.success('Article created successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to create article: ' + error.message);
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
      const payload = {
        ...editData,
        tags: typeof editData.tags === 'string'
          ? editData.tags.split(',').map(t => t.trim()).filter(Boolean)
          : editData.tags,
      };
      await knowledgeApi.update(selectedArticle.id, payload);
      setShowEditModal(false);
      setShowDetailModal(false);
      setFormErrors({});
      toast.success('Article updated successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to update article');
    }
  };

  const handleDelete = async () => {
    if (!selectedArticle) return;
    try {
      await knowledgeApi.delete(selectedArticle.id);
      setShowDetailModal(false);
      toast.success('Article deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete article');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const deletePromises = [...selectedIds].map(id => knowledgeApi.delete(id));
      await Promise.all(deletePromises);
      const count = selectedIds.size;
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
      toast.success(`${count} article(s) deleted`);
      loadData();
    } catch (error) {
      toast.error('Failed to delete articles');
    }
  };

  const handleMarkHelpful = async (id, isHelpful) => {
    try {
      await knowledgeApi.markHelpful(id, isHelpful);
      toast.success(isHelpful ? 'Marked as helpful' : 'Marked as not helpful');
      loadData();
    } catch (error) {
      toast.error('Failed to update feedback');
    }
  };

  const handleAiGenerate = async () => {
    if (!formData.title) {
      toast.warning('Enter a title/topic first to generate content');
      return;
    }
    setGeneratingAi(true);
    try {
      const result = await aiApi.generateArticle(formData.title, formData.tags || '');
      setFormData(prev => ({
        ...prev,
        content: result.content || result.article || prev.content,
      }));
      toast.info('AI content generated');
    } catch (error) {
      toast.error('AI generation failed');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleAiGenerateEdit = async () => {
    if (!editData.title) {
      toast.warning('Enter a title/topic first to generate content');
      return;
    }
    setGeneratingAi(true);
    try {
      const result = await aiApi.generateArticle(editData.title, editData.tags || '');
      setEditData(prev => ({
        ...prev,
        content: result.content || result.article || prev.content,
      }));
      toast.info('AI content generated');
    } catch (error) {
      toast.error('AI generation failed');
    } finally {
      setGeneratingAi(false);
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
    if (selectedIds.size === articles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map(a => a.id)));
    }
  };

  const openEditModal = (article) => {
    setEditData({
      title: article.title,
      content: article.content || '',
      categoryId: article.categoryId || '',
      tags: Array.isArray(article.tags) ? article.tags.join(', ') : (article.tags || ''),
      published: article.published !== undefined ? article.published : (article.isPublished !== undefined ? article.isPublished : true),
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
            <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-5 w-56 bg-gray-200 rounded animate-pulse" />
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-600 mt-1 text-sm">Manage help articles and documentation</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            New Article
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 sm:p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-sm font-medium text-indigo-700">
            {selectedIds.size} article{selectedIds.size > 1 ? 's' : ''} selected
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
              placeholder="Search articles..."
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

      {/* Articles Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-3 sm:p-4 w-10">
                  <input
                    type="checkbox"
                    checked={articles.length > 0 && selectedIds.size === articles.length}
                    onChange={toggleSelectAll}
                    className="checkbox-primary"
                  />
                </th>
                <SortHeader field="title" label="Title" />
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden md:table-cell">Category</th>
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden lg:table-cell">Author</th>
                <SortHeader field="views" label="Views" />
                <SortHeader field="helpful" label="Helpful" />
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden md:table-cell">Published</th>
                <SortHeader field="createdAt" label="Created" />
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr
                  key={article.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedIds.has(article.id) ? 'bg-indigo-50' : ''}`}
                >
                  <td className="p-3 sm:p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(article.id)}
                      onChange={() => toggleSelect(article.id)}
                      className="checkbox-primary"
                    />
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer" onClick={() => handleRowClick(article)}>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{article.title}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">
                        {article.summary || (article.content ? article.content.substring(0, 80) + (article.content.length > 80 ? '...' : '') : '')}
                      </p>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer hidden md:table-cell" onClick={() => handleRowClick(article)}>
                    {article.category ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${article.category.color || '#6366f1'}20`, color: article.category.color || '#6366f1' }}>
                        {article.category.name}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Uncategorized</span>
                    )}
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer hidden lg:table-cell" onClick={() => handleRowClick(article)}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-indigo-600">
                          {(article.author?.name || 'U').charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm">{article.author?.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer" onClick={() => handleRowClick(article)}>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Eye className="w-3.5 h-3.5" />
                      {article.views || 0}
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 cursor-pointer" onClick={() => handleRowClick(article)}>
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {article.helpful || 0}
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 hidden md:table-cell cursor-pointer" onClick={() => handleRowClick(article)}>
                    {(article.published !== undefined ? article.published : article.isPublished) ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Published</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Draft</span>
                    )}
                  </td>
                  <td className="p-3 sm:p-4 text-xs sm:text-sm text-gray-500 whitespace-nowrap">{formatDate(article.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {articles.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No articles found</p>
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
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Article Details" size="lg">
        {selectedArticle && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">{selectedArticle.title}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEditModal(selectedArticle)} className="p-2 hover:bg-indigo-50 rounded-lg transition-colors text-indigo-600" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => { setShowDetailModal(false); setShowDeleteDialog(true); }} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {selectedArticle.summary && (
              <p className="text-gray-500 text-sm italic">{selectedArticle.summary}</p>
            )}
            <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap border border-gray-100 rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
              {selectedArticle.content}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <span className="text-sm font-medium text-gray-700">{selectedArticle.category?.name || 'Uncategorized'}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Author</p>
                <span className="text-sm font-medium text-gray-700">{selectedArticle.author?.name || 'Unknown'}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Published</p>
                <span className={`text-sm font-medium ${(selectedArticle.published !== undefined ? selectedArticle.published : selectedArticle.isPublished) ? 'text-green-600' : 'text-gray-500'}`}>
                  {(selectedArticle.published !== undefined ? selectedArticle.published : selectedArticle.isPublished) ? 'Yes' : 'Draft'}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Views</p>
                <span className="text-sm font-medium text-gray-700">{selectedArticle.views || 0}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Helpful</p>
                <span className="text-sm font-medium text-gray-700">{selectedArticle.helpful || 0}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <span className="text-sm font-medium text-gray-700">{formatDate(selectedArticle.createdAt)}</span>
              </div>
              {selectedArticle.tags && (Array.isArray(selectedArticle.tags) ? selectedArticle.tags.length > 0 : selectedArticle.tags) && (
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-xs text-gray-500 mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(selectedArticle.tags) ? selectedArticle.tags : [selectedArticle.tags]).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-sm text-gray-500">Was this helpful?</span>
              <button
                onClick={() => handleMarkHelpful(selectedArticle.id, true)}
                className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-green-600"
                title="Helpful"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleMarkHelpful(selectedArticle.id, false)}
                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                title="Not helpful"
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => navigate(`/knowledge/${selectedArticle.id}`)} className="btn-primary text-sm">
                View Full Details
              </button>
              <button onClick={() => setShowDetailModal(false)} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setFormErrors({}); }} title="Edit Article" size="lg">
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
              className={`input-field h-40 resize-none ${formErrors.content ? 'input-error' : ''}`}
            />
            {formErrors.content && <p className="error-text">{formErrors.content}</p>}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={editData.tags || ''}
                onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                className="input-field"
                placeholder="e.g. billing, faq, setup"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="block text-sm font-medium text-gray-700">Published</label>
            <button
              type="button"
              onClick={() => setEditData({ ...editData, published: !editData.published })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editData.published ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editData.published ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-500">{editData.published ? 'Published' : 'Draft'}</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
            <button
              type="button"
              onClick={handleAiGenerateEdit}
              disabled={generatingAi || !editData.title}
              className="btn-secondary flex items-center gap-2 justify-center text-sm"
            >
              <Sparkles className="w-4 h-4" />
              {generatingAi ? 'Generating...' : 'AI Generate'}
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowEditModal(false); setFormErrors({}); }} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setFormErrors({}); }} title="Create New Article" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`input-field ${formErrors.title ? 'input-error' : ''}`}
              placeholder="Article title or topic"
            />
            {formErrors.title && <p className="error-text">{formErrors.title}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className={`input-field h-40 resize-none ${formErrors.content ? 'input-error' : ''}`}
              placeholder="Write article content here..."
            />
            {formErrors.content && <p className="error-text">{formErrors.content}</p>}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="input-field"
                placeholder="e.g. billing, faq, setup"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="block text-sm font-medium text-gray-700">Published</label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, published: !formData.published })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.published ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.published ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-500">{formData.published ? 'Published' : 'Draft'}</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={generatingAi || !formData.title}
              className="btn-secondary flex items-center gap-2 justify-center text-sm"
            >
              <Sparkles className="w-4 h-4" />
              {generatingAi ? 'Generating...' : 'AI Generate'}
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowCreateModal(false); setFormErrors({}); }} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={creating} className="btn-primary">{creating ? 'Creating...' : 'Create Article'}</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Article"
        message={`Are you sure you want to delete "${selectedArticle?.title}"? This action cannot be undone.`}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={showBulkDeleteDialog}
        onClose={() => setShowBulkDeleteDialog(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Articles"
        message={`Are you sure you want to delete ${selectedIds.size} article(s)? This action cannot be undone.`}
      />
    </div>
  );
}

export default KnowledgeBase;
