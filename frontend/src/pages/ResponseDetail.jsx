import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Zap, Copy, User, Clock } from 'lucide-react';
import { cannedResponsesApi } from '../services/api';

function ResponseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const data = await cannedResponsesApi.getById(id);
      setResponse(data);
    } catch (error) {
      console.error('Failed to load response:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      await cannedResponsesApi.use(id);
      loadData();
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Response not found</p>
        <button onClick={() => navigate('/canned-responses')} className="btn-primary mt-4">
          Back to Canned Responses
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/canned-responses')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Canned Responses
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-cyan-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{response.title}</h1>
                {response.shortcut && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm font-mono mt-2 inline-block">
                    /{response.shortcut}
                  </span>
                )}
              </div>
            </div>
            {!response.isActive && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                Inactive
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-6 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Created by {response.author?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Updated {formatDate(response.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Used {response.useCount} times</span>
            </div>
          </div>

          {/* Content */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <p className="text-gray-700 whitespace-pre-wrap">{response.content}</p>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="btn-primary flex items-center gap-2 w-full justify-center"
          >
            <Copy className="w-5 h-5" />
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResponseDetail;
