import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Repeat,
  PiggyBank,
  User,
  KeyRound,
  Trash2
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { currency, setCurrency, currencyInfo } = useCurrency();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changingCurrency, setChangingCurrency] = useState(false);

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Income', path: '/income', icon: TrendingUp },
    { name: 'Expenses', path: '/expenses', icon: TrendingDown },
    { name: 'Recurring', path: '/recurring', icon: Repeat },
    { name: 'Budgets', path: '/budgets', icon: PiggyBank },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCurrencyChange = async (newCurrency) => {
    setChangingCurrency(true);
    const success = await setCurrency(newCurrency);
    if (success) {
      toast.success(`Currency changed to ${currencyInfo[newCurrency]?.name || newCurrency}`);
    } else {
      toast.error('Failed to change currency');
    }
    setChangingCurrency(false);
  };

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-64x64.png" 
                alt="KitaTracker" 
                className="h-10 w-auto flex-shrink-0"
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
              {/* Currency Selector */}
              <Select value={currency} onValueChange={handleCurrencyChange} disabled={changingCurrency}>
                <SelectTrigger className="w-[100px] h-9 rounded-lg border-slate-200" data-testid="header-currency-select">
                  <SelectValue>
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-base">{currencyInfo[currency]?.symbol}</span>
                      <span className="text-sm">{currency}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(currencyInfo).map(([code, info]) => (
                    <SelectItem key={code} value={code}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-base w-6">{info.symbol}</span>
                        <span>{code}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    data-testid="user-profile-trigger"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.name?.charAt(0) || 'D'}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {user?.name || 'Demo User'}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={() => navigate('/profile')}
                    className="cursor-pointer"
                    data-testid="edit-profile-btn"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Edit Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate('/profile?tab=password')}
                    className="cursor-pointer"
                    data-testid="change-password-btn"
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    Change Password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => navigate('/profile?tab=delete')}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                    data-testid="delete-account-btn"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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

            {/* Mobile: Currency + Menu */}
            <div className="flex lg:hidden items-center gap-2">
              {/* Mobile Currency Selector */}
              <Select value={currency} onValueChange={handleCurrencyChange} disabled={changingCurrency}>
                <SelectTrigger className="w-[70px] h-9 rounded-lg border-slate-200 text-sm" data-testid="mobile-currency-select">
                  <SelectValue>
                    <span className="font-mono">{currencyInfo[currency]?.symbol}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(currencyInfo).map(([code, info]) => (
                    <SelectItem key={code} value={code}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono w-5">{info.symbol}</span>
                        <span>{code}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                data-testid="mobile-menu-toggle"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
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
                
                {/* Mobile Profile Section */}
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0) || 'D'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium block">{user?.name || 'Demo User'}</span>
                    <span className="text-xs text-slate-400">Tap to edit profile</span>
                  </div>
                </Link>
                
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
