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
  Phone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <Bot className="w-8 h-8" />
            AI Support
          </h1>
          <p className="text-sm text-gray-500 mt-1">Customer Support Agent</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 p-3 mb-2">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <span className="text-indigo-600 font-medium">
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
            className="w-full flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
