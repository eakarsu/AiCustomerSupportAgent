import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, FileText, DollarSign, Sparkles, ChevronRight, Loader2, Download, Send, CheckCircle, XCircle } from 'lucide-react';
import { crmQuotesApi } from '../../services/crmApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';

const STATUS_COLORS = { draft: 'bg-gray-100 text-gray-700', sent: 'bg-blue-100 text-blue-800', accepted: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', expired: 'bg-yellow-100 text-yellow-800' };

const AI_VERBS = [
  { key: 'aiGenerateQuote', label: 'Generate Quote' },
  { key: 'aiOptimizePricing', label: 'Optimize Pricing' },
  { key: 'aiWinProbability', label: 'Predict Win Probability' },
  { key: 'aiDiscountSuggest', label: 'Suggest Discount' },
  { key: 'aiExecutiveSummary', label: 'Generate Executive Summary' },
  { key: 'aiCompetitorPricing', label: 'Analyze Competitor Pricing' },
  { key: 'aiRiskFlags', label: 'Flag Quote Risks' },
  { key: 'aiPersonalize', label: 'Personalize Quote' },
  { key: 'aiCoverLetter', label: 'Generate Cover Letter' },
  { key: 'aiUpsellItems', label: 'Suggest Upsell Items' },
  { key: 'aiNegotiationRange', label: 'Suggest Negotiation Range' },
  { key: 'aiExpiryOptimal', label: 'Suggest Optimal Expiry' },
  { key: 'aiLineItemNarrative', label: 'Generate Line Item Narrative' },
  { key: 'aiCloseScript', label: 'Generate Closing Script' },
  { key: 'aiRejectReasons', label: 'Analyze Rejection Reasons' },
  { key: 'aiContractDraft', label: 'Draft Contract Terms' },
];

const emptyForm = { title: '', totalAmount: '', currency: 'USD', status: 'draft', validUntil: '', opportunityId: '', contactId: '', notes: '', lineItems: '' };

export default function CrmQuotes() {
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
      if (search.trim()) res = await crmQuotesApi.search({ q: search, page, limit: 20 });
      else res = await crmQuotesApi.list(params);
      setItems(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (e) { toast.error('Failed to load quotes'); }
    finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmQuotesApi.create({ ...formData, totalAmount: formData.totalAmount ? Number(formData.totalAmount) : undefined }); toast.success('Quote created'); setShowCreate(false); setFormData(emptyForm); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try { setSaving(true); await crmQuotesApi.update(selected.id, { ...formData, totalAmount: formData.totalAmount ? Number(formData.totalAmount) : undefined }); toast.success('Quote updated'); setShowEdit(false); load(); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await crmQuotesApi.delete(selected.id); toast.success('Quote deleted'); setShowDelete(false); setShowDetail(false); load(); }
    catch (e) { toast.error(e.message); }
  };

  const sendQuote = async (item) => {
    try { await crmQuotesApi.send(item.id); toast.success('Quote sent'); load(); }
    catch (e) { toast.error(e.message); }
  };

  const acceptQuote = async (item) => {
    try { await crmQuotesApi.accept(item.id); toast.success('Quote accepted'); load(); }
    catch (e) { toast.error(e.message); }
  };

  const openEdit = (item) => {
    setFormData({ title: item.title || '', totalAmount: item.totalAmount || '', currency: item.currency || 'USD', status: item.status || 'draft', validUntil: item.validUntil ? item.validUntil.split('T')[0] : '', opportunityId: item.opportunityId || '', contactId: item.contactId || '', notes: item.notes || '', lineItems: item.lineItems ? JSON.stringify(item.lineItems, null, 2) : '' });
    setShowEdit(true);
  };

  const runAI = async (verb) => {
    setAiVerb(verb); setAiResult(null); setAiLoading(true);
    try {
      let res;
      if (verb.key === 'aiGenerateQuote') res = await crmQuotesApi[verb.key]({ id: selected?.id });
      else res = await crmQuotesApi[verb.key](selected?.id);
      setAiResult(res.result || res);
    } catch (e) { setAiResult({ error: e.message }); } finally { setAiLoading(false); }
  };

  const exportCsv = async () => {
    try { const blob = await crmQuotesApi.exportCsv(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'crm_quotes.csv'; a.click(); URL.revokeObjectURL(url); toast.success('CSV exported'); }
    catch (e) { toast.error('Export failed'); }
  };

  const FormFields = ({ data, onChange }) => (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Quote Title *</label><input className="input-field" value={data.title} onChange={e => onChange({ ...data, title: e.target.value })} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label><input type="number" className="input-field" value={data.totalAmount} onChange={e => onChange({ ...data, totalAmount: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select className="input-field" value={data.currency} onChange={e => onChange({ ...data, currency: e.target.value })}>
            <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="CAD">CAD</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="input-field" value={data.status} onChange={e => onChange({ ...data, status: e.target.value })}>
            <option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="expired">Expired</option>
          </select>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label><input type="date" className="input-field" value={data.validUntil} onChange={e => onChange({ ...data, validUntil: e.target.value })} /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea className="input-field h-20 resize-none" value={data.notes} onChange={e => onChange({ ...data, notes: e.target.value })} /></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FileText className="w-6 h-6 text-indigo-600" />CRM Quotes</h1><p className="text-gray-500 text-sm mt-1">Manage proposals and quotes with AI pricing</p></div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-secondary flex items-center gap-1 text-sm"><Download className="w-4 h-4" /><span className="hidden sm:inline">CSV</span></button>
          <button onClick={() => { setFormData(emptyForm); setShowCreate(true); }} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />New Quote</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="input-field pl-10" placeholder="Search quotes..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select className="input-field sm:w-36" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="expired">Expired</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-left text-xs font-medium text-gray-600">Quote</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600">Status</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden md:table-cell">Amount</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden lg:table-cell">Valid Until</th>
                <th className="p-4 text-left text-xs font-medium text-gray-600 hidden lg:table-cell">Actions</th>
                <th className="p-4"></th>
              </tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 cursor-pointer" onClick={() => { setSelected(item); setShowDetail(true); }}><div className="flex items-center gap-3"><div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4 text-amber-600" /></div><p className="font-medium text-gray-900 text-sm">{item.title}</p></div></td>
                    <td className="p-4 cursor-pointer" onClick={() => { setSelected(item); setShowDetail(true); }}><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100'}`}>{item.status}</span></td>
                    <td className="p-4 hidden md:table-cell cursor-pointer text-sm font-medium text-green-600" onClick={() => { setSelected(item); setShowDetail(true); }}>{item.totalAmount ? `${item.currency || 'USD'} ${Number(item.totalAmount).toLocaleString()}` : '—'}</td>
                    <td className="p-4 hidden lg:table-cell cursor-pointer text-sm text-gray-500" onClick={() => { setSelected(item); setShowDetail(true); }}>{item.validUntil ? new Date(item.validUntil).toLocaleDateString() : '—'}</td>
                    <td className="p-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        {item.status === 'draft' && <button onClick={() => sendQuote(item)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Send"><Send className="w-3.5 h-3.5" /></button>}
                        {item.status === 'sent' && <button onClick={() => acceptQuote(item)} className="p-1.5 hover:bg-green-50 rounded text-green-600" title="Mark Accepted"><CheckCircle className="w-3.5 h-3.5" /></button>}
                      </div>
                    </td>
                    <td className="p-4 cursor-pointer" onClick={() => { setSelected(item); setShowDetail(true); }}><ChevronRight className="w-4 h-4 text-gray-400" /></td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No quotes found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={setPage} onLimitChange={() => {}} />
      </div>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Quote Details" size="lg">
        {selected && <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center"><FileText className="w-6 h-6 text-amber-600" /></div>
            <div><h3 className="font-semibold text-gray-900 text-lg">{selected.title}</h3><span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status] || 'bg-gray-100'}`}>{selected.status}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {selected.totalAmount != null && <div><p className="text-xs text-gray-400">Total Amount</p><p className="font-semibold text-green-600 text-xl">{selected.currency || 'USD'} {Number(selected.totalAmount).toLocaleString()}</p></div>}
            {selected.validUntil && <div><p className="text-xs text-gray-400">Valid Until</p><p className="font-medium">{new Date(selected.validUntil).toLocaleDateString()}</p></div>}
          </div>
          {selected.notes && <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400 mb-1">Notes</p><p className="text-sm text-gray-700">{selected.notes}</p></div>}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <button onClick={() => { openEdit(selected); setShowDetail(false); }} className="btn-primary text-sm">Edit</button>
            {selected.status === 'draft' && <button onClick={() => { sendQuote(selected); setShowDetail(false); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"><Send className="w-4 h-4" />Send</button>}
            <button onClick={() => { setShowAI(true); setShowDetail(false); setAiResult(null); setAiVerb(null); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"><Sparkles className="w-4 h-4" />AI Tools</button>
            <button onClick={() => { setShowDelete(true); setShowDetail(false); }} className="btn-danger text-sm">Delete</button>
            <button onClick={() => setShowDetail(false)} className="btn-secondary text-sm ml-auto">Close</button>
          </div>
        </div>}
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Quote" size="lg">
        <form onSubmit={handleCreate} className="space-y-4"><FormFields data={formData} onChange={setFormData} /><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Quote'}</button></div></form>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Quote" size="lg">
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

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Quote" message={`Delete "${selected?.title}"? This cannot be undone.`} />
    </div>
  );
}
