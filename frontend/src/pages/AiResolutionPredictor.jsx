import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb,
  Plus,
  Search,
  Trash2,
  Eye,
  Brain,
  Clock,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
  X,
  ListChecks,
  Zap,
  ChevronDown
} from 'lucide-react';

const API_BASE = '/api';

const SAMPLE_TICKETS = [
  {
    subject: 'Payment not processed - Order #12345',
    description: 'I made a payment 3 days ago but it still shows as pending. Order #12345. My credit card was charged $149.99 but the order status hasn\'t updated. I need this resolved ASAP as it\'s a gift for my daughter\'s birthday this weekend.'
  },
  {
    subject: 'Feature request: Dark mode for dashboard',
    description: 'Would love to have a dark mode option in the dashboard. Many users in our organization work late hours and the bright interface causes eye strain. We have 200+ active users who have requested this feature.'
  },
  {
    subject: 'Cannot export data to CSV',
    description: 'When I click the export button on the reports page, nothing happens. I\'ve tried different browsers (Chrome 120, Firefox 121, Safari 17) and cleared cache. The console shows a 403 error. I need to export our Q4 report by end of week.'
  },
  {
    subject: 'Account locked after password reset',
    description: 'I reset my password using the forgot password link, set a new password successfully, but now my account is locked. The error says "Account temporarily disabled." I\'ve been locked out for 2 hours and I have an urgent client presentation.'
  },
  {
    subject: 'API rate limiting causing data sync failures',
    description: 'Our integration is hitting API rate limits during peak hours (9-11 AM EST). We\'re getting 429 errors on roughly 30% of requests. This is causing data sync failures between our CRM and your platform. We\'re on the Business plan with 10,000 requests/hour limit.'
  }
];

function AiResolutionPredictor() {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    ticketId: ''
  });
  const [aiResult, setAiResult] = useState(null);

  useEffect(() => {
    loadPredictions();
    loadTickets();
  }, []);

  const loadPredictions = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai-features/predictions`);
      const data = await res.json();
      setPredictions(data);
    } catch (error) {
      console.error('Failed to load predictions:', error);
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

  const handlePredict = async (e) => {
    e.preventDefault();
    setPredicting(true);
    setAiResult(null);

    try {
      const res = await fetch(`${API_BASE}/ai-features/predict-resolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setAiResult(data);
      loadPredictions();
    } catch (error) {
      console.error('Prediction failed:', error);
    } finally {
      setPredicting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this prediction?')) return;

    try {
      await fetch(`${API_BASE}/ai-features/predictions/${id}`, {
        method: 'DELETE'
      });
      loadPredictions();
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

  const filteredPredictions = predictions.filter(p =>
    p.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.predictedResolution.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOutcomeColor = (outcome) => {
    switch (outcome) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'escalation_needed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (hours) => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${Math.round(hours)} hr`;
    return `${Math.round(hours / 24)} days`;
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
            <Lightbulb className="w-8 h-8 text-amber-500" />
            AI Resolution Predictor
          </h1>
          <p className="text-gray-600 mt-1">Predict ticket resolutions and estimated time using AI</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{predictions.length}</p>
              <p className="text-sm text-gray-500">Total Predictions</p>
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
                {predictions.filter(p => p.predictedOutcome === 'success').length}
              </p>
              <p className="text-sm text-gray-500">Success Predicted</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatTime(predictions.reduce((acc, p) => acc + p.estimatedTimeHours, 0) / predictions.length || 0)}
              </p>
              <p className="text-sm text-gray-500">Avg Resolution Time</p>
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
                {predictions.filter(p => p.predictedOutcome === 'escalation_needed').length}
              </p>
              <p className="text-sm text-gray-500">Needs Escalation</p>
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
            placeholder="Search predictions..."
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
          New Prediction
        </button>
      </div>

      {/* Predictions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Subject</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Predicted Resolution</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Est. Time</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Outcome</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Confidence</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Steps</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPredictions.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(item)}
                >
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate font-medium text-gray-900">{item.subject}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-sm truncate text-gray-600">{item.predictedResolution}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{formatTime(item.estimatedTimeHours)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOutcomeColor(item.predictedOutcome)}`}>
                      {item.predictedOutcome?.replace('_', ' ') || 'success'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${item.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{Math.round(item.confidence * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-600">{item.suggestedSteps?.length || 0} steps</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRowClick(item)}
                        className="p-2 hover:bg-amber-100 rounded-lg text-amber-600 transition-colors"
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
        {filteredPredictions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No predictions found. Create one to get started.
          </div>
        )}
      </div>

      {/* New Prediction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-500" />
                Predict Resolution
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
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors border border-amber-200"
                    >
                      <Zap className="w-3 h-3" />
                      {sample.subject.length > 35 ? sample.subject.substring(0, 35) + '...' : sample.subject}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handlePredict} className="space-y-4">
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
                  disabled={predicting}
                  className="btn-primary w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600"
                >
                  {predicting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Predicting with AI...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      Predict Resolution
                    </>
                  )}
                </button>
              </form>

              {/* AI Result Display */}
              {aiResult && (
                <div className="mt-6 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    AI Prediction Result
                  </h3>

                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <p className="text-sm text-gray-500 mb-1">Predicted Resolution</p>
                    <p className="text-gray-800">{aiResult.aiResponse.predictedResolution}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Est. Time</p>
                      <p className="font-semibold text-blue-600">{formatTime(aiResult.aiResponse.estimatedTimeHours)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Outcome</p>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getOutcomeColor(aiResult.aiResponse.predictedOutcome)}`}>
                        {aiResult.aiResponse.predictedOutcome?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Confidence</p>
                      <p className="font-semibold text-green-600">{Math.round(aiResult.aiResponse.confidence * 100)}%</p>
                    </div>
                  </div>

                  {aiResult.aiResponse.suggestedSteps?.length > 0 && (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                        <ListChecks className="w-4 h-4" />
                        Suggested Steps
                      </p>
                      <ol className="list-decimal list-inside space-y-2">
                        {aiResult.aiResponse.suggestedSteps.map((step, i) => (
                          <li key={i} className="text-gray-700">{step}</li>
                        ))}
                      </ol>
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
              <h2 className="text-xl font-bold text-gray-900">Prediction Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedItem.subject}</h3>
                <p className="text-gray-600">{selectedItem.description}</p>
              </div>

              <div className="bg-amber-50 rounded-lg p-4">
                <p className="text-sm text-amber-600 font-medium mb-1">Predicted Resolution</p>
                <p className="text-gray-800">{selectedItem.predictedResolution}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Estimated Time</p>
                  <p className="font-semibold text-blue-600">{formatTime(selectedItem.estimatedTimeHours)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Predicted Outcome</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getOutcomeColor(selectedItem.predictedOutcome)}`}>
                    {selectedItem.predictedOutcome?.replace('_', ' ') || 'success'}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Confidence</p>
                  <p className="font-semibold text-green-600">{Math.round(selectedItem.confidence * 100)}%</p>
                </div>
              </div>

              {selectedItem.suggestedSteps?.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    Suggested Resolution Steps
                  </p>
                  <ol className="list-decimal list-inside space-y-2">
                    {selectedItem.suggestedSteps.map((step, i) => (
                      <li key={i} className="text-gray-700">{step}</li>
                    ))}
                  </ol>
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

export default AiResolutionPredictor;
