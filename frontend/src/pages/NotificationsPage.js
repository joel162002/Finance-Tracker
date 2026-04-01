import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle,
  Calendar,
  Info,
  Check,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'budget_warning':
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    case 'budget_danger':
      return <AlertCircle className="w-5 h-5 text-orange-500" />;
    case 'budget_exceeded':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'recurring_due':
      return <Calendar className="w-5 h-5 text-blue-500" />;
    case 'recurring_created':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    default:
      return <Info className="w-5 h-5 text-slate-500" />;
  }
};

const getNotificationBg = (type, isRead) => {
  if (isRead) return 'bg-white';
  switch (type) {
    case 'budget_warning':
      return 'bg-amber-50';
    case 'budget_danger':
      return 'bg-orange-50';
    case 'budget_exceeded':
      return 'bg-red-50';
    case 'recurring_due':
      return 'bg-blue-50';
    case 'recurring_created':
      return 'bg-emerald-50';
    default:
      return 'bg-slate-50';
  }
};

const getPriorityBadge = (priority) => {
  switch (priority) {
    case 'high':
      return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">High</span>;
    case 'normal':
      return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Normal</span>;
    default:
      return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Low</span>;
  }
};

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    loading,
    fetchNotifications,
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    checkRecurringNotifications
  } = useNotifications();

  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkRecurringNotifications();
    await fetchNotifications();
    setRefreshing(false);
  };

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
      const date = new Date(dateString);
      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 1) {
        return formatDistanceToNow(date, { addSuffix: true });
      } else if (diffDays < 7) {
        return format(date, "EEEE 'at' h:mm a");
      } else {
        return format(date, "MMM d 'at' h:mm a");
      }
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Notifications
          </h1>
          <p className="text-slate-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-xl"
            data-testid="refresh-notifications-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={markAllAsRead}
              className="rounded-xl"
              data-testid="mark-all-read-page-btn"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setClearDialogOpen(true)}
              className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
              data-testid="clear-all-btn"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
          <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-700 mb-2">No notifications</h3>
          <p className="text-slate-500">
            You're all caught up! We'll notify you when something important happens.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`${getNotificationBg(notification.type, notification.is_read)} rounded-xl p-4 border border-slate-200 transition-all hover:shadow-md cursor-pointer`}
              onClick={() => handleNotificationClick(notification)}
              data-testid={`notification-${notification.id}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className={`text-base ${!notification.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {notification.title}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {notification.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getPriorityBadge(notification.priority)}
                      {!notification.is_read && (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-500">
                      {formatTime(notification.created_at)}
                    </span>
                    <div className="flex gap-2">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="h-7 text-xs text-slate-500 hover:text-slate-700"
                          data-testid={`mark-read-${notification.id}`}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Mark read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="h-7 text-xs text-slate-500 hover:text-red-600"
                        data-testid={`delete-${notification.id}`}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your notifications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearAllNotifications();
                setClearDialogOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
