import { useState, useEffect, useCallback } from 'react';
import { Plus, GitBranch, Sparkles, ChevronRight, Loader2, ArrowUpDown, Percent } from 'lucide-react';
import { crmPipelineStagesApi } from '../../services/crmApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

const AI_VERBS = [
  { key: 'aiOptimize', label: 'Optimize Stage', needsId: true },
  { key: 'aiBottleneck', label: 'Detect Bottleneck', needsId: true },
  { key: 'aiConversionTips', label: 'Suggest Conversion Tips', needsId: true },
  { key: 'aiExitCriteria', label: 'Generate Exit Criteria', needsId: true },
  { key: 'aiPipelineHealth', label: 'Assess Pipeline Health', needsId: false },
  { key: 'aiWinRatePredict', label: 'Predict Win Rate', needsId: true },
  { key: 'aiPipelineGaps', label: 'Identify Pipeline Gaps', needsId: false },
];

const emptyForm = { name: '', description: '', order: 1, winProbability: 0, isActive: true };

export default function CrmPipelineStages() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const res = await crmPipelineStagesApi.list({ page: 1, limit: 100 });
      setItems((res.data || []).sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (e) { toast.error('Failed to load pipeline stages'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmPipelineStagesApi.create({ ...formData, order: Number(formData.order), winProbability: Number(formData.winProbability) }); toast.success('Stage created'); setShowCreate(false); setFormData(emptyForm); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmPipelineStagesApi.update(selected.id, { ...formData, order: Number(formData.order), winProbability: Number(formData.winProbability) }); toast.success('Stage updated'); setShowEdit(false); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await crmPipelineStagesApi.delete(selected.id); toast.success('Stage deleted'); setShowDelete(false); setShowDetail(false); load(); }
    catch (e) { toast.error(e.message); }
  };

  const openEdit = (item) => {
    setFormData({ name: item.name || '', description: item.description || '', order: item.order || 1, winProbability: item.winProbability || 0, isActive: item.isActive !== false });
    setShowEdit(true);
  };

  const runAI = async (verb) => {
    setAiVerb(verb); setAiResult(null); setAiLoading(true);
    try {
      let res;
      if (!verb.needsId) res = await crmPipelineStagesApi[verb.key]();
      else res = await crmPipelineStagesApi[verb.key](selected?.id);
      setAiResult(res.result || res);
    } catch (e) { setAiResult({ error: e.message }); } finally { setAiLoading(false); }
  };

  const FormFields = ({ data, onChange }) => (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Stage Name *</label><input className="input-field" value={data.name} onChange={e => onChange({ ...data, name: e.target.value })} required /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="input-field h-20 resize-none" value={data.description} onChange={e => onChange({ ...data, description: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Order</label><input type="number" min="1" className="input-field" value={data.order} onChange={e => onChange({ ...data, order: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Win Probability (%)</label><input type="number" min="0" max="100" className="input-field" value={data.winProbability} onChange={e => onChange({ ...data, winProbability: e.target.value })} /></div>
      </div>
      <div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={data.isActive} onChange={e => onChange({ ...data, isActive: e.target.checked })} className="checkbox-primary" /><span className="text-sm font-medium text-gray-700">Active</span></label></div>
    </div>
  );

  const stageColors = ['bg-gray-400', 'bg-blue-400', 'bg-yellow-400', 'bg-orange-400', 'bg-green-500', 'bg-red-400'];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><GitBranch className="w-6 h-6 text-indigo-600" />Pipeline Stages</h1><p className="text-gray-500 text-sm mt-1">Configure and optimize your sales pipeline</p></div>
        <div className="flex gap-2">
          <button onClick={() => { setSelected(null); setShowAI(true); setAiVerb(null); setAiResult(null); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"><Sparkles className="w-4 h-4" />Pipeline AI</button>
          <button onClick={() => { setFormData(emptyForm); setShowCreate(true); }} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />New Stage</button>
        </div>
      </div>

      {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div> : (
        <div className="space-y-3">
          {/* Visual pipeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Pipeline Flow</h2>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {items.filter(s => s.isActive !== false).map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-center">
                    <div className={`w-28 py-2 px-3 rounded-lg text-white text-xs font-medium ${stageColors[i % stageColors.length]}`}>{stage.name}</div>
                    <p className="text-xs text-gray-400 mt-1">{stage.winProbability || 0}%</p>
                  </div>
                  {i < items.filter(s => s.isActive !== false).length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Stage list */}
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelected(item); setShowDetail(true); }}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold flex-shrink-0">{item.order}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><p className="font-medium text-gray-900">{item.name}</p>{item.isActive === false && <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">Inactive</span>}</div>
                {item.description && <p className="text-sm text-gray-400 truncate">{item.description}</p>}
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500 flex-shrink-0"><Percent className="w-3.5 h-3.5" />{item.winProbability || 0}% win rate</div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
          ))}
          {items.length === 0 && <div className="bg-white rounded-xl p-8 text-center text-gray-400">No pipeline stages configured</div>}
        </div>
      )}

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Stage Details" size="lg">
        {selected && <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">{selected.order}</div>
            <div><h3 className="text-lg font-semibold">{selected.name}</h3><p className="text-sm text-gray-400">Stage #{selected.order} · {selected.winProbability || 0}% win probability</p></div>
          </div>
          {selected.description && <p className="text-sm text-gray-600">{selected.description}</p>}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <button onClick={() => { openEdit(selected); setShowDetail(false); }} className="btn-primary text-sm">Edit</button>
            <button onClick={() => { setShowAI(true); setShowDetail(false); setAiResult(null); setAiVerb(null); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"><Sparkles className="w-4 h-4" />AI Tools</button>
            <button onClick={() => { setShowDelete(true); setShowDetail(false); }} className="btn-danger text-sm">Delete</button>
            <button onClick={() => setShowDetail(false)} className="btn-secondary text-sm ml-auto">Close</button>
          </div>
        </div>}
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Pipeline Stage" size="lg">
        <form onSubmit={handleCreate} className="space-y-4"><FormFields data={formData} onChange={setFormData} /><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Stage'}</button></div></form>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Stage" size="lg">
        <form onSubmit={handleEdit} className="space-y-4"><FormFields data={formData} onChange={setFormData} /><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button></div></form>
      </Modal>

      <Modal isOpen={showAI} onClose={() => setShowAI(false)} title={selected ? `AI Tools — ${selected?.name}` : 'Pipeline AI Tools'} size="lg">
        <div className="flex gap-4 h-96">
          <div className="w-52 flex-shrink-0 space-y-1 overflow-y-auto">
            {AI_VERBS.map(v => <button key={v.key} onClick={() => runAI(v)} disabled={v.needsId && !selected} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${aiVerb?.key === v.key ? 'bg-purple-100 text-purple-700 font-medium' : 'hover:bg-gray-100 text-gray-700'} disabled:opacity-40 disabled:cursor-not-allowed`}>{v.label}</button>)}
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-y-auto">
            {aiLoading && <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>}
            {!aiLoading && !aiResult && <p className="text-sm text-gray-400 text-center mt-8">Select an AI tool from the left</p>}
            {!aiLoading && aiResult && <pre className="text-xs text-gray-800 whitespace-pre-wrap">{JSON.stringify(aiResult, null, 2)}</pre>}
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Stage" message={`Delete "${selected?.name}"? This cannot be undone.`} />
    </div>
  );
}
