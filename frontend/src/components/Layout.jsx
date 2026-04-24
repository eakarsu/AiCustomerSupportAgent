import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Folder,
  Tag,
  BookOpen,
  MessageSquare,
  UserCircle,
  Bot,
  BarChart3,
  Settings,
  LogOut,
  Phone,
  Tags,
  Lightbulb,
  Star,
  Route,
  ShoppingCart,
  Sparkles,
  Menu,
  X,
  Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/tickets', icon: Ticket, label: 'Tickets' },
  { path: '/calls', icon: Phone, label: 'Phone Calls' },
  { path: '/customers', icon: Users, label: 'Customers' },
  { path: '/categories', icon: Folder, label: 'Categories' },
  { path: '/tags', icon: Tag, label: 'Tags' },
  { path: '/knowledge', icon: BookOpen, label: 'Knowledge Base' },
  { path: '/canned-responses', icon: MessageSquare, label: 'Canned Responses' },
  { path: '/team', icon: UserCircle, label: 'Team' },
  { path: '/ai-chat', icon: Bot, label: 'AI Chat' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const aiFeatures = [
  { path: '/ai-classifier', icon: Tags, label: 'Ticket Classifier', color: 'text-indigo-600' },
  { path: '/ai-predictor', icon: Lightbulb, label: 'Resolution Predictor', color: 'text-amber-500' },
  { path: '/ai-knowledge', icon: BookOpen, label: 'Knowledge Suggester', color: 'text-emerald-600' },
  { path: '/ai-quality', icon: Star, label: 'Quality Scorer', color: 'text-yellow-500' },
  { path: '/ai-escalation', icon: Route, label: 'Escalation Router', color: 'text-red-600' },
  { path: '/ai-shopping', icon: ShoppingCart, label: 'Shopping Assistant', color: 'text-pink-600' },
];

function Layout() {
  const { user, logout } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
    } catch (e) {
      // Continue logout even if API fails
    }
    logout();
    success('Logged out successfully');
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const SidebarContent = () => (
    <>
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h1 className="text-lg sm:text-xl font-bold text-indigo-600 flex items-center gap-2">
          <Bot className="w-7 h-7 sm:w-8 sm:h-8" />
          AI Support
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Customer Support Agent</p>
      </div>

      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={closeSidebar}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}

        {/* AI Features Section */}
        <div className="pt-4 mt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            AI Features
          </div>
          {aiFeatures.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="p-3 sm:p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 p-2 sm:p-3 mb-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full" />
            ) : (
              <span className="text-indigo-600 font-medium text-sm sm:text-base">
                {user?.name?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-sm"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - mobile: slide-in overlay, desktop: fixed */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-gray-200 flex flex-col
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={closeSidebar}
          className="md:hidden absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
