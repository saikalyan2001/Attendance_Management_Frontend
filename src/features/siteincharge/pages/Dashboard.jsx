import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardData } from '../redux/dashboardSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
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

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { metrics, loading, error } = useSelector((state) => state.siteInchargeDashboard);

  // Hardcoded location for no-auth
  const locationId = '1234567890abcdef1234567a';

  useEffect(() => {
    dispatch(fetchDashboardData({ location: locationId }));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch({ type: 'siteInchargeDashboard/reset' });
    }
  }, [error, dispatch]);

  // Prepare chart data
  const chartData = {
    labels: metrics?.attendanceTrends?.map((trend) => format(new Date(trend.date), 'MMM d')) || [],
    datasets: [
      {
        label: 'Present',
        data: metrics?.attendanceTrends?.map((trend) => trend.present) || [],
        backgroundColor: '#22c55e',
        borderColor: '#16a34a',
        borderWidth: 1,
      },
      {
        label: 'Absent',
        data: metrics?.attendanceTrends?.map((trend) => trend.absent) || [],
        backgroundColor: '#ef4444',
        borderColor: '#dc2626',
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
          color: '#e5e7eb',
        },
        ticks: { color: '#e5e7eb' },
        grid: { color: '#4b5563' },
      },
      x: {
        title: {
          display: true,
          text: 'Date',
          color: '#e5e7eb',
        },
        ticks: { color: '#e5e7eb' },
        grid: { color: '#4b5563' },
      },
    },
    plugins: {
      legend: {
        labels: { color: '#e5e7eb' },
      },
    },
  };

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Site Incharge Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span>Guest</span>
            <ThemeToggle />
            <Button variant="outline" size="icon" onClick={() => navigate('/login')} aria-label="Navigate to login">
              <Loader2 className="h-5 w-5 text-accent" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 space-y-6">
          {error && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array(3)
                .fill()
                .map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-complementary text-body">
                  <CardHeader className="flex flex-row items-center space-x-2">
                    <Users className="h-5 w-5 text-accent" />
                    <CardTitle>Total Employees</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{metrics?.totalEmployees || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-complementary text-body">
                  <CardHeader className="flex flex-row items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <CardTitle>Today's Present</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{metrics?.todayAttendance?.present || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-complementary text-body">
                  <CardHeader className="flex flex-row items-center space-x-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <CardTitle>Today's Absent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{metrics?.todayAttendance?.absent || 0}</p>
                  </CardContent>
                </Card>
              </div>
              <Card className="bg-complementary text-body">
                <CardHeader>
                  <CardTitle>Recent Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics?.recentAttendance?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-body">Employee</TableHead>
                          <TableHead className="text-body">Date</TableHead>
                          <TableHead className="text-body">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.recentAttendance.map((att) => (
                          <TableRow key={att._id}>
                            <TableCell className="text-body">
                              {att.employee.name} ({att.employee.employeeId})
                            </TableCell>
                            <TableCell className="text-body">{format(new Date(att.date), 'MMM d, yyyy')}</TableCell>
                            <TableCell
                              className={
                                att.status === 'present'
                                  ? 'text-green-500'
                                  : att.status === 'absent'
                                  ? 'text-red-500'
                                  : 'text-yellow-500'
                              }
                            >
                              {att.status.charAt(0).toUpperCase() + att.status.slice(1)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-body">No recent attendance records</p>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-complementary text-body">
                <CardHeader>
                  <CardTitle>Leave Usage Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg">
                    Total Leaves Taken: <span className="font-bold">{metrics?.leaveSummary?.totalLeaves || 0}</span>
                  </p>
                  <p className="text-lg">
                    Average Leaves per Employee:{' '}
                    <span className="font-bold">{metrics?.leaveSummary?.averageLeaves?.toFixed(1) || 0}</span>
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-complementary text-body">
                <CardHeader>
                  <CardTitle>Attendance Trends (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Bar data={chartData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;