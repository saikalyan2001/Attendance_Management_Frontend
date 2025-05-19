import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchReports } from '../redux/reportsSlice';
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
import { format, getDaysInMonth } from 'date-fns';
import { Label } from '@/components/ui/label';

const Reports = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { reports, locations, loading, error } = useSelector((state) => state.siteInchargeReports);

  const [month, setMonth] = useState('5'); // May 2025
  const [location, setLocation] = useState('all'); // All Locations

  useEffect(() => {
    dispatch(fetchReports({ month: parseInt(month), location }));
  }, [dispatch, month, location]);

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

  const handleDownloadCSV = () => {
    const csv = Papa.unparse(reports, {
      header: true,
      columns: ['employeeId', 'name', 'presentDays', 'absentDays', 'leaveDays', 'salary'],
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance_report_${month}_2025.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

 const handleDownloadPDF = () => {
  const doc = new jsPDF();
  doc.text('Attendance Report', 14, 20);
  doc.text(`Month: ${format(new Date(2025, month - 1), 'MMMM yyyy')}`, 14, 30);
  doc.text(`Location: ${location === 'all' ? 'All Locations' : locations.find((loc) => loc._id === location)?.name || 'Unknown'}`, 14, 40);

  autoTable(doc, {
    startY: 50,
    head: [['Employee ID', 'Name', 'Present', 'Absent', 'Leaves', 'Salary']],
    body: reports.map((report) => [
      report.employeeId,
      report.name,
      report.presentDays,
      report.absentDays,
      report.leaveDays,
      `₹${report.salary.toFixed(2)}`,
    ]),
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`attendance_report_${month}_2025.pdf`);
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
        <main className="flex-1 p-6">
          {error && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Attendance Reports</CardTitle>
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
                  onClick={handleDownloadCSV}
                  className="bg-accent text-body hover:bg-accent-hover"
                  disabled={loading || !reports.length}
                >
                  Download CSV
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  className="bg-accent text-body hover:bg-accent-hover"
                  disabled={loading || !reports.length}
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
              ) : reports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-body">Employee ID</TableHead>
                      <TableHead className="text-body">Name</TableHead>
                      <TableHead className="text-body">Present</TableHead>
                      <TableHead className="text-body">Absent</TableHead>
                      <TableHead className="text-body">Leaves</TableHead>
                      <TableHead className="text-body">Salary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.employeeId}>
                        <TableCell className="text-body">{report.employeeId}</TableCell>
                        <TableCell className="text-body">{report.name}</TableCell>
                        <TableCell className="text-body">{report.presentDays}</TableCell>
                        <TableCell className="text-body">{report.absentDays}</TableCell>
                        <TableCell className="text-body">{report.leaveDays}</TableCell>
                        <TableCell className="text-body">₹{report.salary.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-complementary">No reports available for the selected filters.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Reports;