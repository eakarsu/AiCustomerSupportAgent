import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Clock, User, MessageSquare, TrendingUp,
  Filter, Search, Trash2, Ticket, PhoneCall,
  ChevronUp, ChevronDown, ArrowUpDown
} from 'lucide-react';
import { callsApi, customersApi } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';

function Calls() {
  const navigate = useNavigate();
  const toast = useToast();
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [sortBy, setSortBy] = useState('startedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadData();
  }, [statusFilter, directionFilter, searchDebounced, sortBy, sortOrder]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await customersApi.getAll({ limit: 200 });
      setCustomers(data.customers || data.data || data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadData = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (directionFilter) params.direction = directionFilter;
      if (searchDebounced) params.search = searchDebounced;
      if (sortBy) params.sortBy = sortBy;
      if (sortOrder) params.sortOrder = sortOrder;

      const [callsData, statsData] = await Promise.all([
        callsApi.getAll(params),
        callsApi.getStats()
      ]);

      setCalls(callsData.calls || callsData.data || callsData);
      setStats(statsData);
    } catch (error) {
      toast.error('Failed to load calls');
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
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
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
      'positive': 'text-green-600 bg-green-50',
      'negative': 'text-red-600 bg-red-50',
      'neutral': 'text-gray-600 bg-gray-50'
    };
    return colors[sentiment] || 'text-gray-600 bg-gray-50';
  };

  const getDirectionIcon = (direction) => {
    return direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;
  };

  const handleCreateTicket = async (e, call) => {
    e.stopPropagation();
    try {
      const ticket = await callsApi.createTicket(call.id);
      toast.success('Ticket created from call');
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      toast.error('Failed to create ticket: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedCall) return;
    try {
      await callsApi.delete(selectedCall.id);
      setCalls(calls.filter(c => c.id !== selectedCall.id));
      setSelectedCall(null);
      toast.success('Call record deleted');
    } catch (error) {
      toast.error('Failed to delete call: ' + error.message);
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
    let callPhone = phoneNumber;

    if (!callPhone && selectedCustomer) {
      const customer = customers.find(c => c.id === selectedCustomer);
      callPhone = customer?.phone;
    }

    if (!callPhone) {
      setCallError('Please enter a phone number or select a customer with a phone');
      return;
    }

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
      toast.success(`Call initiated! Call ID: ${result.call?.id || result.id}`);
      loadData();
    } catch (error) {
      setCallError(error.message || 'Failed to initiate call');
    } finally {
      setCalling(false);
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const SortHeader = ({ field, label, className = '' }) => (
    <th
      className={`text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 cursor-pointer hover:text-indigo-600 select-none ${className}`}
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortBy === field ? (
          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-gray-300" />
        )}
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-5 w-56 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-6 bg-gray-100 animate-pulse h-28" />
          ))}
        </div>
        <SkeletonTable rows={10} columns={8} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Phone Calls</h1>
          <p className="text-gray-600 mt-1 text-sm">AI-powered voice support conversations</p>
        </div>
        <button
          onClick={handleOpenCallModal}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          <PhoneCall className="w-4 h-4" />
          Make Call
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
            <p className="text-gray-500 text-xs sm:text-sm">Total Calls</p>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.completedCalls}</p>
            <p className="text-gray-500 text-xs sm:text-sm">Completed</p>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-amber-600 font-medium text-sm">{stats.transferRate}%</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.transferredCalls}</p>
            <p className="text-gray-500 text-xs sm:text-sm">Transferred to Human</p>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</p>
            <p className="text-gray-500 text-xs sm:text-sm">Avg Duration</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search calls by phone, customer, or summary..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden btn-secondary flex items-center gap-2 justify-center"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row gap-3 sm:gap-4`}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field sm:w-40"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
              <option value="ringing">Ringing</option>
              <option value="failed">Failed</option>
              <option value="busy">Busy</option>
              <option value="no-answer">No Answer</option>
            </select>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="input-field sm:w-40"
            >
              <option value="">All Directions</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 w-12">Dir</th>
                <SortHeader field="callerPhone" label="Caller / Customer" />
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden md:table-cell">Phone</th>
                <SortHeader field="status" label="Status" />
                <SortHeader field="duration" label="Duration" className="hidden lg:table-cell" />
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 hidden lg:table-cell">Sentiment</th>
                <SortHeader field="startedAt" label="Date" className="hidden md:table-cell" />
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(calls) ? calls : []).map((call) => {
                const DirectionIcon = getDirectionIcon(call.direction);
                return (
                  <tr
                    key={call.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-3 sm:p-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        call.direction === 'inbound' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        <DirectionIcon className={`w-4 h-4 ${
                          call.direction === 'inbound' ? 'text-blue-600' : 'text-green-600'
                        }`} />
                      </div>
                    </td>
                    <td
                      className="p-3 sm:p-4 cursor-pointer"
                      onClick={() => navigate(`/calls/${call.id}`)}
                    >
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {call.customer?.name || call.callerPhone}
                        </p>
                        {call.summary && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">{call.summary}</p>
                        )}
                      </div>
                    </td>
                    <td
                      className="p-3 sm:p-4 cursor-pointer hidden md:table-cell"
                      onClick={() => navigate(`/calls/${call.id}`)}
                    >
                      <span className="text-sm text-gray-600">{call.callerPhone}</span>
                      {call._count?.transcripts > 0 && (
                        <span className="ml-2 text-xs text-gray-400">
                          <MessageSquare className="w-3 h-3 inline" /> {call._count.transcripts}
                        </span>
                      )}
                    </td>
                    <td
                      className="p-3 sm:p-4 cursor-pointer"
                      onClick={() => navigate(`/calls/${call.id}`)}
                    >
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                        {call.status}
                      </span>
                      {call.wasTransferred && (
                        <span className="ml-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium hidden sm:inline-block">
                          Transferred
                        </span>
                      )}
                    </td>
                    <td
                      className="p-3 sm:p-4 cursor-pointer hidden lg:table-cell"
                      onClick={() => navigate(`/calls/${call.id}`)}
                    >
                      <span className="text-sm text-gray-600">{formatDuration(call.duration)}</span>
                    </td>
                    <td
                      className="p-3 sm:p-4 cursor-pointer hidden lg:table-cell"
                      onClick={() => navigate(`/calls/${call.id}`)}
                    >
                      {call.sentiment ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(call.sentiment)}`}>
                          {call.sentiment}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">--</span>
                      )}
                    </td>
                    <td
                      className="p-3 sm:p-4 text-xs sm:text-sm text-gray-500 whitespace-nowrap hidden md:table-cell cursor-pointer"
                      onClick={() => navigate(`/calls/${call.id}`)}
                    >
                      {formatDate(call.startedAt)}
                    </td>
                    <td className="p-3 sm:p-4">
                      <div className="flex items-center gap-1">
                        {!call.ticketId ? (
                          <button
                            onClick={(e) => handleCreateTicket(e, call)}
                            className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors text-indigo-600"
                            title="Create Ticket"
                          >
                            <Ticket className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/tickets/${call.ticketId}`); }}
                            className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-green-600"
                            title="View Ticket"
                          >
                            <Ticket className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCall(call);
                            setShowDeleteDialog(true);
                          }}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(!calls || calls.length === 0) && (
          <div className="p-12 text-center">
            <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No calls found</p>
            <p className="text-gray-400 text-sm mt-1">
              Calls will appear here when customers call your Twilio number
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => { setShowDeleteDialog(false); setSelectedCall(null); }}
        onConfirm={handleDelete}
        title="Delete Call"
        message="Are you sure you want to delete this call record? This action cannot be undone."
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
              className="input-field"
            >
              <option value="">-- Select a customer --</option>
              {(Array.isArray(customers) ? customers : []).map((customer) => (
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
              className="input-field"
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
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleMakeCall}
              disabled={calling || (!phoneNumber && !selectedCustomer)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
