import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tags,
  Plus,
  Search,
  Trash2,
  Eye,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  X,
  Zap,
  ChevronDown
} from 'lucide-react';

const API_BASE = '/api';

const SAMPLE_TICKETS = [
  {
    subject: 'Login page shows 500 error after update',
    description: 'When I try to log in to my account, the page shows a 500 internal server error. This started happening right after the latest update was deployed yesterday. I\'ve cleared my cache and tried different browsers but the issue persists. This is blocking my entire team from accessing the dashboard.'
  },
  {
    subject: 'Request for bulk enterprise pricing',
    description: 'We\'re a Fortune 500 company interested in purchasing 500+ licenses for our entire customer support organization. Can you provide enterprise pricing details? We also need information about SSO integration, dedicated support, and SLA guarantees.'
  },
  {
    subject: 'Mobile app crashes on iOS 17',
    description: 'The mobile app keeps crashing immediately when I try to open the settings page on iOS 17.2. I\'ve tried reinstalling the app, restarting my phone, and updating to the latest app version but nothing works. iPhone 15 Pro, iOS 17.2.'
  },
  {
    subject: 'Billing charged twice for monthly subscription',
    description: 'I was charged twice ($49.99 each) for my monthly subscription on January 15th. Transaction IDs: TXN-89234 and TXN-89237. I need an immediate refund for the duplicate charge. This has happened before and I\'m very frustrated.'
  },
  {
    subject: 'How to integrate API with Salesforce',
    description: 'We want to integrate your API with our Salesforce CRM to automatically sync customer tickets. Can you provide documentation on webhooks, API rate limits, and best practices for real-time data syncing?'
  }
];

function AiTicketClassifier() {
  const navigate = useNavigate();
  const [classifications, setClassifications] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    ticketId: ''
  });
  const [aiResult, setAiResult] = useState(null);

  useEffect(() => {
    loadClassifications();
    loadTickets();
  }, []);

  const loadClassifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai-features/classifications`);
      const data = await res.json();
      setClassifications(data);
    } catch (error) {
      console.error('Failed to load classifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/tickets`);
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : data.tickets || []);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    }
  };

  const handleClassify = async (e) => {
    e.preventDefault();
    setClassifying(true);
    setAiResult(null);

    try {
      const res = await fetch(`${API_BASE}/ai-features/classify-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setAiResult(data);
      loadClassifications();
    } catch (error) {
      console.error('Classification failed:', error);
    } finally {
      setClassifying(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this classification?')) return;

    try {
      await fetch(`${API_BASE}/ai-features/classifications/${id}`, {
        method: 'DELETE'
      });
      loadClassifications();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleTicketSelect = (ticketId) => {
    if (!ticketId) {
      setFormData({ ...formData, ticketId: '' });
      return;
    }
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      setFormData({
        subject: ticket.subject,
        description: ticket.description || ticket.subject,
        ticketId: ticket.id
      });
    }
  };

  const handleLoadSample = (sample) => {
    setFormData({
      subject: sample.subject,
      description: sample.description,
      ticketId: ''
    });
  };

  const filteredClassifications = classifications.filter(c =>
    c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.suggestedCategory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Tags className="w-8 h-8 text-indigo-600" />
            AI Ticket Classifier
          </h1>
          <p className="text-gray-600 mt-1">Automatically classify and categorize support tickets using AI</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{classifications.length}</p>
              <p className="text-sm text-gray-500">Total Classifications</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(classifications.reduce((acc, c) => acc + c.confidence, 0) / classifications.length * 100 || 0)}%
              </p>
              <p className="text-sm text-gray-500">Avg Confidence</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {classifications.filter(c => c.suggestedPriority === 'urgent' || c.suggestedPriority === 'high').length}
              </p>
              <p className="text-sm text-gray-500">High Priority</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(classifications.reduce((acc, c) => acc + c.urgencyScore, 0) / classifications.length || 0)}/10
              </p>
              <p className="text-sm text-gray-500">Avg Urgency</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search classifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <button
          onClick={() => { setShowModal(true); setAiResult(null); setFormData({ subject: '', description: '', ticketId: '' }); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Classification
        </button>
      </div>

      {/* Classifications Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Subject</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Category</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Priority</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Sentiment</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Confidence</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Urgency</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClassifications.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(item)}
                >
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate font-medium text-gray-900">{item.subject}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                      {item.suggestedCategory}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.suggestedPriority)}`}>
                      {item.suggestedPriority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSentimentColor(item.sentiment)}`}>
                      {item.sentiment || 'neutral'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${item.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{Math.round(item.confidence * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">{item.urgencyScore}/10</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRowClick(item)}
                        className="p-2 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredClassifications.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No classifications found. Create one to get started.
          </div>
        )}
      </div>

      {/* New Classification Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-indigo-600" />
                Classify New Ticket
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {/* Ticket Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Existing Ticket (optional)
                </label>
                <div className="relative">
                  <select
                    value={formData.ticketId}
                    onChange={(e) => handleTicketSelect(e.target.value)}
                    className="input-field appearance-none pr-10"
                  >
                    <option value="">-- Choose a ticket or enter manually --</option>
                    {tickets.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        #{ticket.id.slice(0, 8)} - {ticket.subject} [{ticket.status}]
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Sample Data Buttons */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Load Sample
                </label>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_TICKETS.map((sample, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleLoadSample(sample)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors border border-indigo-200"
                    >
                      <Zap className="w-3 h-3" />
                      {sample.subject.length > 35 ? sample.subject.substring(0, 35) + '...' : sample.subject}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleClassify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Enter ticket subject..."
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the issue in detail..."
                    rows={4}
                    className="input-field"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={classifying}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {classifying ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Classifying with AI...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      Classify Ticket
                    </>
                  )}
                </button>
              </form>

              {/* AI Result Display */}
              {aiResult && (
                <div className="mt-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    AI Classification Result
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Category</p>
                      <p className="font-semibold text-indigo-600">{aiResult.aiResponse.suggestedCategory}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Priority</p>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(aiResult.aiResponse.suggestedPriority)}`}>
                        {aiResult.aiResponse.suggestedPriority}
                      </span>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Sentiment</p>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(aiResult.aiResponse.sentiment)}`}>
                        {aiResult.aiResponse.sentiment}
                      </span>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Confidence</p>
                      <p className="font-semibold text-green-600">{Math.round(aiResult.aiResponse.confidence * 100)}%</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Urgency Score</p>
                      <p className="font-semibold text-orange-600">{aiResult.aiResponse.urgencyScore}/10</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {aiResult.aiResponse.suggestedTags?.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {aiResult.aiResponse.reasoning && (
                    <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">AI Reasoning</p>
                      <p className="text-gray-700">{aiResult.aiResponse.reasoning}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Classification Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedItem.subject}</h3>
                <p className="text-gray-600">{selectedItem.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Category</p>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
                    {selectedItem.suggestedCategory}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Priority</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedItem.suggestedPriority)}`}>
                    {selectedItem.suggestedPriority}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Sentiment</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(selectedItem.sentiment)}`}>
                    {selectedItem.sentiment || 'neutral'}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Confidence</p>
                  <p className="font-semibold text-green-600">{Math.round(selectedItem.confidence * 100)}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Urgency Score</p>
                  <p className="font-semibold text-orange-600">{selectedItem.urgencyScore}/10</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Suggested Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedItem.suggestedTags?.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              {selectedItem.reasoning && (
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm text-indigo-600 font-medium mb-1">AI Reasoning</p>
                  <p className="text-gray-700">{selectedItem.reasoning}</p>
                </div>
              )}

              <div className="text-sm text-gray-500">
                Created: {new Date(selectedItem.createdAt).toLocaleString()}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(selectedItem.id)}
                  className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AiTicketClassifier;
