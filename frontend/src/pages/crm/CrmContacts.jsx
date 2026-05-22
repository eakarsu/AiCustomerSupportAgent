import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Users, Mail, Phone, Building2, Sparkles, ChevronRight, X, Loader2, Archive, RotateCcw, Download } from 'lucide-react';
import { crmContactsApi } from '../../services/crmApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';

const STATUS_COLORS = { active: 'bg-green-100 text-green-800', inactive: 'bg-gray-100 text-gray-700', prospect: 'bg-blue-100 text-blue-800', lead: 'bg-yellow-100 text-yellow-800' };

const AI_VERBS = [
  { key: 'aiEnrich', label: 'Enrich from Name', needsId: false },
  { key: 'aiBuyerPersona', label: 'Classify Buyer Persona', needsId: true },
  { key: 'aiBuyerIntent', label: 'Predict Buyer Intent', needsId: true },
  { key: 'aiScoreEngagement', label: 'Score Engagement', needsId: true },
  { key: 'aiDeadContact', label: 'Detect Dead Contact', needsId: true },
  { key: 'aiNextTouch', label: 'Suggest Next Touch', needsId: true },
  { key: 'aiSummarize', label: 'Summarize History', needsId: true },
  { key: 'aiIcebreaker', label: 'Generate Icebreaker', needsId: true },
  { key: 'aiChannelPref', label: 'Classify Channel Preference', needsId: true },
  { key: 'aiBestTime', label: 'Predict Best Contact Time', needsId: true },
  { key: 'aiJobChange', label: 'Detect Job Change', needsId: true },
  { key: 'aiRelationshipMap', label: 'Suggest Relationship Map', needsId: true },
  { key: 'aiOutreachEmail', label: 'Generate Outreach Email', needsId: true },
  { key: 'aiLeadFit', label: 'Score Lead Fit', needsId: true },
  { key: 'aiMergeCandidates', label: 'Suggest Merge Candidates', needsId: true },
];

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', title: '', department: '', accountId: '', status: 'prospect', leadSource: '' };

export default function CrmContacts() {
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
      if (search.trim()) {
        res = await crmContactsApi.search({ q: search, page, limit: 20 });
      } else {
        res = await crmContactsApi.list(params);
      }
      setItems(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (e) { toast.error('Failed to load contacts'); }
    finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmContactsApi.create(formData); toast.success('Contact created'); setShowCreate(false); setFormData(emptyForm); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmContactsApi.update(selected.id, formData); toast.success('Contact updated'); setShowEdit(false); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await crmContactsApi.delete(selected.id); toast.success('Contact deleted'); setShowDelete(false); setShowDetail(false); load(); }
    catch (e) { toast.error(e.message); }
  };

  const openEdit = (item) => { setFormData({ firstName: item.firstName || '', lastName: item.lastName || '', email: item.email || '', phone: item.phone || '', title: item.title || '', department: item.department || '', accountId: item.accountId || '', status: item.status || 'prospect', leadSource: item.leadSource || '' }); setShowEdit(true); };

  const runAI = async (verb) => {
    setAiVerb(verb); setAiResult(null); setAiLoading(true);
    try {
      const fn = crmContactsApi[verb.key];
      let res;
      if (verb.key === 'aiEnrich') res = await fn({ id: selected?.id, name: `${selected?.firstName} ${selected?.lastName}`, company: '' });
      else if (verb.key === 'aiValidateEmail') res = await fn(selected?.email);
      else res = await fn(selected?.id);
      setAiResult(res.result || res);
    } catch (e) { setAiResult({ error: e.message }); }
    finally { setAiLoading(false); }
  };

  const exportCsv = async () => {
    try { const blob = await crmContactsApi.exportCsv(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'crm_contacts.csv'; a.click(); URL.revokeObjectURL(url); toast.success('CSV exported'); }
    catch (e) { toast.error('Export failed'); }
  };

  const FormFields = ({ data, onChange }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name</label><input className="input-field" value={data.firstName} onChange={e => onChange({ ...data, firstName: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label><input className="input-field" value={data.lastName} onChange={e => onChange({ ...data, lastName: e.target.value })} /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className="input-field" value={data.email} onChange={e => onChange({ ...data, email: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input className="input-field" value={data.phone} onChange={e => onChange({ ...data, phone: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input className="input-field" value={data.title} onChange={e => onChange({ ...data, title: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><input className="input-field" value={data.department} onChange={e => onChange({ ...data, department: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="input-field" value={data.status} onChange={e => onChange({ ...data, status: e.target.value })}>
            <option value="prospect">Prospect</option><option value="lead">Lead</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label><input className="input-field" value={data.leadSource} onChange={e => onChange({ ...data, leadSource: e.target.value })} placeholder="e.g. website, referral" /></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-6 h-6 text-indigo-600" />CRM Contacts</h1><p className="text-gray-500 text-sm mt-1">Manage contacts with AI-powered insights</p></div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-secondary flex items-center gap-1 text-sm"><Download className="w-4 h-4" /><span className="hidden sm:inline">CSV</span></button>
          <button onClick={() => { setFormData(emptyForm); setShowCreate(true); }} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />New Contact</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="input-field pl-10" placeholder="Search contacts..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select className="input-field sm:w-40" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option><option value="prospect">Prospect</option><option value="lead">Lead</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-left text-xs font-medium text-gray-600">Name</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden md:table-cell">Email</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden lg:table-cell">Title</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600">Status</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden lg:table-cell">Engagement</th>
                <th className="p-4"></th>
              </tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelected(item); setShowDetail(true); }}>
                    <td className="p-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-600 text-sm font-medium">{(item.firstName || '?').charAt(0)}</div><div><p className="font-medium text-gray-900 text-sm">{item.firstName} {item.lastName}</p><p className="text-xs text-gray-500">{item.department}</p></div></div></td>
                    <td className="p-4 hidden md:table-cell"><div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-3.5 h-3.5 text-gray-400" />{item.email}</div></td>
                    <td className="p-4 hidden lg:table-cell text-sm text-gray-600">{item.title || '—'}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-700'}`}>{item.status}</span></td>
                    <td className="p-4 hidden lg:table-cell"><div className="flex items-center gap-2"><div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.engagementScore || 0}%` }} /></div><span className="text-xs text-gray-500">{item.engagementScore || 0}</span></div></td>
                    <td className="p-4"><ChevronRight className="w-4 h-4 text-gray-400" /></td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No contacts found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={setPage} onLimitChange={() => {}} />
      </div>

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Contact Details" size="lg">
        {selected && <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xl font-bold">{(selected.firstName || '?').charAt(0)}</div>
              <div><h3 className="text-lg font-semibold">{selected.firstName} {selected.lastName}</h3><p className="text-sm text-gray-500">{selected.title} {selected.department && `· ${selected.department}`}</p><span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status] || 'bg-gray-100 text-gray-700'}`}>{selected.status}</span></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {selected.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{selected.email}</div>}
            {selected.phone && <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{selected.phone}</div>}
            {selected.leadSource && <div><p className="text-xs text-gray-400">Lead Source</p><p className="font-medium">{selected.leadSource}</p></div>}
            {selected.engagementScore != null && <div><p className="text-xs text-gray-400">Engagement Score</p><p className="font-medium">{selected.engagementScore}</p></div>}
            {selected.buyerPersona && <div><p className="text-xs text-gray-400">Buyer Persona</p><p className="font-medium">{selected.buyerPersona}</p></div>}
            {selected.leadFitScore != null && <div><p className="text-xs text-gray-400">Lead Fit Score</p><p className="font-medium">{selected.leadFitScore}</p></div>}
          </div>
          {selected.aiSummary && <div className="bg-indigo-50 rounded-lg p-3"><p className="text-xs text-indigo-400 mb-1">AI Summary</p><p className="text-sm text-indigo-800">{selected.aiSummary}</p></div>}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <button onClick={() => { openEdit(selected); setShowDetail(false); }} className="btn-primary text-sm">Edit</button>
            <button onClick={() => { setShowAI(true); setShowDetail(false); setAiResult(null); setAiVerb(null); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"><Sparkles className="w-4 h-4" />AI Tools</button>
            <button onClick={() => { setShowDelete(true); setShowDetail(false); }} className="btn-danger text-sm">Delete</button>
            <button onClick={() => setShowDetail(false)} className="btn-secondary text-sm ml-auto">Close</button>
          </div>
        </div>}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Contact" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <FormFields data={formData} onChange={setFormData} />
          <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Contact'}</button></div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Contact" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <FormFields data={formData} onChange={setFormData} />
          <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button></div>
        </form>
      </Modal>

      {/* AI Panel */}
      <Modal isOpen={showAI} onClose={() => setShowAI(false)} title={`AI Tools — ${selected?.firstName} ${selected?.lastName}`} size="lg">
        <div className="flex gap-4 h-96">
          <div className="w-48 flex-shrink-0 space-y-1 overflow-y-auto">
            {AI_VERBS.map(v => <button key={v.key} onClick={() => runAI(v)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${aiVerb?.key === v.key ? 'bg-purple-100 text-purple-700 font-medium' : 'hover:bg-gray-100 text-gray-700'}`}>{v.label}</button>)}
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-y-auto">
            {aiLoading && <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>}
            {!aiLoading && !aiResult && <p className="text-sm text-gray-400 text-center mt-8">Select an AI tool from the left</p>}
            {!aiLoading && aiResult && <pre className="text-xs text-gray-800 whitespace-pre-wrap">{JSON.stringify(aiResult, null, 2)}</pre>}
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Contact" message={`Delete "${selected?.firstName} ${selected?.lastName}"? This cannot be undone.`} />
    </div>
  );
}
