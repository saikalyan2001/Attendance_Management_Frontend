import { useEffect, useState, useMemo, Component } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard, reset } from '../redux/dashboardSlice';
import { logout } from '../../../redux/slices/authSlice';
import Layout from '../../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, LogOut, MapPin, Users, CheckCircle, XCircle, Sun, Clock, Download, CalendarIcon, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
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
    ('ErrorBoundary caught an error:', error, errorInfo);
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

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { dashboardData, loading, error } = useSelector((state) => state.adminDashboard);

  const [selectedDate, setSelectedDate] = useState(toZonedTime(new Date(), 'Asia/Kolkata'));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Detect current theme
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      ('Unauthorized access attempt:', { user }); // Debug
      navigate('/login');
      return;
    }
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    ('Fetching dashboard data for date:', dateString, 'user:', user.email); // Debug
    dispatch(fetchDashboard({ date: selectedDate }))
      .unwrap()
      .then((data) => {
        ('Received dashboardData:', data); // Debug
      })
      .catch((err) => {
        ('Fetch dashboard error:', err); // Debug
        toast.error(err);
      });
  }, [dispatch, navigate, selectedDate]); // Removed user from dependencies

  useEffect(() => {
    if (error) {
      ('Error state triggered:', error); // Debug
      toast.error(error, {
        action: {
          label: 'Retry',
          onClick: () => {
            ('Retrying fetch for date:', format(selectedDate, 'yyyy-MM-dd')); // Debug
            dispatch(fetchDashboard({ date: selectedDate }))
              .unwrap()
              .catch((err) => toast.error(err));
            dispatch(reset());
          },
        },
      });
    }
  }, [error, dispatch, selectedDate]);

  const handleLogout = () => {
    ('Initiating logout for user:', user?.email); // Debug
    dispatch(logout())
      .unwrap()
      .then(() => {
        toast.success('Logged out successfully');
        navigate('/login');
      })
      .catch((err) => toast.error(err));
  };

  const handleRefresh = () => {
    ('Refetching for date:', format(selectedDate, 'yyyy-MM-dd')); // Debug
    dispatch(fetchDashboard({ date: selectedDate }))
      .unwrap()
      .then((data) => {
        ('Refreshed dashboardData:', data); // Debug
        toast.success('Data refreshed successfully');
      })
      .catch((err) => toast.error(err));
  };

  const handleExportPDF = () => {
    if (!filteredAttendance?.length) {
      toast.error('No recent attendance data to export');
      return;
    }
    const doc = new jsPDF();
    doc.text('Recent Attendance', 14, 20);
    doc.text(`Date: ${format(selectedDate, 'MMMM dd, yyyy')}`, 14, 30);
    autoTable(doc, {
      startY: 40,
      head: [['Employee', 'Location', 'Date', 'Status']],
      body: filteredAttendance.map((record) => [
        `${record.employee?.name || 'Unknown'} (${record.employee?.employeeId || 'N/A'})`,
        record.location?.name || 'N/A',
        format(new Date(record.date), 'MM/dd/yyyy'),
        record.status.charAt(0).toUpperCase() + record.status.slice(1),
      ]),
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: currentTheme === 'dark' ? [96, 165, 250] : [59, 130, 246] },
    });
    doc.save(`recent-attendance-${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
  };

  const handleExportCSV = () => {
    if (!filteredAttendance?.length) {
      toast.error('No recent attendance data to export');
      return [];
    }
    ('Exporting CSV with data:', filteredAttendance); // Debug
    return filteredAttendance.map((record) => ({
      Employee: `${record.employee?.name || 'Unknown'} (${record.employee?.employeeId || 'N/A'})`,
      Location: record.location?.name || 'N/A',
      Date: format(new Date(record.date), 'MM/dd/yyyy'),
      Status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
    }));
  };

  const handleDateSelect = (date) => {
    if (date) {
      const timeZone = 'Asia/Kolkata';
      const zonedDate = toZonedTime(date, timeZone);
      ('Selected date:', date, 'Zoned date:', zonedDate); // Debug
      setSelectedDate(zonedDate);
      setIsCalendarOpen(false);
    }
  };

  const filteredAttendance = useMemo(() => {
    let result = dashboardData?.recentAttendance || [];
    ('Raw recentAttendance:', result); // Debug
    if (searchQuery) {
      result = result.filter(
        (record) =>
          record.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.employee?.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((record) => record.status === statusFilter);
    }
    ('Filtered Attendance for day', format(selectedDate, 'yyyy-MM-dd'), ':', result); // Debug
    return result;
  }, [dashboardData, searchQuery, statusFilter, selectedDate]);

  const paginatedAttendance = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAttendance.slice(start, start + itemsPerPage);
  }, [filteredAttendance, currentPage]);

  const totalPages = Math.ceil(filteredAttendance.length / itemsPerPage);

  const chartData = useMemo(() => {
    const counts = {
      present: filteredAttendance.filter((record) => record.status === 'present').length,
      absent: filteredAttendance.filter((record) => record.status === 'absent').length,
      leave: filteredAttendance.filter((record) => record.status === 'leave').length,
      halfDay: filteredAttendance.filter((record) => record.status === 'half-day').length,
    };
    const data = [
      { name: 'Present', value: counts.present, fill: 'rgb(var(--color-green))' },
      { name: 'Absent', value: counts.absent, fill: 'rgb(var(--color-error))' },
      { name: 'Leave', value: counts.leave, fill: 'rgb(var(--color-yellow))' },
      { name: 'Half-Day', value: counts.halfDay, fill: 'rgb(var(--color-accent))' },
    ];
    ('Chart Data:', data); // Debug
    return data;
  }, [filteredAttendance]);

  if (loading && !dashboardData) {
    return (
      <Layout title="Dashboard">
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-accent" aria-label="Loading dashboard data" />
        </div>
      </Layout>
    );
  }

  const { totalLocations, totalEmployees, present, absent, leave, halfDay } = dashboardData || {};

  return (
    <Layout title={`Welcome, ${user?.name || 'Admin'}`}>
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
      <div className="space-y-6">
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
              <CardTitle className="text-sm sm:text-base">Total Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{totalEmployees || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green" aria-hidden="true" />
              <CardTitle className="text-sm sm:text-base">Present Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{present || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-error" aria-hidden="true" />
              <CardTitle className="text-sm sm:text-base">Absent Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{absent || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <Sun className="h-5 w-5 text-yellow" aria-hidden="true" />
              <CardTitle className="text-sm sm:text-base">On Leave Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{leave || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-accent" aria-hidden="true" />
              <CardTitle className="text-sm sm:text-base">Half-Day Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{halfDay || 0}</p>
            </CardContent>
          </Card>
        </div>
        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.every((item) => item.value === 0) ? (
              <div className="text-center text-body text-sm sm:text-base">
                No attendance data available for {format(selectedDate, 'PPP')}
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
              placeholder="Search by employee name or ID"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-complementary text-body border-accent"
              aria-label="Search employees"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
            aria-label="Filter by attendance status"
          >
            <SelectTrigger className="w-[180px] bg-complementary text-body border-accent">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent className="bg-complementary text-body border-accent">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="leave">Leave</SelectItem>
              <SelectItem value="half-day">Half-Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-lg md:text-xl">Recent Attendance</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={handleExportPDF}
                className="bg-accent text-body hover:bg-accent-hover"
                disabled={!filteredAttendance?.length}
                aria-label="Export attendance as PDF"
              >
                <Download className="h-4 w-4 mr-2" /> PDF
              </Button>
              <ErrorBoundary>
                <CSVLink
                  data={filteredAttendance?.length ? handleExportCSV() : []}
                  filename={`recent-attendance-${format(selectedDate, 'yyyy-MM-dd')}.csv`}
                  className={`inline-flex items-center px-3 py-2 rounded-md text-sm ${
                    filteredAttendance?.length
                      ? 'bg-accent text-body hover:bg-accent-hover'
                      : 'bg-complementary-light text-body opacity-50 cursor-not-allowed'
                  }`}
                  aria-label="Export attendance as CSV"
                  target={filteredAttendance?.length ? '_blank' : undefined}
                  onClick={(e) => {
                    if (!filteredAttendance?.length) {
                      e.preventDefault();
                      toast.error('No recent attendance data to export');
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
                    <TableHead className="text-body font-semibold text-sm sm:text-base">Employee</TableHead>
                    <TableHead className="text-body font-semibold text-sm sm:text-base">Location</TableHead>
                    <TableHead className="text-body font-semibold text-sm sm:text-base">Date</TableHead>
                    <TableHead className="text-body font-semibold text-sm sm:text-base">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAttendance.length > 0 ? (
                    paginatedAttendance.map((record) => (
                      <TableRow
                        key={record._id}
                        className="bg-complementary hover:bg-complementary-light"
                      >
                        <TableCell className="text-body text-sm sm:text-base">
                          {record.employee?.name || 'Unknown'} ({record.employee?.employeeId || 'N/A'})
                        </TableCell>
                        <TableCell className="text-body text-sm sm:text-base">
                          {record.location?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-body text-sm sm:text-base">
                          {format(new Date(record.date), 'PPP')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              record.status === 'present'
                                ? 'bg-green text-body'
                                : record.status === 'absent'
                                ? 'bg-error text-body'
                                : record.status === 'leave'
                                ? 'bg-yellow text-body'
                                : 'bg-accent text-body'
                            }
                          >
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-body text-sm sm:text-base">
                        No recent attendance records for {format(selectedDate, 'PPP')}
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
      </div>
    </Layout>
  );
};

export default Dashboard;