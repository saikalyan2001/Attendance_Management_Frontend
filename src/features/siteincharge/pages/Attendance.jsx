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
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

const Attendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { attendance, loading, error } = useSelector((state) => state.siteInchargeAttendance);

  const [date, setDate] = useState(null);
  const [status, setStatus] = useState('all');

  // Hardcoded location for no-auth testing
  const locationId = '1234567890abcdef1234567a';

  useEffect(() => {
    const filters = { location: locationId };
    if (date) filters.date = format(date, 'yyyy-MM-dd');
    if (status && status !== 'all') filters.status = status;
    dispatch(fetchAttendance(filters));
  }, [dispatch, date, status]);

  useEffect(() => {
    if (error) {
      console.error('Attendance fetch error:', error);
      toast.error(error || 'Failed to load attendance records');
      dispatch({ type: 'siteInchargeAttendance/reset' });
    }
  }, [error, dispatch]);

  const resetFilters = () => {
    setDate(null);
    setStatus('all');
  };

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Attendance</h1>
          <div className="flex items-center space-x-4">
            <span>Guest</span>
            <ThemeToggle />
            <Button variant="outline" size="icon" onClick={() => navigate('/login')} aria-label="Navigate to login">
              <Loader2 className="h-5 w-5 text-accent" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 space-y-6">
          {error && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Filter Attendance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="filterDate" className="block text-sm font-medium">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-complementary text-body border-accent">
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
              </div>
              <div className="flex-1">
                <label htmlFor="filterStatus" className="block text-sm font-medium">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="filterStatus" className="bg-complementary text-body border-accent">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-complementary text-body">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="bg-complementary text-body border-accent"
                >
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array(5).fill().map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : attendance?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-body">Employee Name</TableHead>
                      <TableHead className="text-body">Status</TableHead>
                      <TableHead className="text-body">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell className="text-body">
                          {record.employee?.name || 'Unknown'} ({record.employee?.employeeId || 'N/A'})
                        </TableCell>
                        <TableCell
                          className={
                            record.status === 'present'
                              ? 'text-green-500'
                              : record.status === 'absent'
                              ? 'text-red-500'
                              : 'text-yellow-500'
                          }
                        >
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </TableCell>
                        <TableCell className="text-body">
                          {format(new Date(record.date), 'PPP')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-body">No attendance records found for the selected filters.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Attendance;