import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendanceReport, fetchLeaveReport, reset as resetReports } from '../redux/reportsSlice';
import { fetchLocations, reset as resetLocations } from '../redux/locationsSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { logout } from '../../../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const AdminReports = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { attendanceReport, leaveReport, loading: reportsLoading, error: reportsError } = useSelector((state) => state.adminReports);
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.adminLocations);

  const [month, setMonth] = useState('5'); // May 2025
  const [location, setLocation] = useState('all'); // All Locations

  useEffect(() => {
    const year = 2025;
    const startDate = format(startOfMonth(new Date(year, parseInt(month) - 1)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(year, parseInt(month) - 1)), 'yyyy-MM-dd');
    dispatch(fetchAttendanceReport({ startDate, endDate, location: location === 'all' ? '' : location }));
    dispatch(fetchLeaveReport({ location: location === 'all' ? '' : location }));
    dispatch(fetchLocations());
  }, [dispatch, month, location]);

  useEffect(() => {
    if (reportsError || locationsError) {
      toast.error(reportsError || locationsError);
      dispatch(resetReports());
      dispatch(resetLocations());
    }
  }, [reportsError, locationsError, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleDownloadCSV = (type) => {
    let data, filename, columns;
    if (type === 'attendance') {
      data = attendanceReport?.attendance?.map((record) => ({
        Employee: `${record.employee?.name} (${record.employee?.employeeId})`,
        Location: record.location?.name,
        Date: format(new Date(record.date), 'MM/dd/yyyy'),
        Status: record.status,
      })) || [];
      filename = `attendance-report-${month}-2025.csv`;
      columns = ['Employee', 'Location', 'Date', 'Status'];
    } else {
      data = leaveReport?.employees?.map((emp) => ({
        Employee: `${emp.name} (${emp.employeeId})`,
        Location: emp.location?.name,
        Available: emp.paidLeaves.available,
        Used: emp.paidLeaves.used,
        CarriedForward: emp.paidLeaves.carriedForward,
      })) || [];
      filename = `leave-report-${month}-2025.csv`;
      columns = ['Employee', 'Location', 'Available', 'Used', 'CarriedForward'];
    }

    const csv = Papa.unparse(data, {
      header: true,
      columns,
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = (type) => {
    const doc = new jsPDF();
    const title = type === 'attendance' ? 'Attendance Report' : 'Leave Report';
    doc.text(title, 14, 20);
    doc.text(`Month: ${format(new Date(2025, parseInt(month) - 1), 'MMMM yyyy')}`, 14, 30);
    doc.text(
      `Location: ${location === 'all' ? 'All Locations' : locations.find((loc) => loc._id === location)?.name || 'Unknown'}`,
      14,
      40
    );

    if (type === 'attendance') {
      autoTable(doc, {
        startY: 50,
        head: [['Employee', 'Location', 'Date', 'Status']],
        body: attendanceReport?.attendance?.map((record) => [
          `${record.employee?.name} (${record.employee?.employeeId})`,
          record.location?.name,
          format(new Date(record.date), 'MM/dd/yyyy'),
          record.status.charAt(0).toUpperCase() + record.status.slice(1),
        ]) || [],
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    } else {
      autoTable(doc, {
        startY: 50,
        head: [['Employee', 'Location', 'Available', 'Used', 'Carried Forward']],
        body: leaveReport?.employees?.map((emp) => [
          `${emp.name} (${emp.employeeId})`,
          emp.location?.name,
          emp.paidLeaves.available,
          emp.paidLeaves.used,
          emp.paidLeaves.carriedForward,
        ]) || [],
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    doc.save(`${type}-report-${month}-2025.pdf`);
  };

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Reports</h1>
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
        <main className="flex-1 p-6 space-y-6">
          {(reportsError || locationsError) && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{reportsError || locationsError}</AlertDescription>
            </Alert>
          )}
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Attendance Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Label htmlFor="month">Month</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger id="month" className="bg-complementary text-body border-accent">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="location">Location</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger id="location" className="bg-complementary text-body border-accent">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc._id} value={loc._id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-4 mb-4">
                <Button
                  onClick={() => handleDownloadCSV('attendance')}
                  className="bg-accent text-body hover:bg-accent-hover"
                  disabled={reportsLoading || !attendanceReport?.attendance?.length}
                >
                  Download CSV
                </Button>
                <Button
                  onClick={() => handleDownloadPDF('attendance')}
                  className="bg-accent text-body hover:bg-accent-hover"
                  disabled={reportsLoading || !attendanceReport?.attendance?.length}
                >
                  Download PDF
                </Button>
              </div>
              {reportsLoading ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              ) : attendanceReport?.attendance?.length > 0 ? (
                <>
                  <div className="mb-4">
                    <p className="text-body">
                      Present: {attendanceReport?.summary.totalPresent || 0} | Absent:{' '}
                      {attendanceReport?.summary.totalAbsent || 0} | Leave:{' '}
                      {attendanceReport?.summary.totalLeave || 0}
                    </p>
                  </div>
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
                      {attendanceReport.attendance.map((record) => (
                        <TableRow key={record._id}>
                          <TableCell className="text-body">
                            {record.employee?.name} ({record.employee?.employeeId})
                          </TableCell>
                          <TableCell className="text-body">{record.location?.name}</TableCell>
                          <TableCell className="text-body">
                            {format(new Date(record.date), 'MM/dd/yyyy')}
                          </TableCell>
                          <TableCell
                            className={
                              record.status === 'present'
                                ? 'text-green-500'
                                : record.status === 'absent'
                                ? 'text-red-500'
                                : 'text-yellow-500'
                            }
                          >
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <p className="text-complementary">No attendance records available for the selected filters.</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Leave Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end gap-4 mb-4">
                <Button
                  onClick={() => handleDownloadCSV('leave')}
                  className="bg-accent text-body hover:bg-accent-hover"
                  disabled={reportsLoading || !leaveReport?.employees?.length}
                >
                  Download CSV
                </Button>
                <Button
                  onClick={() => handleDownloadPDF('leave')}
                  className="bg-accent text-body hover:bg-accent-hover"
                  disabled={reportsLoading || !leaveReport?.employees?.length}
                >
                  Download PDF
                </Button>
              </div>
              {reportsLoading ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              ) : leaveReport?.employees?.length > 0 ? (
                <>
                  <div className="mb-4">
                    <p className="text-body">
                      Total Available: {leaveReport?.summary.totalAvailable || 0} | Total Used:{' '}
                      {leaveReport?.summary.totalUsed || 0} | Total Carried Forward:{' '}
                      {leaveReport?.summary.totalCarriedForward || 0}
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-body">Employee</TableHead>
                        <TableHead className="text-body">Location</TableHead>
                        <TableHead className="text-body">Available Leaves</TableHead>
                        <TableHead className="text-body">Used Leaves</TableHead>
                        <TableHead className="text-body">Carried Forward</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveReport.employees.map((emp) => (
                        <TableRow key={emp._id}>
                          <TableCell className="text-body">
                            {emp.name} ({emp.employeeId})
                          </TableCell>
                          <TableCell className="text-body">{emp.location?.name}</TableCell>
                          <TableCell className="text-body">{emp.paidLeaves.available}</TableCell>
                          <TableCell className="text-body">{emp.paidLeaves.used}</TableCell>
                          <TableCell className="text-body">{emp.paidLeaves.carriedForward}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <p className="text-complementary">No employees found for the selected filters.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default AdminReports;