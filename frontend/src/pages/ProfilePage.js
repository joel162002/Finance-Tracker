import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import { User, KeyRound, Trash2, Save, AlertTriangle } from 'lucide-react';

export const ProfilePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  
  // Delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'password' || tab === 'delete') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!name.trim() || name.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }

    try {
      setSavingProfile(true);
      const response = await api.put('/user/profile', { name: name.trim() });
      updateUser(response.data);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setSavingPassword(true);
      await api.put('/user/password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    try {
      setDeleting(true);
      await api.delete('/user/account');
      toast.success('Account deleted successfully');
      logout();
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete account');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl tracking-tight font-light text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Account Settings
        </h1>
        <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-600">
          Manage your profile, password, and account
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="profile" data-testid="profile-tab" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="password" data-testid="password-tab" className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Password
          </TabsTrigger>
          <TabsTrigger value="delete" data-testid="delete-tab" className="flex items-center gap-2 text-red-600 data-[state=active]:text-red-600">
            <Trash2 className="w-4 h-4" />
            Delete
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center">
                <span className="text-white text-2xl font-medium">
                  {name?.charAt(0) || user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-900">{user?.name || 'User'}</h3>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="rounded-xl bg-slate-50 mt-1.5"
                  data-testid="profile-name-input"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="rounded-xl bg-slate-100 mt-1.5"
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>

              <Button
                type="submit"
                disabled={savingProfile || name === user?.name}
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl"
                data-testid="save-profile-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 mb-6">Change Password</h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="rounded-xl bg-slate-50 mt-1.5"
                  data-testid="current-password-input"
                  required
                />
              </div>

              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="rounded-xl bg-slate-50 mt-1.5"
                  data-testid="new-password-input"
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="rounded-xl bg-slate-50 mt-1.5"
                  data-testid="confirm-password-input"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl"
                data-testid="change-password-submit"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                {savingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Delete Account Tab */}
        <TabsContent value="delete">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-red-200">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-red-900">Delete Account</h3>
                <p className="text-sm text-red-700 mt-1">
                  This action is permanent and cannot be undone. All your data will be deleted forever.
                </p>
              </div>
            </div>

            <div className="bg-red-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-800 font-medium mb-2">This will permanently delete:</p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>Your account and profile information</li>
                <li>All income and expense entries</li>
                <li>Recurring transactions and budgets</li>
                <li>Products and categories you've created</li>
                <li>All settings and preferences</li>
              </ul>
            </div>

            <Button
              onClick={() => setDeleteDialogOpen(true)}
              variant="destructive"
              className="rounded-xl"
              data-testid="delete-account-trigger"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete My Account
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Account Permanently?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>This action cannot be undone. All your data will be permanently deleted.</p>
              <div>
                <Label htmlFor="delete-confirm" className="text-slate-700">
                  Type <span className="font-bold text-red-600">DELETE</span> to confirm:
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="mt-2 rounded-xl"
                  data-testid="delete-confirm-input"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || deleting}
              className="bg-red-600 hover:bg-red-700"
              data-testid="delete-account-confirm"
            >
              {deleting ? 'Deleting...' : 'Delete Forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
