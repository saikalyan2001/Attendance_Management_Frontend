import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { markAttendance, fetchMonthlyAttendance } from '../redux/markAttendanceSlice';
import { fetchEmployees } from '../redux/employeeSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LogOut } from 'lucide-react';
import { logout } from '../../../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const MarkAttendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { employees, loading: empLoading } = useSelector((state) => state.siteInchargeEmployee);
  const { monthlyAttendance, loading, error } = useSelector((state) => state.siteInchargeMarkAttendance);

  const [form, setForm] = useState({
    employeeId: '',
    date: '',
    status: '',
  });
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1); // 1-12
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchMonthlyAttendance({ month: monthFilter, year: yearFilter }));
  }, [dispatch, monthFilter, yearFilter]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch({ type: 'siteInchargeMarkAttendance/reset' });
    }
  }, [error, dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSelectChange = (name, value) => {
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    if (!form.employeeId || !form.date || !form.status) {
      setFormError('All fields are required');
      toast.error('All fields are required');
      return;
    }

    const parsedDate = new Date(form.date);
    if (isNaN(parsedDate)) {
      setFormError('Invalid date format');
      toast.error('Invalid date format');
      return;
    }

    dispatch(markAttendance(form))
      .unwrap()
      .then(() => {
        toast.success('Attendance marked successfully');
        setForm({ employeeId: '', date: '', status: '' });
        dispatch(fetchMonthlyAttendance({ month: monthFilter, year: yearFilter }));
      })
      .catch((err) => {
        setFormError(err);
        toast.error(err);
      });
  };

  const handleMonthChange = (value) => {
    setMonthFilter(parseInt(value));
  };

  const handleYearChange = (value) => {
    setYearFilter(parseInt(value));
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Mark Attendance</h1>
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
        <main className="flex-1 p-6">
          {formError && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <Card className="bg-complementary text-body max-w-2xl mx-auto mb-8">
            <CardHeader>
              <CardTitle>Mark Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="employeeId">Employee</Label>
                  <Select
                    value={form.employeeId}
                    onValueChange={(value) => handleSelectChange('employeeId', value)}
                  >
                    <SelectTrigger id="employeeId" className="bg-complementary text-body border-accent">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      {employees.map((emp) => (
                        <SelectItem key={emp._id} value={emp._id}>
                          {emp.name} ({emp.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={handleInputChange}
                    className="bg-complementary text-body border-accent"
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => handleSelectChange('status', value)}
                  >
                    <SelectTrigger id="status" className="bg-complementary text-body border-accent">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      <SelectItem value="Present">Present</SelectItem>
                      <SelectItem value="Absent">Absent</SelectItem>
                      <SelectItem value="Half-Day">Half-Day</SelectItem>
                      <SelectItem value="Leave">Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Available Paid Leaves</Label>
                  <Input
                    value={
                      employees.find((emp) => emp._id === form.employeeId)?.paidLeaves.available || 0
                    }
                    className="bg-complementary text-body border-accent"
                    disabled
                  />
                </div>
                <Button
                  type="submit"
                  className="bg-accent text-body hover:bg-accent-hover"
                  disabled={loading || empLoading}
                >
                  Mark Attendance
                </Button>
              </form>
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
              ) : monthlyAttendance.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-body">Employee</TableHead>
                      <TableHead className="text-body">Date</TableHead>
                      <TableHead className="text-body">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyAttendance.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell className="text-body">
                          {record.employee.name} ({record.employee.employeeId})
                        </TableCell>
                        <TableCell className="text-body">
                          {new Date(record.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-body">{record.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-complementary">No attendance records found</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default MarkAttendance;