import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { markAttendance, fetchMonthlyAttendance, bulkMarkAttendance, requestAttendanceEdit, reset } from '../redux/attendanceSlice';
import { fetchEmployees } from '../redux/employeeSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, Loader2, AlertCircle, X, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isWeekend } from 'date-fns';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Define validation schema for the "Request Edit" form
const requestEditSchema = z.object({
  requestedStatus: z.enum(['present', 'absent', 'leave', 'half-day'], {
    required_error: 'Please select a status',
  }),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500, 'Reason must be 500 characters or less'),
});

const parseServerError = (error) => {
  if (!error) return { message: 'An unknown error occurred', fields: {} };
  if (typeof error === 'string') return { message: error, fields: {} };
  const message = error.message || 'Operation failed';
  const fields = error.errors?.reduce((acc, err) => {
    acc[err.field] = err.message;
    return acc;
  }, {}) || {};
  return { message, fields };
};

const MarkAttendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { employees, loading: empLoading } = useSelector((state) => state.siteInchargeEmployee);
  const { monthlyAttendance, loading, error } = useSelector((state) => state.siteInchargeAttendance);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [attendanceData, setAttendanceData] = useState({});
  const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState([]);
  const [bulkEmployeeStatuses, setBulkEmployeeStatuses] = useState({}); // New state for per-employee status
  const [requestDialog, setRequestDialog] = useState({
    open: false,
    employeeId: null,
    employeeName: '',
    date: null,
    currentStatus: '',
    location: null,
  });
  const [serverError, setServerError] = useState(null);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const locationId = user?.locations?.[0]?._id; // Use first assigned location

  const requestForm = useForm({
    resolver: zodResolver(requestEditSchema),
    defaultValues: {
      requestedStatus: '',
      reason: '',
    },
  });

  useEffect(() => {
    if (!user || user.role !== 'siteincharge') {
      navigate('/login');
      return;
    }
    if (!user?.locations?.length) {
      setServerError({ message: 'No location assigned. Please contact an admin.', fields: {} });
      toast.error('No location assigned. Please contact an admin.', { duration: 10000 });
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!locationId) return;
    dispatch(fetchEmployees({ location: locationId }));
    dispatch(fetchMonthlyAttendance({ month: monthFilter, year: yearFilter, location: locationId }));
  }, [dispatch, locationId, monthFilter, yearFilter]);

  useEffect(() => {
    console.log('Employees state:', employees);
    console.log('Monthly attendance state:', monthlyAttendance);
  }, [employees, monthlyAttendance]);

  useEffect(() => {
    if (error) {
      const parsedError = parseServerError(error);
      setServerError(parsedError);
      toast.error(parsedError.message, {
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

  const handleAttendanceChange = (employeeId, status) => {
    setAttendanceData((prev) => ({
      ...prev,
      [employeeId]: status,
    }));
  };

  const handleBulkSelect = (employeeId) => {
    setBulkSelectedEmployees((prev) => {
      const newSelection = prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId];
      
      setBulkEmployeeStatuses((prevStatuses) => {
        const newStatuses = { ...prevStatuses };
        if (!newSelection.includes(employeeId)) {
          // If employee is deselected, remove their status
          delete newStatuses[employeeId];
        } else {
          // If employee is selected, set default status to 'absent'
          newStatuses[employeeId] = 'absent';
        }
        return newStatuses;
      });

      return newSelection;
    });
  };

  const handleBulkStatusChange = (employeeId, status) => {
    setBulkEmployeeStatuses((prev) => ({
      ...prev,
      [employeeId]: status,
    }));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allEmployeeIds = employees.map((emp) => emp._id);
      setBulkSelectedEmployees(allEmployeeIds);
      setBulkEmployeeStatuses(
        allEmployeeIds.reduce((acc, id) => {
          acc[id] = 'absent'; // Default status for all selected
          return acc;
        }, {})
      );
    } else {
      setBulkSelectedEmployees([]);
      setBulkEmployeeStatuses({});
    }
  };

  const handleBulkSubmit = () => {
    setServerError(null);
    if (!employees.length) {
      setServerError({ message: 'No employees available', fields: {} });
      toast.error('No employees available', { duration: 5000 });
      return;
    }
    if (!bulkSelectedEmployees.length) {
      setServerError({ message: 'Please select at least one employee', fields: {} });
      toast.error('Please select at least one employee', { duration: 5000 });
      return;
    }

    console.log('Total employees:', employees.length);
    console.log('Selected employees:', bulkSelectedEmployees);
    console.log('Employee statuses:', bulkEmployeeStatuses);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const selectedRecords = bulkSelectedEmployees.map((employeeId) => ({
      employeeId,
      date: dateStr,
      status: bulkEmployeeStatuses[employeeId] || 'absent',
      location: locationId,
    }));
    console.log('Selected records:', selectedRecords);
    const remainingEmployees = employees.filter((emp) => {
      const isSelected = bulkSelectedEmployees.includes(emp._id.toString());
      console.log(`Employee ${emp._id} selected: ${isSelected}`);
      return !isSelected;
    });
    console.log('Remaining employees:', remainingEmployees);
    const remainingRecords = remainingEmployees.map((emp) => ({
      employeeId: emp._id,
      date: dateStr,
      status: 'present',
      location: locationId,
    }));
    console.log('Remaining records:', remainingRecords);
    const allRecords = [...selectedRecords, ...remainingRecords];
    console.log('All records to submit:', allRecords);

    dispatch(bulkMarkAttendance(allRecords))
      .unwrap()
      .then(() => {
        // Count statuses for the toast message
        const statusCounts = selectedRecords.reduce((acc, record) => {
          acc[record.status] = (acc[record.status] || 0) + 1;
          return acc;
        }, {});
        const statusMessage = Object.entries(statusCounts)
          .map(([status, count]) => `${count} as ${status}`)
          .join(', ');
        toast.success(
          `Marked ${selectedRecords.length} employee(s): ${statusMessage}, and ${remainingRecords.length} employee(s) as Present`
        );
        setBulkSelectedEmployees([]);
        setBulkEmployeeStatuses({});
        const selectedMonth = selectedDate.getMonth() + 1;
        const selectedYear = selectedDate.getFullYear();
        setMonthFilter(selectedMonth);
        setYearFilter(selectedYear);
        dispatch(fetchMonthlyAttendance({ month: selectedMonth, year: selectedYear, location: locationId }))
          .then(() => {
            console.log('Fetched monthly attendance after submission:', monthlyAttendance);
          });
      })
      .catch((err) => {
        const parsedError = parseServerError(err);
        setServerError(parsedError);
        toast.error(parsedError.message, { duration: 10000 });
      });
  };

  const handleSubmit = () => {
    setServerError(null);
    if (!employees.length) {
      setServerError({ message: 'No employees available', fields: {} });
      toast.error('No employees available', { duration: 5000 });
      return;
    }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const attendanceRecords = employees.map((emp) => ({
      employeeId: emp._id,
      date: dateStr,
      status: attendanceData[emp._id] || 'present',
      location: locationId,
    }));
    dispatch(markAttendance(attendanceRecords))
      .unwrap()
      .then(() => {
        toast.success('Attendance marked successfully');
        setAttendanceData({});
        const selectedMonth = selectedDate.getMonth() + 1;
        const selectedYear = selectedDate.getFullYear();
        setMonthFilter(selectedMonth);
        setYearFilter(selectedYear);
        dispatch(fetchMonthlyAttendance({ month: selectedMonth, year: selectedYear, location: locationId }));
      })
      .catch((err) => {
        const parsedError = parseServerError(err);
        setServerError(parsedError);
        toast.error(parsedError.message, { duration: 10000 });
      });
  };

  const handleRequestEdit = (employeeId, employeeName, date, currentStatus, location) => {
    setRequestDialog({
      open: true,
      employeeId,
      employeeName,
      date,
      currentStatus,
      location,
    });
    requestForm.reset({
      requestedStatus: '',
      reason: '',
    });
  };

  const submitRequestEdit = async (data) => {
    try {
      await requestForm.trigger();
      const errors = Object.entries(requestForm.formState.errors).map(([field, error]) => ({
        field,
        message: error.message || 'Invalid input',
      }));
      if (errors.length > 0) {
        setServerError({ message: 'Please fix the form errors before submitting', fields: errors });
        toast.error('Please fix the form errors before submitting', { duration: 5000 });
        return;
      }

      await dispatch(
        requestAttendanceEdit({
          employeeId: requestDialog.employeeId,
          location: locationId,
          date: format(requestDialog.date, 'yyyy-MM-dd'),
          requestedStatus: data.requestedStatus,
          reason: data.reason,
        })
      ).unwrap();
      toast.success('Edit request submitted successfully');
      setRequestDialog({ open: false, employeeId: null, employeeName: '', date: null, currentStatus: '', location: null });
      setServerError(null);
    } catch (err) {
      const parsedError = parseServerError(err);
      setServerError(parsedError);
      toast.error(parsedError.message, { duration: 10000 });
    }
  };

  const handleMonthChange = (value) => {
    setMonthFilter(parseInt(value));
  };

  const handleYearChange = (value) => {
    setYearFilter(parseInt(value));
  };

  const handleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
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
    isWeekend: isWeekend(day),
  }));

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const aValue = a.name.toLowerCase();
      const bValue = b.name.toLowerCase();
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
  }, [employees, sortOrder]);

  const handleDateSelect = (date) => {
    if (date > new Date()) {
      toast.error('Cannot select a future date', { duration: 5000 });
      return;
    }
    setSelectedDate(date);
  };

  const handleDismissErrors = () => {
    dispatch(reset());
    setServerError(null);
    requestForm.reset();
    toast.dismiss();
  };

  return (
    <Layout title="Mark Attendance" role="siteincharge">
      {serverError && (
        <Alert variant="destructive" className="mb-4 sm:mb-5 md:mb-6 border-error text-error max-w-2xl mx-auto rounded-md relative animate-fade-in">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          <AlertTitle className="text-[10px] sm:text-sm md:text-base xl:text-lg font-bold">Error</AlertTitle>
          <AlertDescription className="text-[10px] sm:text-sm md:text-base xl:text-lg">
            <p>{serverError.message}</p>
            {serverError.fields && Object.keys(serverError.fields).length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-track-complementary">
                <ul className="list-disc pl-5 space-y-1">
                  {Object.entries(serverError.fields).map(([field, message], index) => (
                    <li key={index}>{message} (Field: {field})</li>
                  ))}
                </ul>
              </div>
            )}
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
            <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Mark Attendance</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="space-y-4 sm:space-y-5">
              <div>
                <Label htmlFor="date" className="block text-[10px] sm:text-sm xl:text-lg font-medium">
                  Select Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full sm:w-64 justify-start text-left font-normal bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md h-8 sm:h-9 xl:h-10 text-[10px] sm:text-sm xl:text-base"
                      disabled={!locationId}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-complementary text-body">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      initialFocus
                      disabled={(date) => date > new Date()}
                      className="rounded-md border border-accent/20"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="block text-[10px] sm:text-sm xl:text-lg font-medium mb-2 sm:mb-3">
                  Bulk Mark Attendance
                </Label>
                <p className="text-[10px] sm:text-sm xl:text-base text-body mb-2">
                  Select employees to mark their status (Absent, Half Day, or Leave). Non-selected employees will be marked as Present.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-[10px] sm:text-sm xl:text-base text-body">
                      {bulkSelectedEmployees.length} employee{bulkSelectedEmployees.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                      onClick={handleBulkSubmit}
                      className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-base py-1 sm:py-2 px-3 sm:px-4"
                      disabled={loading || empLoading || !bulkSelectedEmployees.length || !locationId}
                    >
                      {loading ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : 'Mark Attendance'}
                    </Button>
                  </div>
                </div>
                {empLoading ? (
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
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">
                            <Checkbox
                              checked={bulkSelectedEmployees.length === employees.length}
                              onCheckedChange={handleSelectAll}
                              disabled={!locationId}
                            />
                          </TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Employee</TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Status</TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Available Leaves</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((emp) => (
                          <TableRow key={emp._id}>
                            <TableCell>
                              <Checkbox
                                checked={bulkSelectedEmployees.includes(emp._id.toString())}
                                onCheckedChange={() => handleBulkSelect(emp._id.toString())}
                                disabled={!locationId}
                              />
                            </TableCell>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                              {emp.name} ({emp.employeeId})
                            </TableCell>
                            <TableCell className="text-body">
                              <Select
                                value={bulkEmployeeStatuses[emp._id] || 'absent'}
                                onValueChange={(value) => handleBulkStatusChange(emp._id, value)}
                                disabled={!bulkSelectedEmployees.includes(emp._id.toString()) || !locationId}
                              >
                                <SelectTrigger className="w-full sm:w-32 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md h-8 sm:h-9 xl:h-10 text-[10px] sm:text-sm xl:text-base">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-complementary text-body">
                                  <SelectItem value="absent" className="text-[10px] sm:text-sm xl:text-base">
                                    Absent
                                  </SelectItem>
                                  <SelectItem value="half-day" className="text-[10px] sm:text-sm xl:text-base">
                                    Half Day
                                  </SelectItem>
                                  <SelectItem
                                    value="leave"
                                    disabled={emp.paidLeaves.available < 1}
                                    className="text-[10px] sm:text-sm xl:text-base"
                                  >
                                    Leave
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                              {emp.paidLeaves.available}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-body text-[10px] sm:text-sm xl:text-base">No employees found</p>
                )}
              </div>
              <div>
                <Label className="block text-[10px] sm:text-sm xl:text-lg font-medium mb-2 sm:mb-3">
                  Individual Attendance
                </Label>
                {empLoading ? (
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
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Employee</TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Status</TableHead>
                          <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">Available Leaves</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((emp) => (
                          <TableRow key={emp._id}>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                              {emp.name} ({emp.employeeId})
                            </TableCell>
                            <TableCell className="text-body">
                              <Select
                                value={attendanceData[emp._id] || 'present'}
                                onValueChange={(value) => handleAttendanceChange(emp._id, value)}
                                disabled={!locationId}
                              >
                                <SelectTrigger className="w-full sm:w-48 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md h-8 sm:h-9 xl:h-10 text-[10px] sm:text-sm xl:text-base">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-complementary text-body">
                                  <SelectItem value="present" className="text-[10px] sm:text-sm xl:text-base">
                                    Present
                                  </SelectItem>
                                  <SelectItem value="absent" className="text-[10px] sm:text-sm xl:text-base">
                                    Absent
                                  </SelectItem>
                                  <SelectItem value="half-day" className="text-[10px] sm:text-sm xl:text-base">
                                    Half Day
                                  </SelectItem>
                                  <SelectItem
                                    value="leave"
                                    disabled={emp.paidLeaves.available < 1}
                                    className="text-[10px] sm:text-sm xl:text-base"
                                  >
                                    Paid Leave
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                              {emp.paidLeaves.available}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-body text-[10px] sm:text-sm xl:text-base">No employees found</p>
                )}
              </div>
              <div className="flex gap-3 sm:gap-4">
                <Button
                  onClick={handleSubmit}
                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-base py-1 sm:py-2 px-3 sm:px-4"
                  disabled={loading || empLoading || !employees.length || !locationId}
                >
                  {loading ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : 'Mark Attendance'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
              Monthly Attendance
              <div className="flex gap-2 sm:gap-4">
                <Select value={monthFilter.toString()} onValueChange={handleMonthChange} disabled={!locationId}>
                  <SelectTrigger className="bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md h-8 sm:h-9 xl:h-10 w-32 sm:w-40 text-[10px] sm:text-sm xl:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-complementary text-body">
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()} className="text-[10px] sm:text-sm xl:text-base">
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={yearFilter.toString()} onValueChange={handleYearChange} disabled={!locationId}>
                  <SelectTrigger className="bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md h-8 sm:h-9 xl:h-10 w-20 sm:w-24 text-[10px] sm:text-sm xl:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-complementary text-body">
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()} className="text-[10px] sm:text-sm xl:text-base">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            {loading || empLoading ? (
              <div className="space-y-4">
                {Array(3)
                  .fill()
                  .map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
              </div>
            ) : sortedEmployees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-body text-[10px] sm:text-sm xl:text-base">
                        <Button variant="ghost" onClick={handleSort} className="flex items-center space-x-1">
                          Employee
                          <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </TableHead>
                      {days.map((day) => (
                        <TableHead
                          key={day.formatted}
                          className={`text-body text-[10px] sm:text-sm xl:text-base ${day.isWeekend ? 'bg-accent/10' : ''}`}
                        >
                          {day.dayName}
                          <br />
                          {day.formatted}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedEmployees.map((emp) => (
                      <TableRow key={emp._id}>
                        <TableCell className="text-body text-[10px] sm:text-sm xl:text-base">
                          {emp.name} ({emp.employeeId})
                        </TableCell>
                        {days.map((day) => {
                          const record = monthlyAttendance.find(
                            (att) =>
                              att.employee?._id?.toString() === emp._id.toString() &&
                              format(new Date(att.date), 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd')
                          );
                          console.log(`Record for ${emp.name} on ${format(day.date, 'yyyy-MM-dd')}:`, record);
                          return (
                            <TableCell
                              key={day.formatted}
                              className={`text-[10px] sm:text-sm xl:text-base ${day.isWeekend ? 'bg-accent/10' : ''} ${
                                record
                                  ? record.status === 'present'
                                    ? 'text-green-500 cursor-pointer'
                                    : record.status === 'absent'
                                    ? 'text-red-500 cursor-pointer'
                                    : 'text-yellow-500 cursor-pointer'
                                  : 'text-body'
                              }`}
                              onClick={() =>
                                record &&
                                handleRequestEdit(emp._id, emp.name, day.date, record.status, locationId)
                              }
                            >
                              {record ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>{record.status.charAt(0).toUpperCase()}</TooltipTrigger>
                                    <TooltipContent className="bg-complementary text-body border-accent">
                                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-body text-[10px] sm:text-sm xl:text-base">No attendance records found</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Edit Dialog */}
      <Dialog
        open={requestDialog.open}
        onOpenChange={(open) =>
          !open && setRequestDialog({ open: false, employeeId: null, employeeName: '', date: null, currentStatus: '', location: null })
        }
      >
        <DialogContent className="bg-complementary text-body border-accent max-w-[90vw] sm:max-w-md max-h-[70vh] h-full overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0 px-4 sm:px-6 pt-4">
            <DialogTitle className="text-base sm:text-lg xl:text-xl">
              Request Edit for {requestDialog.employeeName} on {requestDialog.date ? format(requestDialog.date, 'PPP') : ''}
            </DialogTitle>
            <DialogDescription className="text-[10px] sm:text-sm xl:text-base">
              Request a change to the attendance status for this employee.
            </DialogDescription>
          </DialogHeader>
          <Form {...requestForm}>
            <form onSubmit={requestForm.handleSubmit(submitRequestEdit)} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-2 sm:space-y-3">
                <div>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Current Status</FormLabel>
                  <Input
                    value={requestDialog.currentStatus ? requestDialog.currentStatus.charAt(0).toUpperCase() + requestDialog.currentStatus.slice(1) : ''}
                    disabled
                    className="h-8 sm:h-9 xl:h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-base"
                  />
                </div>
                <FormField
                  control={requestForm.control}
                  name="requestedStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Requested Status *</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-full bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md h-8 sm:h-9 xl:h-10 text-[10px] sm:text-sm xl:text-base">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent className="bg-complementary text-body">
                            <SelectItem value="present" className="text-[10px] sm:text-sm xl:text-base">
                              Present
                            </SelectItem>
                            <SelectItem value="absent" className="text-[10px] sm:text-sm xl:text-base">
                              Absent
                            </SelectItem>
                            <SelectItem value="leave" className="text-[10px] sm:text-sm xl:text-base">
                              Leave
                            </SelectItem>
                            <SelectItem value="half-day" className="text-[10px] sm:text-sm xl:text-base">
                              Half Day
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage className="text-error text-[9px] sm:text-xs xl:text-sm">
                        {serverError?.fields?.requestedStatus || requestForm.formState.errors.requestedStatus?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={requestForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Reason *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter reason for edit"
                          className="h-8 sm:h-9 xl:h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-base"
                        />
                      </FormControl>
                      <FormMessage className="text-error text-[9px] sm:text-xs xl:text-sm">
                        {serverError?.fields?.reason || requestForm.formState.errors.reason?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="shrink-0 px-4 sm:px-6 py-4 border-t border-accent/20 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRequestDialog({ open: false, employeeId: null, employeeName: '', date: null, currentStatus: '', location: null })}
                  className="border-accent text-accent hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-base py-1 sm:py-2 px-2 sm:px-3"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-base py-1 sm:py-2 px-2 sm:px-3"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : 'Submit Request'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default MarkAttendance;