import { useState, useEffect, useRef } from 'react';
import { Bot, Send, ThumbsUp, ThumbsDown, Sparkles, RefreshCw } from 'lucide-react';
import { aiApi } from '../services/api';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

function AiChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => generateId());
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm your AI Customer Support Assistant. How can I help you today? I can answer questions, help troubleshoot issues, and provide information about our products and services.",
        timestamp: new Date()
      }
    ]);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      id: generateId(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await aiApi.chat(input, sessionId);

      const assistantMessage = {
        id: response.conversationId,
        role: 'assistant',
        content: response.response,
        intent: response.intent,
        relatedArticles: response.relatedArticles,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request. Please try again or contact a human agent for assistance.",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (messageId, wasHelpful) => {
    try {
      await aiApi.feedback(messageId, wasHelpful);
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, feedback: wasHelpful } : msg
      ));
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Chat cleared. How can I help you today?",
        timestamp: new Date()
      }
    ]);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Support Chat</h1>
              <p className="text-gray-600">Powered by OpenRouter AI</p>
            </div>
          </div>
          <button
            onClick={handleClearChat}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                  : 'bg-white text-gray-900 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100'
              } p-4`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-600">AI Assistant</span>
                  {message.intent && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                      {message.intent.replace('_', ' ')}
                    </span>
                  )}
                </div>
              )}

              <p className="whitespace-pre-wrap">{message.content}</p>

              {message.relatedArticles && message.relatedArticles.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Related articles:</p>
                  <div className="flex flex-wrap gap-2">
                    {message.relatedArticles.map((article, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {article.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className={`flex items-center justify-between mt-2 pt-2 ${
                message.role === 'user' ? 'text-indigo-200' : 'text-gray-400 border-t border-gray-100'
              }`}>
                <span className="text-xs">{formatTime(message.timestamp)}</span>

                {message.role === 'assistant' && message.id !== 'welcome' && !message.isError && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFeedback(message.id, true)}
                      className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                        message.feedback === true ? 'text-green-600' : ''
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleFeedback(message.id, false)}
                      className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                        message.feedback === false ? 'text-red-600' : ''
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                <span className="text-sm text-gray-500">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="input-field flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary flex items-center gap-2 px-6"
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2 text-center">
          AI responses are generated by OpenRouter. For complex issues, please contact a human agent.
        </p>
      </div>
    </div>
  );
}

export default AiChat;
