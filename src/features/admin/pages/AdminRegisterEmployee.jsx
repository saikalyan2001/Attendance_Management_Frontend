import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerEmployee, reset as resetEmployees } from '../redux/employeeSlice';
import { fetchLocations, reset as resetLocations } from '../redux/locationsSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { logout } from '../../../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const RegisterEmployee = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { loading: employeesLoading, error: employeesError, success } = useSelector((state) => state.adminEmployees);
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.adminLocations);

  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    designation: '',
    department: '',
    salary: '',
    location: '',
    phone: '',
    dob: '',
  });

  useEffect(() => {
    dispatch(fetchLocations());
  }, [dispatch]);

  useEffect(() => {
    if (employeesError || locationsError) {
      toast.error(employeesError || locationsError);
      dispatch(resetEmployees());
      dispatch(resetLocations());
    }
    if (success) {
      toast.success('Employee registered successfully');
      dispatch(resetEmployees());
      setFormData({
        employeeId: '',
        name: '',
        email: '',
        designation: '',
        department: '',
        salary: '',
        location: '',
        phone: '',
        dob: '',
      });
    }
  }, [employeesError, locationsError, success, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { employeeId, name, email, designation, department, salary, location, phone, dob } = formData;

    if (!employeeId || !name || !email || !designation || !department || !salary || !location) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!/^\d+$/.test(salary)) {
      toast.error('Salary must be a valid number');
      return;
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      toast.error('Phone number must be 10 digits');
      return;
    }

    dispatch(
      registerEmployee({
        employeeId,
        name,
        email,
        designation,
        department,
        salary: parseFloat(salary),
        location,
        phone,
        dob: dob ? new Date(dob).toISOString() : undefined,
        paidLeaves: { available: 3, used: 0, carriedForward: 0 },
        documents: [],
      })
    );
  };

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Register Employee</h1>
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
          {(employeesError || locationsError) && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{employeesError || locationsError}</AlertDescription>
            </Alert>
          )}
          <Card className="bg-complementary text-body max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Add New Employee</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="employeeId">Employee ID *</Label>
                  <Input
                    id="employeeId"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    placeholder="e.g., EMP003"
                    className="bg-complementary text-body border-accent"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Alice Johnson"
                    className="bg-complementary text-body border-accent"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="e.g., alice@example.com"
                    className="bg-complementary text-body border-accent"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="designation">Designation *</Label>
                  <Input
                    id="designation"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    placeholder="e.g., Analyst"
                    className="bg-complementary text-body border-accent"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department *</Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="e.g., Finance"
                    className="bg-complementary text-body border-accent"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="salary">Salary *</Label>
                  <Input
                    id="salary"
                    name="salary"
                    type="number"
                    value={formData.salary}
                    onChange={handleInputChange}
                    placeholder="e.g., 55000"
                    className="bg-complementary text-body border-accent"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData({ ...formData, location: value })}
                  >
                    <SelectTrigger id="location" className="bg-complementary text-body border-accent">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      {locations.map((loc) => (
                        <SelectItem key={loc._id} value={loc._id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g., 1234567890"
                    className="bg-complementary text-body border-accent"
                  />
                </div>
                <div>
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    name="dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="bg-complementary text-body border-accent"
                  />
                </div>
                <Button
                  type="submit"
                  className="bg-accent text-body hover:bg-accent-hover"
                  disabled={employeesLoading || locationsLoading}
                >
                  {employeesLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Register Employee'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default RegisterEmployee;