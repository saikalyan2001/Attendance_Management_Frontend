import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile, updateProfile, updatePassword, uploadProfilePicture, reset as resetProfile } from '../redux/profileSlice';
import { fetchLocations, reset as resetLocations } from '../redux/locationsSlice';
import { logout } from '../../../redux/slices/authSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogOut, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { profile, loading: profileLoading, error: profileError, success } = useSelector((state) => state.adminProfile);
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.adminLocations);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [pictureError, setPictureError] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/login');
    }
    dispatch(fetchProfile());
    dispatch(fetchLocations());
  }, [dispatch, user, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        name: profile.name || '',
        phone: profile.phone || '',
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (profileError || locationsError) {
      toast.error(profileError || locationsError);
      dispatch(resetProfile());
      dispatch(resetLocations());
    }
    if (success) {
      toast.success('Profile updated successfully');
      dispatch(resetProfile());
      setFormData((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setProfilePicture(null);
    }
  }, [profileError, locationsError, success, dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePictureChange = (e) => {
    const file = e.target.files[0];
    const filetypes = /jpg|jpeg|png/;
    const isValidType = filetypes.test(file.name.toLowerCase());
    const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB

    if (!isValidType) {
      setPictureError('Invalid file type. Only JPG, JPEG, PNG allowed.');
      toast.error('Invalid file type');
    } else if (!isValidSize) {
      setPictureError('File exceeds 5MB limit.');
      toast.error('File exceeds 5MB limit');
    } else {
      setPictureError(null);
      setProfilePicture(file);
    }
    e.target.value = '';
  };

  const handleRemovePicture = () => {
    setProfilePicture(null);
    setPictureError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { name, phone, currentPassword, newPassword, confirmPassword } = formData;

    if (!name) {
      toast.error('Name is required');
      return;
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      toast.error('Phone number must be 10 digits');
      return;
    }

    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        toast.error('All password fields are required');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }
      if (newPassword.length < 8) {
        toast.error('New password must be at least 8 characters');
        return;
      }
      dispatch(updatePassword({ currentPassword, newPassword }));
    }

    dispatch(updateProfile({ name, phone }));

    if (profilePicture) {
      dispatch(uploadProfilePicture(profilePicture));
    }
  };

  const handleLogout = () => {
    dispatch(logout()).then(() => {
      toast.success('Logged out successfully');
      navigate('/login');
    });
  };

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Admin Profile</h1>
          <div className="flex items-center space-x-4">
            <span>{user?.name || 'Guest'}</span>
            <ThemeToggle />
            {user && (
              <Button variant="outline" size="icon" onClick={handleLogout} aria-label="Log out">
                <LogOut className="h-5 w-5 text-accent" />
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 p-6">
          {(profileError || locationsError) && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{profileError || locationsError}</AlertDescription>
            </Alert>
          )}
          <Card className="bg-complementary text-body max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              {profileLoading || locationsLoading ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              ) : profile ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email (Read-only)</Label>
                    <Input
                      id="email"
                      value={profile.email || ''}
                      disabled
                      className="bg-complementary text-body border-accent opacity-50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Admin User"
                      className="bg-complementary text-body border-accent"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g., 1234567890"
                      className="bg-complementary text-body border-accent"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      placeholder="Enter current password"
                      className="bg-complementary text-body border-accent"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      placeholder="Enter new password"
                      className="bg-complementary text-body border-accent"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm new password"
                      className="bg-complementary text-body border-accent"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profilePicture">Profile Picture (JPG, JPEG, PNG; Max 5MB)</Label>
                    <Input
                      id="profilePicture"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={handlePictureChange}
                      className="bg-complementary text-body border-accent"
                    />
                    {profilePicture && (
                      <div className="mt-2 flex items-center justify-between text-sm text-body">
                        <span>{profilePicture.name} ({(profilePicture.size / 1024 / 1024).toFixed(2)} MB)</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemovePicture}
                          className="text-error hover:text-error-hover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {profile.profilePicture && !profilePicture && (
                      <div className="mt-2 text-sm text-body">
                        Current: {profile.profilePicture.name}
                      </div>
                    )}
                    {pictureError && (
                      <div className="mt-2 text-sm text-error">{pictureError}</div>
                    )}
                  </div>
                  <div>
                    <Label>Role (Read-only)</Label>
                    <Input
                      value={profile.role || 'Admin'}
                      disabled
                      className="bg-complementary text-body border-accent opacity-50"
                    />
                  </div>
                  <div>
                    <Label>Assigned Locations (Read-only)</Label>
                    <div className="bg-complementary border border-accent rounded-md p-2">
                      {profile.locations?.length > 0 ? (
                        profile.locations.map((loc) => (
                          <div key={loc._id} className="text-body">
                            {loc.name}
                          </div>
                        ))
                      ) : (
                        <p className="text-body">No locations assigned</p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="bg-accent text-body hover:bg-accent-hover"
                    disabled={profileLoading}
                  >
                    {profileLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Update Profile'
                    )}
                  </Button>
                </form>
              ) : (
                <p className="text-body">No profile data available</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Profile;
