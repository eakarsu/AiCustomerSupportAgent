import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Bot,
  UserCircle,
  Clock,
  Sparkles,
  FileText,
  RefreshCw
} from 'lucide-react';
import { ticketsApi, aiApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState('');
  const [autoAiResponse, setAutoAiResponse] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const ticketData = await ticketsApi.getById(id);
      setTicket(ticketData);
    } catch (error) {
      console.error('Failed to load ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    try {
      // Send agent message
      await ticketsApi.addMessage(id, {
        content: message,
        isFromAgent: true,
        senderId: user?.id
      });

      const sentMessage = message;
      setMessage('');

      // Reload to show the new message
      await loadData();

      // If auto AI response is enabled, generate and send AI response
      if (autoAiResponse) {
        setGeneratingAi(true);
        try {
          const aiResponse = await aiApi.generateResponse(id, 'professional and helpful');

          // Add AI response as a message
          await ticketsApi.addMessage(id, {
            content: aiResponse.response,
            isFromAgent: true,
            isAiGenerated: true,
            senderId: user?.id
          });

          await loadData();
        } catch (error) {
          console.error('AI response failed:', error);
        } finally {
          setGeneratingAi(false);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleGenerateAiResponse = async () => {
    setGeneratingAi(true);
    setAiSuggestion('');
    try {
      const response = await aiApi.generateResponse(id, 'professional and friendly');
      setAiSuggestion(response.response);
    } catch (error) {
      console.error('Failed to generate AI response:', error);
      setAiSuggestion('Failed to generate AI response. Please check your OpenRouter API key.');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSendAiResponse = async () => {
    if (!aiSuggestion) return;

    setSending(true);
    try {
      await ticketsApi.addMessage(id, {
        content: aiSuggestion,
        isFromAgent: true,
        isAiGenerated: true,
        senderId: user?.id
      });
      setAiSuggestion('');
      await loadData();
    } catch (error) {
      console.error('Failed to send AI response:', error);
    } finally {
      setSending(false);
    }
  };

  const handleUseAiSuggestion = () => {
    setMessage(aiSuggestion);
    setAiSuggestion('');
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    setSummary('');
    try {
      const response = await aiApi.summarizeTicket(id);
      setSummary(response.summary);
    } catch (error) {
      console.error('Failed to summarize:', error);
      setSummary('Failed to summarize. Please check your OpenRouter API key.');
    } finally {
      setSummarizing(false);
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      await ticketsApi.update(id, { status });
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleUpdatePriority = async (priority) => {
    try {
      await ticketsApi.update(id, { priority });
      loadData();
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Ticket not found</p>
        <button onClick={() => navigate('/tickets')} className="btn-primary mt-4">
          Back to Tickets
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <button
          onClick={() => navigate('/tickets')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tickets
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
            <p className="text-gray-600 mt-1">{ticket.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={ticket.status}
              onChange={(e) => handleUpdateStatus(e.target.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium status-${ticket.status} border-0 cursor-pointer`}
            >
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={ticket.priority}
              onChange={(e) => handleUpdatePriority(e.target.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium priority-${ticket.priority} border-0 cursor-pointer`}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {ticket.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isFromAgent ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-xl p-4 ${
                    msg.isFromAgent
                      ? msg.isAiGenerated
                        ? 'bg-purple-600 text-white'
                        : 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {msg.isFromAgent ? (
                      <>
                        {msg.isAiGenerated && <Bot className="w-4 h-4" />}
                        <span className="text-sm font-medium">
                          {msg.isAiGenerated ? 'AI Assistant' : (msg.senderUser?.name || 'Agent')}
                        </span>
                      </>
                    ) : (
                      <>
                        <UserCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {msg.customer?.name || ticket.customer?.name}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      msg.isFromAgent ? 'text-indigo-200' : 'text-gray-500'
                    }`}
                  >
                    {formatDate(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}

            {generatingAi && (
              <div className="flex justify-end">
                <div className="bg-purple-100 text-purple-800 rounded-xl p-4 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI is generating response...</span>
                </div>
              </div>
            )}
          </div>

          {/* AI Suggestion */}
          {aiSuggestion && (
            <div className="border-t border-gray-200 p-4 bg-purple-50">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">AI Generated Response</span>
              </div>
              <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap bg-white p-3 rounded-lg border border-purple-200">
                {aiSuggestion}
              </p>
              <div className="flex gap-2">
                <button onClick={handleSendAiResponse} disabled={sending} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm">
                  {sending ? 'Sending...' : 'Send AI Response'}
                </button>
                <button onClick={handleUseAiSuggestion} className="btn-secondary text-sm">
                  Edit First
                </button>
                <button onClick={() => setAiSuggestion('')} className="btn-secondary text-sm">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="border-t border-gray-200 p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">AI Summary</span>
                </div>
                <button onClick={() => setSummary('')} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <p className="text-sm text-gray-700">{summary}</p>
            </div>
          )}

          {/* Message Input */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={handleGenerateAiResponse}
                disabled={generatingAi}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Bot className="w-4 h-4" />
                {generatingAi ? 'Generating...' : 'Generate AI Response'}
              </button>
              <button
                type="button"
                onClick={handleSummarize}
                disabled={summarizing}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                {summarizing ? 'Summarizing...' : 'Summarize Ticket'}
              </button>
              <label className="flex items-center gap-2 text-sm text-gray-600 ml-auto">
                <input
                  type="checkbox"
                  checked={autoAiResponse}
                  onChange={(e) => setAutoAiResponse(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Auto AI follow-up
              </label>
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-4">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="input-field flex-1"
                disabled={sending || generatingAi}
              />
              <button
                type="submit"
                disabled={sending || !message.trim() || generatingAi}
                className="btn-primary flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-gray-200 bg-white p-6 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-4">Ticket Details</h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Customer</label>
              <div className="flex items-center gap-3 mt-1">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <UserCircle className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium">{ticket.customer?.name}</p>
                  <p className="text-sm text-gray-500">{ticket.customer?.email}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500">Category</label>
              {ticket.category ? (
                <div
                  className="mt-1 px-3 py-2 rounded-lg text-sm font-medium inline-block"
                  style={{
                    backgroundColor: `${ticket.category.color}20`,
                    color: ticket.category.color
                  }}
                >
                  {ticket.category.name}
                </div>
              ) : (
                <p className="text-gray-400 mt-1">No category</p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-500">Assignee</label>
              {ticket.assignee ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-600">
                      {ticket.assignee.name.charAt(0)}
                    </span>
                  </div>
                  <span>{ticket.assignee.name}</span>
                </div>
              ) : (
                <p className="text-gray-400 mt-1">Unassigned</p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-500">Source</label>
              <p className="mt-1 capitalize">{ticket.source}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500">Created</label>
              <p className="mt-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                {formatDate(ticket.createdAt)}
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-500">Messages</label>
              <p className="mt-1">{ticket.messages?.length || 0} messages</p>
            </div>

            {ticket.tags && ticket.tags.length > 0 && (
              <div>
                <label className="text-sm text-gray-500">Tags</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ticket.tags.map((t) => (
                    <span
                      key={t.tag.id}
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${t.tag.color}20`,
                        color: t.tag.color
                      }}
                    >
                      {t.tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketDetail;
