import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const LoginPage = () => {
  const [email, setEmail] = useState('demo@finance.com');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password
      });

      login(response.data.user, response.data.token);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        backgroundImage: 'url(https://static.prod-images.emergentagent.com/jobs/f07b6a58-52be-4933-9672-f096982b7978/images/f1b8bf6fb612dae3c22e96a899e47d90dfccfca0f432f2dc4d4789939643884f.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="w-full max-w-md backdrop-blur-xl bg-white/60 rounded-2xl p-8 sm:p-10 shadow-[0_8px_30px_-4px_rgba(15,23,42,0.1)] border border-white/20">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl tracking-tight font-light text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Welcome Back
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-600">Sign in to manage your finances</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Label htmlFor="email" className="text-sm text-slate-700">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="demo@finance.com"
              className="mt-1.5 rounded-xl bg-slate-50 focus:ring-slate-900/20"
              data-testid="login-email-input"
              required
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-sm text-slate-700">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1.5 rounded-xl bg-slate-50 focus:ring-slate-900/20"
              data-testid="login-password-input"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-6 py-2.5 transition-all hover:-translate-y-0.5"
            data-testid="login-submit-button"
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <LogIn className="w-5 h-5" />
                Sign In
              </span>
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-slate-50/50 rounded-xl">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Demo Credentials</p>
          <p className="text-sm text-slate-600">Email: demo@finance.com</p>
          <p className="text-sm text-slate-600">Password: demo123</p>
        </div>
      </div>
    </div>
  );
};
