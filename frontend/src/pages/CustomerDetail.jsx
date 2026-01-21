import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCircle, Mail, Phone, Building, Ticket, Clock } from 'lucide-react';
import { customersApi } from '../services/api';

function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const data = await customersApi.getById(id);
      setCustomer(data);
    } catch (error) {
      console.error('Failed to load customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      standard: 'bg-gray-100 text-gray-800',
      premium: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800',
      vip: 'bg-amber-100 text-amber-800'
    };
    return colors[tier] || colors.standard;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
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

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Customer not found</p>
        <button onClick={() => navigate('/customers')} className="btn-primary mt-4">
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </button>

      <div className="grid grid-cols-3 gap-8">
        {/* Customer Info */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {customer.avatar ? (
                  <img src={customer.avatar} alt="" className="w-20 h-20 rounded-full" />
                ) : (
                  <UserCircle className="w-12 h-12 text-indigo-600" />
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(customer.tier)}`}>
                {customer.tier}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-5 h-5" />
                <span>{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-5 h-5" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.company && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Building className="w-5 h-5" />
                  <span>{customer.company}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-gray-600">
                <Clock className="w-5 h-5" />
                <span>Customer since {formatDate(customer.createdAt)}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-indigo-600">{customer._count?.tickets || 0}</p>
                  <p className="text-sm text-gray-500">Total Tickets</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">${customer.totalSpent?.toFixed(2) || '0.00'}</p>
                  <p className="text-sm text-gray-500">Total Spent</p>
                </div>
              </div>
            </div>

            {customer.notes && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                <p className="text-gray-600 text-sm">{customer.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Recent Tickets</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {customer.tickets && customer.tickets.length > 0 ? (
                customer.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Ticket className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{ticket.subject}</p>
                          <p className="text-sm text-gray-500">{formatDate(ticket.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ticket.category && (
                          <span
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${ticket.category.color}20`,
                              color: ticket.category.color
                            }}
                          >
                            {ticket.category.name}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium status-${ticket.status}`}>
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No tickets yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerDetail;
