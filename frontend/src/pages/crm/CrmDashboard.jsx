import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, TrendingUp, GitBranch, Activity, Inbox, Calendar, FileText, BarChart3, Sparkles, ChevronRight, Loader2, DollarSign } from 'lucide-react';
import { crmContactsApi, crmAccountsApi, crmOpportunitiesApi, crmQuotesApi, crmForecastingApi } from '../../services/crmApi';
import { useToast } from '../../context/ToastContext';

const crmModules = [
  { path: '/crm/contacts', icon: Users, label: 'Contacts', color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-600', description: 'Manage prospects and leads' },
  { path: '/crm/accounts', icon: Building2, label: 'Accounts', color: 'bg-indigo-500', lightColor: 'bg-indigo-50', textColor: 'text-indigo-600', description: 'Customer companies' },
  { path: '/crm/opportunities', icon: TrendingUp, label: 'Opportunities', color: 'bg-green-500', lightColor: 'bg-green-50', textColor: 'text-green-600', description: 'Active deals in pipeline' },
  { path: '/crm/pipeline-stages', icon: GitBranch, label: 'Pipeline Stages', color: 'bg-purple-500', lightColor: 'bg-purple-50', textColor: 'text-purple-600', description: 'Configure sales pipeline' },
  { path: '/crm/activities', icon: Activity, label: 'Activities', color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-600', description: 'Calls, meetings & tasks' },
  { path: '/crm/email-sync', icon: Inbox, label: 'Email Sync', color: 'bg-teal-500', lightColor: 'bg-teal-50', textColor: 'text-teal-600', description: 'Synced email threads' },
  { path: '/crm/calendar-sync', icon: Calendar, label: 'Calendar Sync', color: 'bg-pink-500', lightColor: 'bg-pink-50', textColor: 'text-pink-600', description: 'Meetings & scheduling' },
  { path: '/crm/quotes', icon: FileText, label: 'Quotes', color: 'bg-amber-500', lightColor: 'bg-amber-50', textColor: 'text-amber-600', description: 'Proposals and pricing' },
  { path: '/crm/forecasting', icon: BarChart3, label: 'Forecasting', color: 'bg-rose-500', lightColor: 'bg-rose-50', textColor: 'text-rose-600', description: 'Revenue forecasts' },
];

export default function CrmDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState({ contacts: null, accounts: null, opportunities: null, quotes: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [contacts, accounts, opps, quotes] = await Promise.allSettled([
          crmContactsApi.stats(),
          crmAccountsApi.stats(),
          crmOpportunitiesApi.stats(),
          crmQuotesApi.stats(),
        ]);
        setStats({
          contacts: contacts.status === 'fulfilled' ? contacts.value : null,
          accounts: accounts.status === 'fulfilled' ? accounts.value : null,
          opportunities: opps.status === 'fulfilled' ? opps.value : null,
          quotes: quotes.status === 'fulfilled' ? quotes.value : null,
        });
      } catch (e) {
        // Stats are non-critical
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const StatCard = ({ label, value, sub, icon: Icon, color, lightColor, textColor }) => (
    <div className={`${lightColor} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center`}><Icon className="w-4 h-4 text-white" /></div>
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Dashboard</h1>
        </div>
        <p className="text-gray-500 text-sm">AI-powered customer relationship management with 9 modules, 18 CRUD + 16 AI verbs each</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Contacts" value={stats.contacts?.total} sub={`${stats.contacts?.active ?? '—'} active`} icon={Users} color="bg-blue-500" lightColor="bg-blue-50" textColor="text-blue-600" />
        <StatCard label="Accounts" value={stats.accounts?.total} sub={`${stats.accounts?.healthy ?? '—'} healthy`} icon={Building2} color="bg-indigo-500" lightColor="bg-indigo-50" textColor="text-indigo-600" />
        <StatCard label="Open Deals" value={stats.opportunities?.open} sub="in pipeline" icon={TrendingUp} color="bg-green-500" lightColor="bg-green-50" textColor="text-green-600" />
        <StatCard label="Quotes" value={stats.quotes?.total} sub={`${stats.quotes?.sent ?? '—'} sent`} icon={FileText} color="bg-amber-500" lightColor="bg-amber-50" textColor="text-amber-600" />
      </div>

      {/* Module Grid */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4">CRM Modules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {crmModules.map(mod => (
          <Link key={mod.path} to={mod.path} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 ${mod.lightColor} rounded-lg flex items-center justify-center`}><mod.icon className={`w-5 h-5 ${mod.textColor}`} /></div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{mod.label}</h3>
            <p className="text-sm text-gray-400">{mod.description}</p>
            <div className="flex items-center gap-1 mt-3">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <p className="text-xs text-gray-400">18 CRUD + 16 AI verbs</p>
            </div>
          </Link>
        ))}
      </div>

      {/* AI Capabilities Banner */}
      <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <Sparkles className="w-8 h-8 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg mb-1">AI-Powered CRM</h3>
            <p className="text-indigo-100 text-sm mb-3">Each module includes up to 16 AI verbs powered by OpenRouter. Click any record, open AI Tools, and choose from actions like predict win probability, generate outreach emails, score engagement, summarize history, and more.</p>
            <div className="flex flex-wrap gap-2">
              {['Predict Win Probability', 'Score Lead Fit', 'Generate Outreach Email', 'Detect Churn Risk', 'Generate Account Plan', 'Optimize Pricing', 'Forecast Revenue'].map(f => (
                <span key={f} className="bg-white bg-opacity-20 text-xs px-2 py-1 rounded-full">{f}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
