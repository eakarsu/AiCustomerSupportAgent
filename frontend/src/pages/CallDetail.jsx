import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  User,
  Bot,
  Ticket,
  Calendar,
  Timer,
  TrendingUp,
  FileText
} from 'lucide-react';
import { callsApi } from '../services/api';

function CallDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCall();
  }, [id]);

  const loadCall = async () => {
    try {
      const data = await callsApi.getById(id);
      setCall(data);
    } catch (error) {
      console.error('Failed to load call:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString();
  };

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'bg-green-100 text-green-700',
      'in-progress': 'bg-blue-100 text-blue-700',
      'ringing': 'bg-yellow-100 text-yellow-700',
      'failed': 'bg-red-100 text-red-700',
      'busy': 'bg-orange-100 text-orange-700',
      'no-answer': 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getSentimentColor = (sentiment) => {
    const colors = {
      'positive': 'bg-green-100 text-green-700',
      'negative': 'bg-red-100 text-red-700',
      'neutral': 'bg-gray-100 text-gray-700'
    };
    return colors[sentiment] || 'bg-gray-100 text-gray-700';
  };

  const handleCreateTicket = async () => {
    try {
      const ticket = await callsApi.createTicket(call.id);
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      alert('Failed to create ticket: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Call not found</p>
        <button
          onClick={() => navigate('/calls')}
          className="mt-4 text-indigo-600 hover:text-indigo-700"
        >
          Back to Calls
        </button>
      </div>
    );
  }

  const DirectionIcon = call.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/calls')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Calls
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
              call.direction === 'inbound' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              <DirectionIcon className={`w-7 h-7 ${
                call.direction === 'inbound' ? 'text-blue-600' : 'text-green-600'
              }`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {call.customer?.name || call.callerPhone}
              </h1>
              <p className="text-gray-500">
                {call.direction === 'inbound' ? 'Inbound' : 'Outbound'} call - {formatDate(call.startedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!call.ticketId ? (
              <button
                onClick={handleCreateTicket}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Ticket className="w-4 h-4" />
                Create Ticket
              </button>
            ) : (
              <button
                onClick={() => navigate(`/tickets/${call.ticketId}`)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Ticket className="w-4 h-4" />
                View Ticket
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Call Info */}
        <div className="col-span-1 space-y-6">
          {/* Call Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Call Details</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                  {call.status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Direction</span>
                <span className="text-gray-900 capitalize">{call.direction}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="text-gray-900 font-medium">{formatDuration(call.duration)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Caller</span>
                <span className="text-gray-900">{call.callerPhone}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Called</span>
                <span className="text-gray-900">{call.calledPhone}</span>
              </div>

              {call.sentiment && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Sentiment</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(call.sentiment)}`}>
                    {call.sentiment}
                  </span>
                </div>
              )}

              {call.wasTransferred && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Transferred</span>
                  <span className="text-amber-600 font-medium">Yes</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Started</span>
                <span className="text-gray-900 text-sm">{formatDate(call.startedAt)}</span>
              </div>

              {call.endedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Ended</span>
                  <span className="text-gray-900 text-sm">{formatDate(call.endedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Card */}
          {call.customer && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer</h2>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{call.customer.name}</p>
                  <p className="text-sm text-gray-500">{call.customer.email}</p>
                </div>
              </div>

              {call.customer.phone && (
                <p className="text-sm text-gray-500 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  {call.customer.phone}
                </p>
              )}

              <button
                onClick={() => navigate(`/customers/${call.customer.id}`)}
                className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                View Customer
              </button>
            </div>
          )}

          {/* Summary Card */}
          {call.summary && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                AI Summary
              </h2>
              <p className="text-gray-600">{call.summary}</p>
            </div>
          )}
        </div>

        {/* Right Column - Transcript */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Call Transcript</h2>
              <p className="text-sm text-gray-500">{call.transcripts?.length || 0} messages</p>
            </div>

            <div className="p-6 max-h-[600px] overflow-y-auto">
              {call.transcripts?.length === 0 ? (
                <div className="text-center py-12">
                  <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No transcript available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {call.transcripts?.map((transcript, index) => (
                    <div
                      key={transcript.id}
                      className={`flex gap-3 ${
                        transcript.speaker === 'ai' ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      {transcript.speaker === 'ai' && (
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-indigo-600" />
                        </div>
                      )}

                      <div className={`max-w-[70%] ${
                        transcript.speaker === 'ai'
                          ? 'bg-gray-100 rounded-br-xl rounded-tr-xl rounded-bl-xl'
                          : 'bg-indigo-600 text-white rounded-bl-xl rounded-tl-xl rounded-br-xl'
                      } p-4`}>
                        <p className={transcript.speaker === 'ai' ? 'text-gray-800' : 'text-white'}>
                          {transcript.content}
                        </p>
                        <div className={`flex items-center gap-2 mt-2 text-xs ${
                          transcript.speaker === 'ai' ? 'text-gray-500' : 'text-indigo-200'
                        }`}>
                          <span>{formatTime(transcript.timestamp)}</span>
                          {transcript.confidence && (
                            <span>({Math.round(transcript.confidence * 100)}% confidence)</span>
                          )}
                        </div>
                      </div>

                      {transcript.speaker === 'customer' && (
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CallDetail;
