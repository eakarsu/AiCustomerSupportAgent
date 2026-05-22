import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Calendar, Clock, Users, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { crmCalendarSyncApi } from '../../services/crmApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';

const STATUS_COLORS = { scheduled: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' };
const TYPE_COLORS = { demo: 'bg-purple-100 text-purple-800', discovery: 'bg-yellow-100 text-yellow-800', followup: 'bg-blue-100 text-blue-800', qbr: 'bg-indigo-100 text-indigo-800', onboarding: 'bg-green-100 text-green-800', internal: 'bg-gray-100 text-gray-700' };

const AI_VERBS = [
  { key: 'aiMeetingPrep', label: 'Generate Meeting Prep' },
  { key: 'aiSummarizeMeeting', label: 'Summarize Meeting' },
  { key: 'aiAgenda', label: 'Generate Agenda' },
  { key: 'aiActionItems', label: 'Extract Action Items' },
  { key: 'aiClassify', label: 'Classify Meeting' },
  { key: 'aiSentiment', label: 'Analyze Meeting Sentiment' },
  { key: 'aiLinkToDeal', label: 'Link to Deal' },
  { key: 'aiFollowUp', label: 'Draft Follow-up' },
  { key: 'aiBuyerSignals', label: 'Detect Buyer Signals' },
  { key: 'aiParticipantInsights', label: 'Generate Participant Insights' },
  { key: 'aiROI', label: 'Assess Meeting ROI' },
  { key: 'aiDecisionReadiness', label: 'Assess Decision Readiness' },
  { key: 'aiRisks', label: 'Flag Meeting Risks' },
  { key: 'aiRecurring', label: 'Suggest Recurring Pattern' },
];

const emptyForm = { title: '', description: '', startTime: '', endTime: '', location: '', meetingType: 'discovery', status: 'scheduled', contactId: '', opportunityId: '' };

export default function CrmCalendarSync() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
      if (statusFilter) params.status = statusFilter;
      let res;
      if (search.trim()) res = await crmCalendarSyncApi.search({ q: search, page, limit: 20 });
      else res = await crmCalendarSyncApi.list(params);
      setItems(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (e) { toast.error('Failed to load calendar events'); }
    finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmCalendarSyncApi.create(formData); toast.success('Event created'); setShowCreate(false); setFormData(emptyForm); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmCalendarSyncApi.update(selected.id, formData); toast.success('Event updated'); setShowEdit(false); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await crmCalendarSyncApi.delete(selected.id); toast.success('Event deleted'); setShowDelete(false); setShowDetail(false); load(); }
    catch (e) { toast.error(e.message); }
  };

  const openEdit = (item) => {
    setFormData({ title: item.title || '', description: item.description || '', startTime: item.startTime ? item.startTime.slice(0, 16) : '', endTime: item.endTime ? item.endTime.slice(0, 16) : '', location: item.location || '', meetingType: item.meetingType || 'discovery', status: item.status || 'scheduled', contactId: item.contactId || '', opportunityId: item.opportunityId || '' });
    setShowEdit(true);
  };

  const runAI = async (verb) => {
    setAiVerb(verb); setAiResult(null); setAiLoading(true);
    try { const res = await crmCalendarSyncApi[verb.key](selected?.id); setAiResult(res.result || res); }
    catch (e) { setAiResult({ error: e.message }); } finally { setAiLoading(false); }
  };

  const FormFields = ({ data, onChange }) => (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input className="input-field" value={data.title} onChange={e => onChange({ ...data, title: e.target.value })} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select className="input-field" value={data.meetingType} onChange={e => onChange({ ...data, meetingType: e.target.value })}>
            <option value="discovery">Discovery</option><option value="demo">Demo</option><option value="followup">Follow-up</option><option value="qbr">QBR</option><option value="onboarding">Onboarding</option><option value="internal">Internal</option>
          </select>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="input-field" value={data.status} onChange={e => onChange({ ...data, status: e.target.value })}>
            <option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label><input type="datetime-local" className="input-field" value={data.startTime} onChange={e => onChange({ ...data, startTime: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">End Time</label><input type="datetime-local" className="input-field" value={data.endTime} onChange={e => onChange({ ...data, endTime: e.target.value })} /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Location / Link</label><input className="input-field" value={data.location} onChange={e => onChange({ ...data, location: e.target.value })} placeholder="Zoom link or office" /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="input-field h-20 resize-none" value={data.description} onChange={e => onChange({ ...data, description: e.target.value })} /></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Calendar className="w-6 h-6 text-indigo-600" />Calendar Sync</h1><p className="text-gray-500 text-sm mt-1">Synced meetings with AI meeting intelligence</p></div>
        <button onClick={() => { setFormData(emptyForm); setShowCreate(true); }} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />New Event</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="input-field pl-10" placeholder="Search events..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select className="input-field sm:w-36" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-left text-xs font-medium text-gray-600">Event</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600">Type</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600">Status</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden md:table-cell">Start Time</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden lg:table-cell">Location</th>
                <th className="p-4"></th>
              </tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelected(item); setShowDetail(true); }}>
                    <td className="p-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0"><Calendar className="w-4 h-4 text-purple-600" /></div><p className="font-medium text-gray-900 text-sm">{item.title}</p></div></td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[item.meetingType] || 'bg-gray-100 text-gray-700'}`}>{item.meetingType}</span></td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-700'}`}>{item.status}</span></td>
                    <td className="p-4 hidden md:table-cell text-sm text-gray-500">{item.startTime ? new Date(item.startTime).toLocaleString() : '—'}</td>
                    <td className="p-4 hidden lg:table-cell text-sm text-gray-500 max-w-xs truncate">{item.location || '—'}</td>
                    <td className="p-4"><ChevronRight className="w-4 h-4 text-gray-400" /></td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No events found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={setPage} onLimitChange={() => {}} />
      </div>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Event Details" size="lg">
        {selected && <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center"><Calendar className="w-6 h-6 text-purple-600" /></div>
            <div><h3 className="font-semibold text-gray-900 text-lg">{selected.title}</h3><div className="flex items-center gap-2 mt-1"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[selected.meetingType] || 'bg-gray-100'}`}>{selected.meetingType}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status] || 'bg-gray-100'}`}>{selected.status}</span></div></div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {selected.startTime && <div><p className="text-xs text-gray-400">Start</p><p className="font-medium">{new Date(selected.startTime).toLocaleString()}</p></div>}
            {selected.endTime && <div><p className="text-xs text-gray-400">End</p><p className="font-medium">{new Date(selected.endTime).toLocaleString()}</p></div>}
            {selected.location && <div className="col-span-2"><p className="text-xs text-gray-400">Location</p><p className="font-medium">{selected.location}</p></div>}
          </div>
          {selected.description && <div className="bg-gray-50 rounded-lg p-3"><p className="text-sm text-gray-700">{selected.description}</p></div>}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <button onClick={() => { openEdit(selected); setShowDetail(false); }} className="btn-primary text-sm">Edit</button>
            <button onClick={() => { setShowAI(true); setShowDetail(false); setAiResult(null); setAiVerb(null); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"><Sparkles className="w-4 h-4" />AI Tools</button>
            <button onClick={() => { setShowDelete(true); setShowDetail(false); }} className="btn-danger text-sm">Delete</button>
            <button onClick={() => setShowDetail(false)} className="btn-secondary text-sm ml-auto">Close</button>
          </div>
        </div>}
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Calendar Event" size="lg">
        <form onSubmit={handleCreate} className="space-y-4"><FormFields data={formData} onChange={setFormData} /><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Event'}</button></div></form>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Event" size="lg">
        <form onSubmit={handleEdit} className="space-y-4"><FormFields data={formData} onChange={setFormData} /><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button></div></form>
      </Modal>

      <Modal isOpen={showAI} onClose={() => setShowAI(false)} title={`AI Tools — ${selected?.title}`} size="lg">
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

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Event" message={`Delete "${selected?.title}"? This cannot be undone.`} />
    </div>
  );
}
