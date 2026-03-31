import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasProcessed = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processCallback = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = window.location.hash;
        console.log('Auth callback - hash:', hash);
        
        const sessionId = new URLSearchParams(hash.substring(1)).get('session_id');
        console.log('Auth callback - sessionId:', sessionId);
        
        if (!sessionId) {
          console.error('No session_id found in URL');
          setError('No session ID found. Please try again.');
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        // Exchange session_id for user data via backend
        const response = await axios.post(`${API}/auth/google/callback?session_id=${sessionId}`);
        console.log('Auth callback - response:', response.data);
        
        const { user, token } = response.data;
        console.log('Auth callback - token:', token);
        console.log('Auth callback - user:', user);
        
        // Login user - this saves to localStorage and updates React state
        login(user, token);
        
        // Also directly set localStorage as backup (in case state update is slow)
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Clear the hash 
        window.history.replaceState(null, '', '/dashboard');
        toast.success(`Welcome, ${user.name || user.email}!`);
        
        // Small delay to ensure state propagation, then navigate
        await new Promise(resolve => setTimeout(resolve, 100));
        navigate('/dashboard', { replace: true });
        
      } catch (error) {
        console.error('Auth callback error:', error);
        const message = error.response?.data?.detail || 'Authentication failed. Please try again.';
        setError(message);
        toast.error(message);
        setTimeout(() => navigate('/'), 2000);
      }
    };

    processCallback();
  }, [navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
      <div className="text-center">
        {error ? (
          <>
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-2xl">!</span>
            </div>
            <p className="text-red-400">{error}</p>
            <p className="text-white/50 text-sm mt-2">Redirecting...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/70">Completing sign in...</p>
          </>
        )}
      </div>
    </div>
  );
};
