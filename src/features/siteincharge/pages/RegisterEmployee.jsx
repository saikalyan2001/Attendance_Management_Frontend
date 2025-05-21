import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerEmployee, fetchLocations, bulkRegisterEmployees } from '../redux/employeeSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Papa from 'papaparse';

const RegisterEmployee = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { locations, loading, error } = useSelector((state) => state.siteInchargeEmployee);

  const [form, setForm] = useState({
    employeeId: '',
    name: '',
    email: '',
    designation: '',
    department: '',
    salary: '',
    location: '1234567890abcdef1234567a', // Hardcoded Location A
    phone: '',
    dob: '',
  });
  const [documents, setDocuments] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvData, setCsvData] = useState([]);

  useEffect(() => {
    dispatch(fetchLocations());
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

  const onDrop = useCallback((acceptedFiles) => {
    const validFiles = acceptedFiles.filter((file) =>
      ['image/jpeg', 'image/png'].includes(file.type)
    );
    if (validFiles.length !== acceptedFiles.length) {
      toast.error('Only JPEG and PNG files are allowed for preview');
    }
    setDocuments((prev) => [...prev, ...validFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [] },
    multiple: true,
  });

  const removeDocument = (index) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file');
      return;
    }
    setCsvFile(file);
    Papa.parse(file, {
      complete: (result) => {
        const data = result.data;
        if (!data[0].includes('employeeId')) {
          toast.error('CSV must include headers: employeeId, name, email, designation, department, salary, phone, dob');
          return;
        }
        const parsedData = data.slice(1).map((row, index) => ({
          row: index + 2,
          employeeId: row[0],
          name: row[1],
          email: row[2],
          designation: row[3],
          department: row[4],
          salary: row[5],
          phone: row[6] || '',
          dob: row[7] || '',
          location: form.location,
        })).filter(row => row.employeeId); // Remove empty rows
        setCsvData(parsedData);
        validateCsvData(parsedData);
      },
      header: true,
      skipEmptyLines: true,
    });
  };

  const validateCsvData = (data) => {
    const errors = [];
    const seenIds = new Set();
    const seenEmails = new Set();

    data.forEach((row, index) => {
      if (!row.employeeId) errors.push({ row: row.row, message: 'Employee ID is required' });
      if (!row.name) errors.push({ row: row.row, message: 'Name is required' });
      if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push({ row: row.row, message: 'Valid email is required' });
      }
      if (!row.designation) errors.push({ row: row.row, message: 'Designation is required' });
      if (!row.department) errors.push({ row: row.row, message: 'Department is required' });
      if (!row.salary || isNaN(row.salary) || parseFloat(row.salary) <= 0) {
        errors.push({ row: row.row, message: 'Salary must be a positive number' });
      }
      if (row.phone && !/^\d{10}$/.test(row.phone)) {
        errors.push({ row: row.row, message: 'Phone number must be 10 digits' });
      }
      if (row.dob && isNaN(new Date(row.dob))) {
        errors.push({ row: row.row, message: 'Invalid date of birth' });
      }
      if (seenIds.has(row.employeeId)) {
        errors.push({ row: row.row, message: 'Duplicate employeeId in CSV' });
      } else {
        seenIds.add(row.employeeId);
      }
      if (seenEmails.has(row.email)) {
        errors.push({ row: row.row, message: 'Duplicate email in CSV' });
      } else {
        seenEmails.add(row.email);
      }
    });

    setCsvErrors(errors);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    if (!form.employeeId || !form.name || !form.email || !form.designation || !form.department || !form.salary || !form.location) {
      setFormError('All fields except phone, DOB, and documents are required');
      toast.error('All fields except phone, DOB, and documents are required');
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
    formData.append('location', form.location);
    if (form.phone) formData.append('phone', form.phone);
    if (form.dob) formData.append('dob', form.dob);
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

  const handleCsvSubmit = () => {
    if (csvErrors.length > 0) {
      toast.error('Please fix CSV errors before submitting');
      return;
    }
    if (!csvData.length) {
      toast.error('No valid CSV data to submit');
      return;
    }

    dispatch(bulkRegisterEmployees(csvData))
      .unwrap()
      .then(() => {
        toast.success('Employees registered successfully via CSV');
        setCsvFile(null);
        setCsvData([]);
        setCsvErrors([]);
        navigate('/siteincharge/employees');
      })
      .catch((err) => {
        toast.error(err);
        setCsvErrors([{ row: 0, message: err }]);
      });
  };

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Register Employee</h1>
          <div className="flex items-center space-x-4">
            <span>Guest</span>
            <ThemeToggle />
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/login')}
              aria-label="Navigate to login"
            >
              <Loader2 className="h-5 w-5 text-accent" />
            </Button>
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
                    value="2"
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
                      {locations.map((loc) => (
                        <SelectItem key={loc._id} value={loc._id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Documents (JPEG, PNG)</Label>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed p-4 rounded-md text-center cursor-pointer ${
                      isDragActive ? 'border-accent bg-accent/10' : 'border-accent/50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <p className="text-body">
                      {isDragActive
                        ? 'Drop the files here ...'
                        : 'Drag & drop JPEG/PNG files here, or click to select'}
                    </p>
                  </div>
                  {documents.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Uploaded Files:</p>
                      <ul className="mt-1 space-y-1">
                        {documents.map((file, index) => (
                          <li key={index} className="flex items-center justify-between text-sm">
                            <span>{file.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocument(index)}
                              aria-label={`Remove ${file.name}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => setPreviewOpen(true)}
                      >
                        Preview Documents
                      </Button>
                    </div>
                  )}
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
          <Card className="bg-complementary text-body max-w-2xl mx-auto mt-6">
            <CardHeader>
              <CardTitle>Bulk Register via CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csvUpload">Upload CSV</Label>
                  <Input
                    id="csvUpload"
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="bg-complementary text-body border-accent"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    CSV must include headers: employeeId, name, email, designation, department, salary, phone, dob
                  </p>
                </div>
                {csvFile && (
                  <div>
                    <p className="text-sm font-medium">Uploaded File: {csvFile.name}</p>
                    {csvErrors.length > 0 && (
                      <div className="mt-2">
                        <Alert variant="destructive">
                          <AlertDescription>
                            Found {csvErrors.length} errors in CSV:
                          </AlertDescription>
                        </Alert>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Row</TableHead>
                              <TableHead>Error</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {csvErrors.map((err, index) => (
                              <TableRow key={index}>
                                <TableCell>{err.row}</TableCell>
                                <TableCell>{err.message}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {csvData.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">
                          {csvData.length} valid rows detected
                        </p>
                      </div>
                    )}
                    <Button
                      onClick={handleCsvSubmit}
                      className="mt-2 bg-accent text-body hover:bg-accent-hover"
                      disabled={loading || csvErrors.length > 0 || !csvData.length}
                    >
                      Register Employees from CSV
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Document Previews</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                {documents.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-48 object-contain rounded-md"
                    />
                    <p className="text-sm mt-1 truncate">{file.name}</p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        removeDocument(index);
                        if (documents.length === 1) setPreviewOpen(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default RegisterEmployee;