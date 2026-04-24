import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Route,
  Plus,
  Search,
  Trash2,
  Eye,
  Brain,
  AlertTriangle,
  ArrowUpRight,
  Users,
  Shield,
  Sparkles,
  ArrowLeft,
  X,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react';

const API_BASE = '/api';

const SAMPLE_ESCALATIONS = [
  {
    subject: 'Legal threat - GDPR data deletion request',
    description: 'Customer is threatening legal action claiming GDPR violation. They want all personal data deleted immediately and are requesting a formal data processing report. They\'ve mentioned contacting the Information Commissioner\'s Office if not resolved within 24 hours.',
    customerTier: 'enterprise'
  },
  {
    subject: 'VIP client considering contract cancellation',
    description: 'Our largest enterprise client (Fortune 500, $500K annual contract) is considering canceling due to 3 major outages in the past month. Their CTO has requested an urgent meeting with our VP of Engineering. Multiple teams are affected.',
    customerTier: 'vip'
  },
  {
    subject: 'Simple password reset request',
    description: 'Customer forgot their password and needs help resetting it. They have access to their registered email address. Standard account, no previous issues.',
    customerTier: 'standard'
  },
  {
    subject: 'Security breach - unauthorized account access',
    description: 'Customer reports unauthorized transactions on their account. Someone changed their email and password. They see purchases they didn\'t make totaling $2,300. They\'re extremely upset and demanding immediate account freeze and full investigation.',
    customerTier: 'premium'
  },
  {
    subject: 'Service degradation affecting 500+ users',
    description: 'Enterprise customer reporting widespread performance issues. Their dashboard is loading 10x slower than normal, API responses are timing out, and real-time notifications have stopped working. This is affecting their entire customer support operation with 500+ agents.',
    customerTier: 'enterprise'
  }
];

function AiEscalationRouter() {
  const navigate = useNavigate();
  const [routings, setRoutings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [routing, setRouting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    customerTier: 'standard'
  });
  const [aiResult, setAiResult] = useState(null);

  useEffect(() => {
    loadRoutings();
  }, []);

  const loadRoutings = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai-features/escalation-routings`);
      const data = await res.json();
      setRoutings(data);
    } catch (error) {
      console.error('Failed to load routings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoute = async (e) => {
    e.preventDefault();
    setRouting(true);
    setAiResult(null);

    try {
      const res = await fetch(`${API_BASE}/ai-features/route-escalation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setAiResult(data);
      loadRoutings();
    } catch (error) {
      console.error('Routing failed:', error);
    } finally {
      setRouting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this routing?')) return;

    try {
      await fetch(`${API_BASE}/ai-features/escalation-routings/${id}`, {
        method: 'DELETE'
      });
      loadRoutings();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const filteredRoutings = routings.filter(r =>
    r.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.suggestedTeam?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      case 'angry': return 'text-red-700 bg-red-200';
      default: return 'text-gray-600 bg-gray-100';
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
            <Route className="w-8 h-8 text-red-600" />
            AI Escalation Router
          </h1>
          <p className="text-gray-600 mt-1">Intelligently route escalations to the right team using AI</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Route className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{routings.length}</p>
              <p className="text-sm text-gray-500">Total Routings</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {routings.filter(r => r.shouldEscalate).length}
              </p>
              <p className="text-sm text-gray-500">Escalated</p>
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
                {routings.filter(r => r.urgencyLevel === 'critical' || r.urgencyLevel === 'high').length}
              </p>
              <p className="text-sm text-gray-500">High Priority</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(routings.reduce((acc, r) => acc + r.riskScore, 0) / routings.length * 100 || 0)}%
              </p>
              <p className="text-sm text-gray-500">Avg Risk Score</p>
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
            placeholder="Search routings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <button
          onClick={() => { setShowModal(true); setAiResult(null); setFormData({ subject: '', description: '', customerTier: 'standard' }); }}
          className="btn-primary flex items-center gap-2 bg-red-600 hover:bg-red-700"
        >
          <Plus className="w-5 h-5" />
          New Routing
        </button>
      </div>

      {/* Routings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Subject</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Escalate</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Team</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Urgency</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Sentiment</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Risk</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRoutings.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(item)}
                >
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate font-medium text-gray-900">{item.subject}</div>
                  </td>
                  <td className="px-6 py-4">
                    {item.shouldEscalate ? (
                      <span className="flex items-center gap-1 text-red-600">
                        <CheckCircle className="w-4 h-4" />
                        Yes
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600">
                        <XCircle className="w-4 h-4" />
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {item.suggestedTeam || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(item.urgencyLevel)}`}>
                      {item.urgencyLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSentimentColor(item.customerSentiment)}`}>
                      {item.customerSentiment || 'neutral'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.riskScore >= 0.7 ? 'bg-red-500' :
                            item.riskScore >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${item.riskScore * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{Math.round(item.riskScore * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRowClick(item)}
                        className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
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
        {filteredRoutings.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No routings found. Create one to get started.
          </div>
        )}
      </div>

      {/* New Routing Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-red-600" />
                Route Escalation
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {/* Sample Data Buttons */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Load Sample
                </label>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_ESCALATIONS.map((sample, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData({ subject: sample.subject, description: sample.description, customerTier: sample.customerTier })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors border border-red-200"
                    >
                      <Zap className="w-3 h-3" />
                      {sample.subject.length > 35 ? sample.subject.substring(0, 35) + '...' : sample.subject}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleRoute} className="space-y-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Tier</label>
                  <select
                    value={formData.customerTier}
                    onChange={(e) => setFormData({ ...formData, customerTier: e.target.value })}
                    className="input-field"
                  >
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={routing}
                  className="btn-primary w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700"
                >
                  {routing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      Route Escalation
                    </>
                  )}
                </button>
              </form>

              {/* AI Result Display */}
              {aiResult && (
                <div className="mt-6 p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-red-600" />
                    AI Routing Decision
                  </h3>

                  {/* Escalation Decision */}
                  <div className={`rounded-xl p-6 mb-4 ${
                    aiResult.aiResponse.shouldEscalate
                      ? 'bg-red-100 border-2 border-red-300'
                      : 'bg-green-100 border-2 border-green-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      {aiResult.aiResponse.shouldEscalate ? (
                        <>
                          <ArrowUpRight className="w-8 h-8 text-red-600" />
                          <div>
                            <p className="font-bold text-red-700 text-lg">Escalation Required</p>
                            <p className="text-red-600">This ticket needs immediate escalation</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-8 h-8 text-green-600" />
                          <div>
                            <p className="font-bold text-green-700 text-lg">No Escalation Needed</p>
                            <p className="text-green-600">This ticket can be handled normally</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Suggested Team</p>
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">{aiResult.aiResponse.suggestedTeam || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Urgency Level</p>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(aiResult.aiResponse.urgencyLevel)}`}>
                        {aiResult.aiResponse.urgencyLevel}
                      </span>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Customer Sentiment</p>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(aiResult.aiResponse.customerSentiment)}`}>
                        {aiResult.aiResponse.customerSentiment}
                      </span>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Risk Score</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              aiResult.aiResponse.riskScore >= 0.7 ? 'bg-red-500' :
                              aiResult.aiResponse.riskScore >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${aiResult.aiResponse.riskScore * 100}%` }}
                          />
                        </div>
                        <span className="font-bold">{Math.round(aiResult.aiResponse.riskScore * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  {aiResult.aiResponse.escalationReason && (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-1">Reason</p>
                      <p className="text-gray-800">{aiResult.aiResponse.escalationReason}</p>
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
              <h2 className="text-xl font-bold text-gray-900">Routing Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedItem.subject}</h3>
                <p className="text-gray-600">{selectedItem.description}</p>
              </div>

              {/* Escalation Status */}
              <div className={`rounded-xl p-4 ${
                selectedItem.shouldEscalate
                  ? 'bg-red-100 border-2 border-red-300'
                  : 'bg-green-100 border-2 border-green-300'
              }`}>
                <div className="flex items-center gap-3">
                  {selectedItem.shouldEscalate ? (
                    <>
                      <ArrowUpRight className="w-6 h-6 text-red-600" />
                      <p className="font-bold text-red-700">Escalation Required</p>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <p className="font-bold text-green-700">No Escalation Needed</p>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Suggested Team</p>
                  <span className="font-semibold text-gray-900">{selectedItem.suggestedTeam || 'N/A'}</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Suggested Agent</p>
                  <span className="font-semibold text-gray-900">{selectedItem.suggestedAgent || 'N/A'}</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Urgency Level</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(selectedItem.urgencyLevel)}`}>
                    {selectedItem.urgencyLevel}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Customer Sentiment</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(selectedItem.customerSentiment)}`}>
                    {selectedItem.customerSentiment || 'neutral'}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Risk Score</p>
                  <p className="font-semibold">{Math.round(selectedItem.riskScore * 100)}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Confidence</p>
                  <p className="font-semibold text-green-600">{Math.round(selectedItem.confidence * 100)}%</p>
                </div>
              </div>

              {selectedItem.escalationReason && (
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-600 font-medium mb-1">Escalation Reason</p>
                  <p className="text-gray-800">{selectedItem.escalationReason}</p>
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

export default AiEscalationRouter;
