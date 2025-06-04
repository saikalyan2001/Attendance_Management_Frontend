import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile, reset } from '../redux/profileSlice';
import { fetchMe } from '../../../redux/slices/authSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, X, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';

const parseServerError = (error) => {
  if (!error) return 'An unknown error occurred';
  if (typeof error === 'string') return error;
  return error.message || 'Operation failed';
};

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const { profile, recentAttendance, loading, error } = useSelector((state) => state.siteInchargeProfile);

  const [serverError, setServerError] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    dispatch(fetchMe())
      .unwrap()
      .catch((err) => {
        console.error('fetchMe error:', err);
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
      console.log('Fetching profile for user:', user.email);
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

  const handleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const sortedRecentAttendance = useMemo(() => {
    if (!recentAttendance) return [];
    return [...recentAttendance].sort((a, b) => {
      const aValue = a.employee?.name?.toLowerCase() || '';
      const bValue = b.employee?.name?.toLowerCase() || '';
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
  }, [recentAttendance, sortOrder]);

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
      <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2">
        <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in">
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
        <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            {loading || authLoading ? (
              <div className="space-y-4">
                {Array(3).fill().map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : sortedRecentAttendance?.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Date</TableHead>
                      <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">
                        <Button variant="ghost" onClick={handleSort} className="flex items-center space-x-1">
                          Employee
                          <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRecentAttendance.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                          {format(new Date(record.date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                          {record.employee?.name || 'Unknown'}
                        </TableCell>
                        <TableCell
                          className={`text-[10px] sm:text-sm xl:text-base ${
                            record.status === 'present'
                              ? 'text-green-500'
                              : record.status === 'absent'
                              ? 'text-red-500'
                              : 'text-yellow-500'
                          }`}
                        >
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-body text-[10px] sm:text-sm xl:text-base">No recent attendance records</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;