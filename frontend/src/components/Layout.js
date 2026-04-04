import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMonth } from '../context/MonthContext';
import { NotificationDropdown } from './NotificationDropdown';
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
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';

export const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { selectedMonth, changeMonth, getMonthOptions, getShortMonthLabel } = useMonth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Navigate to previous/next month
  const navigateMonth = (direction) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + direction, 1);
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    changeMonth(newMonth);
  };

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
              <img 
                src="/logo-full.png" 
                alt="KitaTracker" 
                className="h-11 sm:h-12 w-auto"
              />
            </Link>

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
              {/* Global Month Selector - Glassy Design */}
              <div className="flex items-center gap-0.5 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl p-1 border border-white/50 shadow-lg shadow-emerald-500/5">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-white/60 rounded-lg transition-all duration-200 hover:shadow-sm"
                  data-testid="month-prev-btn"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-700" />
                </button>
                <Select value={selectedMonth} onValueChange={changeMonth}>
                  <SelectTrigger className="w-[140px] h-9 border-0 bg-white/50 hover:bg-white/70 rounded-lg font-semibold text-slate-800 shadow-sm transition-all duration-200" data-testid="month-selector">
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span>{getShortMonthLabel(selectedMonth)}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {getMonthOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-white/60 rounded-lg transition-all duration-200 hover:shadow-sm"
                  data-testid="month-next-btn"
                >
                  <ChevronRight className="w-4 h-4 text-slate-700" />
                </button>
              </div>

              {/* Notification Bell */}
              <NotificationDropdown />

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

            {/* Mobile: Month + Currency + Notifications + Menu */}
            <div className="flex lg:hidden items-center gap-1.5">
              {/* Mobile Month Selector - Glassy Design */}
              <div className="flex items-center bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl border border-white/50 shadow-md shadow-emerald-500/5">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-1.5 hover:bg-white/60 rounded-l-xl transition-all duration-200"
                  data-testid="mobile-month-prev-btn"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-700" />
                </button>
                <Select value={selectedMonth} onValueChange={changeMonth}>
                  <SelectTrigger className="w-[90px] h-8 border-0 bg-white/50 text-xs font-semibold text-slate-800 px-2 rounded-none" data-testid="mobile-month-selector">
                    <SelectValue>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-emerald-600" />
                        <span>{getShortMonthLabel(selectedMonth)}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {getMonthOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-1.5 hover:bg-white/60 rounded-r-xl transition-all duration-200"
                  data-testid="mobile-month-next-btn"
                >
                  <ChevronRight className="w-4 h-4 text-slate-700" />
                </button>
              </div>

              {/* Mobile Notification Bell */}
              <NotificationDropdown />

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                data-testid="mobile-menu-toggle"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
