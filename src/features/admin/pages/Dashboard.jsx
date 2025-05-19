import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard } from '../redux/dashboardSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { dashboardData, loading, error } = useSelector((state) => state.adminDashboard);

  useEffect(() => {
    dispatch(fetchDashboard())
      .unwrap()
      .catch((err) => toast.error(err));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch({ type: 'admin/reset' });
    }
  }, [error, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const { totalLocations, totalEmployees, present, absent, recentAttendance } = dashboardData || {};

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-complementary text-body">
                <CardHeader>
                  <CardTitle>Total Locations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{totalLocations || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-complementary text-body">
                <CardHeader>
                  <CardTitle>Total Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{totalEmployees || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-complementary text-body">
                <CardHeader>
                  <CardTitle>Present Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{present || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-complementary text-body">
                <CardHeader>
                  <CardTitle>Absent Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{absent || 0}</p>
                </CardContent>
              </Card>
            </div>
            <Card className="bg-complementary text-body">
              <CardHeader>
                <CardTitle>Recent Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-body">Employee</TableHead>
                      <TableHead className="text-body">Location</TableHead>
                      <TableHead className="text-body">Date</TableHead>
                      <TableHead className="text-body">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentAttendance?.length > 0 ? (
                      recentAttendance.map((record) => (
                        <TableRow key={record._id}>
                          <TableCell className="text-body">{record.employee?.name} ({record.employee?.employeeId})</TableCell>
                          <TableCell className="text-body">{record.location?.name}</TableCell>
                          <TableCell className="text-body">{new Date(record.date).toLocaleDateString()}</TableCell>
                          <TableCell className={record.status === 'present' ? 'text-green-500' : 'text-red-500'}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-body">No recent attendance</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;