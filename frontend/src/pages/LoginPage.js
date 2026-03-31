import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Mail, Chrome, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const LoginPage = () => {
  const [view, setView] = useState('landing'); // 'landing', 'signin', 'signup'
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Sign In form
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });
  
  // Sign Up form
  const [signUpData, setSignUpData] = useState({
    username: '',
    email: '',
    password: ''
  });
  
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const validateSignIn = () => {
    const newErrors = {};
    if (!signInData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(signInData.email)) newErrors.email = 'Invalid email format';
    if (!signInData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignUp = () => {
    const newErrors = {};
    if (!signUpData.username) newErrors.username = 'Username is required';
    else if (signUpData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    if (!signUpData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(signUpData.email)) newErrors.email = 'Invalid email format';
    if (!signUpData.password) newErrors.password = 'Password is required';
    else if (signUpData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!validateSignIn()) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, signInData);
      login(response.data.user, response.data.token);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Invalid credentials';
      toast.error(message);
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!validateSignUp()) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, signUpData);
      login(response.data.user, response.data.token);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      toast.error(message);
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  // Landing View
  const LandingView = () => (
    <div className="text-center">
      {/* Logo */}
      <div className="mb-6">
        <img 
          src="/logo.png" 
          alt="KitaTracker" 
          className="max-w-[120px] h-auto mx-auto rounded-lg"
          style={{ borderRadius: '8px' }}
        />
      </div>
      
      {/* Headline */}
      <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-3 leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
        See your real income.<br />
        Control your expenses.<br />
        Grow your business with clarity.
      </h1>
      
      {/* Auth Options */}
      <div className="mt-8 space-y-3">
        <p className="text-sm text-slate-600">
          Already have an account?{' '}
          <button 
            onClick={() => setView('signin')}
            className="text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
          >
            Sign in
          </button>
        </p>
        <p className="text-sm text-slate-600">
          Don't have an account?{' '}
          <button 
            onClick={() => setView('signup')}
            className="text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
          >
            Sign up
          </button>
        </p>
      </div>
      
      {/* Divider */}
      <div className="my-8 flex items-center gap-4">
        <div className="flex-1 h-px bg-slate-200"></div>
        <span className="text-xs text-slate-400 uppercase tracking-wider">Continue with</span>
        <div className="flex-1 h-px bg-slate-200"></div>
      </div>
      
      {/* Auth Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleGoogleLogin}
          variant="outline"
          className="w-full h-12 rounded-xl border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 font-medium"
          data-testid="google-login-button"
        >
          <Chrome className="w-5 h-5 mr-3 text-slate-600" />
          Continue with Google
        </Button>
        
        <Button
          onClick={() => setView('signin')}
          variant="outline"
          className="w-full h-12 rounded-xl border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 font-medium"
          data-testid="email-login-button"
        >
          <Mail className="w-5 h-5 mr-3 text-slate-600" />
          Continue with Email
        </Button>
      </div>
    </div>
  );

  // Sign In View
  const SignInView = () => (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Welcome back
        </h1>
        <p className="text-slate-600">
          Sign in to manage your income and expenses.
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSignIn} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="signin-email" className="text-slate-700 font-medium">Email</Label>
          <Input
            id="signin-email"
            type="email"
            placeholder="Enter your email"
            value={signInData.email}
            onChange={(e) => {
              setSignInData({ ...signInData, email: e.target.value });
              setErrors({ ...errors, email: null });
            }}
            className={`h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors ${errors.email ? 'border-red-400' : ''}`}
            data-testid="signin-email-input"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signin-password" className="text-slate-700 font-medium">Password</Label>
          <div className="relative">
            <Input
              id="signin-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={signInData.password}
              onChange={(e) => {
                setSignInData({ ...signInData, password: e.target.value });
                setErrors({ ...errors, password: null });
              }}
              className={`h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors pr-12 ${errors.password ? 'border-red-400' : ''}`}
              data-testid="signin-password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
        </div>
        
        {/* Forgot Password */}
        <div className="text-right">
          <button 
            type="button"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
          >
            Forgot password?
          </button>
        </div>
        
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}
        
        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all duration-200 disabled:opacity-70"
            data-testid="signin-submit-button"
          >
            {loading ? 'Signing in...' : 'Log in'}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setView('landing');
              setErrors({});
              setSignInData({ email: '', password: '' });
            }}
            className="w-full h-12 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </form>
    </div>
  );

  // Sign Up View
  const SignUpView = () => (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Create your account
        </h1>
        <p className="text-slate-600">
          Start tracking your income and expenses.
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSignUp} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="signup-username" className="text-slate-700 font-medium">Username</Label>
          <Input
            id="signup-username"
            type="text"
            placeholder="Enter your username"
            value={signUpData.username}
            onChange={(e) => {
              setSignUpData({ ...signUpData, username: e.target.value });
              setErrors({ ...errors, username: null });
            }}
            className={`h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors ${errors.username ? 'border-red-400' : ''}`}
            data-testid="signup-username-input"
          />
          {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signup-email" className="text-slate-700 font-medium">Email</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="Enter your email"
            value={signUpData.email}
            onChange={(e) => {
              setSignUpData({ ...signUpData, email: e.target.value });
              setErrors({ ...errors, email: null });
            }}
            className={`h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors ${errors.email ? 'border-red-400' : ''}`}
            data-testid="signup-email-input"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signup-password" className="text-slate-700 font-medium">Password</Label>
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={signUpData.password}
              onChange={(e) => {
                setSignUpData({ ...signUpData, password: e.target.value });
                setErrors({ ...errors, password: null });
              }}
              className={`h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors pr-12 ${errors.password ? 'border-red-400' : ''}`}
              data-testid="signup-password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">Password must be at least 6 characters.</p>
          {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
        </div>
        
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}
        
        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all duration-200 disabled:opacity-70"
            data-testid="signup-submit-button"
          >
            {loading ? 'Creating account...' : 'Get started'}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setView('landing');
              setErrors({});
              setSignUpData({ username: '', email: '', password: '' });
            }}
            className="w-full h-12 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl"></div>
      </div>
      
      {/* Card */}
      <div className="relative w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/80 rounded-2xl p-8 sm:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] border border-white/50">
          {view === 'landing' && <LandingView />}
          {view === 'signin' && <SignInView />}
          {view === 'signup' && <SignUpView />}
        </div>
        
        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
