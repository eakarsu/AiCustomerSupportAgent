import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  User,
  MessageSquare,
  TrendingUp,
  Filter,
  Search,
  MoreVertical,
  Ticket,
  Trash2,
  PhoneCall,
  X
} from 'lucide-react';
import { callsApi, customersApi } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';

function Calls() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter, directionFilter]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await customersApi.getAll();
      console.log('Loaded customers:', data);
      setCustomers(data.customers || data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadData = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (directionFilter) params.direction = directionFilter;

      const [callsData, statsData] = await Promise.all([
        callsApi.getAll(params),
        callsApi.getStats()
      ]);

      setCalls(callsData.calls);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load calls:', error);
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
      'positive': 'text-green-600',
      'negative': 'text-red-600',
      'neutral': 'text-gray-600'
    };
    return colors[sentiment] || 'text-gray-600';
  };

  const getDirectionIcon = (direction) => {
    return direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;
  };

  const handleCreateTicket = async (call) => {
    try {
      const ticket = await callsApi.createTicket(call.id);
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      alert('Failed to create ticket: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedCall) return;
    try {
      await callsApi.delete(selectedCall.id);
      setCalls(calls.filter(c => c.id !== selectedCall.id));
      setShowDeleteDialog(false);
      setSelectedCall(null);
    } catch (error) {
      console.error('Failed to delete call:', error);
      alert('Failed to delete call: ' + error.message);
    }
  };

  const handleOpenCallModal = () => {
    setPhoneNumber('');
    setSelectedCustomer('');
    setCallError('');
    setShowCallModal(true);
  };

  const handleCustomerSelect = (customerId) => {
    setSelectedCustomer(customerId);
    const customer = customers.find(c => c.id === customerId);
    if (customer?.phone) {
      setPhoneNumber(customer.phone);
    }
  };

  const handleMakeCall = async () => {
    // Get phone from input or from selected customer
    let callPhone = phoneNumber;

    if (!callPhone && selectedCustomer) {
      const customer = customers.find(c => c.id === selectedCustomer);
      callPhone = customer?.phone;
    }

    if (!callPhone) {
      setCallError('Please enter a phone number or select a customer with a phone');
      return;
    }

    // Basic phone validation
    const cleanPhone = callPhone.replace(/[^\d+]/g, '');
    if (cleanPhone.length < 10) {
      setCallError('Please enter a valid phone number');
      return;
    }

    setCalling(true);
    setCallError('');

    try {
      const result = await callsApi.makeOutbound(cleanPhone, selectedCustomer || null);
      setShowCallModal(false);
      loadData(); // Refresh the calls list
      alert(`Call initiated! Call ID: ${result.call.id}`);
    } catch (error) {
      console.error('Failed to make call:', error);
      setCallError(error.message || 'Failed to initiate call');
    } finally {
      setCalling(false);
    }
  };

  const filteredCalls = calls.filter(call => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        call.callerPhone.toLowerCase().includes(searchLower) ||
        call.calledPhone.toLowerCase().includes(searchLower) ||
        call.customer?.name?.toLowerCase().includes(searchLower) ||
        call.summary?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Phone Calls</h1>
          <p className="text-gray-600 mt-1">AI-powered voice support conversations</p>
        </div>
        <button
          onClick={handleOpenCallModal}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <PhoneCall className="w-5 h-5" />
          Make Call
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
            <p className="text-gray-500 text-sm">Total Calls</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.completedCalls}</p>
            <p className="text-gray-500 text-sm">Completed</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-amber-600 font-medium">{stats.transferRate}%</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.transferredCalls}</p>
            <p className="text-gray-500 text-sm">Transferred to Human</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</p>
            <p className="text-gray-500 text-sm">Avg Duration</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search calls by phone, customer, or summary..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In Progress</option>
            <option value="ringing">Ringing</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          >
            <option value="">All Directions</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>
        </div>
      </div>

      {/* Calls List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {filteredCalls.length === 0 ? (
          <div className="p-12 text-center">
            <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No calls found</p>
            <p className="text-gray-400 text-sm mt-1">
              Calls will appear here when customers call your Twilio number
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredCalls.map((call) => {
              const DirectionIcon = getDirectionIcon(call.direction);
              return (
                <div
                  key={call.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-4 cursor-pointer flex-1"
                      onClick={() => navigate(`/calls/${call.id}`)}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        call.direction === 'inbound' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        <DirectionIcon className={`w-5 h-5 ${
                          call.direction === 'inbound' ? 'text-blue-600' : 'text-green-600'
                        }`} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {call.customer?.name || call.callerPhone}
                          </p>
                          {call.sentiment && (
                            <span className={`text-xs ${getSentimentColor(call.sentiment)}`}>
                              ({call.sentiment})
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {call.direction === 'inbound' ? 'From' : 'To'}: {call.callerPhone}
                          {call._count?.transcripts > 0 && (
                            <span className="ml-2">
                              <MessageSquare className="w-3 h-3 inline" /> {call._count.transcripts} messages
                            </span>
                          )}
                        </p>
                        {call.summary && (
                          <p className="text-sm text-gray-600 mt-1 truncate max-w-xl">
                            {call.summary}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                          {call.status}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDuration(call.duration)}
                        </p>
                      </div>

                      <div className="text-right text-sm text-gray-500 w-36">
                        {formatDate(call.startedAt)}
                      </div>

                      {call.wasTransferred && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          Transferred
                        </span>
                      )}

                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenu(actionMenu === call.id ? null : call.id);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>

                        {actionMenu === call.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 w-48">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/calls/${call.id}`);
                                setActionMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <MessageSquare className="w-4 h-4" />
                              View Transcript
                            </button>
                            {!call.ticketId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreateTicket(call);
                                  setActionMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Ticket className="w-4 h-4" />
                                Create Ticket
                              </button>
                            )}
                            {call.ticketId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/tickets/${call.ticketId}`);
                                  setActionMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Ticket className="w-4 h-4" />
                                View Ticket
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCall(call);
                                setShowDeleteDialog(true);
                                setActionMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Call"
        message="Are you sure you want to delete this call record? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setSelectedCall(null);
        }}
      />

      {/* Make Call Modal */}
      <Modal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        title="Make Phone Call"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Customer (Optional)
            </label>
            <select
              value={selectedCustomer}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="">-- Select a customer --</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id} disabled={!customer.phone}>
                  {customer.name} {customer.phone ? `(${customer.phone})` : '(no phone)'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {customers.length} customers loaded
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number {selectedCustomer ? '(auto-filled from customer)' : '*'}
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Include country code (e.g., +1 for US). Select a customer above or enter manually.
            </p>
          </div>

          {callError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {callError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowCallModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleMakeCall}
              disabled={calling || (!phoneNumber && !selectedCustomer)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {calling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Calling...
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4" />
                  Call Now
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Calls;
