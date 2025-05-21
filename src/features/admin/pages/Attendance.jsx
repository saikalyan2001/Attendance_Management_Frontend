import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendance, markAttendance, editAttendance, fetchAttendanceRequests, handleAttendanceRequest } from '../redux/attendanceSlice';
import { fetchLocations } from '../redux/locationsSlice';
import { fetchEmployees, reset as resetEmployees } from '../redux/employeeSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { Loader2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Attendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { attendance, attendanceRequests, loading: attendanceLoading, error: attendanceError } = useSelector((state) => state.adminAttendance);
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.adminLocations);
  const { employees, loading: employeesLoading, error: employeesError } = useSelector((state) => state.adminEmployees);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [location, setLocation] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [absentEmployees, setAbsentEmployees] = useState([]);
  const [editDialog, setEditDialog] = useState(null);
  const [requestDialog, setRequestDialog] = useState(null);

  useEffect(() => {
    dispatch(fetchLocations());
    dispatch(fetchEmployees({ location: location === 'all' ? undefined : location }));
    dispatch(fetchAttendance({ month, year, location: location === 'all' ? undefined : location }));
    dispatch(fetchAttendanceRequests());
  }, [dispatch, month, year, location]);

  useEffect(() => {
    if (attendanceError || locationsError || employeesError) {
      toast.error(attendanceError || locationsError || employeesError || 'Failed to load data');
      dispatch({ type: 'adminAttendance/reset' });
      dispatch({ type: 'adminLocations/reset' });
      dispatch(resetEmployees());
    }
  }, [attendanceError, locationsError, employeesError, dispatch]);

  const handleMarkAttendance = () => {
    if (!location || location === 'all') {
      toast.error('Please select a specific location');
      return;
    }
    if (!employees.length) {
      toast.error('No employees available for this location');
      return;
    }
    dispatch(
      markAttendance({
        date: format(selectedDate, 'yyyy-MM-dd'),
        location,
        absentEmployees,
      })
    )
      .unwrap()
      .then(() => {
        toast.success('Attendance marked successfully');
        setAbsentEmployees([]);
        dispatch(fetchAttendance({ month, year, location: location === 'all' ? undefined : location }));
      })
      .catch((err) => toast.error(err.message || 'Failed to mark attendance'));
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

  const handleRequestAction = (requestId, status) => {
    dispatch(handleAttendanceRequest({ id: requestId, status }))
      .unwrap()
      .then(() => {
        toast.success(`Request ${status} successfully`);
        setRequestDialog(null);
        dispatch(fetchAttendanceRequests());
        dispatch(fetchAttendance({ month, year, location: location === 'all' ? undefined : location }));
      })
      .catch((err) => toast.error(err.message || 'Failed to handle request'));
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

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Attendance Management</h1>
          <div className="flex items-center space-x-4">
            <span>Guest</span>
            <ThemeToggle />
            <Button variant="outline" size="icon" onClick={() => navigate('/login')} aria-label="Navigate to login">
              <LogOut className="h-5 w-5 text-accent" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 space-y-6 overflow-x-hidden">
          {(attendanceError || locationsError || employeesError) && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{attendanceError || locationsError || employeesError}</AlertDescription>
            </Alert>
          )}
          {/* Mark Attendance Card */}
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Mark Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div>
                  <Label htmlFor="month">Month</Label>
                  <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
                    <SelectTrigger id="month" className="bg-complementary text-body border-accent">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Select value={year.toString()} onValueChange={(val) => setYear(parseInt(val))}>
                    <SelectTrigger id="year" className="bg-complementary text-body border-accent">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
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
              <div className="mb-4">
                <Label>Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="bg-complementary text-body border-accent rounded-md"
                  disabled={{ after: new Date() }}
                />
              </div>
              <div className="mb-4">
                <Label>Select Absent Employees</Label>
                {employeesLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : employees.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {employees.map((emp) => (
                      <div key={emp._id} className="flex items-center space-x-2">
                        <Checkbox
                          id={emp._id}
                          checked={absentEmployees.includes(emp._id)}
                          onCheckedChange={(checked) =>
                            checked
                              ? setAbsentEmployees([...absentEmployees, emp._id])
                              : setAbsentEmployees(absentEmployees.filter((id) => id !== emp._id))
                          }
                        />
                        <Label htmlFor={emp._id}>
                          {emp.name} ({emp.employeeId}) - Leaves: {emp.paidLeaves.available}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-body">No employees found for this location</p>
                )}
              </div>
              <Button
                onClick={handleMarkAttendance}
                className="bg-accent text-body hover:bg-accent-hover"
                disabled={attendanceLoading || locationsLoading || employeesLoading || !location || location === 'all'}
              >
                {attendanceLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Mark Attendance'}
              </Button>
            </CardContent>
          </Card>
          {/* Attendance Overview Card */}
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Attendance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <div className="space-y-4">
                  {Array(5).fill().map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : attendance.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-body sticky left-0 bg-complementary z-10">Employee</TableHead>
                        <TableHead className="text-body">Location</TableHead>
                        {daysInMonth.map((day) => (
                          <TableHead key={format(day, 'yyyy-MM-dd')} className="text-body">
                            {weekDays[getDay(day)]}
                            <br />
                            {format(day, 'dd')}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp) => (
                        <TableRow key={emp._id}>
                          <TableCell className="text-body sticky left-0 bg-complementary z-10">
                            {emp.name} ({emp.employeeId})
                          </TableCell>
                          <TableCell className="text-body">{locations.find((loc) => loc._id === emp.location)?.name || 'N/A'}</TableCell>
                          {daysInMonth.map((day) => {
                            const record = attendance.find(
                              (att) =>
                                att.employee?._id.toString() === emp._id.toString() &&
                                format(new Date(att.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                            );
                            return (
                              <TableCell
                                key={format(day, 'yyyy-MM-dd')}
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
                                  setEditDialog({
                                    attendanceId: record._id,
                                    currentStatus: record.status,
                                    employeeId: emp._id,
                                    employeeName: emp.name,
                                    availableLeaves: emp.paidLeaves.available,
                                    date: day,
                                  })
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
                <p className="text-body">No attendance records available</p>
              )}
            </CardContent>
          </Card>
          {/* Attendance Requests Card */}
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Attendance Edit Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <div className="space-y-4">
                  {Array(3).fill().map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : attendanceRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-body">Employee</TableHead>
                        <TableHead className="text-body">Location</TableHead>
                        <TableHead className="text-body">Date</TableHead>
                        <TableHead className="text-body">Requested Status</TableHead>
                        <TableHead className="text-body">Reason</TableHead>
                        <TableHead className="text-body">Status</TableHead>
                        <TableHead className="text-body">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRequests.map((req) => (
                        <TableRow key={req._id}>
                          <TableCell className="text-body">
                            {req.employee?.name} ({req.employee?.employeeId})
                          </TableCell>
                          <TableCell className="text-body">{req.location?.name}</TableCell>
                          <TableCell className="text-body">{format(new Date(req.date), 'PPP')}</TableCell>
                          <TableCell className="text-body">
                            {req.requestedStatus.charAt(0).toUpperCase() + req.requestedStatus.slice(1)}
                          </TableCell>
                          <TableCell className="text-body">{req.reason}</TableCell>
                          <TableCell className="text-body">
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </TableCell>
                          <TableCell>
                            {req.status === 'pending' && (
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => handleRequestAction(req._id, 'approved')}
                                  className="bg-green-500 text-body hover:bg-green-600"
                                  disabled={attendanceLoading}
                                >
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => handleRequestAction(req._id, 'rejected')}
                                  className="bg-red-500 text-body hover:bg-red-600"
                                  disabled={attendanceLoading}
                                >
                                  Reject
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
                <p className="text-body">No attendance edit requests available</p>
              )}
            </CardContent>
          </Card>
          {/* Edit Attendance Dialog */}
          {editDialog && (
            <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
              <DialogContent className="sm:max-w-md bg-complementary text-body">
                <DialogHeader>
                  <DialogTitle>
                    Edit Attendance for {editDialog.employeeName} on {format(editDialog.date, 'PPP')}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={editDialog.currentStatus}
                      onValueChange={(status) =>
                        setEditDialog({ ...editDialog, currentStatus: status })
                      }
                    >
                      <SelectTrigger className="bg-complementary text-body border-accent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-complementary text-body">
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="leave" disabled={editDialog.availableLeaves < 1}>
                          Leave {editDialog.availableLeaves < 1 && '(No leaves available)'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setEditDialog(null)}
                      className="bg-complementary text-body border-accent"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleEditAttendance(editDialog.attendanceId, editDialog.currentStatus)}
                      className="bg-accent text-body hover:bg-accent-hover"
                      disabled={attendanceLoading}
                    >
                      Save
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
    </div>
  );
};

export default Attendance;
