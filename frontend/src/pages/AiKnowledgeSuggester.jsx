import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Eye,
  Brain,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Sparkles,
  ArrowLeft,
  X,
  ExternalLink,
  Zap
} from 'lucide-react';

const API_BASE = '/api';

const SAMPLE_QUERIES = [
  'How do I reset my password if I no longer have access to my email?',
  'What are the system requirements for the desktop application?',
  'How to configure SSO integration with Azure Active Directory?',
  'What is your refund policy for annual subscriptions?',
  'How to set up automated ticket routing based on keywords?',
  'Can I export my data in bulk? What formats are supported?'
];

function AiKnowledgeSuggester() {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [suggesting, setSuggesting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState('');
  const [aiResult, setAiResult] = useState(null);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai-features/knowledge-suggestions`);
      const data = await res.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = async (e) => {
    e.preventDefault();
    setSuggesting(true);
    setAiResult(null);

    try {
      const res = await fetch(`${API_BASE}/ai-features/suggest-knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      setAiResult(data);
      loadSuggestions();
    } catch (error) {
      console.error('Suggestion failed:', error);
    } finally {
      setSuggesting(false);
    }
  };

  const handleFeedback = async (id, wasHelpful) => {
    try {
      await fetch(`${API_BASE}/ai-features/knowledge-suggestions/${id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wasHelpful })
      });
      loadSuggestions();
    } catch (error) {
      console.error('Feedback failed:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this suggestion?')) return;

    try {
      await fetch(`${API_BASE}/ai-features/knowledge-suggestions/${id}`, {
        method: 'DELETE'
      });
      loadSuggestions();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const filteredSuggestions = suggestions.filter(s =>
    s.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.generatedAnswer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <BookOpen className="w-8 h-8 text-emerald-600" />
            AI Knowledge Suggester
          </h1>
          <p className="text-gray-600 mt-1">Get AI-powered knowledge base suggestions and answers</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{suggestions.length}</p>
              <p className="text-sm text-gray-500">Total Suggestions</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <ThumbsUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {suggestions.filter(s => s.wasHelpful === true).length}
              </p>
              <p className="text-sm text-gray-500">Helpful</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <ThumbsDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {suggestions.filter(s => s.wasHelpful === false).length}
              </p>
              <p className="text-sm text-gray-500">Not Helpful</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(suggestions.reduce((acc, s) => acc + (s.confidence || 0), 0) / suggestions.length * 100 || 0)}%
              </p>
              <p className="text-sm text-gray-500">Avg Confidence</p>
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
            placeholder="Search suggestions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <button
          onClick={() => { setShowModal(true); setAiResult(null); setQuery(''); }}
          className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-5 h-5" />
          New Suggestion
        </button>
      </div>

      {/* Suggestions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Query</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Answer</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Articles</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Confidence</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Feedback</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSuggestions.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(item)}
                >
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate font-medium text-gray-900">{item.query}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-sm truncate text-gray-600">{item.generatedAnswer}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      {Array.isArray(item.suggestedArticles) ? item.suggestedArticles.length : 0} articles
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${item.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{Math.round(item.confidence * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleFeedback(item.id, true)}
                        className={`p-2 rounded-lg transition-colors ${
                          item.wasHelpful === true
                            ? 'bg-green-100 text-green-600'
                            : 'hover:bg-green-100 text-gray-400 hover:text-green-600'
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFeedback(item.id, false)}
                        className={`p-2 rounded-lg transition-colors ${
                          item.wasHelpful === false
                            ? 'bg-red-100 text-red-600'
                            : 'hover:bg-red-100 text-gray-400 hover:text-red-600'
                        }`}
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRowClick(item)}
                        className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors"
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
        {filteredSuggestions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No suggestions found. Create one to get started.
          </div>
        )}
      </div>

      {/* New Suggestion Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-emerald-600" />
                Get Knowledge Suggestions
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
                  {SAMPLE_QUERIES.map((sample, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setQuery(sample)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors border border-emerald-200"
                    >
                      <Zap className="w-3 h-3" />
                      {sample.length > 40 ? sample.substring(0, 40) + '...' : sample}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSuggest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Question</label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="What would you like to know? e.g., 'How do I reset my password?'"
                    rows={3}
                    className="input-field"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={suggesting}
                  className="btn-primary w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  {suggesting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Searching knowledge base...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      Get AI Suggestions
                    </>
                  )}
                </button>
              </form>

              {/* AI Result Display */}
              {aiResult && (
                <div className="mt-6 p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    AI Knowledge Suggestion
                  </h3>

                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <p className="text-sm text-emerald-600 font-medium mb-2">Generated Answer</p>
                    <p className="text-gray-800">{aiResult.aiResponse.generatedAnswer}</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <p className="text-sm text-gray-500 mb-1">Confidence</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${aiResult.aiResponse.confidence * 100}%` }}
                        />
                      </div>
                      <span className="font-semibold text-emerald-600">{Math.round(aiResult.aiResponse.confidence * 100)}%</span>
                    </div>
                  </div>

                  {aiResult.matchedArticles?.length > 0 && (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Related Knowledge Articles
                      </p>
                      <div className="space-y-2">
                        {aiResult.matchedArticles.map((article, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-800">{article.title}</span>
                            <button className="text-emerald-600 hover:text-emerald-700">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
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
              <h2 className="text-xl font-bold text-gray-900">Suggestion Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Query</h3>
                <p className="text-gray-600">{selectedItem.query}</p>
              </div>

              <div className="bg-emerald-50 rounded-lg p-4">
                <p className="text-sm text-emerald-600 font-medium mb-1">AI Generated Answer</p>
                <p className="text-gray-800">{selectedItem.generatedAnswer}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Confidence</p>
                  <p className="font-semibold text-emerald-600">{Math.round(selectedItem.confidence * 100)}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Feedback</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedItem.wasHelpful === true
                      ? 'bg-green-100 text-green-700'
                      : selectedItem.wasHelpful === false
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedItem.wasHelpful === true ? 'Helpful' : selectedItem.wasHelpful === false ? 'Not Helpful' : 'No feedback'}
                  </span>
                </div>
              </div>

              {Array.isArray(selectedItem.suggestedArticles) && selectedItem.suggestedArticles.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-2">Suggested Articles</p>
                  <div className="space-y-2">
                    {selectedItem.suggestedArticles.map((article, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                        <div>
                          <p className="font-medium text-gray-800">{article.title}</p>
                          {article.reason && <p className="text-sm text-gray-500">{article.reason}</p>}
                        </div>
                        {article.relevanceScore && (
                          <span className="text-sm text-emerald-600">{Math.round(article.relevanceScore * 100)}%</span>
                        )}
                      </div>
                    ))}
                  </div>
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

export default AiKnowledgeSuggester;
