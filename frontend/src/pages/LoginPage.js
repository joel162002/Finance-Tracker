import { useState, useCallback, memo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Animated Background Component
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
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Check for Google OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('session_id=')) {
        setLoading(true);
        const sessionId = hash.split('session_id=')[1]?.split('&')[0];
        
        if (sessionId) {
          try {
            const response = await axios.post(`${API}/auth/google/callback?session_id=${sessionId}`);
            login(response.data.user, response.data.token);
            toast.success('Welcome to KitaTracker!');
            // Clear the hash
            window.history.replaceState(null, '', window.location.pathname);
            navigate('/dashboard');
          } catch (error) {
            console.error('OAuth callback error:', error);
            toast.error('Authentication failed. Please try again.');
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
        setLoading(false);
      }
    };

    handleOAuthCallback();
  }, [login, navigate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = useCallback(() => {
    setLoading(true);
    const callbackUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(callbackUrl)}`;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AnimatedBackground />
      
      <div className="relative w-full max-w-sm">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40 border border-white/10">
          
          <div className="text-center">
            <div className="mb-6">
              <img 
                src="/logo-full.png" 
                alt="KitaTracker" 
                className="h-44 sm:h-52 w-auto mx-auto drop-shadow-2xl" 
              />
            </div>
            
            <h1 className="text-xl font-bold mb-8 leading-relaxed">
              <span className="bg-gradient-to-r from-white via-emerald-200 to-white bg-clip-text text-transparent block mb-1">
                See your real income.
              </span>
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent block mb-1">
                Control your expenses.
              </span>
              <span className="bg-gradient-to-r from-white via-emerald-200 to-white bg-clip-text text-transparent block">
                Grow your business with clarity.
              </span>
            </h1>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              <span className="text-xs text-white/40 uppercase tracking-widest font-semibold">Get Started</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
            
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-14 rounded-xl bg-white hover:bg-gray-100 text-slate-800 font-semibold transition-all duration-300 shadow-lg shadow-white/10 hover:shadow-white/20 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="google-login-button"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              ) : (
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {loading ? 'Signing in...' : 'Continue with Google'}
            </Button>
            
            <p className="text-white/30 text-xs mt-6">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
            
            <p className="text-white/40 text-xs mt-4 pt-4 border-t border-white/10">
              Built by <span className="text-emerald-400/70 font-medium">Joel Jalapit Jr.</span>
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
