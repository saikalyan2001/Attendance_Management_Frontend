// src/features/superadmin/pages/Dashboard.jsx
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState, useMemo, Component } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchSuperAdminDashboard, reset } from '../redux/superAdminDashboardSlice';
import { logout } from '../../../redux/slices/authSlice';
import { toast } from 'react-hot-toast';
import Layout from '../../../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from '../../../components/common/ThemeToggle';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ToasterProvider from '../../../components/common/ToasterProvider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Loader2, MapPin, Users, CheckCircle, XCircle, Activity, Settings, BarChart as BarChartIcon, Clock, Download, CalendarIcon, RefreshCw, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CSVLink } from 'react-csv';

// Simple Error Boundary Component
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-error text-center p-4">
          Something went wrong. Please try again.
        </div>
      );
    }
    return this.props.children;
  }
}

const SuperAdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { dashboardData, loading, error } = useSelector((state) => state.superAdminDashboard);

  const [selectedDate, setSelectedDate] = useState(toZonedTime(new Date(), 'Asia/Kolkata'));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Detect current theme
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      
      navigate('/login');
      return;
    }
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    
    dispatch(fetchSuperAdminDashboard({ date: selectedDate }))
      .unwrap()
      .then((data) => {
        
      })
      .catch((err) => {
        
        toast.error(err);
      });
  }, [dispatch, navigate, selectedDate]);

  useEffect(() => {
    if (error) {
      
      toast.error(error, {
        action: {
          label: 'Retry',
          onClick: () => {
            
            dispatch(fetchSuperAdminDashboard({ date: selectedDate }))
              .unwrap()
              .catch((err) => toast.error(err));
            dispatch(reset());
          },
        },
      });
    }
  }, [error, dispatch, selectedDate]);

  const handleLogout = () => {
    
    dispatch(logout())
      .unwrap()
      .then(() => {
        toast.success('Logged out successfully');
        navigate('/login');
      })
      .catch((err) => toast.error(err));
  };

  const handleRefresh = () => {
    
    dispatch(fetchSuperAdminDashboard({ date: selectedDate }))
      .unwrap()
      .then((data) => {
        
        toast.success('Data refreshed successfully');
      })
      .catch((err) => toast.error(err));
  };

  const handleExportPDF = () => {
    if (!filteredActivity?.length) {
      toast.error('No recent user activity data to export');
      return;
    }
    const doc = new jsPDF();
    doc.text('Recent User Activity', 14, 20);
    doc.text(`Date: ${format(selectedDate, 'MMMM dd, yyyy')}`, 14, 30);
    autoTable(doc, {
      startY: 40,
      head: [['User', 'Role', 'Date', 'Action']],
      body: filteredActivity.map((record) => [
        `${record.user?.name || 'Unknown'} (${record.user?.email || 'N/A'})`,
        record.user?.role || 'N/A',
        format(new Date(record.timestamp), 'MM/dd/yyyy'),
        record.action || 'N/A',
      ]),
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: currentTheme === 'dark' ? [96, 165, 250] : [59, 130, 246] },
    });
    doc.save(`recent-user-activity-${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
  };

  const handleExportCSV = () => {
    if (!filteredActivity?.length) {
      toast.error('No recent user activity data to export');
      return [];
    }
    
    return filteredActivity.map((record) => ({
      User: `${record.user?.name || 'Unknown'} (${record.user?.email || 'N/A'})`,
      Role: record.user?.role || 'N/A',
      Date: format(new Date(record.timestamp), 'MM/dd/yyyy'),
      Action: record.action || 'N/A',
    }));
  };

  const handleDateSelect = (date) => {
    if (date) {
      const timeZone = 'Asia/Kolkata';
      const zonedDate = toZonedTime(date, timeZone);
      
      setSelectedDate(zonedDate);
      setIsCalendarOpen(false);
      setCurrentPage(1);
    }
  };

  const filteredActivity = useMemo(() => {
    let result = dashboardData?.recentActivity || [];
    
    if (searchQuery) {
      result = result.filter(
        (record) =>
          record.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (roleFilter !== 'all') {
      result = result.filter((record) => record.user?.role === roleFilter);
    }
    
    return result;
  }, [dashboardData, searchQuery, roleFilter, selectedDate]);

  const paginatedActivity = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredActivity.slice(start, start + itemsPerPage);
  }, [filteredActivity, currentPage]);

  const totalPages = Math.ceil(filteredActivity.length / itemsPerPage);

  const chartData = useMemo(() => {
    const counts = {
      admin: filteredActivity.filter((record) => record.user?.role === 'admin').length,
      siteincharge: filteredActivity.filter((record) => record.user?.role === 'siteincharge').length,
    };
    const data = [
      { name: 'Admins', value: counts.admin, fill: 'rgb(var(--color-green))' },
      { name: 'Site Incharges', value: counts.siteincharge, fill: 'rgb(var(--color-accent))' },
    ];
    
    return data;
  }, [filteredActivity]);

  if (loading && !dashboardData) {
    return (
      <Layout title="Super Admin Dashboard">
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-accent" aria-label="Loading dashboard data" />
        </div>
      </Layout>
    );
  }

  const { totalUsers, totalLocations, totalAdmins, totalSiteIncharges, activeUsers, inactiveUsers } = dashboardData || {};

  return (
    <Layout title={`Welcome, ${user?.name || 'Super Admin'}`}>
      <div className="space-y-6">
        {error && (
          <Alert className="mb-6 border-error bg-error text-error animate-fade-in">
            <AlertDescription className="flex justify-between items-center">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="border-accent text-accent hover:bg-accent-hover"
                aria-label="Retry fetching dashboard data"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const timeZone = 'Asia/Kolkata';
                const today = toZonedTime(new Date(), timeZone);
                setSelectedDate(today);
              }}
              className="bg-complementary text-body border-accent"
              aria-label="Select today's date"
            >
              Today
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="bg-complementary text-body border-accent"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto justify-start text-left font-normal bg-complementary text-body border-accent animate-fade-in"
                aria-label="Select a specific date"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-complementary text-body border-accent">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => date > toZonedTime(new Date(), 'Asia/Kolkata')}
                className="rounded-md p-4"
                calendarClassName="text-lg"
                dayClassName="h-10 w-10 rounded-full hover:bg-accent-light"
                styles={{
                  head_row: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    backgroundColor: 'var(--color-complementary)',
                    borderBottom: '1px solid var(--color-accent)',
                  },
                  head_cell: {
                    flex: '1',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'var(--color-body)',
                  },
                  cell: {
                    flex: 1,
                    textAlign: 'center',
                  },
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-fade-in">
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-accent" aria-hidden="true" />
              <CardTitle className="text-sm sm:text-base">Total Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{totalLocations || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-accent" aria-hidden="true" />
              <CardTitle className="text-sm sm:text-base">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{totalUsers || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green" aria-hidden="true" />
              <CardTitle className="text-sm sm:text-base">Total Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{totalAdmins || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-accent" aria-hidden="true" />
              <CardTitle className="text-sm sm:text-base">Total Site Incharges</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{totalSiteIncharges || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green" aria-hidden="true" />
              <CardTitle className="text-sm sm:text-base">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{activeUsers || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-error" aria-hidden="true" />
              <CardTitle className="text-sm sm:text-base">Inactive Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{inactiveUsers || 0}</p>
            </CardContent>
          </Card>
        </div>
        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">User Activity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.every((item) => item.value === 0) ? (
              <div className="text-center text-body text-sm sm:text-base">
                No user activity data available for {format(selectedDate, 'PPP')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <XAxis dataKey="name" stroke="rgb(var(--color-text))" />
                  <YAxis stroke="rgb(var(--color-text))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(var(--color-complementary))',
                      borderColor: 'rgb(var(--color-accent))',
                      color: 'rgb(var(--color-text))',
                    }}
                  />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search by user name or email"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-complementary text-body border-accent"
              aria-label="Search users"
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(value) => {
              setRoleFilter(value);
              setCurrentPage(1);
            }}
            aria-label="Filter by user role"
          >
            <SelectTrigger className="w-[180px] bg-complementary text-body border-accent">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent className="bg-complementary text-body border-accent">
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="siteincharge">Site Incharge</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-lg md:text-xl">Recent User Activity</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={handleExportPDF}
                className="bg-accent text-body hover:bg-accent-hover"
                disabled={!filteredActivity?.length}
                aria-label="Export user activity as PDF"
              >
                <Download className="h-4 w-4 mr-2" /> PDF
              </Button>
              <ErrorBoundary>
                <CSVLink
                  data={filteredActivity?.length ? handleExportCSV() : []}
                  filename={`recent-user-activity-${format(selectedDate, 'yyyy-MM-dd')}.csv`}
                  className={`inline-flex items-center px-3 py-2 rounded-md text-sm ${
                    filteredActivity?.length
                      ? 'bg-accent text-body hover:bg-accent-hover'
                      : 'bg-complementary-light text-body opacity-50 cursor-not-allowed'
                  }`}
                  aria-label="Export user activity as CSV"
                  target={filteredActivity?.length ? '_blank' : undefined}
                  onClick={(e) => {
                    if (!filteredActivity?.length) {
                      e.preventDefault();
                      toast.error('No recent user activity data to export');
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" /> CSV
                </CSVLink>
              </ErrorBoundary>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="bg-complementary-light">
                    <TableHead className="text-body font-semibold text-sm sm:text-base">User</TableHead>
                    <TableHead className="text-body font-semibold text-sm sm:text-base">Role</TableHead>
                    <TableHead className="text-body font-semibold text-sm sm:text-base">Date</TableHead>
                    <TableHead className="text-body font-semibold text-sm sm:text-base">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedActivity.length > 0 ? (
                    paginatedActivity.map((record) => (
                      <TableRow
                        key={record._id}
                        className="bg-complementary hover:bg-complementary-light"
                      >
                        <TableCell className="text-body text-sm sm:text-base">
                          {record.user?.name || 'Unknown'} ({record.user?.email || 'N/A'})
                        </TableCell>
                        <TableCell className="text-body text-sm sm:text-base">
                          {record.user?.role || 'N/A'}
                        </TableCell>
                        <TableCell className="text-body text-sm sm:text-base">
                          {format(new Date(record.timestamp), 'PPP')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              record.action === 'login'
                                ? 'bg-green text-body'
                                : 'bg-accent text-body'
                            }
                          >
                            {record.action ? record.action.charAt(0).toUpperCase() + record.action.slice(1) : 'N/A'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-body text-sm sm:text-base">
                        No recent user activity for {format(selectedDate, 'PPP')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="bg-complementary text-body border-accent"
                  aria-label="Previous page"
                >
                  Previous
                </Button>
                <span className="text-body self-center">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="bg-complementary text-body border-accent"
                  aria-label="Next page"
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link to="/superadmin/users">
                <Button
                  className="w-full bg-accent text-body hover:bg-accent-hover h-10"
                  aria-label="Manage Users"
                >
                  <Users className="h-5 w-5 mr-2" /> Manage Users
                </Button>
              </Link>
              <Link to="/admin/employees">
                <Button
                  className="w-full bg-accent text-body hover:bg-accent-hover h-10"
                  aria-label="Manage Employees"
                >
                  <Users className="h-5 w-5 mr-2" /> Manage Employees
                </Button>
              </Link>
              <Link to="/admin/locations">
                <Button
                  className="w-full bg-accent text-body hover:bg-accent-hover h-10"
                  aria-label="Manage Locations"
                >
                  <MapPin className="h-5 w-5 mr-2" /> Manage Locations
                </Button>
              </Link>
              <Link to="/admin/reports">
                <Button
                  className="w-full bg-accent text-body hover:bg-accent-hover h-10"
                  aria-label="View Reports"
                >
                  <BarChartIcon className="h-5 w-5 mr-2" /> View Reports
                </Button>
              </Link>
              <Link to="/admin/attendance">
                <Button
                  className="w-full bg-accent text-body hover:bg-accent-hover h-10"
                  aria-label="View Attendance"
                >
                  <Clock className="h-5 w-5 mr-2" /> View Attendance
                </Button>
              </Link>
              <Link to="/admin/settings">
                <Button
                  className="w-full bg-accent text-body hover:bg-accent-hover h-10"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5 mr-2" /> Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SuperAdminDashboard;