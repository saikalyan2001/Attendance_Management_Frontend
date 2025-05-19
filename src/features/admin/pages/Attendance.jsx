import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendance, markAttendance, editAttendance, fetchAttendanceRequests, handleAttendanceRequest } from '../redux/attendanceSlice';
import { fetchLocations } from '../redux/locationsSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Loader2, LogOut } from 'lucide-react';
import { logout } from '../../../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const Attendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { attendance, attendanceRequests, loading: attendanceLoading, error: attendanceError } = useSelector((state) => state.adminAttendance);
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.adminLocations);


  const [month, setMonth] = useState('5'); // May 2025
  const [location, setLocation] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date(2025, 4, 19)); // May 19, 2025
  const [absentEmployees, setAbsentEmployees] = useState([]);
  const [editDialog, setEditDialog] = useState(null);
  const [requestDialog, setRequestDialog] = useState(null);

  useEffect(() => {
    const year = 2025;
    dispatch(fetchAttendance({ month: parseInt(month), year, location: location === 'all' ? '' : location }));
    dispatch(fetchLocations());
    dispatch(fetchAttendanceRequests());
  }, [dispatch, month, location]);

  useEffect(() => {
    if (attendanceError || locationsError) {
      toast.error(attendanceError || locationsError);
      dispatch({ type: 'attendance/reset' });
      dispatch({ type: 'locations/reset' });
    }
  }, [attendanceError, locationsError, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleMarkAttendance = () => {
    dispatch(markAttendance({
      date: format(selectedDate, 'yyyy-MM-dd'),
      location: location === 'all' ? locations[0]?._id : location,
      absentEmployees,
    }))
      .unwrap()
      .then(() => {
        toast.success('Attendance marked successfully');
        setAbsentEmployees([]);
      })
      .catch((err) => toast.error(err));
  };

  const handleEditAttendance = (attendanceId, newStatus) => {
    dispatch(editAttendance({ id: attendanceId, status: newStatus }))
      .unwrap()
      .then(() => {
        toast.success('Attendance updated successfully');
        setEditDialog(null);
      })
      .catch((err) => toast.error(err));
  };

  const handleRequestAction = (requestId, status) => {
    dispatch(handleAttendanceRequest({ id: requestId, status }))
      .unwrap()
      .then(() => {
        toast.success(`Request ${status} successfully`);
        setRequestDialog(null);
      })
      .catch((err) => toast.error(err));
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

  const daysInMonth = eachDayOfInterval(new Date(2025, parseInt(month) - 1));
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Attendance</h1>
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
          {(attendanceError || locationsError) && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{attendanceError || locationsError}</AlertDescription>
            </Alert>
          )}
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Mark Attendance</CardTitle>
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
                  <Label>Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="bg-complementary text-body border-accent"
                  />
                </div>
              </div>
              <div className="mb-4">
                <Label>Select Absent Employees</Label>
                <Select
                  multiple
                  value={absentEmployees}
                  onValueChange={setAbsentEmployees}
                >
                  <SelectTrigger className="bg-complementary text-body border-accent">
                    <SelectValue placeholder="Select absent employees" />
                  </SelectTrigger>
                  <SelectContent className="bg-complementary text-body">
                    {locations
                      .filter((loc) => location === 'all' || loc._id === location)
                      .flatMap((loc) =>
                        loc.employees?.map((emp) => (
                          <SelectItem key={emp._id} value={emp._id}>
                            {emp.name} ({emp.employeeId})
                          </SelectItem>
                        ))
                      )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleMarkAttendance}
                className="bg-accent text-body hover:bg-accent-hover"
                disabled={attendanceLoading || locationsLoading || !location || absentEmployees.length === 0}
              >
                Mark Attendance
              </Button>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Attendance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              ) : attendance?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-body">Employee ID</TableHead>
                      <TableHead className="text-body">Name</TableHead>
                      {daysInMonth.map((day, index) => (
                        <TableHead key={index} className="text-body">
                          {weekDays[getDay(day)]}<br />{format(day, 'dd')}
                        </TableHead>
                      ))}
                      <TableHead className="text-body">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(attendance.reduce((acc, record) => {
                      const empId = record.employee._id;
                      if (!acc[empId]) {
                        acc[empId] = {
                          employeeId: record.employee.employeeId,
                          name: record.employee.name,
                          status: Array(daysInMonth.length).fill('-'),
                        };
                      }
                      const dayIndex = daysInMonth.findIndex((d) => format(d, 'yyyy-MM-dd') === format(new Date(record.date), 'yyyy-MM-dd'));
                      if (dayIndex !== -1) {
                        acc[empId].status[dayIndex] = record.status.charAt(0).toUpperCase();
                      }
                      return acc;
                    }, {})).map((emp) => (
                      <TableRow key={emp.employeeId}>
                        <TableCell className="text-body">{emp.employeeId}</TableCell>
                        <TableCell className="text-body">{emp.name}</TableCell>
                        {emp.status.map((status, index) => (
                          <TableCell key={index} className={`text-body ${status === 'P' ? 'text-green-500' : status === 'A' ? 'text-red-500' : status === 'L' ? 'text-yellow-500' : ''}`}>
                            {status}
                          </TableCell>
                        ))}
                        <TableCell>
                          <Dialog open={editDialog?.employeeId === emp.employeeId} onOpenChange={() => setEditDialog(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditDialog({ employeeId: emp.employeeId })}
                                className="border-accent text-accent hover:bg-accent-hover hover:text-body"
                              >
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md bg-complementary text-body">
                              <DialogHeader>
                                <DialogTitle>Edit Attendance for {emp.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Select
                                  onValueChange={(value) => handleEditAttendance(attendance.find((a) => a.employee._id === emp.employeeId)?._id, value)}
                                >
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
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-complementary">No attendance records available.</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Attendance Edit Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              ) : attendanceRequests?.length > 0 ? (
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
                        <TableCell className="text-body">{req.employee.name} ({req.employee.employeeId})</TableCell>
                        <TableCell className="text-body">{req.location.name}</TableCell>
                        <TableCell className="text-body">{format(new Date(req.date), 'MM/dd/yyyy')}</TableCell>
                        <TableCell className="text-body">{req.requestedStatus.charAt(0).toUpperCase() + req.requestedStatus.slice(1)}</TableCell>
                        <TableCell className="text-body">{req.reason}</TableCell>
                        <TableCell className="text-body">{req.status.charAt(0).toUpperCase() + req.status.slice(1)}</TableCell>
                        <TableCell>
                          {req.status === 'pending' && (
                            <Dialog open={requestDialog?.id === req._id} onOpenChange={() => setRequestDialog(null)}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRequestDialog({ id: req._id })}
                                  className="border-accent text-accent hover:bg-accent-hover hover:text-body"
                                >
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md bg-complementary text-body">
                                <DialogHeader>
                                  <DialogTitle>Review Request</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Button
                                    onClick={() => handleRequestAction(req._id, 'approved')}
                                    className="bg-green-500 text-body hover:bg-green-600"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => handleRequestAction(req._id, 'rejected')}
                                    className="bg-red-500 text-body hover:bg-red-600"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-complementary">No attendance edit requests.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Attendance;