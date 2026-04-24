import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Mail, Lock, AlertCircle, Zap, Headphones, BarChart3, Brain, MessageSquare, Shield, CheckCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const validateLogin = () => {
    const errors = {};
    if (!email) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Invalid email format';
    if (!password) errors.password = 'Password is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    setError('');
    try {
      const result = await authApi.requestPasswordReset(resetEmail);
      setSuccessMsg('Password reset link sent. Check your email.');
      if (result.resetToken) {
        setResetToken(result.resetToken);
        setShowResetConfirm(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    if (!newPassword || !resetToken) return;
    setResetLoading(true);
    setError('');
    try {
      await authApi.confirmPasswordReset(resetToken, newPassword);
      setSuccessMsg('Password reset successfully! You can now log in.');
      setShowResetForm(false);
      setShowResetConfirm(false);
      setResetToken('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const checkStrength = async (pw) => {
    setNewPassword(pw);
    if (pw.length < 2) { setPasswordStrength(null); return; }
    const checks = {
      minLength: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /[0-9]/.test(pw),
      special: /[!@#$%^&*(),.?":{}|]/.test(pw),
    };
    const passed = Object.values(checks).filter(Boolean).length;
    setPasswordStrength({ checks, score: passed, strength: passed >= 4 ? 'strong' : passed >= 3 ? 'medium' : 'weak' });
  };

  const handlePopulateCredentials = () => {
    setEmail('admin@company.com');
    setPassword('password123');
  };

  const features = [
    { icon: Brain, text: 'AI-Powered Ticket Classification' },
    { icon: MessageSquare, text: 'Smart Response Suggestions' },
    { icon: BarChart3, text: 'Real-time Analytics Dashboard' },
    { icon: Shield, text: 'Quality Scoring & Escalation' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800">
        {/* Animated background shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-indigo-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <Headphones className="w-7 h-7 text-white" />
            </div>
            <span className="text-white/90 text-xl font-semibold tracking-tight">SupportAI</span>
          </div>

          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
            Smarter Support,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200">
              Happier Customers
            </span>
          </h2>

          <p className="text-indigo-200 text-lg mb-10 max-w-md leading-relaxed">
            Leverage AI to resolve tickets faster, predict issues before they escalate, and deliver exceptional customer experiences.
          </p>

          <div className="space-y-4">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-purple-200" />
                </div>
                <span className="text-white/80 text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-12 pt-8 border-t border-white/10">
            <div>
              <div className="text-2xl font-bold text-white">95%</div>
              <div className="text-indigo-300 text-xs">Resolution Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">2.5x</div>
              <div className="text-indigo-300 text-xs">Faster Response</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">40%</div>
              <div className="text-indigo-300 text-xs">Cost Reduction</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <span className="text-gray-900 text-lg font-semibold">SupportAI</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-gray-500 mt-1">Enter your credentials to access your account</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 flex items-center gap-2 text-sm border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-6 flex items-center gap-2 text-sm border border-green-100">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Password Reset Form */}
          {showResetForm ? (
            <div className="space-y-5">
              {!showResetConfirm ? (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Enter your email" className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" required />
                    </div>
                  </div>
                  <button type="submit" disabled={resetLoading} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50">
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button type="button" onClick={() => { setShowResetForm(false); setError(''); setSuccessMsg(''); }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700">Back to Login</button>
                </form>
              ) : (
                <form onSubmit={handleConfirmReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => checkStrength(e.target.value)}
                        placeholder="Enter new password" className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordStrength && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded ${i <= passwordStrength.score ?
                              passwordStrength.strength === 'strong' ? 'bg-green-500' :
                              passwordStrength.strength === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                              : 'bg-gray-200'}`} />
                          ))}
                        </div>
                        <p className={`text-xs ${passwordStrength.strength === 'strong' ? 'text-green-600' : passwordStrength.strength === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
                          Password strength: {passwordStrength.strength}
                        </p>
                      </div>
                    )}
                  </div>
                  <button type="submit" disabled={resetLoading} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50">
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button type="button" onClick={() => { setShowResetForm(false); setShowResetConfirm(false); setError(''); setSuccessMsg(''); }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700">Back to Login</button>
                </form>
              )}
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-shadow hover:border-gray-300 ${formErrors.email ? 'border-red-400' : 'border-gray-200'}`}
                />
              </div>
              {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button type="button" onClick={() => { setShowResetForm(true); setError(''); setSuccessMsg(''); }}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-shadow hover:border-gray-300 ${formErrors.password ? 'border-red-400' : 'border-gray-200'}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-gray-50 text-gray-400 uppercase tracking-wider">Demo Access</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePopulateCredentials}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            Fill Demo Credentials
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            admin@company.com / password123
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
