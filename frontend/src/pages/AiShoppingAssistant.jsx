import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Send,
  Trash2,
  Bot,
  User,
  Package,
  DollarSign,
  Sparkles,
  ArrowLeft,
  X,
  Star,
  Plus,
  Eye,
  Search,
  Clock,
  MessageSquare
} from 'lucide-react';

const API_BASE = '/api';

function AiShoppingAssistant() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(`shop-${Date.now()}`);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showProductDetailModal, setShowProductDetailModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: ''
  });
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadData = async () => {
    try {
      const [convsRes, prodsRes, ordsRes] = await Promise.all([
        fetch(`${API_BASE}/ai-features/shopping-conversations`),
        fetch(`${API_BASE}/ai-features/products`),
        fetch(`${API_BASE}/ai-features/orders`)
      ]);
      const [convs, prods, ords] = await Promise.all([
        convsRes.json(),
        prodsRes.json(),
        ordsRes.json()
      ]);
      setConversations(convs);
      setProducts(prods);
      setOrders(ords);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    const userMessage = message;
    setMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/ai-features/shopping-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId })
      });
      const data = await res.json();

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: data.aiResponse.response,
        intent: data.aiResponse.intent,
        recommendations: data.aiResponse.productRecommendations,
        confidence: data.aiResponse.confidence
      }]);
      loadData();
    } catch (error) {
      console.error('Chat failed:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        isError: true
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/ai-features/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      setShowProductModal(false);
      setNewProduct({ name: '', description: '', price: '', category: '', stock: '' });
      loadData();
    } catch (error) {
      console.error('Create product failed:', error);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await fetch(`${API_BASE}/ai-features/products/${id}`, { method: 'DELETE' });
      loadData();
    } catch (error) {
      console.error('Delete product failed:', error);
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      await fetch(`${API_BASE}/ai-features/orders/${id}`, { method: 'DELETE' });
      loadData();
    } catch (error) {
      console.error('Delete order failed:', error);
    }
  };

  const handleProductRowClick = (product) => {
    setSelectedProduct(product);
    setShowProductDetailModal(true);
  };

  const handleOrderRowClick = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleConversationRowClick = (conv) => {
    setSelectedConversation(conv);
    setShowConversationModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'shipped': return 'text-blue-600 bg-blue-100';
      case 'processing': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getIntentColor = (intent) => {
    switch (intent) {
      case 'add_to_cart': return 'text-green-600 bg-green-100';
      case 'checkout': return 'text-blue-600 bg-blue-100';
      case 'search': return 'text-purple-600 bg-purple-100';
      case 'order_status': return 'text-amber-600 bg-amber-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.description?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredOrders = orders.filter(o =>
    o.orderNumber?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customerEmail?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.status?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  const filteredConversations = conversations.filter(c =>
    c.customerMessage?.toLowerCase().includes(historySearch.toLowerCase()) ||
    c.assistantResponse?.toLowerCase().includes(historySearch.toLowerCase()) ||
    c.intent?.toLowerCase().includes(historySearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-pink-600" />
            AI Shopping Assistant
          </h1>
          <p className="text-gray-600 mt-1">E-commerce chatbot for product recommendations and orders</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{conversations.length}</p>
              <p className="text-xs text-gray-500">Conversations</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{products.length}</p>
              <p className="text-xs text-gray-500">Products</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{orders.length}</p>
              <p className="text-xs text-gray-500">Orders</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">
                ${orders.reduce((acc, o) => acc + o.totalAmount, 0).toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">Total Sales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {['chat', 'products', 'orders', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab
                ? 'bg-pink-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <Bot className="w-16 h-16 text-pink-200 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">AI Shopping Assistant</h3>
                <p className="text-gray-500 mb-4">Ask me anything about products, orders, or get recommendations!</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    'Show me headphones',
                    'What are your best sellers?',
                    'Check order status',
                    'Products under $50',
                    'Compare wireless earbuds',
                    'I need a gift for a tech lover',
                    'What\'s on sale right now?',
                    'Recommend a laptop for programming',
                    'Do you have any bundle deals?',
                    'What\'s your return policy?'
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setMessage(q)}
                      className="px-3 py-1.5 bg-pink-50 text-pink-600 rounded-full text-sm hover:bg-pink-100 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'user' ? 'bg-indigo-100' : 'bg-pink-100'
                    }`}>
                      {msg.role === 'user' ? (
                        <User className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Bot className="w-4 h-4 text-pink-600" />
                      )}
                    </div>
                    <div>
                      <div className={`rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : msg.isError
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {msg.role === 'assistant' && !msg.isError && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.intent && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getIntentColor(msg.intent)}`}>
                              {msg.intent.replace('_', ' ')}
                            </span>
                          )}
                          {msg.confidence && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              {Math.round(msg.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                      )}

                      {msg.recommendations?.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {msg.recommendations.map((rec, j) => (
                            <div key={j} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                              <p className="font-medium text-gray-900">{rec.name}</p>
                              <p className="text-sm text-gray-500">{rec.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-pink-600" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about products, orders, or get recommendations..."
                className="flex-1 input-field"
              />
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="btn-primary bg-pink-600 hover:bg-pink-700 px-6"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products by name, category..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <button
              onClick={() => setShowProductModal(true)}
              className="btn-primary bg-pink-600 hover:bg-pink-700 flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          </div>
          <div className="overflow-y-auto max-h-[500px]">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Product</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Category</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Price</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Stock</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Rating</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleProductRowClick(product)}
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">{product.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">${product.price.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.stock > 50 ? 'bg-green-100 text-green-700' :
                        product.stock > 10 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {product.stock} in stock
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="font-medium">{product.rating.toFixed(1)}</span>
                        <span className="text-gray-400 text-sm">({product.reviewCount})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleProductRowClick(product)}
                          className="p-2 hover:bg-pink-100 rounded-lg text-pink-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
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
          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500">No products found.</div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search orders by number, customer, status..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Order #</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Customer</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Items</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Total</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleOrderRowClick(order)}
                  >
                    <td className="px-6 py-4 font-medium text-indigo-600">{order.orderNumber}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{order.customerName}</p>
                      <p className="text-sm text-gray-500">{order.customerEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      {Array.isArray(order.items) ? order.items.length : 0} items
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">${order.totalAmount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOrderRowClick(order)}
                          className="p-2 hover:bg-pink-100 rounded-lg text-pink-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
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
          {filteredOrders.length === 0 && (
            <div className="text-center py-12 text-gray-500">No orders found.</div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search conversations by message, response, intent..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Customer Message</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">AI Response</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Intent</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredConversations.map((conv) => (
                  <tr
                    key={conv.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleConversationRowClick(conv)}
                  >
                    <td className="px-6 py-4">
                      <p className="text-gray-900 max-w-xs truncate">{conv.customerMessage}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-600 max-w-sm truncate">{conv.assistantResponse}</p>
                    </td>
                    <td className="px-6 py-4">
                      {conv.intent && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIntentColor(conv.intent)}`}>
                          {conv.intent.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(conv.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredConversations.length === 0 && (
            <div className="text-center py-12 text-gray-500">No conversations found.</div>
          )}
        </div>
      )}

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
              <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="input-field"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <input
                  type="text"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full bg-pink-600 hover:bg-pink-700">
                Add Product
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {showProductDetailModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-pink-600" />
                Product Details
              </h2>
              <button onClick={() => setShowProductDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedProduct.name}</h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {selectedProduct.category}
                </span>
              </div>

              <p className="text-gray-600">{selectedProduct.description}</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Price</p>
                  <p className="text-2xl font-bold text-pink-600">${selectedProduct.price.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedProduct.stock}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedProduct.stock > 50 ? 'bg-green-100 text-green-700' :
                    selectedProduct.stock > 10 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedProduct.stock > 50 ? 'In Stock' : selectedProduct.stock > 10 ? 'Low Stock' : 'Very Low'}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">Rating</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(selectedProduct.rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-gray-900">{selectedProduct.rating.toFixed(1)}</span>
                  <span className="text-gray-500 text-sm">({selectedProduct.reviewCount} reviews)</span>
                </div>
              </div>

              {selectedProduct.tags?.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500">
                Created: {new Date(selectedProduct.createdAt).toLocaleString()}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { handleDeleteProduct(selectedProduct.id); setShowProductDetailModal(false); }}
                  className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                <button
                  onClick={() => setShowProductDetailModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Order {selectedOrder.orderNumber}</h2>
              <button onClick={() => setShowOrderModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium">{selectedOrder.customerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-700">{selectedOrder.customerEmail}</span>
              </div>
              {selectedOrder.shippingAddress && (
                <div>
                  <span className="text-gray-500">Shipping Address</span>
                  <p className="text-gray-700 mt-1">{selectedOrder.shippingAddress}</p>
                </div>
              )}
              {selectedOrder.trackingNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Tracking</span>
                  <span className="font-mono text-indigo-600">{selectedOrder.trackingNumber}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-4">
                <p className="font-medium text-gray-900 mb-2">Items</p>
                <div className="space-y-2">
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-medium">${item.price?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-pink-600">${selectedOrder.totalAmount.toFixed(2)}</span>
              </div>
              <div className="text-sm text-gray-500">
                Ordered: {new Date(selectedOrder.createdAt).toLocaleString()}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { handleDeleteOrder(selectedOrder.id); setShowOrderModal(false); }}
                  className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Detail Modal */}
      {showConversationModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-pink-600" />
                Conversation Details
              </h2>
              <button onClick={() => setShowConversationModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Customer Message */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Customer</p>
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <p className="text-gray-800">{selectedConversation.customerMessage}</p>
                  </div>
                </div>
              </div>

              {/* AI Response */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-pink-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1 font-medium">AI Assistant</p>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedConversation.assistantResponse}</p>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Intent</p>
                  {selectedConversation.intent ? (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getIntentColor(selectedConversation.intent)}`}>
                      {selectedConversation.intent.replace('_', ' ')}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">N/A</span>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Confidence</p>
                  <p className="font-semibold text-green-600">
                    {selectedConversation.confidence ? `${Math.round(selectedConversation.confidence * 100)}%` : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Product Recommendations */}
              {Array.isArray(selectedConversation.productRecommendations) && selectedConversation.productRecommendations.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-2">Product Recommendations</p>
                  <div className="space-y-2">
                    {selectedConversation.productRecommendations.map((rec, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
                        <p className="font-medium text-gray-900">{rec.name}</p>
                        {rec.reason && <p className="text-sm text-gray-500">{rec.reason}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                {new Date(selectedConversation.createdAt).toLocaleString()}
              </div>

              <button
                onClick={() => setShowConversationModal(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AiShoppingAssistant;
