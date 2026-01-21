import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Tag as TagIcon, Ticket, Trash2, Edit } from 'lucide-react';
import { tagsApi } from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

function Tags() {
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#10b981'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await tagsApi.getAll();
      setTags(data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (id) => {
    navigate(`/tags/${id}`);
  };

  const handleOpenCreate = () => {
    setSelectedTag(null);
    setFormData({ name: '', color: '#10b981' });
    setShowModal(true);
  };

  const handleOpenEdit = (e, tag) => {
    e.stopPropagation();
    setSelectedTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color || '#10b981'
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedTag) {
        await tagsApi.update(selectedTag.id, formData);
      } else {
        await tagsApi.create(formData);
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to save tag:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTag) return;
    try {
      await tagsApi.delete(selectedTag.id);
      loadData();
    } catch (error) {
      console.error('Failed to delete tag:', error);
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tags</h1>
          <p className="text-gray-600 mt-1">Label and organize tickets with tags</p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Tag
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {tags.map((tag) => (
          <div
            key={tag.id}
            onClick={() => handleRowClick(tag.id)}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 card-hover relative group"
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={(e) => handleOpenEdit(e, tag)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTag(tag);
                  setShowDeleteDialog(true);
                }}
                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-gray-500 hover:text-red-600" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${tag.color}20` }}
              >
                <TagIcon className="w-5 h-5" style={{ color: tag.color }} />
              </div>
              <h3 className="font-semibold text-gray-900">{tag.name}</h3>
            </div>

            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Ticket className="w-4 h-4" />
              <span>{tag._count?.tickets || 0} tickets</span>
            </div>
          </div>
        ))}
      </div>

      {tags.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No tags found
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedTag ? 'Edit Tag' : 'Add New Tag'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer border border-gray-200"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="input-field flex-1"
                placeholder="#10b981"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : selectedTag ? 'Update Tag' : 'Add Tag'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Tag"
        message={`Are you sure you want to delete "${selectedTag?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}

export default Tags;
