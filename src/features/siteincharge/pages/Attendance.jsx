import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendance } from '../redux/attendanceSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, LogOut } from 'lucide-react';
import { logout } from '../../../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

const Attendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { attendance, loading, error } = useSelector((state) => state.siteInchargeAttendance);
  const [date, setDate] = useState(null);
  const [status, setStatus] = useState('all');

  useEffect(() => {
    const filters = {};
    if (date) filters.date = format(date, 'yyyy-MM-dd');
    if (status && status !== 'all') filters.status = status;
    dispatch(fetchAttendance(filters));
  }, [dispatch, date, status]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const resetFilters = () => {
    setDate(null);
    setStatus('all');
  };

  return (
    <div className="flex min-h-screen bg-body">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow">
          <h1 className="text-xl font-bold">Attendance</h1>
          <div className="flex items-center space-x-4">
            <span>{user?.email || 'Guest'}</span>
            <ThemeToggle />
            {user && (
              <Button variant="outline" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 p-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filter Attendance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-48 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
            </CardContent>
          </Card>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {loading ? (
            <p>Loading attendance...</p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance?.length > 0 ? (
                      attendance.map((record) => (
                        <TableRow key={record._id}>
                          <TableCell>{record.employee?.name || 'Unknown'}</TableCell>
                          <TableCell className={record.status === 'present' ? 'text-green-600' : 'text-red-600'}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </TableCell>
                          <TableCell>{format(new Date(record.date), 'PPP')}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">
                          No attendance records found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default Attendance;