import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Activity, Calendar, Phone, Mail, MessageSquare, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { crmActivitiesApi } from '../../services/crmApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';

const TYPE_ICONS = { call: Phone, email: Mail, meeting: Calendar, note: MessageSquare, task: Activity };
const TYPE_COLORS = { call: 'bg-blue-100 text-blue-600', email: 'bg-green-100 text-green-600', meeting: 'bg-purple-100 text-purple-600', note: 'bg-yellow-100 text-yellow-600', task: 'bg-gray-100 text-gray-600' };
const STATUS_COLORS = { scheduled: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800', overdue: 'bg-orange-100 text-orange-800' };

const AI_VERBS = [
  { key: 'aiSummarize', label: 'Summarize Activity' },
  { key: 'aiSentiment', label: 'Analyze Sentiment' },
  { key: 'aiActionItems', label: 'Extract Action Items' },
  { key: 'aiClassify', label: 'Classify Activity' },
  { key: 'aiFollowUp', label: 'Suggest Follow-up' },
  { key: 'aiDraftEmail', label: 'Draft Follow-up Email' },
  { key: 'aiMeetingNotes', label: 'Generate Meeting Notes' },
  { key: 'aiScoreCall', label: 'Score Call Quality' },
  { key: 'aiRiskSignals', label: 'Detect Risk Signals' },
  { key: 'aiOptimalSchedule', label: 'Suggest Optimal Schedule' },
  { key: 'aiTopics', label: 'Extract Discussion Topics' },
  { key: 'aiCoachingTips', label: 'Generate Coaching Tips' },
  { key: 'aiBuyerSignals', label: 'Detect Buyer Signals' },
];

const emptyForm = { type: 'call', subject: '', description: '', status: 'scheduled', scheduledAt: '', contactId: '', opportunityId: '' };

export default function CrmActivities() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [aiVerb, setAiVerb] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (typeFilter) params.type = typeFilter;
      let res;
      if (search.trim()) res = await crmActivitiesApi.search({ q: search, page, limit: 20 });
      else res = await crmActivitiesApi.list(params);
      setItems(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (e) { toast.error('Failed to load activities'); }
    finally { setLoading(false); }
  }, [page, typeFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmActivitiesApi.create(formData); toast.success('Activity created'); setShowCreate(false); setFormData(emptyForm); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmActivitiesApi.update(selected.id, formData); toast.success('Activity updated'); setShowEdit(false); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await crmActivitiesApi.delete(selected.id); toast.success('Activity deleted'); setShowDelete(false); setShowDetail(false); load(); }
    catch (e) { toast.error(e.message); }
  };

  const openEdit = (item) => {
    setFormData({ type: item.type || 'call', subject: item.subject || '', description: item.description || '', status: item.status || 'scheduled', scheduledAt: item.scheduledAt ? item.scheduledAt.split('T')[0] : '', contactId: item.contactId || '', opportunityId: item.opportunityId || '' });
    setShowEdit(true);
  };

  const runAI = async (verb) => {
    setAiVerb(verb); setAiResult(null); setAiLoading(true);
    try { const res = await crmActivitiesApi[verb.key](selected?.id); setAiResult(res.result || res); }
    catch (e) { setAiResult({ error: e.message }); } finally { setAiLoading(false); }
  };

  const FormFields = ({ data, onChange }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select className="input-field" value={data.type} onChange={e => onChange({ ...data, type: e.target.value })}>
            <option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="note">Note</option><option value="task">Task</option>
          </select>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="input-field" value={data.status} onChange={e => onChange({ ...data, status: e.target.value })}>
            <option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label><input className="input-field" value={data.subject} onChange={e => onChange({ ...data, subject: e.target.value })} required /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="input-field h-24 resize-none" value={data.description} onChange={e => onChange({ ...data, description: e.target.value })} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label><input type="date" className="input-field" value={data.scheduledAt} onChange={e => onChange({ ...data, scheduledAt: e.target.value })} /></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Activity className="w-6 h-6 text-indigo-600" />CRM Activities</h1><p className="text-gray-500 text-sm mt-1">Track calls, meetings, emails and tasks</p></div>
        <button onClick={() => { setFormData(emptyForm); setShowCreate(true); }} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Log Activity</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="input-field pl-10" placeholder="Search activities..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select className="input-field sm:w-36" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All Types</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="note">Note</option><option value="task">Task</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div> : (
          <div className="divide-y divide-gray-100">
            {items.map(item => {
              const Icon = TYPE_ICONS[item.type] || Activity;
              return (
                <div key={item.id} className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelected(item); setShowDetail(true); }}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[item.type] || 'bg-gray-100 text-gray-600'}`}><Icon className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><p className="font-medium text-gray-900 text-sm">{item.subject}</p><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>{item.status}</span></div>
                    {item.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>}
                    {item.scheduledAt && <p className="text-xs text-gray-400 mt-0.5">{new Date(item.scheduledAt).toLocaleDateString()}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                </div>
              );
            })}
            {items.length === 0 && <div className="p-8 text-center text-gray-400">No activities found</div>}
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={setPage} onLimitChange={() => {}} />
      </div>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Activity Details" size="lg">
        {selected && <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[selected.type] || 'bg-gray-100 text-gray-600'}`}>{(() => { const Icon = TYPE_ICONS[selected.type] || Activity; return <Icon className="w-5 h-5" />; })()}</div>
            <div><h3 className="font-semibold text-gray-900">{selected.subject}</h3><div className="flex items-center gap-2 mt-1"><span className="text-xs text-gray-500 capitalize">{selected.type}</span><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selected.status] || 'bg-gray-100'}`}>{selected.status}</span></div></div>
          </div>
          {selected.description && <div className="bg-gray-50 rounded-lg p-3"><p className="text-sm text-gray-700">{selected.description}</p></div>}
          {selected.scheduledAt && <p className="text-sm text-gray-500">Scheduled: {new Date(selected.scheduledAt).toLocaleString()}</p>}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <button onClick={() => { openEdit(selected); setShowDetail(false); }} className="btn-primary text-sm">Edit</button>
            <button onClick={() => { setShowAI(true); setShowDetail(false); setAiResult(null); setAiVerb(null); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"><Sparkles className="w-4 h-4" />AI Tools</button>
            <button onClick={() => { setShowDelete(true); setShowDetail(false); }} className="btn-danger text-sm">Delete</button>
            <button onClick={() => setShowDetail(false)} className="btn-secondary text-sm ml-auto">Close</button>
          </div>
        </div>}
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Log Activity" size="lg">
        <form onSubmit={handleCreate} className="space-y-4"><FormFields data={formData} onChange={setFormData} /><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Log Activity'}</button></div></form>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Activity" size="lg">
        <form onSubmit={handleEdit} className="space-y-4"><FormFields data={formData} onChange={setFormData} /><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button></div></form>
      </Modal>

      <Modal isOpen={showAI} onClose={() => setShowAI(false)} title={`AI Tools — ${selected?.subject}`} size="lg">
        <div className="flex gap-4 h-96">
          <div className="w-52 flex-shrink-0 space-y-1 overflow-y-auto">
            {AI_VERBS.map(v => <button key={v.key} onClick={() => runAI(v)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${aiVerb?.key === v.key ? 'bg-purple-100 text-purple-700 font-medium' : 'hover:bg-gray-100 text-gray-700'}`}>{v.label}</button>)}
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-y-auto">
            {aiLoading && <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>}
            {!aiLoading && !aiResult && <p className="text-sm text-gray-400 text-center mt-8">Select an AI tool from the left</p>}
            {!aiLoading && aiResult && <pre className="text-xs text-gray-800 whitespace-pre-wrap">{JSON.stringify(aiResult, null, 2)}</pre>}
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Activity" message={`Delete "${selected?.subject}"? This cannot be undone.`} />
    </div>
  );
}
