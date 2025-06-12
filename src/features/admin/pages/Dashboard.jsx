import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard, reset } from '../redux/dashboardSlice';
import { logout } from '../../../redux/slices/authSlice'; 
import Layout from '../../../components/layout/Layout';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, LogOut, MapPin, Users, CheckCircle, XCircle, Sun, Clock, Download, CalendarIcon, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { dashboardData, loading, error } = useSelector((state) => state.adminDashboard);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboard({ date: selectedDate }))
        .unwrap()
        .catch((err) => toast.error(err));
    }
  }, [dispatch, user, selectedDate]);

  useEffect(() => {
    if (error) {
      toast.error(error, {
        action: {
          label: 'Retry',
          onClick: () => {
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
    dispatch(logout())
      .unwrap()
      .then(() => {
        toast.success('Logged out successfully');
        navigate('/login');
      })
      .catch((err) => toast.error(err));
  };

  const handleExportPDF = () => {
    if (!dashboardData?.recentAttendance?.length) {
      toast.error('No recent attendance data to export');
      return;
    }
    const doc = new jsPDF();
    doc.text('Recent Attendance', 14, 20);
    doc.text(`Date: ${format(selectedDate, 'MMMM dd, yyyy')}`, 14, 30);
    autoTable(doc, {
      startY: 40,
      head: [['Employee', 'Location', 'Date', 'Status']],
      body: dashboardData.recentAttendance.map((record) => [
        `${record.employee?.name || 'Unknown'} (${record.employee?.employeeId || 'N/A'})`,
        record.location?.name || 'N/A',
        format(new Date(record.date), 'MM/dd/yyyy'),
        record.status.charAt(0).toUpperCase() + record.status.slice(1),
      ]),
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save(`recent-attendance-${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
  };

  if (loading && !dashboardData) {
    return (
      <Layout title="Dashboard">
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  const { totalLocations, totalEmployees, present, absent, leave, halfDay, recentAttendance } = dashboardData || {};

  return (
    <Layout title={`Welcome, ${user?.name || 'Admin'}`}>
      {error && (
        <Alert className="mb-6 border-error bg-error text-error animate-fade-in">
          <AlertDescription className="flex justify-between items-center">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                dispatch(fetchDashboard({ date: selectedDate }))
                  .unwrap()
                  .catch((err) => toast.error(err));
                dispatch(reset());
              }}
              className="border-accent text-accent hover:bg-accent-hover"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-6">
        {/* Date Picker for Attendance Summary */}
        <div className="flex justify-end">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto justify-start text-left font-normal bg-complementary text-body border-accent animate-fade-in"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-complementary text-body border-accent">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }
                }}
                disabled={{ after: new Date() }}
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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-fade-in">
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-accent" />
              <CardTitle className="text-sm sm:text-base">Total Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{totalLocations || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-accent" />
              <CardTitle className="text-sm sm:text-base">Total Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{totalEmployees || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green" />
              <CardTitle className="text-sm sm:text-base">Present Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{present || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-error" />
              <CardTitle className="text-sm sm:text-base">Absent Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{absent || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <Sun className="h-5 w-5 text-yellow" />
              <CardTitle className="text-sm sm:text-base">On Leave Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{leave || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-accent" />
              <CardTitle className="text-sm sm:text-base">Half-Day Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-semibold">{halfDay || 0}</p>
            </CardContent>
          </Card>
        </div>
        {/* Recent Attendance Table */}
        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-lg md:text-xl">Recent Attendance</CardTitle>
            <Button
              onClick={handleExportPDF}
              className="bg-accent text-body hover:bg-accent-hover"
              disabled={!recentAttendance?.length}
            >
              <Download className="h-4 w-4 mr-2" /> Export PDF
            </Button>
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
                  {recentAttendance?.length > 0 ? (
                    recentAttendance.map((record, index) => (
                      <TableRow
                        key={record._id}
                        className={index % 2 === 0 ? 'bg-complementary' : 'bg-complementary-light'}
                      >
                        <TableCell className="text-body text-sm sm:text-base">
                          {record.employee?.name} ({record.employee?.employeeId})
                        </TableCell>
                        <TableCell className="text-body text-sm sm:text-base">{record.location?.name || 'N/A'}</TableCell>
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
                        No recent attendance records
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;