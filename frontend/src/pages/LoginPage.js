import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Mail, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const LoginPage = () => {
  const [view, setView] = useState('landing'); // 'landing', 'signin', 'signup', 'forgot', 'reset'
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  
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
  
  // Reset Password form
  const [resetData, setResetData] = useState({
    code: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const validateSignIn = () => {
    const newErrors = {};
    if (!signInData.email) newErrors.email = 'Email is required';
    else if (!validateEmail(signInData.email)) newErrors.email = 'Please enter a valid email';
    if (!signInData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignUp = () => {
    const newErrors = {};
    if (!signUpData.username) newErrors.username = 'Username is required';
    else if (signUpData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    if (!signUpData.email) newErrors.email = 'Email is required';
    else if (!validateEmail(signUpData.email)) newErrors.email = 'Please enter a valid email';
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
      const message = error.response?.data?.detail || 'Invalid email or password';
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
      toast.success('Account created! Welcome to KitaTracker.');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(message);
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!validateEmail(resetEmail)) {
      setErrors({ email: 'Please enter a valid email' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { email: resetEmail });
      // For demo, we get the code back. In production, user would check email.
      if (response.data.demo_code) {
        setResetCode(response.data.demo_code);
      }
      toast.success('Reset code sent! Check your email.');
      setView('reset');
      setErrors({});
    } catch (error) {
      toast.error('Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const newErrors = {};
    
    if (!resetData.code) newErrors.code = 'Reset code is required';
    if (!resetData.newPassword) newErrors.newPassword = 'New password is required';
    else if (resetData.newPassword.length < 6) newErrors.newPassword = 'Password must be at least 6 characters';
    if (resetData.newPassword !== resetData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        email: resetEmail,
        reset_code: resetData.code,
        new_password: resetData.newPassword
      });
      toast.success('Password reset successfully!');
      setView('signin');
      setResetData({ code: '', newPassword: '', confirmPassword: '' });
      setResetEmail('');
      setResetCode('');
      setErrors({});
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to reset password';
      toast.error(message);
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  const clearAndGoBack = (targetView) => {
    setErrors({});
    setSignInData({ email: '', password: '' });
    setSignUpData({ username: '', email: '', password: '' });
    setResetData({ code: '', newPassword: '', confirmPassword: '' });
    setView(targetView);
  };

  // Landing View
  const LandingView = () => (
    <div className="text-center px-2">
      {/* Logo */}
      <div className="mb-8">
        <img 
          src="/logo.png" 
          alt="KitaTracker" 
          className="w-24 h-auto mx-auto"
        />
      </div>
      
      {/* Headline */}
      <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-8 leading-relaxed tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
        See your real income.<br />
        Control your expenses.<br />
        Grow your business with clarity.
      </h1>
      
      {/* Auth Options */}
      <div className="space-y-2 mb-8">
        <p className="text-sm text-slate-600">
          Already have an account?{' '}
          <button 
            onClick={() => setView('signin')}
            className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors underline underline-offset-2"
          >
            Sign in
          </button>
        </p>
        <p className="text-sm text-slate-600">
          Don't have an account?{' '}
          <button 
            onClick={() => setView('signup')}
            className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors underline underline-offset-2"
          >
            Sign up
          </button>
        </p>
      </div>
      
      {/* Divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-slate-200"></div>
        <span className="text-xs text-slate-400 uppercase tracking-widest font-medium">or</span>
        <div className="flex-1 h-px bg-slate-200"></div>
      </div>
      
      {/* Auth Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleGoogleLogin}
          variant="outline"
          className="w-full h-14 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 font-medium text-slate-700"
          data-testid="google-login-button"
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>
        
        <Button
          onClick={() => setView('signin')}
          className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all duration-200"
          data-testid="email-login-button"
        >
          <Mail className="w-5 h-5 mr-3" />
          Continue with Email
        </Button>
      </div>
    </div>
  );

  // Sign In View
  const SignInView = () => (
    <div className="px-2">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Welcome back
        </h1>
        <p className="text-slate-500 text-sm">
          Sign in to manage your income and expenses.
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSignIn} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="signin-email" className="text-slate-700 font-medium text-sm">Email</Label>
          <Input
            id="signin-email"
            type="email"
            placeholder="Enter your email"
            value={signInData.email}
            onChange={(e) => {
              setSignInData({ ...signInData, email: e.target.value });
              setErrors({ ...errors, email: null, general: null });
            }}
            className={`h-14 rounded-2xl bg-slate-50/50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base ${errors.email ? 'border-red-400 focus:border-red-400' : ''}`}
            data-testid="signin-email-input"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signin-password" className="text-slate-700 font-medium text-sm">Password</Label>
          <div className="relative">
            <Input
              id="signin-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={signInData.password}
              onChange={(e) => {
                setSignInData({ ...signInData, password: e.target.value });
                setErrors({ ...errors, password: null, general: null });
              }}
              className={`h-14 rounded-2xl bg-slate-50/50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all pr-14 text-base ${errors.password ? 'border-red-400 focus:border-red-400' : ''}`}
              data-testid="signin-password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
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
            onClick={() => {
              setResetEmail(signInData.email);
              setView('forgot');
              setErrors({});
            }}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
          >
            Forgot password?
          </button>
        </div>
        
        {errors.general && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}
        
        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all duration-200 disabled:opacity-70"
            data-testid="signin-submit-button"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>Log in <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            onClick={() => clearAndGoBack('landing')}
            className="w-full h-12 rounded-2xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-medium transition-all duration-200"
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
    <div className="px-2">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Create your account
        </h1>
        <p className="text-slate-500 text-sm">
          Start tracking your income and expenses.
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-username" className="text-slate-700 font-medium text-sm">Username</Label>
          <Input
            id="signup-username"
            type="text"
            placeholder="Enter your username"
            value={signUpData.username}
            onChange={(e) => {
              setSignUpData({ ...signUpData, username: e.target.value });
              setErrors({ ...errors, username: null, general: null });
            }}
            className={`h-14 rounded-2xl bg-slate-50/50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base ${errors.username ? 'border-red-400 focus:border-red-400' : ''}`}
            data-testid="signup-username-input"
          />
          {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signup-email" className="text-slate-700 font-medium text-sm">Email</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="Enter your email"
            value={signUpData.email}
            onChange={(e) => {
              setSignUpData({ ...signUpData, email: e.target.value });
              setErrors({ ...errors, email: null, general: null });
            }}
            className={`h-14 rounded-2xl bg-slate-50/50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base ${errors.email ? 'border-red-400 focus:border-red-400' : ''}`}
            data-testid="signup-email-input"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signup-password" className="text-slate-700 font-medium text-sm">Password</Label>
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              value={signUpData.password}
              onChange={(e) => {
                setSignUpData({ ...signUpData, password: e.target.value });
                setErrors({ ...errors, password: null, general: null });
              }}
              className={`h-14 rounded-2xl bg-slate-50/50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all pr-14 text-base ${errors.password ? 'border-red-400 focus:border-red-400' : ''}`}
              data-testid="signup-password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-slate-400">Must be at least 6 characters</p>
          {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
        </div>
        
        {errors.general && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}
        
        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all duration-200 disabled:opacity-70"
            data-testid="signup-submit-button"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>Get started <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            onClick={() => clearAndGoBack('landing')}
            className="w-full h-12 rounded-2xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-medium transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </form>
    </div>
  );

  // Forgot Password View
  const ForgotPasswordView = () => (
    <div className="px-2">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Forgot password?
        </h1>
        <p className="text-slate-500 text-sm">
          Enter your email and we'll send you a reset code.
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleForgotPassword} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="forgot-email" className="text-slate-700 font-medium text-sm">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            placeholder="Enter your email"
            value={resetEmail}
            onChange={(e) => {
              setResetEmail(e.target.value);
              setErrors({ ...errors, email: null });
            }}
            className={`h-14 rounded-2xl bg-slate-50/50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base ${errors.email ? 'border-red-400 focus:border-red-400' : ''}`}
            data-testid="forgot-email-input"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        
        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all duration-200 disabled:opacity-70"
            data-testid="forgot-submit-button"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>Send Reset Code <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            onClick={() => clearAndGoBack('signin')}
            className="w-full h-12 rounded-2xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-medium transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Button>
        </div>
      </form>
    </div>
  );

  // Reset Password View
  const ResetPasswordView = () => (
    <div className="px-2">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Reset your password
        </h1>
        <p className="text-slate-500 text-sm">
          Enter the code sent to <span className="font-medium text-slate-700">{resetEmail}</span>
        </p>
        {resetCode && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700">
              Demo mode: Your reset code is <span className="font-mono font-bold">{resetCode}</span>
            </p>
          </div>
        )}
      </div>
      
      {/* Form */}
      <form onSubmit={handleResetPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-code" className="text-slate-700 font-medium text-sm">Reset Code</Label>
          <Input
            id="reset-code"
            type="text"
            placeholder="Enter 6-digit code"
            value={resetData.code}
            onChange={(e) => {
              setResetData({ ...resetData, code: e.target.value });
              setErrors({ ...errors, code: null, general: null });
            }}
            maxLength={6}
            className={`h-14 rounded-2xl bg-slate-50/50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base text-center tracking-[0.5em] font-mono ${errors.code ? 'border-red-400 focus:border-red-400' : ''}`}
            data-testid="reset-code-input"
          />
          {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="new-password" className="text-slate-700 font-medium text-sm">New Password</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a new password"
              value={resetData.newPassword}
              onChange={(e) => {
                setResetData({ ...resetData, newPassword: e.target.value });
                setErrors({ ...errors, newPassword: null, general: null });
              }}
              className={`h-14 rounded-2xl bg-slate-50/50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all pr-14 text-base ${errors.newPassword ? 'border-red-400 focus:border-red-400' : ''}`}
              data-testid="new-password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-slate-700 font-medium text-sm">Confirm Password</Label>
          <Input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm your new password"
            value={resetData.confirmPassword}
            onChange={(e) => {
              setResetData({ ...resetData, confirmPassword: e.target.value });
              setErrors({ ...errors, confirmPassword: null, general: null });
            }}
            className={`h-14 rounded-2xl bg-slate-50/50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base ${errors.confirmPassword ? 'border-red-400 focus:border-red-400' : ''}`}
            data-testid="confirm-password-input"
          />
          {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
        </div>
        
        {errors.general && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}
        
        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all duration-200 disabled:opacity-70"
            data-testid="reset-submit-button"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>Reset Password <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setView('forgot');
              setResetData({ code: '', newPassword: '', confirmPassword: '' });
              setErrors({});
            }}
            className="w-full h-12 rounded-2xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-medium transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Try Different Email
          </Button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-white to-emerald-50/50">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl"></div>
      </div>
      
      {/* Card */}
      <div className="relative w-full max-w-sm">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          {view === 'landing' && <LandingView />}
          {view === 'signin' && <SignInView />}
          {view === 'signup' && <SignUpView />}
          {view === 'forgot' && <ForgotPasswordView />}
          {view === 'reset' && <ResetPasswordView />}
        </div>
        
        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6 px-4">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
