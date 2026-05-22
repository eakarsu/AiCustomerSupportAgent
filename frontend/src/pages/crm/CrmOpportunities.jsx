import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, TrendingUp, DollarSign, Sparkles, ChevronRight, Loader2, Download, Target } from 'lucide-react';
import { crmOpportunitiesApi } from '../../services/crmApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';

const STAGE_COLORS = { prospecting: 'bg-gray-100 text-gray-700', qualification: 'bg-blue-100 text-blue-800', proposal: 'bg-yellow-100 text-yellow-800', negotiation: 'bg-orange-100 text-orange-800', closed_won: 'bg-green-100 text-green-800', closed_lost: 'bg-red-100 text-red-800' };

const AI_VERBS = [
  { key: 'aiWinProb', label: 'Predict Win Probability' },
  { key: 'aiSlippage', label: 'Detect Deal Slippage' },
  { key: 'aiNextSteps', label: 'Recommend Next Steps' },
  { key: 'aiCompetitorAnalysis', label: 'Analyze Competitor Threats' },
  { key: 'aiDealCoach', label: 'Generate Deal Coaching' },
  { key: 'aiObjHandling', label: 'Suggest Objection Handling' },
  { key: 'aiClosingScript', label: 'Generate Closing Script' },
  { key: 'aiDealSummary', label: 'Summarize Deal' },
  { key: 'aiCloseDate', label: 'Predict Close Date' },
  { key: 'aiRiskScore', label: 'Score Deal Risk' },
  { key: 'aiUpsellInDeal', label: 'Identify Upsell in Deal' },
  { key: 'aiPricingSuggestion', label: 'Suggest Pricing Strategy' },
  { key: 'aiStakeholderMap', label: 'Map Stakeholders' },
  { key: 'aiMeetingPrep', label: 'Generate Meeting Prep' },
  { key: 'aiHealthScore', label: 'Score Deal Health' },
  { key: 'aiAlternativeApproach', label: 'Suggest Alternative Approach' },
];

const emptyForm = { name: '', value: '', stage: 'prospecting', probability: '', expectedCloseDate: '', accountId: '', contactId: '', description: '' };

export default function CrmOpportunities() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
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
      if (stageFilter) params.stage = stageFilter;
      let res;
      if (search.trim()) res = await crmOpportunitiesApi.search({ q: search, page, limit: 20 });
      else res = await crmOpportunitiesApi.list(params);
      setItems(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (e) { toast.error('Failed to load opportunities'); }
    finally { setLoading(false); }
  }, [page, stageFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmOpportunitiesApi.create({ ...formData, value: formData.value ? Number(formData.value) : undefined, probability: formData.probability ? Number(formData.probability) : undefined }); toast.success('Opportunity created'); setShowCreate(false); setFormData(emptyForm); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmOpportunitiesApi.update(selected.id, { ...formData, value: formData.value ? Number(formData.value) : undefined, probability: formData.probability ? Number(formData.probability) : undefined }); toast.success('Opportunity updated'); setShowEdit(false); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await crmOpportunitiesApi.delete(selected.id); toast.success('Opportunity deleted'); setShowDelete(false); setShowDetail(false); load(); }
    catch (e) { toast.error(e.message); }
  };

  const openEdit = (item) => {
    setFormData({ name: item.name || '', value: item.value || '', stage: item.stage || 'prospecting', probability: item.probability || '', expectedCloseDate: item.expectedCloseDate ? item.expectedCloseDate.split('T')[0] : '', accountId: item.accountId || '', contactId: item.contactId || '', description: item.description || '' });
    setShowEdit(true);
  };

  const runAI = async (verb) => {
    setAiVerb(verb); setAiResult(null); setAiLoading(true);
    try { const res = await crmOpportunitiesApi[verb.key](selected?.id); setAiResult(res.result || res); }
    catch (e) { setAiResult({ error: e.message }); } finally { setAiLoading(false); }
  };

  const FormFields = ({ data, onChange }) => (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Name *</label><input className="input-field" value={data.name} onChange={e => onChange({ ...data, name: e.target.value })} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Value ($)</label><input type="number" className="input-field" value={data.value} onChange={e => onChange({ ...data, value: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Probability (%)</label><input type="number" min="0" max="100" className="input-field" value={data.probability} onChange={e => onChange({ ...data, probability: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
          <select className="input-field" value={data.stage} onChange={e => onChange({ ...data, stage: e.target.value })}>
            <option value="prospecting">Prospecting</option><option value="qualification">Qualification</option><option value="proposal">Proposal</option><option value="negotiation">Negotiation</option><option value="closed_won">Closed Won</option><option value="closed_lost">Closed Lost</option>
          </select>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label><input type="date" className="input-field" value={data.expectedCloseDate} onChange={e => onChange({ ...data, expectedCloseDate: e.target.value })} /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="input-field h-20 resize-none" value={data.description} onChange={e => onChange({ ...data, description: e.target.value })} /></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><TrendingUp className="w-6 h-6 text-indigo-600" />CRM Opportunities</h1><p className="text-gray-500 text-sm mt-1">Track deals with AI-powered deal coaching</p></div>
        <button onClick={() => { setFormData(emptyForm); setShowCreate(true); }} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />New Opportunity</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="input-field pl-10" placeholder="Search opportunities..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select className="input-field sm:w-44" value={stageFilter} onChange={e => { setStageFilter(e.target.value); setPage(1); }}>
          <option value="">All Stages</option><option value="prospecting">Prospecting</option><option value="qualification">Qualification</option><option value="proposal">Proposal</option><option value="negotiation">Negotiation</option><option value="closed_won">Closed Won</option><option value="closed_lost">Closed Lost</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-left text-xs font-medium text-gray-600">Opportunity</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600">Stage</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden md:table-cell">Value</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden lg:table-cell">Probability</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden lg:table-cell">Close Date</th>
                <th className="p-4"></th>
              </tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelected(item); setShowDetail(true); }}>
                    <td className="p-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0"><Target className="w-4 h-4 text-green-600" /></div><p className="font-medium text-gray-900 text-sm">{item.name}</p></div></td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STAGE_COLORS[item.stage] || 'bg-gray-100 text-gray-700'}`}>{item.stage}</span></td>
                    <td className="p-4 hidden md:table-cell text-sm font-medium text-green-600">{item.value ? `$${Number(item.value).toLocaleString()}` : '—'}</td>
                    <td className="p-4 hidden lg:table-cell"><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${item.probability || 0}%` }} /></div><span className="text-xs text-gray-500">{item.probability || 0}%</span></div></td>
                    <td className="p-4 hidden lg:table-cell text-sm text-gray-500">{item.expectedCloseDate ? new Date(item.expectedCloseDate).toLocaleDateString() : '—'}</td>
                    <td className="p-4"><ChevronRight className="w-4 h-4 text-gray-400" /></td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No opportunities found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={setPage} onLimitChange={() => {}} />
      </div>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Opportunity Details" size="lg">
        {selected && <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center"><Target className="w-6 h-6 text-green-600" /></div>
            <div><h3 className="text-lg font-semibold">{selected.name}</h3><span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[selected.stage] || 'bg-gray-100'}`}>{selected.stage}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {selected.value != null && <div><p className="text-xs text-gray-400">Deal Value</p><p className="font-semibold text-green-600 text-lg">${Number(selected.value).toLocaleString()}</p></div>}
            {selected.probability != null && <div><p className="text-xs text-gray-400">Win Probability</p><p className="font-medium">{selected.probability}%</p></div>}
            {selected.expectedCloseDate && <div><p className="text-xs text-gray-400">Expected Close</p><p className="font-medium">{new Date(selected.expectedCloseDate).toLocaleDateString()}</p></div>}
            {selected.winProbabilityAI != null && <div><p className="text-xs text-gray-400">AI Win Probability</p><p className="font-medium">{selected.winProbabilityAI}%</p></div>}
          </div>
          {selected.description && <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400 mb-1">Description</p><p className="text-sm text-gray-700">{selected.description}</p></div>}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <button onClick={() => { openEdit(selected); setShowDetail(false); }} className="btn-primary text-sm">Edit</button>
            <button onClick={() => { setShowAI(true); setShowDetail(false); setAiResult(null); setAiVerb(null); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"><Sparkles className="w-4 h-4" />AI Tools</button>
            <button onClick={() => { setShowDelete(true); setShowDetail(false); }} className="btn-danger text-sm">Delete</button>
            <button onClick={() => setShowDetail(false)} className="btn-secondary text-sm ml-auto">Close</button>
          </div>
        </div>}
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Opportunity" size="lg">
        <form onSubmit={handleCreate} className="space-y-4"><FormFields data={formData} onChange={setFormData} /><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Opportunity'}</button></div></form>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Opportunity" size="lg">
        <form onSubmit={handleEdit} className="space-y-4"><FormFields data={formData} onChange={setFormData} /><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button></div></form>
      </Modal>

      <Modal isOpen={showAI} onClose={() => setShowAI(false)} title={`AI Tools — ${selected?.name}`} size="lg">
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

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Opportunity" message={`Delete "${selected?.name}"? This cannot be undone.`} />
    </div>
  );
}
