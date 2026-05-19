import { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { aiAdvancedApi } from '../services/api';

const FEATURES = [
  {
    id: 'ticket-priority-predictor',
    title: 'Ticket Priority Predictor',
    desc: 'AI predicts SLA breach risk and adjusts priority automatically.',
    fields: [{ key: 'ticket_id', label: 'Ticket ID', type: 'text' }],
    call: (vals) => aiAdvancedApi.ticketPriorityPredictor(vals.ticket_id),
  },
  {
    id: 'churn-risk',
    title: 'Churn Risk Analyzer',
    desc: 'Score churn likelihood for a customer based on support history.',
    fields: [{ key: 'customer_id', label: 'Customer ID', type: 'text' }],
    call: (vals) => aiAdvancedApi.churnRisk(vals.customer_id),
  },
  {
    id: 'agent-coaching',
    title: 'Agent Coaching',
    desc: 'Quality analysis + coaching feedback on agent ticket replies.',
    fields: [{ key: 'conversation_id', label: 'Ticket / Conversation ID', type: 'text' }],
    call: (vals) => aiAdvancedApi.agentCoaching(vals.conversation_id),
  },
  {
    id: 'smart-canned-suggester',
    title: 'Smart Canned Response Suggester',
    desc: 'Suggest the best canned responses from your library for a ticket.',
    fields: [{ key: 'ticket_id', label: 'Ticket ID', type: 'text' }],
    call: (vals) => aiAdvancedApi.smartCannedSuggester(vals.ticket_id),
  },
  {
    id: 'clv-scoring',
    title: 'Customer Lifetime Value Scoring',
    desc: 'Score a customer for prioritization based on tenure & spend.',
    fields: [{ key: 'customer_id', label: 'Customer ID', type: 'text' }],
    call: (vals) => aiAdvancedApi.clvScoring(vals.customer_id),
  },
  {
    id: 'faq-builder',
    title: 'AI FAQ Builder',
    desc: 'Cluster resolved tickets and auto-draft FAQ entries.',
    fields: [
      { key: 'category_id', label: 'Category ID (optional)', type: 'text' },
      { key: 'limit', label: 'Tickets to analyze', type: 'number', default: 50 },
    ],
    call: (vals) => aiAdvancedApi.faqBuilder({ category_id: vals.category_id || undefined, limit: parseInt(vals.limit) || 50 }),
  },
  {
    id: 'translate',
    title: 'Multilingual Auto-Translate',
    desc: 'Translate customer or agent messages while preserving terminology.',
    fields: [
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'target_language', label: 'Target Language', type: 'text', default: 'en' },
      { key: 'source_language', label: 'Source Language (or auto)', type: 'text', default: 'auto' },
      { key: 'context', label: 'Context (optional)', type: 'text' },
    ],
    call: (vals) => aiAdvancedApi.translate(vals),
  },
  {
    id: 'closure-predictor',
    title: 'Ticket Closure Predictor',
    desc: 'Predict closure likelihood and stalling/auto-close risks.',
    fields: [{ key: 'ticket_id', label: 'Ticket ID', type: 'text' }],
    call: (vals) => aiAdvancedApi.closurePredictor(vals.ticket_id),
  },
  {
    id: 'call-transcript-analyzer',
    title: 'Call Transcript Analyzer',
    desc: 'Summarize and tag a Twilio call transcript; persist as ticket note.',
    fields: [{ key: 'call_id', label: 'Call ID', type: 'text' }],
    call: (vals) => aiAdvancedApi.callTranscriptAnalyzer(vals.call_id),
  },
  {
    id: 'sla-smart-scheduling',
    title: 'SLA Smart Scheduling',
    desc: 'Recommend response/resolution times factoring queue, holidays, calendars.',
    fields: [
      { key: 'ticket_id', label: 'Ticket ID', type: 'text' },
      { key: 'agent_calendars', label: 'Agent Calendars (JSON array)', type: 'textarea' },
      { key: 'holidays', label: 'Holidays (JSON array)', type: 'textarea' },
    ],
    call: (vals) => {
      const parseJson = (v) => { try { return v ? JSON.parse(v) : []; } catch { return []; } };
      return aiAdvancedApi.slaSmartScheduling({
        ticket_id: vals.ticket_id,
        agent_calendars: parseJson(vals.agent_calendars),
        holidays: parseJson(vals.holidays),
      });
    },
  },
  {
    id: 'auto-tag-ticket',
    title: 'Auto-Tag Ticket (Multi-Label)',
    desc: 'Multi-label taxonomic tagging — assigns several tags with confidences (vs. the single-category suggester).',
    fields: [
      { key: 'subject', label: 'Subject', type: 'text' },
      { key: 'description', label: 'Description (optional)', type: 'textarea' },
      { key: 'candidate_tags', label: 'Candidate tag pool (comma-separated, optional)', type: 'text' },
    ],
    call: (vals) => aiAdvancedApi.autoTagTicket({
      subject: vals.subject,
      description: vals.description || undefined,
      candidate_tags: vals.candidate_tags
        ? vals.candidate_tags.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
    }),
  },
  {
    id: 'extract-call-action-items',
    title: 'Extract Call Action Items',
    desc: 'Pull structured action items, owners, and deadlines from a free-text call transcript.',
    fields: [
      { key: 'transcript', label: 'Transcript', type: 'textarea' },
      { key: 'participants', label: 'Participants (comma-separated, optional)', type: 'text' },
    ],
    call: (vals) => aiAdvancedApi.extractCallTranscriptActionItems({
      transcript: vals.transcript,
      participants: vals.participants
        ? vals.participants.split(',').map((p) => p.trim()).filter(Boolean)
        : undefined,
    }),
  },
];

export default function AiAdvancedFeatures() {
  const [expanded, setExpanded] = useState(FEATURES[0].id);
  const [forms, setForms] = useState({});
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const setField = (fid, key, value) => {
    setForms((p) => ({ ...p, [fid]: { ...(p[fid] || {}), [key]: value } }));
  };

  const run = async (feature) => {
    setLoading((p) => ({ ...p, [feature.id]: true }));
    setResults((p) => ({ ...p, [feature.id]: null }));
    try {
      const vals = forms[feature.id] || {};
      // Apply defaults
      for (const f of feature.fields) {
        if ((vals[f.key] === '' || vals[f.key] === undefined) && f.default !== undefined) {
          vals[f.key] = f.default;
        }
      }
      const data = await feature.call(vals);
      setResults((p) => ({ ...p, [feature.id]: data }));
    } catch (err) {
      setResults((p) => ({ ...p, [feature.id]: { error: err.message } }));
    } finally {
      setLoading((p) => ({ ...p, [feature.id]: false }));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Sparkles className="text-indigo-600" size={32} />
        <div>
          <h1 className="text-2xl font-bold">AI Advanced Features</h1>
          <p className="text-gray-600">Specialized AI advisors covering churn, scheduling, translation, and more.</p>
        </div>
      </div>

      <div className="grid gap-3">
        {FEATURES.map((feature) => {
          const isOpen = expanded === feature.id;
          const isLoading = loading[feature.id];
          const result = results[feature.id];
          return (
            <div key={feature.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <button
                className="w-full text-left px-4 py-3 flex items-center justify-between"
                onClick={() => setExpanded(isOpen ? null : feature.id)}
              >
                <div>
                  <div className="font-semibold text-gray-900">{feature.title}</div>
                  <div className="text-sm text-gray-600">{feature.desc}</div>
                </div>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="grid gap-3 mt-3 md:grid-cols-2">
                    {feature.fields.map((f) => (
                      <div key={f.key}>
                        <label className="block text-sm text-gray-700 mb-1">{f.label}</label>
                        {f.type === 'textarea' ? (
                          <textarea
                            className="w-full border border-gray-300 rounded p-2 font-mono text-xs"
                            rows={3}
                            value={(forms[feature.id] || {})[f.key] ?? f.default ?? ''}
                            onChange={(e) => setField(feature.id, f.key, e.target.value)}
                          />
                        ) : (
                          <input
                            type={f.type}
                            className="w-full border border-gray-300 rounded p-2"
                            value={(forms[feature.id] || {})[f.key] ?? f.default ?? ''}
                            onChange={(e) => setField(feature.id, f.key, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    className="mt-3 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                    onClick={() => run(feature)}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    {isLoading ? 'Running...' : 'Run AI Analysis'}
                  </button>

                  {result && result.error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded flex items-start gap-2">
                      <AlertTriangle size={18} />
                      <div>{result.error}</div>
                    </div>
                  )}
                  {result && !result.error && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
