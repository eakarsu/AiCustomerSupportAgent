import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Building2, Globe, Sparkles, ChevronRight, Loader2, Download, TrendingUp } from 'lucide-react';
import { crmAccountsApi } from '../../services/crmApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';

const HEALTH_COLORS = { healthy: 'bg-green-100 text-green-800', at_risk: 'bg-red-100 text-red-800', churned: 'bg-gray-100 text-gray-700', new: 'bg-blue-100 text-blue-800' };

const AI_VERBS = [
  { key: 'aiScoreHealth', label: 'Score Account Health' },
  { key: 'aiChurnRisk', label: 'Predict Churn Risk' },
  { key: 'aiUpsell', label: 'Identify Upsell Opportunities' },
  { key: 'aiAccountPlan', label: 'Generate Account Plan' },
  { key: 'aiCompetitorMap', label: 'Map Competitor Landscape' },
  { key: 'aiSummarize', label: 'Summarize Account' },
  { key: 'aiSegment', label: 'Segment Account' },
  { key: 'aiRiskFlags', label: 'Flag Account Risks' },
  { key: 'aiRelationshipStrength', label: 'Assess Relationship Strength' },
  { key: 'aiQBRAgenda', label: 'Generate QBR Agenda' },
  { key: 'aiExpansionRevenue', label: 'Forecast Expansion Revenue' },
  { key: 'aiWhiteSpace', label: 'Detect White Space' },
  { key: 'aiTechStack', label: 'Infer Tech Stack' },
  { key: 'aiNegotiationTips', label: 'Suggest Negotiation Tips' },
  { key: 'aiOrgChart', label: 'Generate Org Chart Hints' },
  { key: 'aiRecommendActions', label: 'Recommend Actions' },
];

const emptyForm = { name: '', domain: '', industry: '', size: '', annualRevenue: '', country: '', healthStatus: 'new', ownerId: '' };

export default function CrmAccounts() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
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
      if (healthFilter) params.healthStatus = healthFilter;
      let res;
      if (search.trim()) res = await crmAccountsApi.search({ q: search, page, limit: 20 });
      else res = await crmAccountsApi.list(params);
      setItems(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (e) { toast.error('Failed to load accounts'); }
    finally { setLoading(false); }
  }, [page, healthFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmAccountsApi.create(formData); toast.success('Account created'); setShowCreate(false); setFormData(emptyForm); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmAccountsApi.update(selected.id, formData); toast.success('Account updated'); setShowEdit(false); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await crmAccountsApi.delete(selected.id); toast.success('Account deleted'); setShowDelete(false); setShowDetail(false); load(); }
    catch (e) { toast.error(e.message); }
  };

  const openEdit = (item) => {
    setFormData({ name: item.name || '', domain: item.domain || '', industry: item.industry || '', size: item.size || '', annualRevenue: item.annualRevenue || '', country: item.country || '', healthStatus: item.healthStatus || 'new', ownerId: item.ownerId || '' });
    setShowEdit(true);
  };

  const runAI = async (verb) => {
    setAiVerb(verb); setAiResult(null); setAiLoading(true);
    try { const res = await crmAccountsApi[verb.key](selected?.id); setAiResult(res.result || res); }
    catch (e) { setAiResult({ error: e.message }); } finally { setAiLoading(false); }
  };

  const exportCsv = async () => {
    try { const blob = await crmAccountsApi.exportCsv(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'crm_accounts.csv'; a.click(); URL.revokeObjectURL(url); toast.success('CSV exported'); }
    catch (e) { toast.error('Export failed'); }
  };

  const FormFields = ({ data, onChange }) => (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label><input className="input-field" value={data.name} onChange={e => onChange({ ...data, name: e.target.value })} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Domain</label><input className="input-field" value={data.domain} onChange={e => onChange({ ...data, domain: e.target.value })} placeholder="acme.com" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Industry</label><input className="input-field" value={data.industry} onChange={e => onChange({ ...data, industry: e.target.value })} placeholder="Technology" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
          <select className="input-field" value={data.size} onChange={e => onChange({ ...data, size: e.target.value })}>
            <option value="">Select...</option><option value="1-10">1-10</option><option value="11-50">11-50</option><option value="51-200">51-200</option><option value="201-1000">201-1000</option><option value="1000+">1000+</option>
          </select>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Annual Revenue</label><input className="input-field" type="number" value={data.annualRevenue} onChange={e => onChange({ ...data, annualRevenue: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Country</label><input className="input-field" value={data.country} onChange={e => onChange({ ...data, country: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Health Status</label>
          <select className="input-field" value={data.healthStatus} onChange={e => onChange({ ...data, healthStatus: e.target.value })}>
            <option value="new">New</option><option value="healthy">Healthy</option><option value="at_risk">At Risk</option><option value="churned">Churned</option>
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Building2 className="w-6 h-6 text-indigo-600" />CRM Accounts</h1><p className="text-gray-500 text-sm mt-1">Manage customer accounts and companies</p></div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-secondary flex items-center gap-1 text-sm"><Download className="w-4 h-4" /><span className="hidden sm:inline">CSV</span></button>
          <button onClick={() => { setFormData(emptyForm); setShowCreate(true); }} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />New Account</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="input-field pl-10" placeholder="Search accounts..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select className="input-field sm:w-40" value={healthFilter} onChange={e => { setHealthFilter(e.target.value); setPage(1); }}>
          <option value="">All Health</option><option value="new">New</option><option value="healthy">Healthy</option><option value="at_risk">At Risk</option><option value="churned">Churned</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-left text-xs font-medium text-gray-600">Account</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden md:table-cell">Industry</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden lg:table-cell">Size</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600">Health</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden lg:table-cell">Revenue</th>
                <th className="p-4"></th>
              </tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelected(item); setShowDetail(true); }}>
                    <td className="p-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4 text-blue-600" /></div><div><p className="font-medium text-gray-900 text-sm">{item.name}</p>{item.domain && <p className="text-xs text-gray-400 flex items-center gap-1"><Globe className="w-3 h-3" />{item.domain}</p>}</div></div></td>
                    <td className="p-4 hidden md:table-cell text-sm text-gray-600">{item.industry || '—'}</td>
                    <td className="p-4 hidden lg:table-cell text-sm text-gray-600">{item.size || '—'}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${HEALTH_COLORS[item.healthStatus] || 'bg-gray-100 text-gray-700'}`}>{item.healthStatus || 'new'}</span></td>
                    <td className="p-4 hidden lg:table-cell text-sm text-gray-600">{item.annualRevenue ? `$${Number(item.annualRevenue).toLocaleString()}` : '—'}</td>
                    <td className="p-4"><ChevronRight className="w-4 h-4 text-gray-400" /></td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No accounts found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={setPage} onLimitChange={() => {}} />
      </div>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Account Details" size="lg">
        {selected && <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center"><Building2 className="w-8 h-8 text-blue-600" /></div>
            <div><h3 className="text-lg font-semibold">{selected.name}</h3>{selected.domain && <p className="text-sm text-gray-400">{selected.domain}</p>}<span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${HEALTH_COLORS[selected.healthStatus] || 'bg-gray-100'}`}>{selected.healthStatus}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {selected.industry && <div><p className="text-xs text-gray-400">Industry</p><p className="font-medium">{selected.industry}</p></div>}
            {selected.size && <div><p className="text-xs text-gray-400">Size</p><p className="font-medium">{selected.size} employees</p></div>}
            {selected.country && <div><p className="text-xs text-gray-400">Country</p><p className="font-medium">{selected.country}</p></div>}
            {selected.annualRevenue != null && <div><p className="text-xs text-gray-400">Annual Revenue</p><p className="font-medium text-green-600">${Number(selected.annualRevenue).toLocaleString()}</p></div>}
            {selected.healthScore != null && <div><p className="text-xs text-gray-400">Health Score</p><p className="font-medium">{selected.healthScore}</p></div>}
            {selected.churnRisk != null && <div><p className="text-xs text-gray-400">Churn Risk</p><p className="font-medium">{selected.churnRisk}</p></div>}
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <button onClick={() => { openEdit(selected); setShowDetail(false); }} className="btn-primary text-sm">Edit</button>
            <button onClick={() => { setShowAI(true); setShowDetail(false); setAiResult(null); setAiVerb(null); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"><Sparkles className="w-4 h-4" />AI Tools</button>
            <button onClick={() => { setShowDelete(true); setShowDetail(false); }} className="btn-danger text-sm">Delete</button>
            <button onClick={() => setShowDetail(false)} className="btn-secondary text-sm ml-auto">Close</button>
          </div>
        </div>}
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Account" size="lg">
        <form onSubmit={handleCreate} className="space-y-4"><FormFields data={formData} onChange={setFormData} /><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Account'}</button></div></form>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Account" size="lg">
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

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Account" message={`Delete "${selected?.name}"? This cannot be undone.`} />
    </div>
  );
}
