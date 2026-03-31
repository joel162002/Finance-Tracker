import { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Mail, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Animated Background Component - outside main component
const AnimatedBackground = memo(() => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900" />
    <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" 
         style={{ animationDuration: '4s' }} />
    <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse" 
         style={{ animationDuration: '5s', animationDelay: '1s' }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-3xl animate-pulse" 
         style={{ animationDuration: '6s', animationDelay: '2s' }} />
    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
    <div className="absolute inset-0 opacity-20" 
         style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
  </div>
));

AnimatedBackground.displayName = 'AnimatedBackground';

export const LoginPage = () => {
  const [view, setView] = useState('landing');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [demoVerificationCode, setDemoVerificationCode] = useState('');
  
  // Form data as simple state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [errors, setErrors] = useState({});
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = useCallback(() => {
    // Redirect to Emergent OAuth - callback will include session_id in hash fragment
    const callbackUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(callbackUrl)}`;
  }, []);

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleSignIn = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!signInEmail) newErrors.email = 'Email is required';
    else if (!validateEmail(signInEmail)) newErrors.email = 'Please enter a valid email';
    if (!signInPassword) newErrors.password = 'Password is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email: signInEmail,
        password: signInPassword
      });
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
    const newErrors = {};
    if (!signUpUsername) newErrors.username = 'Username is required';
    else if (signUpUsername.length < 3) newErrors.username = 'Username must be at least 3 characters';
    if (!signUpEmail) newErrors.email = 'Email is required';
    else if (!validateEmail(signUpEmail)) newErrors.email = 'Please enter a valid email';
    if (!signUpPassword) newErrors.password = 'Password is required';
    else if (signUpPassword.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, {
        username: signUpUsername,
        email: signUpEmail,
        password: signUpPassword
      });
      
      // Store token and user for later (after verification)
      localStorage.setItem('pending_token', response.data.token);
      localStorage.setItem('pending_user', JSON.stringify(response.data.user));
      
      // Check if email verification is required
      if (response.data.requires_verification) {
        setPendingVerificationEmail(signUpEmail);
        if (response.data.demo_verification_code) {
          setDemoVerificationCode(response.data.demo_verification_code);
        }
        toast.success('Account created! Please verify your email.');
        setView('verify');
      } else {
        // No verification needed (shouldn't happen with new flow)
        login(response.data.user, response.data.token);
        toast.success('Account created! Welcome to KitaTracker.');
        navigate('/dashboard');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(message);
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    if (!verificationCodeInput || verificationCodeInput.length !== 6) {
      setErrors({ code: 'Please enter the 6-digit code' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/verify-email`, {
        email: pendingVerificationEmail,
        verification_code: verificationCodeInput
      });
      
      // Get stored credentials and login
      const token = localStorage.getItem('pending_token');
      const user = JSON.parse(localStorage.getItem('pending_user') || '{}');
      
      // Update user with verified status
      user.email_verified = true;
      
      localStorage.removeItem('pending_token');
      localStorage.removeItem('pending_user');
      
      login(user, token);
      toast.success('Email verified! Welcome to KitaTracker.');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Invalid verification code';
      toast.error(message);
      setErrors({ code: message });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/send-verification`, {
        email: pendingVerificationEmail
      });
      if (response.data.demo_verification_code) {
        setDemoVerificationCode(response.data.demo_verification_code);
      }
      toast.success('Verification code sent!');
    } catch (error) {
      toast.error('Failed to send verification code');
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
    
    if (!resetCodeInput) newErrors.code = 'Reset code is required';
    if (!newPassword) newErrors.newPassword = 'New password is required';
    else if (newPassword.length < 6) newErrors.newPassword = 'Password must be at least 6 characters';
    if (newPassword !== confirmPassword) {
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
        reset_code: resetCodeInput,
        new_password: newPassword
      });
      toast.success('Password reset successfully!');
      setView('signin');
      setResetCodeInput('');
      setNewPassword('');
      setConfirmPassword('');
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

  const clearAndGoTo = (targetView) => {
    setErrors({});
    setSignInEmail('');
    setSignInPassword('');
    setSignUpUsername('');
    setSignUpEmail('');
    setSignUpPassword('');
    setResetCodeInput('');
    setNewPassword('');
    setConfirmPassword('');
    setView(targetView);
  };

  // Input style classes
  const inputClasses = (hasError) => `
    w-full h-14 px-4 rounded-xl
    bg-white/10 backdrop-blur-sm
    border-2 ${hasError ? 'border-red-400/50' : 'border-white/10'}
    text-white placeholder-white/40
    text-base font-medium
    outline-none
    transition-all duration-300
    focus:border-emerald-400/60 focus:bg-white/15 focus:ring-4 focus:ring-emerald-400/10
    hover:border-white/20 hover:bg-white/12
  `;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AnimatedBackground />
      
      <div className="relative w-full max-w-sm">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40 border border-white/10">
          
          {/* Landing View */}
          {view === 'landing' && (
            <div className="text-center">
              <div className="mb-6">
                <img src="/logo.png" alt="KitaTracker" className="w-20 h-auto mx-auto drop-shadow-2xl" />
              </div>
              
              <h1 className="text-xl font-bold mb-8 leading-relaxed">
                <span className="bg-gradient-to-r from-white via-emerald-200 to-white bg-clip-text text-transparent">
                  See your real income.
                </span>
                <br />
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">
                  Control your expenses.
                </span>
                <br />
                <span className="bg-gradient-to-r from-white via-emerald-200 to-white bg-clip-text text-transparent">
                  Grow your business with clarity.
                </span>
              </h1>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <span className="text-xs text-white/40 uppercase tracking-widest font-semibold">Get Started</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={handleGoogleLogin}
                  className="w-full h-14 rounded-xl bg-white hover:bg-gray-100 text-slate-800 font-semibold transition-all duration-300 shadow-lg shadow-white/10 hover:shadow-white/20 hover:scale-[1.02]"
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
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02]"
                  data-testid="email-login-button"
                >
                  <Mail className="w-5 h-5 mr-3" />
                  Continue with Email
                </Button>
              </div>
            </div>
          )}

          {/* Sign In View */}
          {view === 'signin' && (
            <div>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">Welcome back</span>
                </h1>
                <p className="text-white/50 text-sm">Sign in to manage your income and expenses.</p>
              </div>
              
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-white/70 font-medium text-sm block">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={signInEmail}
                    onChange={(e) => { setSignInEmail(e.target.value); setErrors(prev => ({ ...prev, email: null, general: null })); }}
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                    className={inputClasses(errors.email)}
                    data-testid="signin-email-input"
                  />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                </div>
                
                <div className="space-y-2">
                  <label className="text-white/70 font-medium text-sm block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={signInPassword}
                      onChange={(e) => { setSignInPassword(e.target.value); setErrors(prev => ({ ...prev, password: null, general: null })); }}
                      autoComplete="current-password"
                      className={`${inputClasses(errors.password)} pr-14`}
                      data-testid="signin-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
                </div>
                
                <div className="text-right">
                  <button 
                    type="button" 
                    onClick={() => { setResetEmail(signInEmail); setView('forgot'); setErrors({}); }} 
                    className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                
                {errors.general && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-sm text-red-400">{errors.general}</p>
                  </div>
                )}
                
                <div className="space-y-3 pt-2">
                  <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/30 disabled:opacity-50" data-testid="signin-submit-button">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Log in <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                  
                  <Button type="button" variant="ghost" onClick={() => clearAndGoTo('landing')} className="w-full h-12 rounded-xl text-white/50 hover:text-white hover:bg-white/5 font-medium transition-all duration-200">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                  </Button>
                </div>
                
                <p className="text-center text-sm text-white/50 pt-2">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => clearAndGoTo('signup')} className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">Sign up</button>
                </p>
              </form>
            </div>
          )}

          {/* Sign Up View */}
          {view === 'signup' && (
            <div>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">Create your account</span>
                </h1>
                <p className="text-white/50 text-sm">Start tracking your income and expenses.</p>
              </div>
              
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-white/70 font-medium text-sm block">Username</label>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={signUpUsername}
                    onChange={(e) => { setSignUpUsername(e.target.value); setErrors(prev => ({ ...prev, username: null, general: null })); }}
                    autoComplete="username"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                    className={inputClasses(errors.username)}
                    data-testid="signup-username-input"
                  />
                  {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username}</p>}
                </div>
                
                <div className="space-y-2">
                  <label className="text-white/70 font-medium text-sm block">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={signUpEmail}
                    onChange={(e) => { setSignUpEmail(e.target.value); setErrors(prev => ({ ...prev, email: null, general: null })); }}
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                    className={inputClasses(errors.email)}
                    data-testid="signup-email-input"
                  />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                </div>
                
                <div className="space-y-2">
                  <label className="text-white/70 font-medium text-sm block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={signUpPassword}
                      onChange={(e) => { setSignUpPassword(e.target.value); setErrors(prev => ({ ...prev, password: null, general: null })); }}
                      autoComplete="new-password"
                      className={`${inputClasses(errors.password)} pr-14`}
                      data-testid="signup-password-input"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-white/30">Must be at least 6 characters</p>
                  {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                </div>
                
                {errors.general && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-sm text-red-400">{errors.general}</p>
                  </div>
                )}
                
                <div className="space-y-3 pt-2">
                  <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/30 disabled:opacity-50" data-testid="signup-submit-button">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Get started <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                  
                  <Button type="button" variant="ghost" onClick={() => clearAndGoTo('landing')} className="w-full h-12 rounded-xl text-white/50 hover:text-white hover:bg-white/5 font-medium transition-all duration-200">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                  </Button>
                </div>
                
                <p className="text-center text-sm text-white/50 pt-2">
                  Already have an account?{' '}
                  <button type="button" onClick={() => clearAndGoTo('signin')} className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">Sign in</button>
                </p>
              </form>
            </div>
          )}

          {/* Forgot Password View */}
          {view === 'forgot' && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">Forgot password?</span>
                </h1>
                <p className="text-white/50 text-sm">Enter your email and we'll send you a reset code.</p>
              </div>
              
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-white/70 font-medium text-sm block">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => { setResetEmail(e.target.value); setErrors(prev => ({ ...prev, email: null })); }}
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                    className={inputClasses(errors.email)}
                    data-testid="forgot-email-input"
                  />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                </div>
                
                <div className="space-y-3 pt-2">
                  <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/30 disabled:opacity-50" data-testid="forgot-submit-button">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Reset Code <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                  
                  <Button type="button" variant="ghost" onClick={() => clearAndGoTo('signin')} className="w-full h-12 rounded-xl text-white/50 hover:text-white hover:bg-white/5 font-medium transition-all duration-200">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Reset Password View */}
          {view === 'reset' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">Reset your password</span>
                </h1>
                <p className="text-white/50 text-sm">Enter the code sent to <span className="text-white/70 font-medium">{resetEmail}</span></p>
                {resetCode && (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-xs text-amber-300">Demo: Your code is <span className="font-mono font-bold text-amber-200">{resetCode}</span></p>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-white/70 font-medium text-sm block">Reset Code</label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={resetCodeInput}
                    onChange={(e) => { setResetCodeInput(e.target.value); setErrors(prev => ({ ...prev, code: null, general: null })); }}
                    maxLength={6}
                    autoComplete="one-time-code"
                    className={`${inputClasses(errors.code)} text-center tracking-[0.5em] font-mono`}
                    data-testid="reset-code-input"
                  />
                  {errors.code && <p className="text-xs text-red-400 mt-1">{errors.code}</p>}
                </div>
                
                <div className="space-y-2">
                  <label className="text-white/70 font-medium text-sm block">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a new password"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setErrors(prev => ({ ...prev, newPassword: null, general: null })); }}
                      autoComplete="new-password"
                      className={`${inputClasses(errors.newPassword)} pr-14`}
                      data-testid="new-password-input"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="text-xs text-red-400 mt-1">{errors.newPassword}</p>}
                </div>
                
                <div className="space-y-2">
                  <label className="text-white/70 font-medium text-sm block">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: null, general: null })); }}
                    autoComplete="new-password"
                    className={inputClasses(errors.confirmPassword)}
                    data-testid="confirm-password-input"
                  />
                  {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword}</p>}
                </div>
                
                {errors.general && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-sm text-red-400">{errors.general}</p>
                  </div>
                )}
                
                <div className="space-y-3 pt-2">
                  <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/30 disabled:opacity-50" data-testid="reset-submit-button">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Reset Password <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                  
                  <Button type="button" variant="ghost" onClick={() => { setView('forgot'); setResetCodeInput(''); setNewPassword(''); setConfirmPassword(''); setErrors({}); }} className="w-full h-12 rounded-xl text-white/50 hover:text-white hover:bg-white/5 font-medium transition-all duration-200">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Try Different Email
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Email Verification View */}
          {view === 'verify' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">Verify your email</span>
                </h1>
                <p className="text-white/50 text-sm">Enter the 6-digit code sent to <span className="text-white/70 font-medium">{pendingVerificationEmail}</span></p>
                {demoVerificationCode && (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-xs text-amber-300">Demo: Your code is <span className="font-mono font-bold text-amber-200">{demoVerificationCode}</span></p>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-white/70 font-medium text-sm block">Verification Code</label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCodeInput}
                    onChange={(e) => { setVerificationCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6)); setErrors(prev => ({ ...prev, code: null })); }}
                    maxLength={6}
                    autoComplete="one-time-code"
                    className={`${inputClasses(errors.code)} text-center tracking-[0.5em] font-mono`}
                    data-testid="verification-code-input"
                  />
                  {errors.code && <p className="text-xs text-red-400 mt-1">{errors.code}</p>}
                </div>
                
                <div className="space-y-3 pt-2">
                  <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/30 disabled:opacity-50" data-testid="verify-submit-button">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify Email <CheckCircle className="w-4 h-4 ml-2" /></>}
                  </Button>
                  
                  <Button type="button" variant="ghost" onClick={handleResendVerification} disabled={loading} className="w-full h-12 rounded-xl text-white/50 hover:text-white hover:bg-white/5 font-medium transition-all duration-200">
                    Resend Code
                  </Button>
                  
                  <Button type="button" variant="ghost" onClick={() => clearAndGoTo('landing')} className="w-full h-12 rounded-xl text-white/50 hover:text-white hover:bg-white/5 font-medium transition-all duration-200">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Start Over
                  </Button>
                </div>
              </form>
            </div>
          )}

        </div>
        
        <p className="text-center text-xs text-white/30 mt-6 px-4">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
