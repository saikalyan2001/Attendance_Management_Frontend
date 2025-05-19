import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerEmployee, fetchSettings } from '../redux/employeeSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut } from 'lucide-react';
import { logout } from '../../../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const RegisterEmployee = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { locations, settings, loading, error } = useSelector((state) => state.siteInchargeEmployee);

  const [form, setForm] = useState({
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
  const [documents, setDocuments] = useState([]);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch({ type: 'siteInchargeEmployee/reset' });
    }
  }, [error, dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleLocationChange = (value) => {
    setForm({ ...form, location: value });
  };

  const handleDocumentChange = (e) => {
    const files = Array.from(e.target.files);
    setDocuments(files);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    if (!form.employeeId || !form.name || !form.email || !form.designation || !form.department || !form.salary) {
      setFormError('All fields except documents, location, phone, and DOB are required');
      toast.error('All fields except documents, location, phone, and DOB are required');
      return;
    }

    if (isNaN(form.salary) || parseFloat(form.salary) <= 0) {
      setFormError('Salary must be a positive number');
      toast.error('Salary must be a positive number');
      return;
    }

    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      setFormError('Phone number must be 10 digits');
      toast.error('Phone number must be 10 digits');
      return;
    }

    if (form.dob && isNaN(new Date(form.dob))) {
      setFormError('Invalid date of birth');
      toast.error('Invalid date of birth');
      return;
    }

    const formData = new FormData();
    formData.append('employeeId', form.employeeId);
    formData.append('name', form.name);
    formData.append('email', form.email);
    formData.append('designation', form.designation);
    formData.append('department', form.department);
    formData.append('salary', parseFloat(form.salary));
    if (form.location && form.location !== 'none') {
      formData.append('location', form.location);
    }
    if (form.phone) {
      formData.append('phone', form.phone);
    }
    if (form.dob) {
      formData.append('dob', form.dob);
    }
    documents.forEach((file) => {
      formData.append('documents', file);
    });

    dispatch(registerEmployee(formData))
      .unwrap()
      .then(() => {
        toast.success('Employee registered successfully');
        navigate('/siteincharge/employees');
      })
      .catch((err) => {
        setFormError(err);
        toast.error(err);
      });
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
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
          {formError && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <Card className="bg-complementary text-body max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Register New Employee</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    name="employeeId"
                    value={form.employeeId}
                    onChange={handleInputChange}
                    className="bg-complementary text-body border-accent"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    className="bg-complementary text-body border-accent"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleInputChange}
                    className="bg-complementary text-body border-accent"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    name="designation"
                    value={form.designation}
                    onChange={handleInputChange}
                    className="bg-complementary text-body border-accent"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    name="department"
                    value={form.department}
                    onChange={handleInputChange}
                    className="bg-complementary text-body border-accent"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="salary">Salary</Label>
                  <Input
                    id="salary"
                    name="salary"
                    type="number"
                    value={form.salary}
                    onChange={handleInputChange}
                    className="bg-complementary text-body border-accent"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    className="bg-complementary text-body border-accent"
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    name="dob"
                    type="date"
                    value={form.dob}
                    onChange={handleInputChange}
                    className="bg-complementary text-body border-accent"
                  />
                </div>
                <div>
                  <Label htmlFor="paidLeavesAvailable">Paid Leaves Available</Label>
                  <Input
                    id="paidLeavesAvailable"
                    value={settings?.paidLeavesPerMonth || 2}
                    className="bg-complementary text-body border-accent"
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select value={form.location} onValueChange={handleLocationChange}>
                    <SelectTrigger id="location" className="bg-complementary text-body border-accent">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      <SelectItem value="none">Not assigned</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc._id} value={loc._id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="documents">Documents (PDF, JPEG, PNG)</Label>
                  <Input
                    id="documents"
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleDocumentChange}
                    className="bg-complementary text-body border-accent"
                  />
                </div>
                <Button
                  type="submit"
                  className="bg-accent text-body hover:bg-accent-hover"
                  disabled={loading}
                >
                  Register
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