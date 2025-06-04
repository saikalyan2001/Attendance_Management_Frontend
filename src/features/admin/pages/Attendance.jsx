import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendance, markAttendance, editAttendance, fetchAttendanceRequests, handleAttendanceRequest } from '../redux/attendanceSlice';
import { fetchLocations } from '../redux/locationsSlice';
import { fetchEmployees, reset as resetEmployees } from '../redux/employeeSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Search, CalendarIcon, CheckCircle2, ChevronDown, ChevronUp, Eye, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { exportToCSV } from '../../../utils/csvUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'; // Added for tooltips

const Attendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { attendance, attendanceRequests, loading: attendanceLoading, error: attendanceError } = useSelector((state) => state.adminAttendance);
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.adminLocations);
  const { employees, loading: employeesLoading, error: employeesError } = useSelector((state) => state.adminEmployees);
  const { user } = useSelector((state) => state.auth);

  const [month, setMonth] = useState(new Date().getMonth() + 1); // Default to May 2025
  const [year, setYear] = useState(new Date().getFullYear()); // Default to 2025
  const [location, setLocation] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date()); // Single date for marking attendance
  const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState([]);
  const [bulkEmployeeStatuses, setBulkEmployeeStatuses] = useState({});
  const [employeeStatuses, setEmployeeStatuses] = useState({}); // For individual mode
  const [bulkConfirmDialog, setBulkConfirmDialog] = useState({ open: false, records: [], remaining: [] });
  const [individualConfirmDialog, setIndividualConfirmDialog] = useState({ open: false, records: [] });
  const [isBulkOpen, setIsBulkOpen] = useState(true);
  const [isIndividualOpen, setIsIndividualOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editDialog, setEditDialog] = useState(null);
  const [reasonDialog, setReasonDialog] = useState({ open: false, reason: '', employeeName: '', date: '' }); // Added for reason dialog
  const [requestActionDialog, setRequestActionDialog] = useState({ open: false, requestId: null, action: '', employeeName: '', date: '', requestedStatus: '' }); // Added for action confirmation

  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/login');
    dispatch(fetchLocations());
    dispatch(fetchEmployees({ location: location === 'all' ? undefined : location }));
    dispatch(fetchAttendance({ month, year, location: location === 'all' ? undefined : location }));
    dispatch(fetchAttendanceRequests());
  }, [dispatch, month, year, location, user, navigate]);

  useEffect(() => {
    if (attendanceError || locationsError || employeesError) {
      toast.error(attendanceError || locationsError || employeesError || 'Failed to load data', {
        action: {
          label: 'Retry',
          onClick: () => {
            dispatch(fetchLocations());
            dispatch(fetchEmployees({ location: location === 'all' ? undefined : location }));
            dispatch(fetchAttendance({ month, year, location: location === 'all' ? undefined : location }));
            dispatch(fetchAttendanceRequests());
          },
        },
      });
      dispatch({ type: 'adminAttendance/reset' });
      dispatch({ type: 'adminLocations/reset' });
      dispatch(resetEmployees());
    }
  }, [attendanceError, locationsError, employeesError, dispatch]);

  // Bulk Mark Attendance Handlers
  const handleBulkSelect = (employeeId) => {
    setBulkSelectedEmployees((prev) => {
      const newSelection = prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId];

      setBulkEmployeeStatuses((prevStatuses) => {
        const newStatuses = { ...prevStatuses };
        if (!newSelection.includes(employeeId)) {
          delete newStatuses[employeeId];
        } else {
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
          acc[id] = 'absent';
          return acc;
        }, {})
      );
    } else {
      setBulkSelectedEmployees([]);
      setBulkEmployeeStatuses({});
    }
  };

  const handleBulkSubmit = () => {
    if (!location || location === 'all') {
      toast.error('Please select a specific location');
      return;
    }
    if (!employees.length) {
      toast.error('No employees available for this location');
      return;
    }
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }
    if (!bulkSelectedEmployees.length) {
      toast.error('Please select at least one employee');
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const selectedRecords = bulkSelectedEmployees.map((employeeId) => ({
      employeeId,
      status: bulkEmployeeStatuses[employeeId] || 'absent',
    }));
    const remainingEmployees = employees.filter((emp) => !bulkSelectedEmployees.includes(emp._id));
    const remainingRecords = remainingEmployees.map((emp) => ({
      employeeId: emp._id,
      status: 'present',
    }));
    setBulkConfirmDialog({ open: true, records: selectedRecords, remaining: remainingRecords });
  };

  const confirmBulkSubmit = () => {
    const { records: selectedRecords, remaining: remainingRecords } = bulkConfirmDialog;
    const allRecords = [...selectedRecords, ...remainingRecords];

    dispatch(
      markAttendance({
        date: format(selectedDate, 'yyyy-MM-dd'),
        location,
        attendance: allRecords,
      })
    )
      .unwrap()
      .then(() => {
        const statusCounts = selectedRecords.reduce((acc, record) => {
          acc[record.status] = (acc[record.status] || 0) + 1;
          return acc;
        }, {});
        const statusMessage = Object.entries(statusCounts)
          .map(([status, count]) => `${count} as ${status}`)
          .join(', ');
        toast.success(
          `Marked ${selectedRecords.length} employee(s): ${statusMessage}, and ${remainingRecords.length} employee(s) as Present`,
          {
            action: {
              label: 'Undo',
              onClick: () => {
                toast.info('Undo functionality not implemented yet.');
              },
            },
          }
        );
        setBulkSelectedEmployees([]);
        setBulkEmployeeStatuses({});
        setSelectedDate(new Date());
        dispatch(fetchAttendance({ month, year, location: location === 'all' ? undefined : location }));
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to mark attendance');
      })
      .finally(() => {
        setBulkConfirmDialog({ open: false, records: [], remaining: [] });
      });
  };

  // Individual Attendance Handlers
  const handleIndividualStatusChange = (employeeId, status) => {
    setEmployeeStatuses((prev) => ({
      ...prev,
      [employeeId]: status,
    }));
  };

  const handleIndividualSubmit = () => {
    if (!location || location === 'all') {
      toast.error('Please select a specific location');
      return;
    }
    if (!employees.length) {
      toast.error('No employees available for this location');
      return;
    }
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const attendanceRecords = employees.map((emp) => ({
      employeeId: emp._id,
      status: employeeStatuses[emp._id] || 'present',
    }));
    setIndividualConfirmDialog({ open: true, records: attendanceRecords });
  };

  const confirmIndividualSubmit = () => {
    const { records: attendanceRecords } = individualConfirmDialog;
    dispatch(
      markAttendance({
        date: format(selectedDate, 'yyyy-MM-dd'),
        location,
        attendance: attendanceRecords,
      })
    )
      .unwrap()
      .then(() => {
        toast.success('Attendance marked successfully', {
          action: {
            label: 'Undo',
            onClick: () => {
              toast.info('Undo functionality not implemented yet.');
            },
          },
        });
        setEmployeeStatuses({});
        setSelectedDate(new Date());
        dispatch(fetchAttendance({ month, year, location: location === 'all' ? undefined : location }));
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to mark attendance');
      })
      .finally(() => {
        setIndividualConfirmDialog({ open: false, records: [] });
      });
  };

  const handleEditAttendance = (attendanceId, newStatus) => {
    if (!newStatus) {
      toast.error('Please select a status');
      return;
    }
    dispatch(editAttendance({ id: attendanceId, status: newStatus }))
      .unwrap()
      .then(() => {
        toast.success('Attendance updated successfully');
        setEditDialog(null);
        dispatch(fetchAttendance({ month, year, location: location === 'all' ? undefined : location }));
      })
      .catch((err) => toast.error(err.message || 'Failed to edit attendance'));
  };

  const handleRequestAction = (requestId, status, employeeName, date, requestedStatus) => {
    setRequestActionDialog({
      open: true,
      requestId,
      action: status,
      employeeName,
      date,
      requestedStatus,
    });
  };

  const confirmRequestAction = () => {
    const { requestId, action } = requestActionDialog;
    dispatch(handleAttendanceRequest({ id: requestId, status: action }))
      .unwrap()
      .then(() => {
        toast.success(`Request ${action} successfully`, {
          action: {
            label: 'Undo',
            onClick: () => {
              toast.info('Undo functionality not implemented yet.');
            },
          },
        });
        dispatch(fetchAttendanceRequests());
        dispatch(fetchAttendance({ month, year, location: location === 'all' ? undefined : location }));
      })
      .catch((err) => toast.error(err.message || 'Failed to handle request'))
      .finally(() => {
        setRequestActionDialog({ open: false, requestId: null, action: '', employeeName: '', date: '', requestedStatus: '' });
      });
  };

  const handleExportCSV = () => {
    const csvData = attendance.map((record) => ({
      Employee: `${record.employee?.name} (${record.employee?.employeeId})`,
      Location: record.location?.name || 'N/A',
      Date: format(new Date(record.date), 'PPP'),
      Status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
    }));
    exportToCSV(csvData, `attendance_${month}_${year}.csv`);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: format(new Date(2025, i), 'MMMM'),
  }));
  const years = [2024, 2025, 2026];
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(new Date(year, month - 1)),
    end: endOfMonth(new Date(year, month - 1)),
  });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const summary = {
    present: attendance.filter((att) => att.status === 'present').length,
    absent: attendance.filter((att) => att.status === 'absent').length,
    leave: attendance.filter((att) => att.status === 'leave').length,
    halfDay: attendance.filter((att) => att.status === 'half-day').length,
  };

  const filteredAttendance = attendance.filter((att) => {
    const employeeMatch =
      att.employee?.name.toLowerCase().includes(search.toLowerCase()) ||
      att.employee?.employeeId.toLowerCase().includes(search.toLowerCase());
    const statusMatch = statusFilter === 'all' || att.status === statusFilter;
    return employeeMatch && statusMatch;
  });

  // Added: Helper to get status icon for accessibility
  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
      case 'approved':
        return <Check className="h-4 w-4 mr-1" />;
      case 'absent':
      case 'rejected':
        return <X className="h-4 w-4 mr-1" />;
      case 'pending':
      case 'leave':
      case 'half-day':
        return <Eye className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <Layout title="Attendance">
      {(attendanceError || locationsError || employeesError) && (
        <Alert variant="destructive" className="mb-6 border-error text-error">
          <AlertDescription>{attendanceError || locationsError || employeesError}</AlertDescription>
        </Alert>
      )}
      <Tabs defaultValue="mark" className="space-y-6">
        <TabsList className="grid w-full h-fit grid-cols-3 bg-complementary text-body rounded-lg shadow-sm">
          <TabsTrigger value="mark" className="py-3 text-sm rounded-md data-[state=active]:bg-accent data-[state=active]:text-body hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent">
            Mark Attendance
          </TabsTrigger>
          <TabsTrigger value="overview" className="py-3 text-sm rounded-md data-[state=active]:bg-accent data-[state=active]:text-body hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent">
            Attendance Overview
          </TabsTrigger>
          <TabsTrigger value="requests" className="py-3 text-sm rounded-md data-[state=active]:bg-accent data-[state=active]:text-body hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent">
            Attendance Requests
          </TabsTrigger>
        </TabsList>
        <TabsContent value="mark">
          <Card className="bg-complementary text-body shadow-lg rounded-lg">
            <CardHeader className="border-b border-accent">
              <CardTitle className="text-2xl font-bold">Mark Attendance</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  <div className="space-y-2">
                    <Label htmlFor="month" className="text-sm font-medium">Month</Label>
                    <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
                      <SelectTrigger id="month" className="bg-complementary text-body border-accent h-12">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent className="bg-complementary text-body">
                        {months.map((m) => (
                          <SelectItem key={m.value} value={m.value.toString()} className="text-sm">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year" className="text-sm font-medium">Year</Label>
                    <Select value={year.toString()} onValueChange={(val) => setYear(parseInt(val))}>
                      <SelectTrigger id="year" className="bg-complementary text-body border-accent h-12">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="bg-complementary text-body">
                        {years.map((y) => (
                          <SelectItem key={y} value={y.toString()} className="text-sm">
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                    <Select value={location} onValueChange={setLocation}>
                      <SelectTrigger id="location" className="bg-complementary text-body border-accent h-12">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent className="bg-complementary text-body">
                        <SelectItem value="all">All Locations</SelectItem>
                        {locations.map((loc) => (
                          <SelectItem key={loc._id} value={loc._id} className="text-sm">
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date" className="block text-sm font-medium text-body">
                    Select Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full sm:w-64 justify-start text-left font-normal bg-complementary text-body border-accent h-12 text-sm hover:border-accent-hover focus:ring-2 focus:ring-accent"
                        disabled={location === 'all'}
                        aria-label="Select date for marking attendance"
                      >
                        <CalendarIcon className="mr-2 h-5 w-5 text-body" />
                        {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-complementary text-body">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date > new Date()) {
                            toast.error('Cannot select a future date', { duration: 5000 });
                            return;
                          }
                          setSelectedDate(date);
                        }}
                        initialFocus
                        disabled={(date) => date > new Date()}
                        className="border border-accent rounded-lg"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Collapsible open={isBulkOpen} onOpenChange={setIsBulkOpen}>
                  <CollapsibleTrigger asChild>
                    <div className="flex justify-between items-center mb-3">
                      <Label className="text-sm font-medium text-body">
                        Bulk Mark Attendance
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={isBulkOpen ? 'Collapse bulk mark section' : 'Expand bulk mark section'}
                      >
                        {isBulkOpen ? <ChevronUp className="h-5 w-5 text-body" /> : <ChevronDown className="h-5 w-5 text-body" />}
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p className="text-sm text-body mb-3">
                      Select employees to mark their status (Absent, Half Day, or Leave). Non-selected employees will be marked as Present.
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-body">
                          {bulkSelectedEmployees.length} employee{bulkSelectedEmployees.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={handleBulkSubmit}
                          className="bg-accent text-body hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 focus:ring-2 focus:ring-accent"
                          disabled={attendanceLoading || employeesLoading || !bulkSelectedEmployees.length || location === 'all'}
                          aria-label="Mark attendance for selected employees"
                        >
                          {attendanceLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-5 w-5" />
                              Mark Attendance
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {employeesLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-accent" />
                      </div>
                    ) : employees.length > 0 ? (
                      <div className="max-h-[400px] overflow-y-auto overflow-x-auto border border-accent rounded-md relative">
                        <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-accent to-transparent pointer-events-none" />
                        <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-accent to-transparent pointer-events-none" />
                        <Table className="border border-accent min-w-[600px]">
                          <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                            <TableRow>
                              <TableHead className="text-body text-sm">
                                <Checkbox
                                  checked={bulkSelectedEmployees.length === employees.length}
                                  onCheckedChange={handleSelectAll}
                                  disabled={location === 'all'}
                                  className="h-5 w-5"
                                  aria-label="Select all employees for bulk marking"
                                />
                              </TableHead>
                              <TableHead className="text-body text-sm">Employee</TableHead>
                              <TableHead className="text-body text-sm">Status</TableHead>
                              <TableHead className="text-body text-sm">Available Leaves</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {employees.map((emp, index) => (
                              <TableRow key={emp._id} className={index % 2 === 0 ? 'bg-complementary' : 'bg-body'}>
                                <TableCell className="whitespace-nowrap">
                                  <Checkbox
                                    checked={bulkSelectedEmployees.includes(emp._id.toString())}
                                    onCheckedChange={() => handleBulkSelect(emp._id.toString())}
                                    disabled={location === 'all'}
                                    className="h-5 w-5"
                                    aria-label={`Select ${emp.name} for bulk marking`}
                                  />
                                </TableCell>
                                <TableCell className="text-body text-sm whitespace-nowrap">
                                  {emp.name} ({emp.employeeId})
                                </TableCell>
                                <TableCell className="text-body whitespace-nowrap">
                                  <Select
                                    value={bulkEmployeeStatuses[emp._id] || 'absent'}
                                    onValueChange={(value) => handleBulkStatusChange(emp._id, value)}
                                    disabled={!bulkSelectedEmployees.includes(emp._id.toString()) || location === 'all'}
                                  >
                                    <SelectTrigger
                                      className="w-full sm:w-32 bg-complementary text-body border-accent h-12 text-sm focus:ring-2 focus:ring-accent"
                                      aria-label={`Select status for ${emp.name}`}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-complementary text-body">
                                      <SelectItem value="absent" className="text-sm">Absent</SelectItem>
                                      <SelectItem value="half-day" className="text-sm">Half Day</SelectItem>
                                      <SelectItem value="leave" disabled={emp.paidLeaves.available < 1} className="text-sm">
                                        Leave
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-body text-sm whitespace-nowrap">{emp.paidLeaves.available}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-body text-sm">No employees found</p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
                <Collapsible open={isIndividualOpen} onOpenChange={setIsIndividualOpen}>
                  <CollapsibleTrigger asChild>
                    <div className="flex justify-between items-center mb-3">
                      <Label className="text-sm font-medium text-body">
                        Individual Attendance
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={isIndividualOpen ? 'Collapse individual mark section' : 'Expand individual mark section'}
                      >
                        {isIndividualOpen ? <ChevronUp className="h-5 w-5 text-body" /> : <ChevronDown className="h-5 w-5 text-body" />}
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {employeesLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-accent" />
                      </div>
                    ) : employees.length > 0 ? (
                      <div className="max-h-[400px] overflow-y-auto overflow-x-auto border border-accent rounded-md relative">
                        <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-accent to-transparent pointer-events-none" />
                        <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-accent to-transparent pointer-events-none" />
                        <Table className="border border-accent min-w-[600px]">
                          <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                            <TableRow>
                              <TableHead className="text-body text-sm">Employee</TableHead>
                              <TableHead className="text-body text-sm">Status</TableHead>
                              <TableHead className="text-body text-sm">Available Leaves</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {employees.map((emp, index) => (
                              <TableRow key={emp._id} className={index % 2 === 0 ? 'bg-complementary' : 'bg-body'}>
                                <TableCell className="text-body text-sm whitespace-nowrap">
                                  {emp.name} ({emp.employeeId})
                                </TableCell>
                                <TableCell className="text-body whitespace-nowrap">
                                  <Select
                                    value={employeeStatuses[emp._id] || 'present'}
                                    onValueChange={(value) => handleIndividualStatusChange(emp._id, value)}
                                    disabled={location === 'all'}
                                  >
                                    <SelectTrigger
                                      className="w-full sm:w-48 bg-complementary text-body border-accent h-12 text-sm focus:ring-2 focus:ring-accent"
                                      aria-label={`Select status for ${emp.name}`}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-complementary text-body">
                                      <SelectItem value="present" className="text-sm">Present</SelectItem>
                                      <SelectItem value="absent" className="text-sm">Absent</SelectItem>
                                      <SelectItem value="half-day" className="text-sm">Half Day</SelectItem>
                                      <SelectItem value="leave" disabled={emp.paidLeaves.available < 1} className="text-sm">
                                        Paid Leave
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-body text-sm whitespace-nowrap">{emp.paidLeaves.available}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-body text-sm">No employees found</p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
                <div className="flex gap-4">
                  {isIndividualOpen && (
                    <Button
                      onClick={handleIndividualSubmit}
                      className="bg-accent text-body hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 focus:ring-2 focus:ring-accent"
                      disabled={attendanceLoading || employeesLoading || !employees.length || location === 'all'}
                      aria-label="Mark attendance for all employees individually"
                    >
                      {attendanceLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          Mark Attendance
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="overview">
          <div className="space-y-4">
            <Card className="bg-complementary text-body shadow-lg rounded-lg">
              <CardHeader className="border-b border-accent">
                <CardTitle className="text-2xl font-bold">Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{summary.present}</p>
                    <p className="text-sm text-muted-foreground">Present</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{summary.absent}</p>
                    <p className="text-sm text-muted-foreground">Absent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{summary.leave}</p>
                    <p className="text-sm text-muted-foreground">Leave</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{summary.halfDay}</p>
                    <p className="text-sm text-muted-foreground">Half-Day</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-complementary text-body shadow-lg rounded-lg">
              <CardHeader className="border-b border-accent">
                <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-2xl font-bold">
                  <span>Attendance Records</span>
                  <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-body" />
                      <Input
                        placeholder="Search employees"
                        className="pl-10 bg-complementary text-body border-accent rounded-md h-12"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-48 bg-complementary text-body border-accent h-12">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent className="bg-complementary text-body">
                        <SelectItem value="all" className="text-sm">All Statuses</SelectItem>
                        <SelectItem value="present" className="text-sm">Present</SelectItem>
                        <SelectItem value="absent" className="text-sm">Absent</SelectItem>
                        <SelectItem value="leave" className="text-sm">Leave</SelectItem>
                        <SelectItem value="half-day" className="text-sm">Half-Day</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleExportCSV} className="bg-accent text-body hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 focus:ring-2 focus:ring-accent">
                      <Download className="h-4 w-4 mr-2" /> Export CSV
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {attendanceLoading ? (
                  <div className="space-y-4">
                    {Array(5).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredAttendance.length > 0 ? (
                  <div className="relative overflow-x-auto">
                    <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-accent to-transparent pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-accent to-transparent pointer-events-none" />
                    <Table className="w-full min-w-[1000px]">
                      <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                        <TableRow className="hover:bg-complementary">
                          <TableHead className="w-[180px] text-body font-semibold">
                            Employee
                          </TableHead>
                          <TableHead className="w-[150px] text-body font-semibold">
                            Location
                          </TableHead>
                          {daysInMonth.map((day) => (
                            <TableHead
                              key={format(day, 'yyyy-MM-dd')}
                              className="w-[60px] text-center text-body font-semibold pl-6"
                            >
                              {weekDays[getDay(day)]}
                              <br />
                              {format(day, 'dd')}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees
                          .filter((emp) =>
                            emp.name?.toLowerCase().includes(search.toLowerCase()) ||
                            emp.employeeId?.toLowerCase().includes(search.toLowerCase())
                          )
                          .map((emp, index) => (
                            <TableRow key={emp._id} className={index % 2 === 0 ? 'bg-complementary' : 'bg-body'}>
                              <TableCell className="w-[180px] text-body truncate">
                                {emp.name} ({emp.employeeId})
                              </TableCell>
                              <TableCell className="w-[150px] text-body truncate">
                                {locations.find((loc) => loc._id === emp.location)?.name || 'N/A'}
                              </TableCell>
                              {daysInMonth.map((day) => {
                                const record = filteredAttendance.find(
                                  (att) =>
                                    att.employee?._id.toString() === emp._id.toString() &&
                                    format(new Date(att.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                                );
                                return (
                                  <TableCell
                                    key={format(day, 'yyyy-MM-dd')}
                                    className="w-[60px] text-center text-body py-2 pl-6"
                                  >
                                    {record ? (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Badge
                                            variant={
                                              record.status === 'present'
                                                ? 'success'
                                                : record.status === 'absent'
                                                ? 'destructive'
                                                : record.status === 'leave'
                                                ? 'warning'
                                                : 'secondary'
                                            }
                                            className="cursor-pointer text-xs px-2 py-1"
                                          >
                                            <span className="flex items-center">
                                              {getStatusIcon(record.status)}
                                              {record.status.charAt(0).toUpperCase()}
                                            </span>
                                          </Badge>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-complementary text-body">
                                          {['present', 'absent', 'leave', 'half-day'].map((status) => (
                                            <DropdownMenuItem
                                              key={status}
                                              onClick={() =>
                                                setEditDialog({
                                                  attendanceId: record._id,
                                                  currentStatus: status,
                                                  employeeId: emp._id,
                                                  employeeName: emp.name,
                                                  availableLeaves: emp.paidLeaves.available,
                                                  date: day,
                                                })
                                              }
                                              disabled={status === 'leave' && emp.paidLeaves.available < 1}
                                              className="text-xs"
                                            >
                                              {status.charAt(0).toUpperCase() + status.slice(1)}
                                              {status === 'leave' && emp.paidLeaves.available < 1 && ' (No leaves available)'}
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    ) : (
                                      <span className="text-body">-</span>
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
                  <p className="text-body text-center">No attendance records available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="requests">
          <Card className="bg-complementary text-body shadow-lg rounded-lg">
            <CardHeader className="border-b border-accent">
              <CardTitle className="text-2xl font-bold">Attendance Edit Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {attendanceLoading ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : attendanceRequests.length > 0 ? (
                <div className="relative overflow-x-auto">
                  <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-accent to-transparent pointer-events-none" />
                  <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-accent to-transparent pointer-events-none" />
                  <Table className="w-full min-w-[1000px]">
                    <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                      <TableRow className="hover:bg-complementary">
                        <TableHead className="text-sm text-body font-semibold">Employee</TableHead>
                        <TableHead className="text-sm text-body font-semibold">Location</TableHead>
                        <TableHead className="text-sm text-body font-semibold">Date</TableHead>
                        <TableHead className="text-sm text-body font-semibold">Requested Status</TableHead>
                        <TableHead className="text-sm text-body font-semibold">Reason</TableHead>
                        <TableHead className="text-sm text-body font-semibold">Status</TableHead>
                        <TableHead className="text-sm text-body font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRequests.map((req, index) => (
                        <TableRow key={req._id} className={index % 2 === 0 ? 'bg-complementary' : 'bg-body'}>
                          <TableCell className="text-body truncate max-w-[150px]">
                            {req.employee?.name} ({req.employee?.employeeId})
                          </TableCell>
                          <TableCell className="text-body truncate max-w-[150px]">{req.location?.name || 'N/A'}</TableCell>
                          <TableCell className="text-body text-sm">{format(new Date(req.date), 'PPP')}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                req.requestedStatus === 'present'
                                  ? 'success'
                                  : req.requestedStatus === 'absent'
                                  ? 'destructive'
                                  : 'warning'
                              }
                              className="text-xs"
                            >
                              <span className="flex items-center">
                                {getStatusIcon(req.requestedStatus)}
                                {req.requestedStatus.charAt(0).toUpperCase() + req.requestedStatus.slice(1)}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-body text-sm">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() =>
                                      setReasonDialog({
                                        open: true,
                                        reason: req.reason,
                                        employeeName: req.employee?.name,
                                        date: format(new Date(req.date), 'PPP'),
                                      })
                                    }
                                    className="text-accent hover:underline p-0"
                                    aria-label={`View reason for ${req.employee?.name}'s request on ${format(new Date(req.date), 'PPP')}`}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-complementary text-body border-accent max-w-xs">
                                  <p className="text-sm">{req.reason}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                req.status === 'pending'
                                  ? 'secondary'
                                  : req.status === 'approved'
                                  ? 'success'
                                  : 'destructive'
                              }
                              className="text-xs"
                            >
                              <span className="flex items-center">
                                {getStatusIcon(req.status)}
                                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {req.status === 'pending' && (
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() =>
                                    handleRequestAction(
                                      req._id,
                                      'approved',
                                      req.employee?.name,
                                      req.date,
                                      req.requestedStatus
                                    )
                                  }
                                  className="bg-green-500 text-body hover:bg-green-600 text-sm py-2 px-3 flex items-center gap-1 focus:ring-2 focus:ring-green-500"
                                  disabled={attendanceLoading}
                                  aria-label={`Approve request for ${req.employee?.name} on ${format(new Date(req.date), 'PPP')}`}
                                >
                                  {attendanceLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="h-4 w-4" />
                                      Approve
                                    </>
                                  )}
                                </Button>
                                <Button
                                  onClick={() =>
                                    handleRequestAction(
                                      req._id,
                                      'rejected',
                                      req.employee?.name,
                                      req.date,
                                      req.requestedStatus
                                    )
                                  }
                                  className="bg-red-500 text-body hover:bg-red-600 text-sm py-2 px-3 flex items-center gap-1 focus:ring-2 focus:ring-red-500"
                                  disabled={attendanceLoading}
                                  aria-label={`Reject request for ${req.employee?.name} on ${format(new Date(req.date), 'PPP')}`}
                                >
                                  {attendanceLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <X className="h-4 w-4" />
                                      Reject
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-body text-center">No attendance edit requests available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Mark Confirmation Dialog */}
      <Dialog
        open={bulkConfirmDialog.open}
        onOpenChange={(open) => !open && setBulkConfirmDialog({ open: false, records: [], remaining: [] })}
      >
        <DialogContent className="bg-complementary text-body border-accent max-w-[90vw] sm:max-w-md max-h-[70vh] h-full overflow-hidden flex flex-col rounded-lg">
          <DialogHeader className="shrink-0 px-4 pt-4">
            <DialogTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              Confirm Bulk Attendance
            </DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to mark attendance for {bulkConfirmDialog.records.length} employee(s) with the selected statuses and {bulkConfirmDialog.remaining.length} employee(s) as Present?
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <p className="text-sm text-body">
              <strong>Selected Employees:</strong>
            </p>
            <ul className="list-disc pl-5 text-sm text-body">
              {bulkConfirmDialog.records.map((record, index) => (
                <li key={index}>
                  Employee ID {record.employeeId}: {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                </li>
              ))}
            </ul>
            <p className="text-sm text-body mt-2">
              <strong>Remaining Employees (Marked as Present):</strong>
            </p>
            <ul className="list-disc pl-5 text-sm text-body">
              {bulkConfirmDialog.remaining.map((record, index) => (
                <li key={index}>Employee ID {record.employeeId}</li>
              ))}
            </ul>
          </div>
          <DialogFooter className="shrink-0 px-4 py-4 border-t border-accent flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkConfirmDialog({ open: false, records: [], remaining: [] })}
              className="border-accent text-body hover:bg-accent-hover text-sm py-3 px-4 focus:ring-2 focus:ring-accent"
              disabled={attendanceLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmBulkSubmit}
              className="bg-accent text-body hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 focus:ring-2 focus:ring-accent"
              disabled={attendanceLoading}
            >
              {attendanceLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual Mark Confirmation Dialog */}
      <Dialog
        open={individualConfirmDialog.open}
        onOpenChange={(open) => !open && setIndividualConfirmDialog({ open: false, records: [] })}
      >
        <DialogContent className="bg-complementary text-body border-accent max-w-[90vw] sm:max-w-md max-h-[70vh] h-full overflow-hidden flex flex-col rounded-lg">
          <DialogHeader className="shrink-0 px-4 pt-4">
            <DialogTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              Confirm Individual Attendance
            </DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to mark attendance for {individualConfirmDialog.records.length} employee(s) with the selected statuses?
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <p className="text-sm text-body">
              <strong>Attendance Records:</strong>
            </p>
            <ul className="list-disc pl-5 text-sm text-body">
              {individualConfirmDialog.records.map((record, index) => (
                <li key={index}>
                  Employee ID {record.employeeId}: {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter className="shrink-0 px-4 py-4 border-t border-accent flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIndividualConfirmDialog({ open: false, records: [] })}
              className="border-accent text-body hover:bg-accent-hover text-sm py-3 px-4 focus:ring-2 focus:ring-accent"
              disabled={attendanceLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmIndividualSubmit}
              className="bg-accent text-body hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 focus:ring-2 focus:ring-accent"
              disabled={attendanceLoading}
            >
              {attendanceLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Attendance Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="sm:max-w-md w-full bg-complementary text-body border-accent rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Edit Attendance for {editDialog?.employeeName || ''} on{' '}
              {editDialog?.date && format(editDialog.date, 'PPP')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status" className="text-sm font-medium">Status</Label>
              <Select
                value={editDialog?.currentStatus}
                onValueChange={(status) => setEditDialog({ ...editDialog, currentStatus: status })}
              >
                <SelectTrigger className="bg-complementary text-body border-accent h-12 focus:ring-2 focus:ring-accent">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-complementary text-body">
                  <SelectItem value="present" className="text-sm">Present</SelectItem>
                  <SelectItem value="absent" className="text-sm">Absent</SelectItem>
                  <SelectItem value="leave" disabled={editDialog?.availableLeaves < 1} className="text-sm">
                    Leave {editDialog?.availableLeaves < 1 && '(No leaves available)'}
                  </SelectItem>
                  <SelectItem value="half-day" className="text-sm">Half-Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialog(null)}
                className="border-accent text-body hover:bg-accent-hover text-sm py-3 px-4 focus:ring-2 focus:ring-accent"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleEditAttendance(editDialog.attendanceId, editDialog.currentStatus)}
                className="bg-accent text-body hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 focus:ring-2 focus:ring-accent"
                disabled={attendanceLoading}
              >
                {attendanceLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reason View Dialog */}
      <Dialog
        open={reasonDialog.open}
        onOpenChange={(open) => !open && setReasonDialog({ open: false, reason: '', employeeName: '', date: '' })}
      >
        <DialogContent className="bg-complementary text-body border-accent max-w-[90vw] sm:max-w-md max-h-[70vh] h-full overflow-hidden flex flex-col rounded-lg">
          <DialogHeader className="shrink-0 px-4 pt-4">
            <DialogTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5 text-accent" />
              Reason for Request
            </DialogTitle>
            <DialogDescription className="text-sm">
              Request by {reasonDialog.employeeName} on {reasonDialog.date}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <p className="text-sm text-body">{reasonDialog.reason}</p>
          </div>
          <DialogFooter className="shrink-0 px-4 py-4 border-t border-accent flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReasonDialog({ open: false, reason: '', employeeName: '', date: '' })}
              className="border-accent text-body hover:bg-accent-hover text-sm py-3 px-4 focus:ring-2 focus:ring-accent"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Action Confirmation Dialog */}
      <Dialog
        open={requestActionDialog.open}
        onOpenChange={(open) => !open && setRequestActionDialog({ open: false, requestId: null, action: '', employeeName: '', date: '', requestedStatus: '' })}
      >
        <DialogContent className="bg-complementary text-body border-accent max-w-[90vw] sm:max-w-md max-h-[70vh] h-full overflow-hidden flex flex-col rounded-lg">
          <DialogHeader className="shrink-0 px-4 pt-4">
            <DialogTitle className="text-lg flex items-center gap-2">
              {requestActionDialog.action === 'approved' ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  Approve Request
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-red-500" />
                  Reject Request
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to {requestActionDialog.action} the request for {requestActionDialog.employeeName} on {requestActionDialog.date} to mark as {requestActionDialog.requestedStatus}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="shrink-0 px-4 py-4 border-t border-accent flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRequestActionDialog({ open: false, requestId: null, action: '', employeeName: '', date: '', requestedStatus: '' })}
              className="border-accent text-body hover:bg-accent-hover text-sm py-3 px-4 focus:ring-2 focus:ring-accent"
              disabled={attendanceLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmRequestAction}
              className={`${requestActionDialog.action === 'approved' ? 'bg-green-500 hover:bg-green-600 focus:ring-green-500' : 'bg-red-500 hover:bg-red-600 focus:ring-red-500'} text-body text-sm py-3 px-4 flex items-center gap-2 focus:ring-2`}
              disabled={attendanceLoading}
            >
              {attendanceLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : requestActionDialog.action === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Attendance;