import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Plus,
  Search,
  Trash2,
  Eye,
  Brain,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  X,
  MessageSquare,
  Zap
} from 'lucide-react';

const API_BASE = '/api';

const SAMPLE_RESPONSES = [
  {
    label: 'Excellent response',
    text: 'Thank you for reaching out about the billing discrepancy on your account! I\'ve thoroughly reviewed your account history and found that the duplicate charge of $49.99 on January 15th was indeed an error on our end. I\'ve already initiated a full refund, which should appear in your account within 3-5 business days. I\'ve also added a $10 credit to your account as an apology for the inconvenience. If you have any other questions, please don\'t hesitate to reach out. We truly value your business!'
  },
  {
    label: 'Poor response',
    text: 'idk try turning it off and on again. if that doesnt work just clear ur cache or something. let me know if u need anything else i guess.'
  },
  {
    label: 'Average response',
    text: 'Hi, I see you\'re having an issue with your export feature. Please try using a different browser. If the problem persists, please contact us again.'
  },
  {
    label: 'Technical response',
    text: 'I understand you\'re experiencing 429 rate limit errors during peak hours. Based on your Business plan, you have a limit of 10,000 requests/hour. I recommend implementing exponential backoff with jitter in your integration, queuing non-urgent requests for off-peak processing, and consider upgrading to our Enterprise plan which offers 50,000 requests/hour. I\'ve also temporarily increased your rate limit by 20% while we work on a permanent solution. Here\'s our rate limiting best practices doc: [link]. Would you like me to schedule a call with our integration team?'
  },
  {
    label: 'Empathetic response',
    text: 'I completely understand how frustrating it must be to be locked out of your account, especially right before an important client presentation. I\'ve immediately unlocked your account and verified that your new password is working correctly. The lockout was triggered by our security system due to multiple login attempts. To prevent this in the future, I recommend enabling two-factor authentication. Is there anything else I can help you with to prepare for your presentation?'
  }
];

function AiQualityScorer() {
  const navigate = useNavigate();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [scoring, setScoring] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [responseText, setResponseText] = useState('');
  const [aiResult, setAiResult] = useState(null);

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai-features/quality-scores`);
      const data = await res.json();
      setScores(data);
    } catch (error) {
      console.error('Failed to load scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScore = async (e) => {
    e.preventDefault();
    setScoring(true);
    setAiResult(null);

    try {
      const res = await fetch(`${API_BASE}/ai-features/score-quality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseText })
      });
      const data = await res.json();
      setAiResult(data);
      loadScores();
    } catch (error) {
      console.error('Scoring failed:', error);
    } finally {
      setScoring(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this score?')) return;

    try {
      await fetch(`${API_BASE}/ai-features/quality-scores/${id}`, {
        method: 'DELETE'
      });
      loadScores();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const filteredScores = scores.filter(s =>
    s.feedback?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    if (score >= 4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreGradient = (score) => {
    if (score >= 8) return 'from-green-500 to-emerald-500';
    if (score >= 6) return 'from-yellow-500 to-amber-500';
    if (score >= 4) return 'from-orange-500 to-red-400';
    return 'from-red-500 to-red-600';
  };

  const avgScore = scores.length > 0
    ? scores.reduce((acc, s) => acc + s.overallScore, 0) / scores.length
    : 0;

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
            <Star className="w-8 h-8 text-yellow-500" />
            AI Quality Scorer
          </h1>
          <p className="text-gray-600 mt-1">Evaluate and score support response quality using AI</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{scores.length}</p>
              <p className="text-sm text-gray-500">Total Scores</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avgScore.toFixed(1)}/10</p>
              <p className="text-sm text-gray-500">Average Score</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {scores.filter(s => s.overallScore >= 8).length}
              </p>
              <p className="text-sm text-gray-500">Excellent (8+)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {scores.filter(s => s.overallScore < 6).length}
              </p>
              <p className="text-sm text-gray-500">Needs Improvement</p>
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
            placeholder="Search scores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <button
          onClick={() => { setShowModal(true); setAiResult(null); setResponseText(''); }}
          className="btn-primary flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600"
        >
          <Plus className="w-5 h-5" />
          Score Response
        </button>
      </div>

      {/* Scores Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Overall</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Clarity</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Helpfulness</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Professional</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Complete</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Feedback</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredScores.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(item)}
                >
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${getScoreColor(item.overallScore)}`}>
                      {item.overallScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium">{item.clarityScore.toFixed(1)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium">{item.helpfulnessScore.toFixed(1)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium">{item.professionalismScore.toFixed(1)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium">{item.completenessScore.toFixed(1)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate text-gray-600">{item.feedback}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRowClick(item)}
                        className="p-2 hover:bg-yellow-100 rounded-lg text-yellow-600 transition-colors"
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
        {filteredScores.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No scores found. Create one to get started.
          </div>
        )}
      </div>

      {/* New Score Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-500" />
                Score Response Quality
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
                  {SAMPLE_RESPONSES.map((sample, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setResponseText(sample.text)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-100 transition-colors border border-yellow-200"
                    >
                      <Zap className="w-3 h-3" />
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleScore} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Response to Evaluate
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Paste the support response you want to evaluate..."
                    rows={6}
                    className="input-field"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={scoring}
                  className="btn-primary w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600"
                >
                  {scoring ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      Score Quality
                    </>
                  )}
                </button>
              </form>

              {/* AI Result Display */}
              {aiResult && (
                <div className="mt-6 p-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-yellow-600" />
                    Quality Analysis Result
                  </h3>

                  {/* Overall Score Display */}
                  <div className={`bg-gradient-to-r ${getScoreGradient(aiResult.aiResponse.overallScore)} rounded-xl p-6 text-white mb-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/80 text-sm">Overall Score</p>
                        <p className="text-4xl font-bold">{aiResult.aiResponse.overallScore.toFixed(1)}/10</p>
                      </div>
                      <Star className="w-16 h-16 text-white/30" />
                    </div>
                  </div>

                  {/* Individual Scores */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Clarity', score: aiResult.aiResponse.clarityScore },
                      { label: 'Helpfulness', score: aiResult.aiResponse.helpfulnessScore },
                      { label: 'Professionalism', score: aiResult.aiResponse.professionalismScore },
                      { label: 'Completeness', score: aiResult.aiResponse.completenessScore },
                    ].map((item, i) => (
                      <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-gray-500">{item.label}</p>
                          <span className="font-bold text-gray-900">{item.score.toFixed(1)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${getScoreGradient(item.score)}`}
                            style={{ width: `${item.score * 10}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Feedback */}
                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <p className="text-sm text-gray-500 mb-1">Feedback</p>
                    <p className="text-gray-800">{aiResult.aiResponse.feedback}</p>
                  </div>

                  {/* Improvements */}
                  {aiResult.aiResponse.improvements?.length > 0 && (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-2">Suggested Improvements</p>
                      <ul className="space-y-2">
                        {aiResult.aiResponse.improvements.map((improvement, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700">
                            <span className="text-yellow-500 mt-1">•</span>
                            {improvement}
                          </li>
                        ))}
                      </ul>
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
              <h2 className="text-xl font-bold text-gray-900">Score Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Overall Score Display */}
              <div className={`bg-gradient-to-r ${getScoreGradient(selectedItem.overallScore)} rounded-xl p-6 text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Overall Score</p>
                    <p className="text-4xl font-bold">{selectedItem.overallScore.toFixed(1)}/10</p>
                  </div>
                  <Star className="w-16 h-16 text-white/30" />
                </div>
              </div>

              {/* Individual Scores */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Clarity', score: selectedItem.clarityScore },
                  { label: 'Helpfulness', score: selectedItem.helpfulnessScore },
                  { label: 'Professionalism', score: selectedItem.professionalismScore },
                  { label: 'Completeness', score: selectedItem.completenessScore },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-500">{item.label}</p>
                      <span className={`px-2 py-1 rounded text-sm font-bold ${getScoreColor(item.score)}`}>
                        {item.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${getScoreGradient(item.score)}`}
                        style={{ width: `${item.score * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Feedback */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-yellow-600 font-medium mb-1">AI Feedback</p>
                <p className="text-gray-800">{selectedItem.feedback}</p>
              </div>

              {/* Improvements */}
              {selectedItem.improvements?.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-2">Suggested Improvements</p>
                  <ul className="space-y-2">
                    {selectedItem.improvements.map((improvement, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700">
                        <span className="text-yellow-500 mt-1">•</span>
                        {improvement}
                      </li>
                    ))}
                  </ul>
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

export default AiQualityScorer;
