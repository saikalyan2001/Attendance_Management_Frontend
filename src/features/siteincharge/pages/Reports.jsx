import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendanceReports, fetchLeaveReports } from '../redux/reportsSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut } from 'lucide-react';
import { logout } from '../../../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Reports = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { attendanceReports, leaveReports, locations, departments, loading, error } = useSelector(
    (state) => state.siteInchargeReports
  );

  const [month, setMonth] = useState('5'); // May 2025
  const [location, setLocation] = useState('1234567890abcdef1234567a'); // Location A
  const [department, setDepartment] = useState('all');
  const [activeTab, setActiveTab] = useState('attendance');

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

  useEffect(() => {
    const year = 2025;
    const startDate = startOfMonth(new Date(year, parseInt(month) - 1));
    const endDate = endOfMonth(startDate);
    dispatch(
      fetchAttendanceReports({
        startDate,
        endDate,
        location,
        department: department === 'all' ? undefined : department,
      })
    );
    dispatch(
      fetchLeaveReports({
        startDate,
        endDate,
        location,
        department: department === 'all' ? undefined : department,
      })
    );
  }, [dispatch, month, location, department]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch({ type: 'siteInchargeReports/reset' });
    }
  }, [error, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleDownloadCSV = (type) => {
    const data = type === 'attendance' ? attendanceReports : leaveReports;
    const filename = type === 'attendance' ? 'attendance_report' : 'leave_report';
    const columns =
      type === 'attendance'
        ? ['employeeId', 'name', 'presentDays', 'absentDays', 'halfDays', 'leaveDays', 'salary']
        : ['employeeId', 'name', 'availableLeaves', 'usedLeaves', 'carriedForward'];

    const csv = Papa.unparse(data, { header: true, columns });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${month}_2025.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = (type) => {
    const doc = new jsPDF();
    const title = type === 'attendance' ? 'Attendance Report' : 'Leave Report';
    const data = type === 'attendance' ? attendanceReports : leaveReports;

    doc.text(title, 14, 20);
    doc.text(`Month: ${months.find((m) => m.value === month)?.label} 2025`, 14, 30);
    doc.text(
      `Location: ${location === 'all' ? 'All Locations' : locations.find((loc) => loc._id === location)?.name || 'Unknown'}`,
      14, 40
    );
    doc.text(`Department: ${department === 'all' ? 'All Departments' : department}`, 14, 50);

    autoTable(doc, {
      startY: 60,
      head:
        type === 'attendance'
          ? [['Employee ID', 'Name', 'Present', 'Absent', 'Half Days', 'Leaves', 'Salary']]
          : [['Employee ID', 'Name', 'Available Leaves', 'Used Leaves', 'Carried Forward']],
      body: data.map((item) =>
        type === 'attendance'
          ? [
              item.employeeId,
              item.name,
              item.presentDays,
              item.absentDays,
              item.halfDays,
              item.leaveDays,
              `₹${item.salary.toFixed(2)}`,
            ]
          : [
              item.employeeId,
              item.name,
              item.availableLeaves,
              item.usedLeaves,
              item.carriedForward,
            ]
      ),
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`${type}_report_${month}_2025.pdf`);
  };

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
        <main className="flex-1 p-6">
          {error && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Reports</CardTitle>
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
                <div className="flex-1">
                  <Label htmlFor="department">Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger id="department" className="bg-complementary text-body border-accent">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dep) => (
                        <SelectItem key={dep} value={dep}>
                          {dep}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="attendance">Attendance Summary</TabsTrigger>
                  <TabsTrigger value="leaves">Leave Summary</TabsTrigger>
                </TabsList>
                <TabsContent value="attendance">
                  <div className="flex justify-end gap-4 mb-4">
                    <Button
                      onClick={() => handleDownloadCSV('attendance')}
                      className="bg-accent text-body hover:bg-accent-hover"
                      disabled={loading || !attendanceReports.length}
                    >
                      Download CSV
                    </Button>
                    <Button
                      onClick={() => handleDownloadPDF('attendance')}
                      className="bg-accent text-body hover:bg-accent-hover"
                      disabled={loading || !attendanceReports.length}
                    >
                      Download PDF
                    </Button>
                  </div>
                  {loading ? (
                    <div className="space-y-4">
                      {Array(3)
                        .fill()
                        .map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                  ) : attendanceReports.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-body">Employee ID</TableHead>
                          <TableHead className="text-body">Name</TableHead>
                          <TableHead className="text-body">Present</TableHead>
                          <TableHead className="text-body">Absent</TableHead>
                          <TableHead className="text-body">Half Days</TableHead>
                          <TableHead className="text-body">Leaves</TableHead>
                          <TableHead className="text-body">Salary</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceReports.map((report) => (
                          <TableRow key={report.employeeId}>
                            <TableCell className="text-body">{report.employeeId}</TableCell>
                            <TableCell className="text-body">{report.name}</TableCell>
                            <TableCell className="text-body">{report.presentDays}</TableCell>
                            <TableCell className="text-body">{report.absentDays}</TableCell>
                            <TableCell className="text-body">{report.halfDays}</TableCell>
                            <TableCell className="text-body">{report.leaveDays}</TableCell>
                            <TableCell className="text-body">₹{report.salary.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-complementary">No attendance reports available for the selected filters.</p>
                  )}
                </TabsContent>
                <TabsContent value="leaves">
                  <div className="flex justify-end gap-4 mb-4">
                    <Button
                      onClick={() => handleDownloadCSV('leaves')}
                      className="bg-accent text-body hover:bg-accent-hover"
                      disabled={loading || !leaveReports.length}
                    >
                      Download CSV
                    </Button>
                    <Button
                      onClick={() => handleDownloadPDF('leaves')}
                      className="bg-accent text-body hover:bg-accent-hover"
                      disabled={loading || !leaveReports.length}
                    >
                      Download PDF
                    </Button>
                  </div>
                  {loading ? (
                    <div className="space-y-4">
                      {Array(3)
                        .fill()
                        .map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                  ) : leaveReports.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-body">Employee ID</TableHead>
                          <TableHead className="text-body">Name</TableHead>
                          <TableHead className="text-body">Available Leaves</TableHead>
                          <TableHead className="text-body">Used Leaves</TableHead>
                          <TableHead className="text-body">Carried Forward</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaveReports.map((report) => (
                          <TableRow key={report.employeeId}>
                            <TableCell className="text-body">{report.employeeId}</TableCell>
                            <TableCell className="text-body">{report.name}</TableCell>
                            <TableCell className="text-body">{report.availableLeaves}</TableCell>
                            <TableCell className="text-body">{report.usedLeaves}</TableCell>
                            <TableCell className="text-body">{report.carriedForward}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-complementary">No leave reports available for the selected filters.</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Reports;