import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendanceReports, fetchLeaveReports, reset } from '../redux/reportsSlice';
import { fetchMe, logout } from '../../../redux/slices/authSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, X, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const parseServerError = (error) => {
  if (!error) return 'An unknown error occurred';
  if (typeof error === 'string') return error;
  return error.message || 'Operation failed';
};

const Reports = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const { attendanceReports, leaveReports, locations, departments, loading, error } = useSelector(
    (state) => state.siteInchargeReports
  );

    

  const [month, setMonth] = useState('5'); // May 2025
  const [department, setDepartment] = useState('all');
  const [activeTab, setActiveTab] = useState('attendance');
  const [serverError, setServerError] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  const locationId = user?.locations?.[0]?._id;

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
    dispatch(fetchMe())
      .unwrap()
      .catch((err) => {
        ('fetchMe error:', err);
        toast.error('Failed to fetch user data', { duration: 5000 });
        navigate('/login');
      });
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'siteincharge')) {
      navigate('/login');
      return;
    }
    if (!authLoading && !user?.locations?.length) {
      setServerError('No location assigned. Please contact an admin.');
      toast.error('No location assigned. Please contact an admin.', { duration: 10000 });
    } else if (!authLoading && locationId) {
                }
  }, [user, authLoading, locationId, navigate]);

  useEffect(() => {
    if (locationId) {
      const year = 2025;
      const startDate = startOfMonth(new Date(year, parseInt(month) - 1));
      const endDate = endOfMonth(startDate);
      dispatch(
        fetchAttendanceReports({
          startDate,
          endDate,
          location: locationId,
          department: department === 'all' ? undefined : department,
        })
      );
      dispatch(
        fetchLeaveReports({
          startDate,
          endDate,
          location: locationId,
          department: department === 'all' ? undefined : department,
        })
      );
    }
  }, [dispatch, month, department, locationId]);

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
    doc.text(`Location: ${locations.find((loc) => loc._id === locationId)?.name || 'Unknown'}`, 14, 40);
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
          : [item.employeeId, item.name, item.availableLeaves, item.usedLeaves, item.carriedForward]
      ),
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`${type}_report_${month}_2025.pdf`);
  };

  const handleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const sortedAttendanceReports = useMemo(() => {
    return [...attendanceReports].sort((a, b) => {
      const aValue = a.name.toLowerCase();
      const bValue = b.name.toLowerCase();
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
  }, [attendanceReports, sortOrder]);

  const sortedLeaveReports = useMemo(() => {
    return [...leaveReports].sort((a, b) => {
      const aValue = a.name.toLowerCase();
      const bValue = b.name.toLowerCase();
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
  }, [leaveReports, sortOrder]);

  const handleDismissErrors = () => {
    dispatch(reset());
    setServerError(null);
    toast.dismiss();
  };

  return (
    <Layout title="Reports" role="siteincharge">
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
      <div className="space-y-6">
        <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Reports</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
              <div className="flex-1">
                <Label htmlFor="month" className="block text-[10px] sm:text-sm xl:text-lg font-medium">
                  Month
                </Label>
                <Select value={month} onValueChange={setMonth} disabled={!locationId}>
                  <SelectTrigger
                    id="month"
                    className="w-full bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md h-8 sm:h-9 xl:h-10 text-[10px] sm:text-sm xl:text-base"
                  >
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent className="bg-complementary text-body">
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-[10px] sm:text-sm xl:text-base">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="department" className="block text-[10px] sm:text-sm xl:text-lg font-medium">
                  Department
                </Label>
                <Select value={department} onValueChange={setDepartment} disabled={!locationId}>
                  <SelectTrigger
                    id="department"
                    className="w-full bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md h-8 sm:h-9 xl:h-10 text-[10px] sm:text-sm xl:text-base"
                  >
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-complementary text-body">
                    <SelectItem value="all" className="text-[10px] sm:text-sm xl:text-base">
                      All Departments
                    </SelectItem>
                    {departments.map((dep) => (
                      <SelectItem key={dep} value={dep} className="text-[10px] sm:text-sm xl:text-base">
                        {dep}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4 sm:mb-5 md:mb-6">
              <TabsList className="grid w-full grid-cols-2 bg-body border-complementary rounded-md">
                <TabsTrigger
                  value="attendance"
                  className="text-[10px] sm:text-sm xl:text-base data-[state=active]:bg-accent data-[state=active]:text-body rounded-md"
                >
                  Attendance Summary
                </TabsTrigger>
                <TabsTrigger
                  value="leaves"
                  className="text-[10px] sm:text-sm xl:text-base data-[state=active]:bg-accent data-[state=active]:text-body rounded-md"
                >
                  Leave Summary
                </TabsTrigger>
              </TabsList>
              <TabsContent value="attendance">
                <div className="flex justify-end gap-2 sm:gap-3 mb-4">
                  <Button
                    onClick={() => handleDownloadCSV('attendance')}
                    className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-base py-1 sm:py-2 px-2 sm:px-3"
                    disabled={loading || authLoading || !sortedAttendanceReports.length}
                  >
                    {loading || authLoading ? (
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    ) : (
                      'Download CSV'
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDownloadPDF('attendance')}
                    className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-base py-1 sm:py-2 px-2 sm:px-3"
                    disabled={loading || authLoading || !sortedAttendanceReports.length}
                  >
                    {loading || authLoading ? (
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    ) : (
                      'Download PDF'
                    )}
                  </Button>
                </div>
                {loading || authLoading ? (
                  <div className="space-y-4">
                    {Array(3).fill().map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : sortedAttendanceReports.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Employee ID</TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">
                            <Button variant="ghost" onClick={handleSort} className="flex items-center space-x-1">
                              Name
                              <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Present</TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Absent</TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Half Days</TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Leaves</TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Salary</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedAttendanceReports.map((report) => (
                          <TableRow key={report.employeeId}>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                              {report.employeeId}
                            </TableCell>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">{report.name}</TableCell>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                              {report.presentDays}
                            </TableCell>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                              {report.absentDays}
                            </TableCell>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                              {report.halfDays}
                            </TableCell>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                              {report.leaveDays}
                            </TableCell>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                              ₹{report.salary.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-body text-[10px] sm:text-sm xl:text-base">
                    No attendance reports available for the selected filters.
                  </p>
                )}
              </TabsContent>
              <TabsContent value="leaves">
                <div className="flex justify-end gap-2 sm:gap-3 mb-4">
                  <Button
                    onClick={() => handleDownloadCSV('leaves')}
                    className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-base py-1 sm:py-2 px-2 sm:px-3"
                    disabled={loading || authLoading || !sortedLeaveReports.length}
                  >
                    {loading || authLoading ? (
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    ) : (
                      'Download CSV'
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDownloadPDF('leaves')}
                    className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-base py-1 sm:py-2 px-2 sm:px-3"
                    disabled={loading || authLoading || !sortedLeaveReports.length}
                  >
                    {loading || authLoading ? (
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    ) : (
                      'Download PDF'
                    )}
                  </Button>
                </div>
                {loading || authLoading ? (
                  <div className="space-y-4">
                    {Array(3).fill().map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : sortedLeaveReports.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Employee ID</TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">
                            <Button variant="ghost" onClick={handleSort} className="flex items-center space-x-1">
                              Name
                              <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">
                            Available Leaves
                          </TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Used Leaves</TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">
                            Carried Forward
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedLeaveReports.map((report) => (
                          <TableRow key={report.employeeId}>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                              {report.employeeId}
                            </TableCell>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">{report.name}</TableCell>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                              {report.availableLeaves}
                            </TableCell>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                              {report.usedLeaves}
                            </TableCell>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                              {report.carriedForward}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-body text-[10px] sm:text-sm xl:text-base">
                    No leave reports available for the selected filters.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;