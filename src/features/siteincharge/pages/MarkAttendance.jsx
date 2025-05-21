import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmployees } from '../redux/employeeSlice';
import { markAttendance, fetchMonthlyAttendance, bulkMarkAttendance, requestAttendanceEdit } from '../redux/attendanceSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { Label } from '@/components/ui/label';

const MarkAttendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { employees, loading: empLoading } = useSelector((state) => state.siteInchargeEmployee);
  const { monthlyAttendance, loading, error } = useSelector((state) => state.siteInchargeAttendance);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [attendanceData, setAttendanceData] = useState({});
  const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('present');
  const [formError, setFormError] = useState(null);
  const [requestDialog, setRequestDialog] = useState({
    open: false,
    attendanceId: null,
    employeeName: '',
    date: null,
    currentStatus: '',
  });
  const [requestedStatus, setRequestedStatus] = useState('');
  const [reason, setReason] = useState('');

  // Hardcoded location for no-auth
  const locationId = '1234567890abcdef1234567a';

  useEffect(() => {
    dispatch(fetchEmployees({ location: locationId }));
    dispatch(fetchMonthlyAttendance({ month: monthFilter, year: yearFilter, location: locationId }));
  }, [dispatch, monthFilter, yearFilter]);

  useEffect(() => {
    if (error) {
      toast.error(error || 'Failed to process attendance');
      dispatch({ type: 'siteInchargeAttendance/reset' });
    }
  }, [error, dispatch]);

  const handleAttendanceChange = (employeeId, status) => {
    setAttendanceData((prev) => ({
      ...prev,
      [employeeId]: status,
    }));
  };

  const handleBulkSelect = (employeeId) => {
    setBulkSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setBulkSelectedEmployees(employees.map((emp) => emp._id));
    } else {
      setBulkSelectedEmployees([]);
    }
  };

  const handleBulkSubmit = () => {
    setFormError(null);
    if (!bulkSelectedEmployees.length) {
      setFormError('No employees selected');
      toast.error('Please select at least one employee');
      return;
    }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const attendanceRecords = bulkSelectedEmployees.map((employeeId) => ({
      employeeId,
      date: dateStr,
      status: bulkStatus,
      location: locationId,
    }));
    dispatch(bulkMarkAttendance(attendanceRecords))
      .unwrap()
      .then(() => {
        toast.success('Bulk attendance marked successfully');
        setBulkSelectedEmployees([]);
        setBulkStatus('present');
        const selectedMonth = selectedDate.getMonth() + 1;
        const selectedYear = selectedDate.getFullYear();
        setMonthFilter(selectedMonth);
        setYearFilter(selectedYear);
        dispatch({ type: 'siteInchargeAttendance/resetMonthly' });
        dispatch(fetchMonthlyAttendance({ month: selectedMonth, year: selectedYear, location: locationId }));
      })
      .catch((err) => {
        setFormError(err);
        toast.error(err);
      });
  };

  const handleSubmit = () => {
    setFormError(null);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const attendanceRecords = employees.map((emp) => ({
      employeeId: emp._id,
      date: dateStr,
      status: attendanceData[emp._id] || 'present',
      location: locationId,
    }));
    if (!attendanceRecords.length) {
      setFormError('No employees available');
      toast.error('No employees available');
      return;
    }
    dispatch(markAttendance(attendanceRecords))
      .unwrap()
      .then(() => {
        toast.success('Attendance marked successfully');
        setAttendanceData({});
        const selectedMonth = selectedDate.getMonth() + 1;
        const selectedYear = selectedDate.getFullYear();
        setMonthFilter(selectedMonth);
        setYearFilter(selectedYear);
        dispatch({ type: 'siteInchargeAttendance/resetMonthly' });
        dispatch(fetchMonthlyAttendance({ month: selectedMonth, year: selectedYear, location: locationId }));
      })
      .catch((err) => {
        setFormError(err);
        toast.error(err);
      });
  };

  const handleRequestEdit = (attendanceId, employeeName, date, currentStatus) => {
    setRequestDialog({
      open: true,
      attendanceId,
      employeeName,
      date,
      currentStatus,
    });
    setRequestedStatus('');
    setReason('');
  };

  const submitRequestEdit = () => {
    if (!requestedStatus || !reason) {
      toast.error('Please select a status and provide a reason');
      return;
    }
    dispatch(
      requestAttendanceEdit({
        attendanceId: requestDialog.attendanceId,
        requestedStatus,
        reason,
      })
    )
      .unwrap()
      .then(() => {
        toast.success('Edit request submitted successfully');
        setRequestDialog({ open: false, attendanceId: null, employeeName: '', date: null, currentStatus: '' });
        setRequestedStatus('');
        setReason('');
      })
      .catch((err) => toast.error(err));
  };

  const handleMonthChange = (value) => {
    setMonthFilter(parseInt(value));
  };

  const handleYearChange = (value) => {
    setYearFilter(parseInt(value));
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const startDate = startOfMonth(new Date(yearFilter, monthFilter - 1));
  const endDate = endOfMonth(startDate);
  const days = eachDayOfInterval({ start: startDate, end: endDate }).map((day) => ({
    date: day,
    dayName: format(day, 'EEE'),
    formatted: format(day, 'MMM d'),
  }));

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Mark Attendance</h1>
          <div className="flex items-center space-x-4">
            <span>Guest</span>
            <ThemeToggle />
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/login')}
              aria-label="Navigate to login"
            >
              <Loader2 className="h-5 w-5 text-accent" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 space-y-6">
          {formError && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <Card className="bg-complementary text-body max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Mark Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium">
                    Select Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-complementary text-body border-accent"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        disabled={{ after: new Date() }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Bulk Mark Attendance
                  </label>
                  <div className="flex items-center gap-4 mb-4">
                    <Select
                      value={bulkStatus}
                      onValueChange={setBulkStatus}
                      className="bg-complementary text-body border-accent"
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="half-day">Half Day</SelectItem>
                        <SelectItem value="leave">Paid Leave</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleBulkSubmit}
                      className="bg-accent text-body hover:bg-accent-hover"
                      disabled={loading || empLoading || !bulkSelectedEmployees.length}
                    >
                      Apply to Selected
                    </Button>
                  </div>
                  {empLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : employees.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-body">
                            <Checkbox
                              checked={bulkSelectedEmployees.length === employees.length}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead className="text-body">Employee</TableHead>
                          <TableHead className="text-body">Available Leaves</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((emp) => (
                          <TableRow key={emp._id}>
                            <TableCell>
                              <Checkbox
                                checked={bulkSelectedEmployees.includes(emp._id)}
                                onCheckedChange={() => handleBulkSelect(emp._id)}
                              />
                            </TableCell>
                            <TableCell className="text-body">
                              {emp.name} ({emp.employeeId})
                            </TableCell>
                            <TableCell className="text-body">
                              {emp.paidLeaves.available}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-body">No employees found</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Individual Attendance
                  </label>
                  {empLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : employees.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-body">Employee</TableHead>
                          <TableHead className="text-body">Status</TableHead>
                          <TableHead className="text-body">Available Leaves</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((emp) => (
                          <TableRow key={emp._id}>
                            <TableCell className="text-body">
                              {emp.name} ({emp.employeeId})
                            </TableCell>
                            <TableCell className="text-body">
                              <Select
                                value={attendanceData[emp._id] || 'present'}
                                onValueChange={(value) => handleAttendanceChange(emp._id, value)}
                              >
                                <SelectTrigger className="bg-complementary text-body border-accent">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-complementary text-body">
                                  <SelectItem value="present">Present</SelectItem>
                                  <SelectItem value="absent">Absent</SelectItem>
                                  <SelectItem value="half-day">Half Day</SelectItem>
                                  <SelectItem
                                    value="leave"
                                    disabled={emp.paidLeaves.available < 1}
                                  >
                                    Paid Leave
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-body">
                              {emp.paidLeaves.available}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-body">No employees found</p>
                  )}
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={handleSubmit}
                    className="bg-accent text-body hover:bg-accent-hover"
                    disabled={loading || empLoading || !employees.length}
                  >
                    Mark Attendance
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Monthly Attendance
                <div className="flex gap-4">
                  <Select value={monthFilter.toString()} onValueChange={handleMonthChange}>
                    <SelectTrigger className="bg-complementary text-body border-accent w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={yearFilter.toString()} onValueChange={handleYearChange}>
                    <SelectTrigger className="bg-complementary text-body border-accent w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading || empLoading ? (
                <div className="space-y-4">
                  {Array(3)
                    .fill()
                    .map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
              ) : employees.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-body sticky left-0 bg-complementary">
                          Employee
                        </TableHead>
                        {days.map((day) => (
                          <TableHead key={day.formatted} className="text-body">
                            {day.dayName}
                            <br />
                            {day.formatted}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp) => (
                        <TableRow key={emp._id}>
                          <TableCell className="text-body sticky left-0 bg-complementary">
                            {emp.name} ({emp.employeeId})
                          </TableCell>
                          {days.map((day) => {
                            const record = monthlyAttendance.find(
                              (att) =>
                                att.employee._id.toString() === emp._id.toString() &&
                                format(new Date(att.date), 'yyyy-MM-dd') ===
                                  format(day.date, 'yyyy-MM-dd')
                            );
                            return (
                              <TableCell
                                key={day.formatted}
                                className={
                                  record
                                    ? record.status === 'present'
                                      ? 'text-green-500 cursor-pointer'
                                      : record.status === 'absent'
                                      ? 'text-red-500 cursor-pointer'
                                      : 'text-yellow-500 cursor-pointer'
                                    : 'text-body'
                                }
                                onClick={() =>
                                  record &&
                                  handleRequestEdit(record._id, emp.name, day.date, record.status)
                                }
                              >
                                {record ? record.status.charAt(0).toUpperCase() : '-'}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-body">No attendance records found</p>
              )}
            </CardContent>
          </Card>
          {/* Request Edit Dialog */}
          {requestDialog.open && (
            <Dialog open={requestDialog.open} onOpenChange={() => setRequestDialog({ open: false, attendanceId: null, employeeName: '', date: null, currentStatus: '' })}>
              <DialogContent className="sm:max-w-md bg-complementary text-body">
                <DialogHeader>
                  <DialogTitle>
                    Request Edit for {requestDialog.employeeName} on {format(requestDialog.date, 'PPP')}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Current Status</Label>
                    <Input
                      value={requestDialog.currentStatus.charAt(0).toUpperCase() + requestDialog.currentStatus.slice(1)}
                      disabled
                      className="bg-complementary text-body border-accent"
                    />
                  </div>
                  <div>
                    <Label>Requested Status</Label>
                    <Select value={requestedStatus} onValueChange={setRequestedStatus}>
                      <SelectTrigger className="bg-complementary text-body border-accent">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-complementary text-body">
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="leave">Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Enter reason for edit"
                      className="bg-complementary text-body border-accent"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setRequestDialog({ open: false, attendanceId: null, employeeName: '', date: null, currentStatus: '' })}
                    className="bg-complementary text-body border-accent"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={submitRequestEdit}
                    className="bg-accent text-body hover:bg-accent-hover"
                    disabled={loading}
                  >
                    Submit Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
    </div>
  );
};

export default MarkAttendance;
