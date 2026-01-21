import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Eye, ThumbsUp, ThumbsDown, Clock, User } from 'lucide-react';
import { knowledgeApi } from '../services/api';

function ArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const data = await knowledgeApi.getById(id);
      setArticle(data);
    } catch (error) {
      console.error('Failed to load article:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHelpful = async (isHelpful) => {
    try {
      await knowledgeApi.markHelpful(id, isHelpful);
      loadData();
    } catch (error) {
      console.error('Failed to mark helpful:', error);
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

  if (!article) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Article not found</p>
        <button onClick={() => navigate('/knowledge')} className="btn-primary mt-4">
          Back to Knowledge Base
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/knowledge')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Knowledge Base
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              {article.category && (
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium inline-block mb-3"
                  style={{
                    backgroundColor: `${article.category.color}20`,
                    color: article.category.color
                  }}
                >
                  {article.category.name}
                </span>
              )}
              <h1 className="text-3xl font-bold text-gray-900">{article.title}</h1>
            </div>
            {!article.isPublished && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                Draft
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-6 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{article.author?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Updated {formatDate(article.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>{article.views} views</span>
            </div>
          </div>

          {/* Summary */}
          {article.summary && (
            <div className="bg-gray-50 rounded-lg p-4 mb-8">
              <p className="text-gray-700 font-medium">{article.summary}</p>
            </div>
          )}

          {/* Content */}
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {article.content}
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="bg-gray-50 p-6 border-t border-gray-100">
          <p className="text-center text-gray-600 mb-4">Was this article helpful?</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => handleHelpful(true)}
              className="flex items-center gap-2 px-6 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              <ThumbsUp className="w-5 h-5" />
              Yes ({article.helpful})
            </button>
            <button
              onClick={() => handleHelpful(false)}
              className="flex items-center gap-2 px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <ThumbsDown className="w-5 h-5" />
              No ({article.notHelpful})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArticleDetail;
