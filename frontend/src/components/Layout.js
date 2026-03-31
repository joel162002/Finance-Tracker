import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

export const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Income', path: '/income', icon: TrendingUp },
    { name: 'Expenses', path: '/expenses', icon: TrendingDown },
    { name: 'Monthly Summary', path: '/monthly', icon: Calendar },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-48x48.png" 
                alt="KitaTracker" 
                className="w-10 h-10 rounded-lg flex-shrink-0"
              />
              <h1 className="text-base sm:text-lg md:text-xl font-medium text-slate-900 truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <span className="hidden sm:inline">KitaTracker</span>
                <span className="sm:hidden">KitaTracker</span>
              </h1>
            </div>

            <div className="hidden lg:flex items-center gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                    data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.name?.charAt(0) || 'D'}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {user?.name || 'Demo User'}
                </span>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4" strokeWidth={2} />
              </Button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              data-testid="mobile-menu-toggle"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden py-4 border-t border-slate-200 animate-in slide-in-from-top">
              <div className="flex flex-col gap-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" strokeWidth={2} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
                <div className="my-2 border-t border-slate-200"></div>
                <div className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0) || 'D'}
                    </span>
                  </div>
                  <span className="font-medium">{user?.name || 'Demo User'}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-all"
                >
                  <LogOut className="w-5 h-5" strokeWidth={2} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="px-4 sm:px-6 py-6 sm:py-8 md:px-12 md:py-12 max-w-[1600px] mx-auto">
        {children}
      </main>
    </div>
  );
};
