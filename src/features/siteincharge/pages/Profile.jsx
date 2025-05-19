import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile } from '../redux/profileSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LogOut } from 'lucide-react';
import { logout } from '../../../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { profile, recentAttendance, loading, error } = useSelector((state) => state.siteInchargeProfile);

  useEffect(() => {
    if (user) {
      dispatch(fetchProfile());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch({ type: 'siteInchargeProfile/reset' });
    }
  }, [error, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Profile</h1>
          <div className="flex items-center space-x-4">
            <span>{user?.email || 'Guest'}</span>
            <ThemeToggle />
            {user && (
              <Button variant="outline" size="icon" onClick={handleLogout} aria-label="Log out">
                <LogOut className="h-5 w-5 text-accent" />
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 p-6">
          {error && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-complementary text-body">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-6 w-2/3" />
                  </div>
                ) : (
                  <dl className="space-y-2">
                    <div className="flex">
                      <dt className="font-semibold w-1/3">Email:</dt>
                      <dd className="w-2/3">{profile?.email || 'N/A'}</dd>
                    </div>
                    <div className="flex">
                      <dt className="font-semibold w-1/3">Role:</dt>
                      <dd className="w-2/3">{profile?.role || 'N/A'}</dd>
                    </div>
                    <div className="flex">
                      <dt className="font-semibold w-1/3">Location:</dt>
                      <dd className="w-2/3">{profile?.location?.name || 'Not assigned'}</dd>
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>
            <Card className="bg-complementary text-body">
              <CardHeader>
                <CardTitle>Account Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-32 w-full" />
                ) : recentAttendance?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-body">Date</TableHead>
                        <TableHead className="text-body">Employee</TableHead>
                        <TableHead className="text-body">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentAttendance.map((record) => (
                        <TableRow key={record._id}>
                          <TableCell className="text-body">{format(new Date(record.date), 'PPP')}</TableCell>
                          <TableCell className="text-body">{record.employee?.name || 'Unknown'}</TableCell>
                          <TableCell
                            className={
                              record.status === 'present' ? 'text-accent' : 'text-error'
                            }
                          >
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-complementary">No recent attendance records</p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;