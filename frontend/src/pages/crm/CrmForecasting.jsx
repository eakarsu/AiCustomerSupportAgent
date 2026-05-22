import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, BarChart3, TrendingUp, Sparkles, ChevronRight, Loader2, Target } from 'lucide-react';
import { crmForecastingApi } from '../../services/crmApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';

const STATUS_COLORS = { draft: 'bg-gray-100 text-gray-700', committed: 'bg-blue-100 text-blue-800', achieved: 'bg-green-100 text-green-800', missed: 'bg-red-100 text-red-800' };
const PERIOD_COLORS = { Q1: 'bg-indigo-100 text-indigo-800', Q2: 'bg-purple-100 text-purple-800', Q3: 'bg-pink-100 text-pink-800', Q4: 'bg-orange-100 text-orange-800' };

const AI_VERBS = [
  { key: 'aiForecast', label: 'Generate Forecast' },
  { key: 'aiQuotaAttainment', label: 'Predict Quota Attainment' },
  { key: 'aiPipelineCoverage', label: 'Analyze Pipeline Coverage' },
  { key: 'aiRevenueTrend', label: 'Detect Revenue Trends' },
  { key: 'aiRiskScenarios', label: 'Simulate Risk Scenarios' },
  { key: 'aiCallForecast', label: 'Call Forecast' },
  { key: 'aiSeasonality', label: 'Detect Seasonality' },
  { key: 'aiSlippage', label: 'Detect Forecast Slippage' },
  { key: 'aiTopDealRisk', label: 'Flag Top Deal Risks' },
  { key: 'aiCommitAnalysis', label: 'Analyze Commit Accuracy' },
  { key: 'aiTeamPerformance', label: 'Benchmark Team Performance' },
  { key: 'aiRecommendActions', label: 'Recommend Actions' },
  { key: 'aiInsights', label: 'Generate Forecast Insights' },
  { key: 'aiNewBusiness', label: 'Predict New Business' },
  { key: 'aiExpansion', label: 'Predict Expansion Revenue' },
  { key: 'aiRollup', label: 'Generate Rollup Summary' },
];

const emptyForm = { period: '', year: new Date().getFullYear(), quota: '', committed: '', bestCase: '', status: 'draft', ownerId: '', notes: '' };

export default function CrmForecasting() {
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
      const res = await crmForecastingApi.list(params);
      setItems(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (e) { toast.error('Failed to load forecasts'); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmForecastingApi.create({ ...formData, year: Number(formData.year), quota: formData.quota ? Number(formData.quota) : undefined, committed: formData.committed ? Number(formData.committed) : undefined, bestCase: formData.bestCase ? Number(formData.bestCase) : undefined }); toast.success('Forecast created'); setShowCreate(false); setFormData(emptyForm); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmForecastingApi.update(selected.id, { ...formData, year: Number(formData.year), quota: formData.quota ? Number(formData.quota) : undefined, committed: formData.committed ? Number(formData.committed) : undefined, bestCase: formData.bestCase ? Number(formData.bestCase) : undefined }); toast.success('Forecast updated'); setShowEdit(false); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await crmForecastingApi.delete(selected.id); toast.success('Forecast deleted'); setShowDelete(false); setShowDetail(false); load(); }
    catch (e) { toast.error(e.message); }
  };

  const openEdit = (item) => {
    setFormData({ period: item.period || '', year: item.year || new Date().getFullYear(), quota: item.quota || '', committed: item.committed || '', bestCase: item.bestCase || '', status: item.status || 'draft', ownerId: item.ownerId || '', notes: item.notes || '' });
    setShowEdit(true);
  };

  const runAI = async (verb) => {
    setAiVerb(verb); setAiResult(null); setAiLoading(true);
    try {
      let res;
      if (verb.key === 'aiForecast') res = await crmForecastingApi[verb.key]({ id: selected?.id });
      else res = await crmForecastingApi[verb.key](selected?.id);
      setAiResult(res.result || res);
    } catch (e) { setAiResult({ error: e.message }); } finally { setAiLoading(false); }
  };

  const fmt = (v) => v != null ? `$${Number(v).toLocaleString()}` : '—';
  const attainment = (item) => item.quota && item.committed ? Math.round((Number(item.committed) / Number(item.quota)) * 100) : null;

  const FormFields = ({ data, onChange }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Period *</label>
          <select className="input-field" value={data.period} onChange={e => onChange({ ...data, period: e.target.value })} required>
            <option value="">Select...</option><option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option><option value="H1">H1</option><option value="H2">H2</option><option value="Annual">Annual</option>
          </select>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Year</label><input type="number" className="input-field" value={data.year} onChange={e => onChange({ ...data, year: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Quota ($)</label><input type="number" className="input-field" value={data.quota} onChange={e => onChange({ ...data, quota: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Committed ($)</label><input type="number" className="input-field" value={data.committed} onChange={e => onChange({ ...data, committed: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Best Case ($)</label><input type="number" className="input-field" value={data.bestCase} onChange={e => onChange({ ...data, bestCase: e.target.value })} /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select className="input-field" value={data.status} onChange={e => onChange({ ...data, status: e.target.value })}>
          <option value="draft">Draft</option><option value="committed">Committed</option><option value="achieved">Achieved</option><option value="missed">Missed</option>
        </select>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea className="input-field h-20 resize-none" value={data.notes} onChange={e => onChange({ ...data, notes: e.target.value })} /></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BarChart3 className="w-6 h-6 text-indigo-600" />CRM Forecasting</h1><p className="text-gray-500 text-sm mt-1">Revenue forecasts and quota tracking</p></div>
        <div className="flex gap-2">
          <button onClick={() => { setSelected(null); setShowAI(true); setAiVerb(null); setAiResult(null); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"><Sparkles className="w-4 h-4" />AI Forecast</button>
          <button onClick={() => { setFormData(emptyForm); setShowCreate(true); }} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />New Forecast</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1"></div>
        <select className="input-field sm:w-40" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option><option value="draft">Draft</option><option value="committed">Committed</option><option value="achieved">Achieved</option><option value="missed">Missed</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-left text-xs font-medium text-gray-600">Period</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600">Status</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden md:table-cell">Quota</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden md:table-cell">Committed</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden lg:table-cell">Best Case</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden lg:table-cell">Attainment</th>
                <th className="p-4"></th>
              </tr></thead>
              <tbody>
                {items.map(item => {
                  const att = attainment(item);
                  return (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelected(item); setShowDetail(true); }}>
                      <td className="p-4"><div className="flex items-center gap-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${PERIOD_COLORS[item.period] || 'bg-gray-100 text-gray-700'}`}>{item.period}</span><span className="text-sm text-gray-500">{item.year}</span></div></td>
                      <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100'}`}>{item.status}</span></td>
                      <td className="p-4 hidden md:table-cell text-sm text-gray-600">{fmt(item.quota)}</td>
                      <td className="p-4 hidden md:table-cell text-sm font-medium text-indigo-600">{fmt(item.committed)}</td>
                      <td className="p-4 hidden lg:table-cell text-sm text-gray-600">{fmt(item.bestCase)}</td>
                      <td className="p-4 hidden lg:table-cell">{att != null && <div className="flex items-center gap-2"><div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${att >= 100 ? 'bg-green-500' : att >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(att, 100)}%` }} /></div><span className="text-xs text-gray-500">{att}%</span></div>}</td>
                      <td className="p-4"><ChevronRight className="w-4 h-4 text-gray-400" /></td>
                    </tr>
                  );
                })}
                {items.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">No forecasts found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={setPage} onLimitChange={() => {}} />
      </div>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Forecast Details" size="lg">
        {selected && <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center"><BarChart3 className="w-6 h-6 text-indigo-600" /></div>
            <div><h3 className="font-semibold text-gray-900 text-lg">{selected.period} {selected.year}</h3><span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status] || 'bg-gray-100'}`}>{selected.status}</span></div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400">Quota</p><p className="font-semibold text-gray-900 text-lg">{fmt(selected.quota)}</p></div>
            <div className="bg-indigo-50 rounded-lg p-3"><p className="text-xs text-indigo-400">Committed</p><p className="font-semibold text-indigo-600 text-lg">{fmt(selected.committed)}</p></div>
            <div className="bg-green-50 rounded-lg p-3"><p className="text-xs text-green-400">Best Case</p><p className="font-semibold text-green-600 text-lg">{fmt(selected.bestCase)}</p></div>
          </div>
          {attainment(selected) != null && <div><p className="text-xs text-gray-400 mb-1">Quota Attainment</p><div className="flex items-center gap-3"><div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${attainment(selected) >= 100 ? 'bg-green-500' : attainment(selected) >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(attainment(selected), 100)}%` }} /></div><span className="text-sm font-medium">{attainment(selected)}%</span></div></div>}
          {selected.notes && <div className="bg-gray-50 rounded-lg p-3"><p className="text-sm text-gray-700">{selected.notes}</p></div>}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <button onClick={() => { openEdit(selected); setShowDetail(false); }} className="btn-primary text-sm">Edit</button>
            <button onClick={() => { setShowAI(true); setShowDetail(false); setAiResult(null); setAiVerb(null); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"><Sparkles className="w-4 h-4" />AI Tools</button>
            <button onClick={() => { setShowDelete(true); setShowDetail(false); }} className="btn-danger text-sm">Delete</button>
            <button onClick={() => setShowDetail(false)} className="btn-secondary text-sm ml-auto">Close</button>
          </div>
        </div>}
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Forecast" size="lg">
        <form onSubmit={handleCreate} className="space-y-4"><FormFields data={formData} onChange={setFormData} /><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Forecast'}</button></div></form>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Forecast" size="lg">
        <form onSubmit={handleEdit} className="space-y-4"><FormFields data={formData} onChange={setFormData} /><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button></div></form>
      </Modal>

      <Modal isOpen={showAI} onClose={() => setShowAI(false)} title={selected ? `AI Tools — ${selected?.period} ${selected?.year}` : 'AI Forecasting Tools'} size="lg">
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

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Forecast" message={`Delete this forecast? This cannot be undone.`} />
    </div>
  );
}
