import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MessageSquare, Zap, Copy, Trash2, Edit, Check } from 'lucide-react';
import { cannedResponsesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

function CannedResponses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    shortcut: '',
    category: ''
  });
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await cannedResponsesApi.getAll();
      setResponses(data);
    } catch (error) {
      console.error('Failed to load responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (id) => {
    navigate(`/canned-responses/${id}`);
  };

  const handleOpenCreate = () => {
    setSelectedResponse(null);
    setFormData({ title: '', content: '', shortcut: '', category: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (e, response) => {
    e.stopPropagation();
    setSelectedResponse(response);
    setFormData({
      title: response.title,
      content: response.content,
      shortcut: response.shortcut || '',
      category: response.category || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dataToSend = { ...formData };
      if (!selectedResponse) {
        dataToSend.authorId = user?.id;
      }
      if (selectedResponse) {
        await cannedResponsesApi.update(selectedResponse.id, dataToSend);
      } else {
        await cannedResponsesApi.create(dataToSend);
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to save response:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedResponse) return;
    try {
      await cannedResponsesApi.delete(selectedResponse.id);
      loadData();
    } catch (error) {
      console.error('Failed to delete response:', error);
    }
  };

  const handleCopy = async (e, response) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(response.content);
      setCopiedId(response.id);
      setTimeout(() => setCopiedId(null), 2000);
      // Increment use count
      await cannedResponsesApi.use(response.id);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const filteredResponses = responses.filter(response =>
    response.title.toLowerCase().includes(search.toLowerCase()) ||
    response.content.toLowerCase().includes(search.toLowerCase()) ||
    response.shortcut?.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900">Canned Responses</h1>
          <p className="text-gray-600 mt-1">Pre-written templates for quick replies</p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Response
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
          <input
            type="text"
            placeholder="Search responses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Responses Grid */}
      <div className="grid grid-cols-2 gap-6">
        {filteredResponses.map((response) => (
          <div
            key={response.id}
            onClick={() => handleRowClick(response.id)}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover relative group"
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={(e) => handleOpenEdit(e, response)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedResponse(response);
                  setShowDeleteDialog(true);
                }}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
              </button>
            </div>

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-cyan-600" />
                </div>
                {response.shortcut && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                    /{response.shortcut}
                  </span>
                )}
              </div>
              <button
                onClick={(e) => handleCopy(e, response)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {copiedId === response.id ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{response.title}</h3>
            <p className="text-gray-500 text-sm mb-4 line-clamp-3">{response.content}</p>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>By {response.author?.name}</span>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Used {response.useCount} times</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredResponses.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No responses found
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedResponse ? 'Edit Response' : 'Create New Response'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-field"
              placeholder="e.g., Welcome Message"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="input-field h-32 resize-none"
              placeholder="Type your response template here..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shortcut</label>
              <div className="flex items-center">
                <span className="text-gray-500 mr-1">/</span>
                <input
                  type="text"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="input-field"
                  placeholder="welcome"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
                placeholder="e.g., Greetings"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : selectedResponse ? 'Update Response' : 'Create Response'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Response"
        message={`Are you sure you want to delete "${selectedResponse?.title}"? This action cannot be undone.`}
      />
    </div>
  );
}

export default CannedResponses;
