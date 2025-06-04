import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardData, reset } from '../redux/dashboardSlice';
import { logout } from '../../../redux/slices/authSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, CheckCircle, XCircle, AlertCircle, X, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const parseServerError = (error) => {
  if (!error) return 'An unknown error occurred';
  if (typeof error === 'string') return error;
  return error.message || 'Operation failed';
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { metrics, loading, error } = useSelector((state) => state.siteInchargeDashboard);
  const { user } = useSelector((state) => state.auth);

  const [serverError, setServerError] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    if (!user || user.role !== 'siteincharge') {
      navigate('/login');
      return;
    }
    if (user?.locations?.length > 0) {
      dispatch(fetchDashboardData({ location: user.locations[0]._id }));
    } else {
      setServerError('No location assigned to this user. Please contact an admin.');
      toast.error('No location assigned to this user', { duration: 10000 });
      navigate('/login');
    }
  }, [dispatch, user, navigate]);

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
    if (!metrics?.recentAttendance) return [];
    return [...metrics.recentAttendance].sort((a, b) => {
      const aValue = a.employee?.name?.toLowerCase() || '';
      const bValue = b.employee?.name?.toLowerCase() || '';
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
  }, [metrics?.recentAttendance, sortOrder]);

  const handleDismissErrors = () => {
    dispatch(reset());
    setServerError(null);
    toast.dismiss();
  };

  // Prepare chart data with Tailwind-aligned colors
  const chartData = {
    labels: metrics?.attendanceTrends?.map((trend) => format(new Date(trend.date), 'MMM d')) || [],
    datasets: [
      {
        label: 'Present',
        data: metrics?.attendanceTrends?.map((trend) => trend.present) || [],
        backgroundColor: '#22c55e', // Tailwind's text-green-500
        borderColor: '#16a34a', // Tailwind's text-green-600
        borderWidth: 1,
      },
      {
        label: 'Absent',
        data: metrics?.attendanceTrends?.map((trend) => trend.absent) || [],
        backgroundColor: '#ef4444', // Tailwind's text-red-500
        borderColor: '#dc2626', // Tailwind's text-red-600
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Employees',
          color: '#e5e7eb', // Tailwind's text-gray-200
          font: { size: 12 },
        },
        ticks: { color: '#e5e7eb' },
        grid: { color: '#4b5563' }, // Tailwind's text-gray-600
      },
      x: {
        title: {
          display: true,
          text: 'Date',
          color: '#e5e7eb',
          font: { size: 12 },
        },
        ticks: { color: '#e5e7eb' },
        grid: { color: '#4b5563' },
      },
    },
    plugins: {
      legend: {
        labels: { color: '#e5e7eb' },
      },
      tooltip: {
        backgroundColor: '#1f2937', // Tailwind's bg-gray-800
        titleColor: '#e5e7eb',
        bodyColor: '#e5e7eb',
      },
    },
  };

  return (
    <Layout title="Site Incharge Dashboard" role="siteincharge">
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
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {Array(3).fill().map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in">
              <CardHeader className="flex flex-row items-center space-x-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                <CardTitle className="text-sm sm:text-base md:text-lg xl:text-xl">Total Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold">{metrics?.totalEmployees || 0}</p>
              </CardContent>
            </Card>
            <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in">
              <CardHeader className="flex flex-row items-center space-x-2">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                <CardTitle className="text-sm sm:text-base md:text-lg xl:text-xl">Today's Present</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold">{metrics?.todayAttendance?.present || 0}</p>
              </CardContent>
            </Card>
            <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in">
              <CardHeader className="flex flex-row items-center space-x-2">
                <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                <CardTitle className="text-sm sm:text-base md:text-lg xl:text-xl">Today's Absent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold">{metrics?.todayAttendance?.absent || 0}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Recent Attendance</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              {sortedRecentAttendance?.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">
                          <Button variant="ghost" onClick={handleSort} className="flex items-center space-x-1">
                            Employee
                            <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Date</TableHead>
                        <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRecentAttendance.map((att) => (
                        <TableRow key={att._id}>
                          <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                            {att.employee?.name || 'Unknown'} ({att.employee?.employeeId || 'N/A'})
                          </TableCell>
                          <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                            {format(new Date(att.date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell
                            className={`text-[10px] sm:text-sm xl:text-base ${
                              att.status === 'present'
                                ? 'text-green-500'
                                : att.status === 'absent'
                                ? 'text-red-500'
                                : 'text-yellow-500'
                            }`}
                          >
                            {att.status.charAt(0).toUpperCase() + att.status.slice(1)}
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
          <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Leave Usage Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <p className="text-sm sm:text-base md:text-lg xl:text-xl">
                Total Leaves Taken:{' '}
                <span className="font-bold">{metrics?.leaveSummary?.totalLeaves || 0}</span>
              </p>
              <p className="text-sm sm:text-base md:text-lg xl:text-xl">
                Average Leaves per Employee:{' '}
                <span className="font-bold">{metrics?.leaveSummary?.averageLeaves?.toFixed(1) || 0}</span>
              </p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
                Attendance Trends (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="h-64 sm:h-80 md:h-96">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;