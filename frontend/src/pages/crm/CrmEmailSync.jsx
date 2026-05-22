import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Inbox, Mail, Sparkles, ChevronRight, Loader2, ExternalLink } from 'lucide-react';
import { crmEmailSyncApi } from '../../services/crmApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';

const DIR_COLORS = { inbound: 'bg-blue-100 text-blue-800', outbound: 'bg-green-100 text-green-800' };
const STATUS_COLORS = { synced: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', failed: 'bg-red-100 text-red-800' };

const AI_VERBS = [
  { key: 'aiClassify', label: 'Classify Email' },
  { key: 'aiSentiment', label: 'Analyze Sentiment' },
  { key: 'aiSummarize', label: 'Summarize Thread' },
  { key: 'aiDraftReply', label: 'Draft Reply' },
  { key: 'aiExtractEntities', label: 'Extract Entities' },
  { key: 'aiDetectIntent', label: 'Detect Intent' },
  { key: 'aiPrioritize', label: 'Prioritize Email' },
  { key: 'aiLinkToDeal', label: 'Link to Deal' },
  { key: 'aiFollowUpReminder', label: 'Generate Follow-up Reminder' },
  { key: 'aiSpamCheck', label: 'Detect Spam / Auto-reply' },
  { key: 'aiActionItems', label: 'Extract Action Items' },
  { key: 'aiOpportunitySignals', label: 'Detect Opportunity Signals' },
  { key: 'aiLanguage', label: 'Detect Language & Translate' },
  { key: 'aiWritingQuality', label: 'Score Writing Quality' },
  { key: 'aiNextBestAction', label: 'Suggest Next Best Action' },
  { key: 'aiContactMatch', label: 'Match to Contact' },
];

const emptyForm = { subject: '', fromEmail: '', toEmail: '', body: '', direction: 'inbound', threadId: '', contactId: '' };

export default function CrmEmailSync() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState('');
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
      if (dirFilter) params.direction = dirFilter;
      let res;
      if (search.trim()) res = await crmEmailSyncApi.search({ q: search, page, limit: 20 });
      else res = await crmEmailSyncApi.list(params);
      setItems(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (e) { toast.error('Failed to load emails'); }
    finally { setLoading(false); }
  }, [page, dirFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmEmailSyncApi.create(formData); toast.success('Email record created'); setShowCreate(false); setFormData(emptyForm); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmEmailSyncApi.update(selected.id, formData); toast.success('Email updated'); setShowEdit(false); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await crmEmailSyncApi.delete(selected.id); toast.success('Email deleted'); setShowDelete(false); setShowDetail(false); load(); }
    catch (e) { toast.error(e.message); }
  };

  const openEdit = (item) => {
    setFormData({ subject: item.subject || '', fromEmail: item.fromEmail || '', toEmail: item.toEmail || '', body: item.body || '', direction: item.direction || 'inbound', threadId: item.threadId || '', contactId: item.contactId || '' });
    setShowEdit(true);
  };

  const runAI = async (verb) => {
    setAiVerb(verb); setAiResult(null); setAiLoading(true);
    try { const res = await crmEmailSyncApi[verb.key](selected?.id); setAiResult(res.result || res); }
    catch (e) { setAiResult({ error: e.message }); } finally { setAiLoading(false); }
  };

  const FormFields = ({ data, onChange }) => (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label><input className="input-field" value={data.subject} onChange={e => onChange({ ...data, subject: e.target.value })} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">From</label><input type="email" className="input-field" value={data.fromEmail} onChange={e => onChange({ ...data, fromEmail: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">To</label><input type="email" className="input-field" value={data.toEmail} onChange={e => onChange({ ...data, toEmail: e.target.value })} /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
        <select className="input-field" value={data.direction} onChange={e => onChange({ ...data, direction: e.target.value })}>
          <option value="inbound">Inbound</option><option value="outbound">Outbound</option>
        </select>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Body</label><textarea className="input-field h-32 resize-none" value={data.body} onChange={e => onChange({ ...data, body: e.target.value })} /></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Inbox className="w-6 h-6 text-indigo-600" />Email Sync</h1><p className="text-gray-500 text-sm mt-1">Synced emails with AI analysis</p></div>
        <button onClick={() => { setFormData(emptyForm); setShowCreate(true); }} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Add Email</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="input-field pl-10" placeholder="Search emails..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select className="input-field sm:w-36" value={dirFilter} onChange={e => { setDirFilter(e.target.value); setPage(1); }}>
          <option value="">All</option><option value="inbound">Inbound</option><option value="outbound">Outbound</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div> : (
          <div className="divide-y divide-gray-100">
            {items.map(item => (
              <div key={item.id} className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelected(item); setShowDetail(true); }}>
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0"><Mail className="w-4 h-4 text-indigo-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap"><p className="font-medium text-gray-900 text-sm truncate">{item.subject || '(No subject)'}</p><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${DIR_COLORS[item.direction] || 'bg-gray-100'}`}>{item.direction}</span></div>
                  <p className="text-xs text-gray-400 mt-0.5">{item.fromEmail} → {item.toEmail}</p>
                  {item.body && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.body}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">{item.syncStatus && <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[item.syncStatus] || 'bg-gray-100'}`}>{item.syncStatus}</span>}<ChevronRight className="w-4 h-4 text-gray-400" /></div>
              </div>
            ))}
            {items.length === 0 && <div className="p-8 text-center text-gray-400">No emails found</div>}
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={setPage} onLimitChange={() => {}} />
      </div>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Email Details" size="lg">
        {selected && <div className="space-y-4">
          <div><h3 className="font-semibold text-gray-900">{selected.subject}</h3><div className="flex items-center gap-2 mt-1 text-sm text-gray-500"><span>{selected.fromEmail}</span><span>→</span><span>{selected.toEmail}</span></div><div className="flex items-center gap-2 mt-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIR_COLORS[selected.direction] || 'bg-gray-100'}`}>{selected.direction}</span>{selected.syncStatus && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.syncStatus] || 'bg-gray-100'}`}>{selected.syncStatus}</span>}</div></div>
          {selected.body && <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto"><p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.body}</p></div>}
          {selected.aiClassification && <div className="bg-indigo-50 rounded-lg p-3"><p className="text-xs text-indigo-400 mb-1">AI Classification</p><p className="text-sm text-indigo-800">{selected.aiClassification}</p></div>}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <button onClick={() => { openEdit(selected); setShowDetail(false); }} className="btn-primary text-sm">Edit</button>
            <button onClick={() => { setShowAI(true); setShowDetail(false); setAiResult(null); setAiVerb(null); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"><Sparkles className="w-4 h-4" />AI Tools</button>
            <button onClick={() => { setShowDelete(true); setShowDetail(false); }} className="btn-danger text-sm">Delete</button>
            <button onClick={() => setShowDetail(false)} className="btn-secondary text-sm ml-auto">Close</button>
          </div>
        </div>}
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Email Record" size="lg">
        <form onSubmit={handleCreate} className="space-y-4"><FormFields data={formData} onChange={setFormData} /><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Email'}</button></div></form>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Email" size="lg">
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

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Email" message={`Delete this email record? This cannot be undone.`} />
    </div>
  );
}
