import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile, updateProfile, updatePassword, uploadProfilePicture, deleteProfilePicture, reset as resetProfile } from '../redux/profileSlice';
import { fetchLocations, reset as resetLocations } from '../redux/locationsSlice';
import { logout } from '../../../redux/slices/authSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, RefreshCw, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { profile, loading, loadingProfile, loadingPassword, loadingPicture, error: profileError, successProfile, successPassword, successPicture } = useSelector((state) => state.adminProfile);
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
  const [picturePreview, setPicturePreview] = useState(null);

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
      toast.error(profileError || locationsError, {
        action: {
          label: 'Retry',
          onClick: () => {
            if (profileError) dispatch(fetchProfile());
            if (locationsError) dispatch(fetchLocations());
            dispatch(resetProfile());
            dispatch(resetLocations());
          },
        },
      });
    }
    if (successProfile) {
      toast.success('Profile updated successfully');
      dispatch(resetProfile());
    }
    if (successPassword) {
      toast.success('Password updated successfully');
      dispatch(resetProfile());
      setFormData((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    }
    if (successPicture) {
      toast.success('Profile picture updated successfully');
      dispatch(resetProfile());
      setProfilePicture(null);
      setPicturePreview(null);
    }
  }, [profileError, locationsError, successProfile, successPassword, successPicture, dispatch]);

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
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleRemovePicture = () => {
    setProfilePicture(null);
    setPicturePreview(null);
    setPictureError(null);
  };

  const handleDeletePicture = () => {
    dispatch(deleteProfilePicture());
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    const { name, phone } = formData;

    if (!name) {
      toast.error('Name is required');
      return;
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      toast.error('Phone number must be 10 digits');
      return;
    }

    dispatch(updateProfile({ name, phone }));
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = formData;

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
  };

  const handlePictureSubmit = (e) => {
    e.preventDefault();
    if (!profilePicture) {
      toast.error('Please select a profile picture');
      return;
    }
    dispatch(uploadProfilePicture(profilePicture));
  };

  if (loading || locationsLoading) {
    return (
      <Layout title="Profile">
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Profile">
      {(profileError || locationsError) && (
        <Alert variant="destructive" className="mb-6 border-error text-error animate-fade-in">
          <AlertDescription className="flex justify-between items-center">
            <span>{profileError || locationsError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (profileError) dispatch(fetchProfile());
                if (locationsError) dispatch(fetchLocations());
                dispatch(resetProfile());
                dispatch(resetLocations());
              }}
              className="border-accent text-accent hover:bg-accent-hover"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Personal Information */}
        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email (Read-only)</Label>
                <Input
                  id="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800 text-body border-accent opacity-50"
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
                <Label>Role (Read-only)</Label>
                <Input
                  value={profile?.role || 'Admin'}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800 text-body border-accent opacity-50"
                />
              </div>
              <Button
                type="submit"
                className="bg-accent text-body hover:bg-accent-hover w-full sm:w-auto"
                disabled={loadingProfile}
              >
                {loadingProfile ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Update Profile'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password *</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  placeholder="Enter current password"
                  className="bg-complementary text-body border-accent"
                  required
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password *</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  placeholder="Enter new password"
                  className="bg-complementary text-body border-accent"
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm new password"
                  className="bg-complementary text-body border-accent"
                  required
                />
              </div>
              <Button
                type="submit"
                className="bg-accent text-body hover:bg-accent-hover w-full sm:w-auto"
                disabled={loadingPassword}
              >
                {loadingPassword ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Profile Picture */}
        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">Profile Picture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-4">
              {picturePreview ? (
                <img
                  src={picturePreview}
                  alt="Profile Preview"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-accent"
                />
              ) : profile?.profilePicture?.path ? (
                <img
                  src={`http://localhost:5000${profile.profilePicture.path}`}
                  alt="Profile"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-accent"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-accent">
                  <UserIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-500 dark:text-gray-400" />
                </div>
              )}
              {profile?.profilePicture?.path && !picturePreview && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeletePicture}
                  className="text-error hover:bg-error-hover"
                  disabled={loadingPicture}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              )}
            </div>
            <form onSubmit={handlePictureSubmit} className="space-y-4">
              <div>
                <Label htmlFor="profilePicture">Upload New Picture (JPG, JPEG, PNG; Max 5MB)</Label>
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
                {pictureError && (
                  <div className="mt-2 text-sm text-error">{pictureError}</div>
                )}
              </div>
              <Button
                type="submit"
                className="bg-accent text-body hover:bg-accent-hover w-full sm:w-auto"
                disabled={loadingPicture || !profilePicture}
              >
                {loadingPicture ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Upload Picture'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Assigned Locations */}
        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">Assigned Locations (Read-only)</CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.locations?.length > 0 ? (
              <div className="space-y-2">
                {profile.locations.map((loc) => (
                  <TooltipProvider key={loc._id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-body hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                          {loc.name}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-complementary text-body border-accent">
                        <p><strong>Address:</strong> {loc.address}</p>
                        <p><strong>City:</strong> {loc.city}</p>
                        <p><strong>State:</strong> {loc.state}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            ) : (
              <p className="text-body">No locations assigned</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;