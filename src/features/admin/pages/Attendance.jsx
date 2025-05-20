import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendance, markAttendance, editAttendance, fetchAttendanceRequests, handleAttendanceRequest } from '../redux/attendanceSlice';
import { fetchLocations } from '../redux/locationsSlice';
import { fetchEmployees, reset as resetEmployees } from '../redux/employeeSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const Attendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { attendance, attendanceRequests, loading: attendanceLoading, error: attendanceError } = useSelector((state) => state.adminAttendance);
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.adminLocations);
  const { employees, loading: employeesLoading, error: employeesError } = useSelector((state) => state.adminEmployees);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [location, setLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [absentEmployees, setAbsentEmployees] = useState([]);
  const [editDialog, setEditDialog] = useState(null);

  useEffect(() => {
    dispatch(fetchLocations());
    dispatch(fetchEmployees({ location: location || 'all' }));
    dispatch(fetchAttendance({ month, year, location: location || '' }));
    dispatch(fetchAttendanceRequests());
  }, [dispatch, month, year, location]);

  useEffect(() => {
    if (attendanceError || locationsError || employeesError) {
      console.error('Errors:', { attendanceError, locationsError, employeesError });
      toast.error(attendanceError || locationsError || employeesError || 'Failed to load data');
      dispatch({ type: 'adminAttendance/reset' });
      dispatch({ type: 'adminLocations/reset' });
      dispatch(resetEmployees());
    }
  }, [attendanceError, locationsError, employeesError, dispatch]);

  const handleMarkAttendance = () => {
    if (!location) {
      toast.error('Please select a location');
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
        dispatch(fetchAttendance({ month, year, location: location || '' }));
      })
      .catch((err) => {
        console.error('Mark attendance failed:', err);
        toast.error(err.message || 'Failed to mark attendance');
      });
  };

  const handleEditAttendance = (attendanceId, newStatus) => {
    console.log('Editing attendance:', { attendanceId, newStatus });
    dispatch(editAttendance({ id: attendanceId, status: newStatus }))
      .unwrap()
      .then(() => {
        toast.success('Attendance updated successfully');
        setEditDialog(null);
        dispatch(fetchAttendance({ month, year, location: location || '' }));
      })
      .catch((err) => {
        console.error('Edit attendance failed:', err);
        toast.error(err.message || 'Failed to edit attendance');
      });
  };

  const handleRequestAction = (requestId, status) => {
    dispatch(handleAttendanceRequest({ id: requestId, status }))
      .unwrap()
      .then(() => {
        toast.success(`Request ${status} successfully`);
        dispatch(fetchAttendanceRequests());
      })
      .catch((err) => {
        console.error('Handle request failed:', err);
        toast.error(err.message || 'Failed to handle request');
      });
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: `${i + 1}`,
    label: format(new Date(2025, i), 'MMMM'),
  }));

  const years = [2024, 2025, 2026];

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(new Date(year, month - 1)),
    end: endOfMonth(new Date(year, month - 1)),
  });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  console.log('Attendance data:', attendance, 'Days in month:', daysInMonth);

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Attendance</h1>
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
              <AlertDescription>{attendanceError || locationsError || employeesError || 'Error loading data'}</AlertDescription>
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
                  <Select value={`${month}`} onValueChange={(val) => setMonth(parseInt(val))}>
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
                  <Select value={`${year}`} onValueChange={(val) => setYear(parseInt(val))}>
                    <SelectTrigger id="year" className="bg-complementary text-body border-accent">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      {years.map((y) => (
                        <SelectItem key={y} value={`${y}`}>
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
                      {locationsLoading ? (
                        <SelectItem value="loading">Loading...</SelectItem>
                      ) : locations.length > 0 ? (
                        locations.map((loc) => (
                          <SelectItem key={loc._id} value={loc._id}>
                            {loc.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none">No locations available</SelectItem>
                      )}
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
                />
              </div>
              <div className="mb-4">
                <Label>Select Absent Employees</Label>
                {employeesLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : employeesError ? (
                  <p className="text-error">Error loading employees: {employeesError}</p>
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
                          {emp.name} ({emp.employeeId})
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
                disabled={attendanceLoading || locationsLoading || employeesLoading || !location || !employees.length}
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
              ) : attendanceError ? (
                <p className="text-error">Error loading attendance: {attendanceError}</p>
              ) : attendance.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-body sticky left-0 bg-complementary z-10 min-w-[100px]">Employee ID</TableHead>
                          <TableHead className="text-body sticky left-[100px] bg-complementary z-10 min-w-[150px]">Name</TableHead>
                          {daysInMonth.map((day, index) => (
                            <TableHead key={index} className="text-body min-w-[50px]">
                              {weekDays[getDay(day)]}
                              <br />
                              {format(day, 'dd')}
                            </TableHead>
                          ))}
                          <TableHead className="text-body min-w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.values(
                          attendance.reduce((acc, record) => {
                            if (!record.employee?._id) {
                              console.warn('Invalid attendance record:', record);
                              return acc;
                            }
                            const empId = record.employee._id;
                            if (!acc[empId]) {
                              acc[empId] = {
                                employeeId: record.employee.employeeId || 'N/A',
                                name: record.employee.name || 'Unknown',
                                status: Array(daysInMonth.length).fill('-'),
                                records: {},
                              };
                            }
                            const recordDate = new Date(record.date);
                            const dayIndex = daysInMonth.findIndex((d) => isSameDay(d, recordDate));
                            if (dayIndex !== -1) {
                              acc[empId].status[dayIndex] = record.status.charAt(0).toUpperCase();
                              acc[empId].records[dayIndex] = record._id;
                            } else {
                              console.warn('Date out of range:', record.date, record);
                            }
                            return acc;
                          }, {})
                        ).map((emp) => {
                          console.log('Employee attendance:', emp);
                          return (
                            <TableRow key={emp.employeeId}>
                              <TableCell className="text-body sticky left-0 bg-complementary z-10">{emp.employeeId}</TableCell>
                              <TableCell className="text-body sticky left-[100px] bg-complementary z-10">{emp.name}</TableCell>
                              {emp.status.map((status, index) => (
                                <TableCell
                                  key={index}
                                  className={`text-body text-center ${
                                    status === 'P' ? 'text-green-600 dark:text-green-400' :
                                    status === 'A' ? 'text-red-600 dark:text-red-400' :
                                    status === 'L' ? 'text-yellow-600 dark:text-yellow-400' : ''
                                  }`}
                                >
                                  {status}
                                </TableCell>
                              ))}
                              <TableCell>
                                <Dialog
                                  open={editDialog?.employeeId === emp.employeeId}
                                  onOpenChange={(open) => !open && setEditDialog(null)}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditDialog({ employeeId: emp.employeeId, records: emp.records })}
                                      className="border-accent text-accent hover:bg-accent-hover hover:text-body"
                                      disabled={attendanceLoading}
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
                                        value={editDialog?.selectedDate || ''}
                                        onValueChange={(date) => setEditDialog({ ...editDialog, selectedDate: date })}
                                      >
                                        <SelectTrigger className="bg-complementary text-body border-accent">
                                          <SelectValue placeholder="Select date" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-complementary text-body">
                                          {Object.entries(emp.records).map(([idx, recordId]) => (
                                            <SelectItem key={idx} value={idx}>
                                              {format(daysInMonth[parseInt(idx)], 'MMM dd, yyyy')}
                                            </SelectItem>
                                          ))}
                                          {Object.keys(emp.records).length === 0 && (
                                            <SelectItem value="none" disabled>
                                              No attendance records
                                            </SelectItem>
                                          )}
                                        </SelectContent>
                                      </Select>
                                      <Select
                                        value={editDialog?.selectedStatus || ''}
                                        onValueChange={(status) => {
                                          if (editDialog?.selectedDate && emp.records[parseInt(editDialog.selectedDate)]) {
                                            handleEditAttendance(emp.records[parseInt(editDialog.selectedDate)], status);
                                          }
                                        }}
                                        disabled={!editDialog?.selectedDate}
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
                                      {attendanceLoading && <Loader2 className="h-5 w-5 animate-spin mx-auto" />}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
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
              ) : attendanceRequests?.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
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
                              {req.employee?.name || 'Unknown'} ({req.employee?.employeeId || 'N/A'})
                            </TableCell>
                            <TableCell className="text-body">{req.location?.name || 'N/A'}</TableCell>
                            <TableCell className="text-body">{format(new Date(req.date), 'MM/dd/yyyy')}</TableCell>
                            <TableCell className="text-body">
                              {req.requestedStatus.charAt(0).toUpperCase() + req.requestedStatus.slice(1)}
                            </TableCell>
                            <TableCell className="text-body">{req.reason}</TableCell>
                            <TableCell className="text-body">
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </TableCell>
                            <TableCell>
                              {req.status === 'pending' && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-accent text-accent hover:bg-accent-hover hover:text-body"
                                      disabled={attendanceLoading}
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
                                  </DialogContent>
                                </Dialog>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <p className="text-body">No attendance edit requests available.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Attendance;