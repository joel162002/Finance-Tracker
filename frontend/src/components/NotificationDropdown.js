import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle,
  Calendar,
  Info,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'budget_warning':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'budget_danger':
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    case 'budget_exceeded':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'recurring_due':
      return <Calendar className="w-4 h-4 text-blue-500" />;
    case 'recurring_created':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    default:
      return <Info className="w-4 h-4 text-slate-500" />;
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high':
      return 'border-l-red-500';
    case 'normal':
      return 'border-l-amber-500';
    default:
      return 'border-l-slate-300';
  }
};

export const NotificationDropdown = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    loading 
  } = useNotifications();

  const recentNotifications = notifications.slice(0, 5);

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const formatTime = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          data-testid="notification-bell"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <h3 className="font-medium text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-slate-500 hover:text-slate-700 h-7"
              data-testid="mark-all-read-btn"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            Loading...
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No notifications yet</p>
            <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <>
            {recentNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`px-3 py-3 cursor-pointer hover:bg-slate-50 transition-colors border-l-2 ${getPriorityColor(notification.priority)} ${
                  !notification.is_read ? 'bg-blue-50/50' : ''
                }`}
                data-testid={`notification-item-${notification.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.is_read ? 'font-medium text-slate-900' : 'text-slate-700'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
            ))}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onClick={() => navigate('/notifications')}
              className="justify-center text-sm text-emerald-600 hover:text-emerald-700 cursor-pointer"
              data-testid="view-all-notifications"
            >
              View all notifications
              <ExternalLink className="w-3 h-3 ml-1" />
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
