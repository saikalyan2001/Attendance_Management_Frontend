import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile, reset } from '../redux/profileSlice';
import { fetchMe } from '../../../redux/slices/authSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const parseServerError = (error) => {
  if (!error) return 'An unknown error occurred';
  if (typeof error === 'string') return error;
  return error.message || 'Operation failed';
};

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const { profile, loading, error } = useSelector((state) => state.siteInchargeProfile);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    dispatch(fetchMe())
      .unwrap()
      .catch((err) => {
        ('fetchMe error:', err);
        toast.error('Failed to fetch user data', { duration: 5000 });
        navigate('/login');
      });
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'siteincharge')) {
      navigate('/login');
      return;
    }
    if (!authLoading && user) {
      dispatch(fetchProfile());
    }
  }, [dispatch, user, authLoading, navigate]);

  useEffect(() => {
    if (error) {
      const parsedError = parseServerError(error);
      setServerError(parsedError);
      toast.error(parsedError, {
        action: {
          label: 'Dismiss',
          onClick: () => {
            dispatch(reset());
            setServerError(null);
          },
        },
        duration: 10000,
      });
    }
  }, [error, dispatch]);

  const handleDismissErrors = () => {
    dispatch(reset());
    setServerError(null);
    toast.dismiss();
  };

  return (
    <Layout title="Profile" role="siteincharge">
      {serverError && (
        <Alert variant="destructive" className="mb-4 sm:mb-5 md:mb-6 border-error text-error max-w-2xl mx-auto rounded-md relative animate-fade-in">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          <AlertTitle className="text-[10px] sm:text-sm md:text-base xl:text-lg font-bold">Error</AlertTitle>
          <AlertDescription className="text-[10px] sm:text-sm md:text-base xl:text-lg">
            <p>{serverError}</p>
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissErrors}
            className="absolute top-2 right-2 text-error hover:text-error-hover"
            aria-label="Dismiss errors"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Alert>
      )}
      <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          {loading || authLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : profile ? (
            <dl className="space-y-2">
              <div className="flex">
                <dt className="font-semibold w-1/3 text-[10px] sm:text-sm xl:text-base">Email:</dt>
                <dd className="w-2/3 text-[10px] sm:text-sm xl:text-base">{profile.email || 'N/A'}</dd>
              </div>
              <div className="flex">
                <dt className="font-semibold w-1/3 text-[10px] sm:text-sm xl:text-base">Role:</dt>
                <dd className="w-2/3 text-[10px] sm:text-sm xl:text-base">{profile.role || 'N/A'}</dd>
              </div>
              <div className="flex">
                <dt className="font-semibold w-1/3 text-[10px] sm:text-sm xl:text-base">Location:</dt>
                <dd className="w-2/3 text-[10px] sm:text-sm xl:text-base">{profile.locations?.[0]?.name || 'Not assigned'}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-body text-[10px] sm:text-sm xl:text-base">No profile data available</p>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Profile;