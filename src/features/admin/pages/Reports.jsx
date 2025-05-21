import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendanceReport, fetchLeaveReport, fetchSalaryReport, reset as resetReports } from '../redux/reportsSlice';
import { fetchLocations, reset as resetLocations } from '../redux/locationsSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const Reports = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { attendanceReport, leaveReport, salaryReport, loading: reportsLoading, error: reportsError } = useSelector((state) => state.adminReports);
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.adminLocations);

  const [month, setMonth] = useState('5'); // May 2025
  const [year, setYear] = useState('2025');
  const [location, setLocation] = useState('all');

  useEffect(() => {
    const startDate = format(startOfMonth(new Date(parseInt(year), parseInt(month) - 1)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(parseInt(year), parseInt(month) - 1)), 'yyyy-MM-dd');
    dispatch(fetchAttendanceReport({ startDate, endDate, location: location === 'all' ? '' : location }));
    dispatch(fetchLeaveReport({ location: location === 'all' ? '' : location }));
    dispatch(fetchSalaryReport({ startDate, endDate, location: location === 'all' ? '' : location }));
    dispatch(fetchLocations());
  }, [dispatch, month, year, location]);

  useEffect(() => {
    if (reportsError || locationsError) {
      toast.error(reportsError || locationsError || 'Failed to load reports');
      dispatch(resetReports());
      dispatch(resetLocations());
    }
  }, [reportsError, locationsError, dispatch]);

  const handleDownloadCSV = (type) => {
    let data, filename, columns;
    if (type === 'attendance') {
      if (!attendanceReport?.attendance?.length) {
        toast.error('No attendance data to export');
        return;
      }
      data = attendanceReport.attendance.map((record) => ({
        Employee: `${record.employee?.name || 'Unknown'} (${record.employee?.employeeId || 'N/A'})`,
        Location: record.location?.name || 'Unknown',
        Date: format(new Date(record.date), 'MM/dd/yyyy'),
        Status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
      }));
      filename = `attendance-report-${month}-${year}.csv`;
      columns = ['Employee', 'Location', 'Date', 'Status'];
    } else if (type === 'leave') {
      if (!leaveReport?.employees?.length) {
        toast.error('No leave data to export');
        return;
      }
      data = leaveReport.employees.map((emp) => ({
        Employee: `${emp.name || 'Unknown'} (${emp.employeeId || 'N/A'})`,
        Location: emp.location?.name || 'Unknown',
        Available: emp.paidLeaves.available,
        Used: emp.paidLeaves.used,
        CarriedForward: emp.paidLeaves.carriedForward,
      }));
      filename = `leave-report-${month}-${year}.csv`;
      columns = ['Employee', 'Location', 'Available', 'Used', 'CarriedForward'];
    } else {
      if (!salaryReport?.employees?.length) {
        toast.error('No salary data to export');
        return;
      }
      data = salaryReport.employees.map((emp) => ({
        Employee: `${emp.employee?.name || 'Unknown'} (${emp.employee?.employeeId || 'N/A'})`,
        Location: emp.location?.name || 'Unknown',
        PresentDays: emp.presentDays,
        HalfDays: emp.halfDays,
        LeaveDays: emp.leaveDays,
        TotalSalary: `$${emp.totalSalary.toFixed(2)}`,
      }));
      filename = `salary-report-${month}-${year}.csv`;
      columns = ['Employee', 'Location', 'PresentDays', 'HalfDays', 'LeaveDays', 'TotalSalary'];
    }

    const csv = Papa.unparse(data, { header: true, columns });
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
    if (type === 'attendance' && !attendanceReport?.attendance?.length) {
      toast.error('No attendance data to export');
      return;
    }
    if (type === 'leave' && !leaveReport?.employees?.length) {
      toast.error('No leave data to export');
      return;
    }
    if (type === 'salary' && !salaryReport?.employees?.length) {
      toast.error('No salary data to export');
      return;
    }

    const doc = new jsPDF();
    const title = type === 'attendance' ? 'Attendance Report' : type === 'leave' ? 'Leave Report' : 'Salary Report';
    doc.text(title, 14, 20);
    doc.text(`Month: ${format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy')}`, 14, 30);
    doc.text(
      `Location: ${location === 'all' ? 'All Locations' : locations.find((loc) => loc._id === location)?.name || 'Unknown'}`,
      14,
      40
    );

    if (type === 'attendance') {
      autoTable(doc, {
        startY: 50,
        head: [['Employee', 'Location', 'Date', 'Status']],
        body: attendanceReport.attendance.map((record) => [
          `${record.employee?.name || 'Unknown'} (${record.employee?.employeeId || 'N/A'})`,
          record.location?.name || 'Unknown',
          format(new Date(record.date), 'MM/dd/yyyy'),
          record.status.charAt(0).toUpperCase() + record.status.slice(1),
        ]),
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    } else if (type === 'leave') {
      autoTable(doc, {
        startY: 50,
        head: [['Employee', 'Location', 'Available', 'Used', 'Carried Forward']],
        body: leaveReport.employees.map((emp) => [
          `${emp.name || 'Unknown'} (${emp.employeeId || 'N/A'})`,
          emp.location?.name || 'Unknown',
          emp.paidLeaves.available,
          emp.paidLeaves.used,
          emp.paidLeaves.carriedForward,
        ]),
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    } else {
      autoTable(doc, {
        startY: 50,
        head: [['Employee', 'Location', 'Present Days', 'Half Days', 'Leave Days', 'Total Salary']],
        body: salaryReport.employees.map((emp) => [
          `${emp.employee?.name || 'Unknown'} (${emp.employee?.employeeId || 'N/A'})`,
          emp.location?.name || 'Unknown',
          emp.presentDays,
          emp.halfDays,
          emp.leaveDays,
          `$${emp.totalSalary.toFixed(2)}`,
        ]),
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    doc.save(`${type}-report-${month}-${year}.pdf`);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2025, i), 'MMMM'),
  }));
  const years = ['2024', '2025', '2026'];

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Reports</h1>
          <div className="flex items-center space-x-4">
            <span>Guest</span>
            <ThemeToggle />
            <Button variant="outline" size="icon" onClick={() => navigate('/login')} aria-label="Log out">
              <LogOut className="h-5 w-5 text-accent" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 space-y-6">
          {(reportsError || locationsError) && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{reportsError || locationsError}</AlertDescription>
            </Alert>
          )}
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
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
            <div>
              <Label htmlFor="year">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="year" className="bg-complementary text-body border-accent">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="bg-complementary text-body">
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
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
          {/* Attendance Report */}
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Attendance Report</CardTitle>
            </CardHeader>
            <CardContent>
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
                <div className="space-y-4">
                  {Array(5).fill().map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : attendanceReport?.attendance?.length > 0 ? (
                <>
                  <div className="mb-4">
                    <p className="text-body">
                      Present: {attendanceReport.summary?.totalPresent || 0} | Absent: {attendanceReport.summary?.totalAbsent || 0} | 
                      Leave: {attendanceReport.summary?.totalLeave || 0} | Half-Day: {attendanceReport.summary?.totalHalfDay || 0}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
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
                              {record.employee?.name || 'Unknown'} ({record.employee?.employeeId || 'N/A'})
                            </TableCell>
                            <TableCell className="text-body">{record.location?.name || 'Unknown'}</TableCell>
                            <TableCell className="text-body">
                              {format(new Date(record.date), 'MM/dd/yyyy')}
                            </TableCell>
                            <TableCell
                              className={
                                record.status === 'present'
                                  ? 'text-green-500'
                                  : record.status === 'absent'
                                  ? 'text-red-500'
                                  : record.status === 'half-day'
                                  ? 'text-blue-500'
                                  : 'text-yellow-500'
                              }
                            >
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <p className="text-body">No attendance records available.</p>
              )}
            </CardContent>
          </Card>
          {/* Leave Report */}
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
                <div className="space-y-4">
                  {Array(5).fill().map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : leaveReport?.employees?.length > 0 ? (
                <>
                  <div className="mb-4">
                    <p className="text-body">
                      Total Available: {leaveReport.summary?.totalAvailable || 0} | Total Used: {leaveReport.summary?.totalUsed || 0} | 
                      Total Carried Forward: {leaveReport.summary?.totalCarriedForward || 0}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
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
                              {emp.name || 'Unknown'} ({emp.employeeId || 'N/A'})
                            </TableCell>
                            <TableCell className="text-body">{emp.location?.name || 'Unknown'}</TableCell>
                            <TableCell className="text-body">{emp.paidLeaves.available}</TableCell>
                            <TableCell className="text-body">{emp.paidLeaves.used}</TableCell>
                            <TableCell className="text-body">{emp.paidLeaves.carriedForward}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <p className="text-body">No employees found.</p>
              )}
            </CardContent>
          </Card>
          {/* Salary Report */}
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Salary Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end gap-4 mb-4">
                <Button
                  onClick={() => handleDownloadCSV('salary')}
                  className="bg-accent text-body hover:bg-accent-hover"
                  disabled={reportsLoading || !salaryReport?.employees?.length}
                >
                  Download CSV
                </Button>
                <Button
                  onClick={() => handleDownloadPDF('salary')}
                  className="bg-accent text-body hover:bg-accent-hover"
                  disabled={reportsLoading || !salaryReport?.employees?.length}
                >
                  Download PDF
                </Button>
              </div>
              {reportsLoading ? (
                <div className="space-y-4">
                  {Array(5).fill().map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : salaryReport?.employees?.length > 0 ? (
                <>
                  <div className="mb-4">
                    <p className="text-body">
                      Total Present Days: {salaryReport.summary?.totalPresentDays || 0} | Total Half Days: {salaryReport.summary?.totalHalfDays || 0} | 
                      Total Leave Days: {salaryReport.summary?.totalLeaveDays || 0} | Total Salary: ${salaryReport.summary?.totalSalary.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-body">Employee</TableHead>
                          <TableHead className="text-body">Location</TableHead>
                          <TableHead className="text-body">Present Days</TableHead>
                          <TableHead className="text-body">Half Days</TableHead>
                          <TableHead className="text-body">Leave Days</TableHead>
                          <TableHead className="text-body">Total Salary</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salaryReport.employees.map((emp) => (
                          <TableRow key={emp.employee._id}>
                            <TableCell className="text-body">
                              {emp.employee?.name || 'Unknown'} ({emp.employee?.employeeId || 'N/A'})
                            </TableCell>
                            <TableCell className="text-body">{emp.location?.name || 'Unknown'}</TableCell>
                            <TableCell className="text-body">{emp.presentDays}</TableCell>
                            <TableCell className="text-body">{emp.halfDays}</TableCell>
                            <TableCell className="text-body">{emp.leaveDays}</TableCell>
                            <TableCell className="text-body">${emp.totalSalary.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <p className="text-body">No salary records available.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Reports;
