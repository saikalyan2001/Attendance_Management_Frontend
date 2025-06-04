import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendanceReport, fetchLeaveReport, fetchSalaryReport, reset as resetReports } from '../redux/reportsSlice';
import { fetchLocations, reset as resetLocations } from '../redux/locationsSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
  const dispatch = useDispatch();
  const { attendanceReport, leaveReport, salaryReport, loading: reportsLoading, error: reportsError } = useSelector((state) => state.adminReports);
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.adminLocations);
  const { user } = useSelector((state) => state.auth);

  const [month, setMonth] = useState('5'); // May 2025
  const [year, setYear] = useState('2025');
  const [location, setLocation] = useState('all');
  const [currentPage, setCurrentPage] = useState({ attendance: 1, leave: 1, salary: 1 });
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ attendance: null, leave: null, salary: null });
  const [searchQuery, setSearchQuery] = useState({ attendance: '', leave: '', salary: '' });
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const startDate = format(startOfMonth(new Date(parseInt(year), parseInt(month) - 1)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(parseInt(year), parseInt(month) - 1)), 'yyyy-MM-dd');
    dispatch(fetchAttendanceReport({ startDate, endDate, location: location === 'all' ? '' : location }));
    dispatch(fetchLeaveReport({ location: location === 'all' ? '' : location }));
    dispatch(fetchSalaryReport({ startDate, endDate, location: location === 'all' ? '' : location }));
    dispatch(fetchLocations());
  }, [dispatch, month, year, location, user]);

  useEffect(() => {
    if (reportsError || locationsError) {
      toast.error(reportsError || locationsError || 'Failed to load reports', {
        action: {
          label: 'Retry',
          onClick: () => {
            const startDate = format(startOfMonth(new Date(parseInt(year), parseInt(month) - 1)), 'yyyy-MM-dd');
            const endDate = format(endOfMonth(new Date(parseInt(year), parseInt(month) - 1)), 'yyyy-MM-dd');
            dispatch(fetchAttendanceReport({ startDate, endDate, location: location === 'all' ? '' : location }));
            dispatch(fetchLeaveReport({ location: location === 'all' ? '' : location }));
            dispatch(fetchSalaryReport({ startDate, endDate, location: location === 'all' ? '' : location }));
            dispatch(fetchLocations());
          },
        },
      });
      dispatch(resetReports());
      dispatch(resetLocations());
    }
  }, [reportsError, locationsError, dispatch, month, year, location]);

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

  const handleSort = (type, key) => {
    setSortConfig((prev) => {
      const newSort = { ...prev };
      if (newSort[type]?.key === key && newSort[type]?.direction === 'asc') {
        newSort[type] = { key, direction: 'desc' };
      } else {
        newSort[type] = { key, direction: 'asc' };
      }
      return newSort;
    });
  };

  const sortData = (data, type) => {
    if (!data || !sortConfig[type]) return data;
    const { key, direction } = sortConfig[type];
    return [...data].sort((a, b) => {
      let aValue, bValue;
      if (type === 'attendance') {
        if (key === 'employee') {
          aValue = a.employee?.name?.toLowerCase() || '';
          bValue = b.employee?.name?.toLowerCase() || '';
        } else if (key === 'location') {
          aValue = a.location?.name?.toLowerCase() || '';
          bValue = b.location?.name?.toLowerCase() || '';
        } else if (key === 'date') {
          aValue = new Date(a.date);
          bValue = new Date(b.date);
        } else {
          aValue = a[key]?.toLowerCase() || '';
          bValue = b[key]?.toLowerCase() || '';
        }
      } else if (type === 'leave') {
        if (key === 'employee') {
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
        } else if (key === 'location') {
          aValue = a.location?.name?.toLowerCase() || '';
          bValue = b.location?.name?.toLowerCase() || '';
        } else {
          aValue = a.paidLeaves[key] || 0;
          bValue = b.paidLeaves[key] || 0;
        }
      } else {
        if (key === 'employee') {
          aValue = a.employee?.name?.toLowerCase() || '';
          bValue = b.employee?.name?.toLowerCase() || '';
        } else if (key === 'location') {
          aValue = a.location?.name?.toLowerCase() || '';
          bValue = b.location?.name?.toLowerCase() || '';
        } else {
          aValue = a[key] || 0;
          bValue = b[key] || 0;
        }
      }
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filterData = (data, type) => {
    const query = searchQuery[type].toLowerCase();
    if (!query) return data;
    if (type === 'attendance') {
      return data.filter(
        (record) =>
          record.employee?.name?.toLowerCase().includes(query) ||
          record.employee?.employeeId?.toLowerCase().includes(query)
      );
    } else if (type === 'leave') {
      return data.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(query) ||
          emp.employeeId?.toLowerCase().includes(query)
      );
    } else {
      return data.filter(
        (emp) =>
          emp.employee?.name?.toLowerCase().includes(query) ||
          emp.employee?.employeeId?.toLowerCase().includes(query)
      );
    }
  };

  const paginateData = (data, type) => {
    const startIndex = (currentPage[type] - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2025, i), 'MMMM'),
  }));
  const years = ['2024', '2025', '2026'];

  // Attendance Data
  const filteredAttendance = useMemo(() => {
    if (!attendanceReport?.attendance) return [];
    return filterData(attendanceReport.attendance, 'attendance');
  }, [attendanceReport, searchQuery.attendance]);

  const sortedAttendance = useMemo(() => sortData(filteredAttendance, 'attendance'), [filteredAttendance, sortConfig.attendance]);
  const paginatedAttendance = useMemo(() => paginateData(sortedAttendance, 'attendance'), [sortedAttendance, currentPage.attendance]);

  // Leave Data
  const filteredLeave = useMemo(() => {
    if (!leaveReport?.employees) return [];
    return filterData(leaveReport.employees, 'leave');
  }, [leaveReport, searchQuery.leave]);

  const sortedLeave = useMemo(() => sortData(filteredLeave, 'leave'), [filteredLeave, sortConfig.leave]);
  const paginatedLeave = useMemo(() => paginateData(sortedLeave, 'leave'), [sortedLeave, currentPage.leave]);

  // Salary Data
  const filteredSalary = useMemo(() => {
    if (!salaryReport?.employees) return [];
    return filterData(salaryReport.employees, 'salary');
  }, [salaryReport, searchQuery.salary]);

  const sortedSalary = useMemo(() => sortData(filteredSalary, 'salary'), [filteredSalary, sortConfig.salary]);
  const paginatedSalary = useMemo(() => paginateData(sortedSalary, 'salary'), [sortedSalary, currentPage.salary]);

  return (
    <Layout title="Reports">
      {(reportsError || locationsError) && (
        <Alert variant="destructive" className="mb-6 border-error text-error">
          <AlertDescription>{reportsError || locationsError}</AlertDescription>
        </Alert>
      )}
      {/* Filters */}
      <Card className="bg-complementary text-body mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month" className="text-sm font-medium">Month</Label>
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
            <div className="space-y-2">
              <Label htmlFor="year" className="text-sm font-medium">Year</Label>
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
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">Location</Label>
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
        </CardContent>
      </Card>
      {/* Attendance Report */}
      <Card className="bg-complementary text-body mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Attendance Report</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
                className="bg-gray-100 dark:bg-gray-800 text-body"
              >
                {viewMode === 'table' ? 'Card View' : 'Table View'}
              </Button>
              <Button
                onClick={() => handleDownloadCSV('attendance')}
                className="bg-accent text-body hover:bg-accent-hover"
                disabled={reportsLoading || !attendanceReport?.attendance?.length}
              >
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
              <Button
                onClick={() => handleDownloadPDF('attendance')}
                className="bg-accent text-body hover:bg-accent-hover"
                disabled={reportsLoading || !attendanceReport?.attendance?.length}
              >
                <Download className="h-4 w-4 mr-2" /> PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-body">
              Present: {attendanceReport?.summary?.totalPresent || 0} | Absent: {attendanceReport?.summary?.totalAbsent || 0} | 
              Leave: {attendanceReport?.summary?.totalLeave || 0} | Half-Day: {attendanceReport?.summary?.totalHalfDay || 0}
            </p>
          </div>
          <div className="relative mb-4 w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-body" />
            <Input
              placeholder="Search employees..."
              className="pl-10 bg-gray-100 dark:bg-gray-800 text-body border-accent rounded-md"
              value={searchQuery.attendance}
              onChange={(e) => setSearchQuery({ ...searchQuery, attendance: e.target.value })}
            />
          </div>
          {reportsLoading ? (
            <div className="space-y-4">
              {Array(5).fill().map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAttendance.length > 0 ? (
            <>
              {viewMode === 'table' ? (
                <div className="relative overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('attendance', 'employee')}
                        >
                          Employee
                          {sortConfig.attendance?.key === 'employee' &&
                            (sortConfig.attendance.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('attendance', 'location')}
                        >
                          Location
                          {sortConfig.attendance?.key === 'location' &&
                            (sortConfig.attendance.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('attendance', 'date')}
                        >
                          Date
                          {sortConfig.attendance?.key === 'date' &&
                            (sortConfig.attendance.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('attendance', 'status')}
                        >
                          Status
                          {sortConfig.attendance?.key === 'status' &&
                            (sortConfig.attendance.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAttendance.map((record) => (
                        <TableRow key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <TableCell className="text-body truncate max-w-[200px]">
                            {record.employee?.name || 'Unknown'} ({record.employee?.employeeId || 'N/A'})
                          </TableCell>
                          <TableCell className="text-body truncate max-w-[150px]">{record.location?.name || 'Unknown'}</TableCell>
                          <TableCell className="text-body">{format(new Date(record.date), 'MM/dd/yyyy')}</TableCell>
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
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedAttendance.map((record) => (
                    <Card key={record._id} className="bg-gray-100 dark:bg-gray-800 text-body">
                      <CardContent className="p-4">
                        <p className="font-semibold truncate">
                          {record.employee?.name || 'Unknown'} ({record.employee?.employeeId || 'N/A'})
                        </p>
                        <p className="text-sm truncate">Location: {record.location?.name || 'Unknown'}</p>
                        <p className="text-sm">Date: {format(new Date(record.date), 'MM/dd/yyyy')}</p>
                        <p
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
                          Status: {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage({ ...currentPage, attendance: currentPage.attendance - 1 })}
                  disabled={currentPage.attendance === 1}
                  className="bg-gray-100 dark:bg-gray-800 text-body"
                >
                  Previous
                </Button>
                <span className="text-body">
                  Page {currentPage.attendance} of {Math.ceil(filteredAttendance.length / itemsPerPage) || 1}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage({ ...currentPage, attendance: currentPage.attendance + 1 })}
                  disabled={currentPage.attendance >= Math.ceil(filteredAttendance.length / itemsPerPage)}
                  className="bg-gray-100 dark:bg-gray-800 text-body"
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <p className="text-body text-center">No attendance records available.</p>
          )}
        </CardContent>
      </Card>
      {/* Leave Report */}
      <Card className="bg-complementary text-body mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Leave Report</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
                className="bg-gray-100 dark:bg-gray-800 text-body"
              >
                {viewMode === 'table' ? 'Card View' : 'Table View'}
              </Button>
              <Button
                onClick={() => handleDownloadCSV('leave')}
                className="bg-accent text-body hover:bg-accent-hover"
                disabled={reportsLoading || !leaveReport?.employees?.length}
              >
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
              <Button
                onClick={() => handleDownloadPDF('leave')}
                className="bg-accent text-body hover:bg-accent-hover"
                disabled={reportsLoading || !leaveReport?.employees?.length}
              >
                <Download className="h-4 w-4 mr-2" /> PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-body">
              Total Available: {leaveReport?.summary?.totalAvailable || 0} | Total Used: {leaveReport?.summary?.totalUsed || 0} | 
              Total Carried Forward: {leaveReport?.summary?.totalCarriedForward || 0}
            </p>
          </div>
          <div className="relative mb-4 w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-body" />
            <Input
              placeholder="Search employees..."
              className="pl-10 bg-gray-100 dark:bg-gray-800 text-body border-accent rounded-md"
              value={searchQuery.leave}
              onChange={(e) => setSearchQuery({ ...searchQuery, leave: e.target.value })}
            />
          </div>
          {reportsLoading ? (
            <div className="space-y-4">
              {Array(5).fill().map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLeave.length > 0 ? (
            <>
              {viewMode === 'table' ? (
                <div className="relative overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('leave', 'employee')}
                        >
                          Employee
                          {sortConfig.leave?.key === 'employee' &&
                            (sortConfig.leave.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('leave', 'location')}
                        >
                          Location
                          {sortConfig.leave?.key === 'location' &&
                            (sortConfig.leave.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('leave', 'available')}
                        >
                          Available
                          {sortConfig.leave?.key === 'available' &&
                            (sortConfig.leave.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('leave', 'used')}
                        >
                          Used
                          {sortConfig.leave?.key === 'used' &&
                            (sortConfig.leave.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('leave', 'carriedForward')}
                        >
                          Carried Forward
                          {sortConfig.leave?.key === 'carriedForward' &&
                            (sortConfig.leave.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLeave.map((emp) => (
                        <TableRow key={emp._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <TableCell className="text-body truncate max-w-[200px]">
                            {emp.name || 'Unknown'} ({emp.employeeId || 'N/A'})
                          </TableCell>
                          <TableCell className="text-body truncate max-w-[150px]">{emp.location?.name || 'Unknown'}</TableCell>
                          <TableCell className="text-body">{emp.paidLeaves.available}</TableCell>
                          <TableCell className="text-body">{emp.paidLeaves.used}</TableCell>
                          <TableCell className="text-body">{emp.paidLeaves.carriedForward}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedLeave.map((emp) => (
                    <Card key={emp._id} className="bg-gray-100 dark:bg-gray-800 text-body">
                      <CardContent className="p-4">
                        <p className="font-semibold truncate">
                          {emp.name || 'Unknown'} ({emp.employeeId || 'N/A'})
                        </p>
                        <p className="text-sm truncate">Location: {emp.location?.name || 'Unknown'}</p>
                        <p className="text-sm">Available: {emp.paidLeaves.available}</p>
                        <p className="text-sm">Used: {emp.paidLeaves.used}</p>
                        <p className="text-sm">Carried Forward: {emp.paidLeaves.carriedForward}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage({ ...currentPage, leave: currentPage.leave - 1 })}
                  disabled={currentPage.leave === 1}
                  className="bg-gray-100 dark:bg-gray-800 text-body"
                >
                  Previous
                </Button>
                <span className="text-body">
                  Page {currentPage.leave} of {Math.ceil(filteredLeave.length / itemsPerPage) || 1}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage({ ...currentPage, leave: currentPage.leave + 1 })}
                  disabled={currentPage.leave >= Math.ceil(filteredLeave.length / itemsPerPage)}
                  className="bg-gray-100 dark:bg-gray-800 text-body"
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <p className="text-body text-center">No employees found.</p>
          )}
        </CardContent>
      </Card>
      {/* Salary Report */}
      <Card className="bg-complementary text-body">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Salary Report</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
                className="bg-gray-100 dark:bg-gray-800 text-body"
              >
                {viewMode === 'table' ? 'Card View' : 'Table View'}
              </Button>
              <Button
                onClick={() => handleDownloadCSV('salary')}
                className="bg-accent text-body hover:bg-accent-hover"
                disabled={reportsLoading || !salaryReport?.employees?.length}
              >
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
              <Button
                onClick={() => handleDownloadPDF('salary')}
                className="bg-accent text-body hover:bg-accent-hover"
                disabled={reportsLoading || !salaryReport?.employees?.length}
              >
                <Download className="h-4 w-4 mr-2" /> PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-body">
              Total Present Days: {salaryReport?.summary?.totalPresentDays || 0} | Total Half Days: {salaryReport?.summary?.totalHalfDays || 0} | 
              Total Leave Days: {salaryReport?.summary?.totalLeaveDays || 0} | Total Salary: ${salaryReport?.summary?.totalSalary?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="relative mb-4 w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-body" />
            <Input
              placeholder="Search employees..."
              className="pl-10 bg-gray-100 dark:bg-gray-800 text-body border-accent rounded-md"
              value={searchQuery.salary}
              onChange={(e) => setSearchQuery({ ...searchQuery, salary: e.target.value })}
            />
          </div>
          {reportsLoading ? (
            <div className="space-y-4">
              {Array(5).fill().map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredSalary.length > 0 ? (
            <>
              {viewMode === 'table' ? (
                <div className="relative overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('salary', 'employee')}
                        >
                          Employee
                          {sortConfig.salary?.key === 'employee' &&
                            (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('salary', 'location')}
                        >
                          Location
                          {sortConfig.salary?.key === 'location' &&
                            (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('salary', 'presentDays')}
                        >
                          Present Days
                          {sortConfig.salary?.key === 'presentDays' &&
                            (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('salary', 'halfDays')}
                        >
                          Half Days
                          {sortConfig.salary?.key === 'halfDays' &&
                            (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('salary', 'leaveDays')}
                        >
                          Leave Days
                          {sortConfig.salary?.key === 'leaveDays' &&
                            (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                        <TableHead
                          className="text-body font-semibold cursor-pointer sticky top-0"
                          onClick={() => handleSort('salary', 'totalSalary')}
                        >
                          Total Salary
                          {sortConfig.salary?.key === 'totalSalary' &&
                            (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSalary.map((emp) => (
                        <TableRow key={emp.employee._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <TableCell className="text-body truncate max-w-[200px]">
                            {emp.employee?.name || 'Unknown'} ({emp.employee?.employeeId || 'N/A'})
                          </TableCell>
                          <TableCell className="text-body truncate max-w-[150px]">{emp.location?.name || 'Unknown'}</TableCell>
                          <TableCell className="text-body">{emp.presentDays}</TableCell>
                          <TableCell className="text-body">{emp.halfDays}</TableCell>
                          <TableCell className="text-body">{emp.leaveDays}</TableCell>
                          <TableCell className="text-body">${emp.totalSalary.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedSalary.map((emp) => (
                    <Card key={emp.employee._id} className="bg-gray-100 dark:bg-gray-800 text-body">
                      <CardContent className="p-4">
                        <p className="font-semibold truncate">
                          {emp.employee?.name || 'Unknown'} ({emp.employee?.employeeId || 'N/A'})
                        </p>
                        <p className="text-sm truncate">Location: {emp.location?.name || 'Unknown'}</p>
                        <p className="text-sm">Present Days: {emp.presentDays}</p>
                        <p className="text-sm">Half Days: {emp.halfDays}</p>
                        <p className="text-sm">Leave Days: {emp.leaveDays}</p>
                        <p className="text-sm">Total Salary: ${emp.totalSalary.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage({ ...currentPage, salary: currentPage.salary - 1 })}
                  disabled={currentPage.salary === 1}
                  className="bg-gray-100 dark:bg-gray-800 text-body"
                >
                  Previous
                </Button>
                <span className="text-body">
                  Page {currentPage.salary} of {Math.ceil(filteredSalary.length / itemsPerPage) || 1}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage({ ...currentPage, salary: currentPage.salary + 1 })}
                  disabled={currentPage.salary >= Math.ceil(filteredSalary.length / itemsPerPage)}
                  className="bg-gray-100 dark:bg-gray-800 text-body"
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <p className="text-body text-center">No salary records available.</p>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Reports;