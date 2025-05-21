import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { getEmployee, editEmployee, uploadDocument, fetchEmployeeAttendance } from '../redux/employeeSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Edit, Upload, Loader2 } from 'lucide-react';

const EmployeeProfile = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { employee, attendance, loading, error } = useSelector((state) => state.siteInchargeEmployee);

  const [editForm, setEditForm] = useState(null);
  const [uploadForm, setUploadForm] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  useEffect(() => {
    dispatch(getEmployee(id));
    dispatch(fetchEmployeeAttendance({ employeeId: id, month: monthFilter, year: yearFilter }));
  }, [dispatch, id, monthFilter, yearFilter]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch({ type: 'siteInchargeEmployee/reset' });
    }
  }, [error, dispatch]);

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const { name, email, designation, department, salary, phone, dob } = editForm;

    if (!name || !email || !designation || !department || !salary) {
      toast.error('All fields except phone and DOB are required');
      return;
    }

    if (isNaN(salary) || parseFloat(salary) <= 0) {
      toast.error('Salary must be a positive number');
      return;
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      toast.error('Phone number must be 10 digits');
      return;
    }

    if (dob && isNaN(new Date(dob))) {
      toast.error('Invalid date of birth');
      return;
    }

    dispatch(editEmployee({ id, data: { name, email, designation, department, salary: parseFloat(salary), phone, dob } }))
      .unwrap()
      .then(() => {
        toast.success('Employee updated successfully');
        setEditForm(null);
      })
      .catch((err) => toast.error(err));
  };

  const handleDocumentSubmit = (e) => {
    e.preventDefault();
    if (!documentFile) {
      toast.error('No file selected');
      return;
    }

    const formData = new FormData();
    formData.append('documents', documentFile);

    dispatch(uploadDocument({ id, formData }))
      .unwrap()
      .then(() => {
        toast.success('Document uploaded successfully');
        setUploadForm(null);
        setDocumentFile(null);
      })
      .catch((err) => toast.error(err));
  };

  const handleMonthChange = (value) => {
    setMonthFilter(parseInt(value));
  };

  const handleYearChange = (value) => {
    setYearFilter(parseInt(value));
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
          <h1 className="text-xl font-bold">Employee Profile</h1>
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
          {loading || !employee ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <Card className="bg-complementary text-body">
                <CardHeader>
                  <CardTitle>Employee Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <p className="text-body">{employee.name}</p>
                      </div>
                      <div>
                        <Label>Employee ID</Label>
                        <p className="text-body">{employee.employeeId}</p>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <p className="text-body">{employee.email}</p>
                      </div>
                      <div>
                        <Label>Designation</Label>
                        <p className="text-body">{employee.designation}</p>
                      </div>
                      <div>
                        <Label>Department</Label>
                        <p className="text-body">{employee.department}</p>
                      </div>
                      <div>
                        <Label>Salary</Label>
                        <p className="text-body">₹{employee.salary.toFixed(2)}</p>
                      </div>
                      <div>
                        <Label>Location</Label>
                        <p className="text-body">{employee.location?.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <p className="text-body">{employee.phone || '-'}</p>
                      </div>
                      <div>
                        <Label>Date of Birth</Label>
                        <p className="text-body">
                          {employee.dob ? format(new Date(employee.dob), 'MMM d, yyyy') : '-'}
                        </p>
                      </div>
                      <div>
                        <Label>Paid Leaves</Label>
                        <p className="text-body">Available: {employee.paidLeaves.available}, Used: {employee.paidLeaves.used}</p>
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setEditForm({
                              id: employee._id,
                              name: employee.name,
                              email: employee.email,
                              designation: employee.designation,
                              department: employee.department,
                              salary: employee.salary.toString(),
                              phone: employee.phone || '',
                              dob: employee.dob ? new Date(employee.dob).toISOString().split('T')[0] : '',
                            })
                          }
                        >
                          <Edit className="h-4 w-4 mr-2 text-accent" />
                          Edit Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-complementary text-body">
                        <DialogHeader>
                          <DialogTitle>Edit Employee</DialogTitle>
                        </DialogHeader>
                        {editForm && (
                          <form onSubmit={handleEditSubmit} className="space-y-4">
                            <input type="hidden" name="id" value={editForm.id} />
                            <div>
                              <Label htmlFor="edit-name">Name</Label>
                              <Input
                                id="edit-name"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="bg-complementary text-body border-accent"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-email">Email</Label>
                              <Input
                                id="edit-email"
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="bg-complementary text-body border-accent"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-designation">Designation</Label>
                              <Input
                                id="edit-designation"
                                value={editForm.designation}
                                onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                                className="bg-complementary text-body border-accent"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-department">Department</Label>
                              <Input
                                id="edit-department"
                                value={editForm.department}
                                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                                className="bg-complementary text-body border-accent"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-salary">Salary</Label>
                              <Input
                                id="edit-salary"
                                type="number"
                                value={editForm.salary}
                                onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
                                className="bg-complementary text-body border-accent"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-phone">Phone</Label>
                              <Input
                                id="edit-phone"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                className="bg-complementary text-body border-accent"
                                placeholder="1234567890"
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-dob">Date of Birth</Label>
                              <Input
                                id="edit-dob"
                                type="date"
                                value={editForm.dob}
                                onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                                className="bg-complementary text-body border-accent"
                              />
                            </div>
                            <Button
                              type="submit"
                              className="bg-accent text-body hover:bg-accent-hover"
                              disabled={loading}
                            >
                              Save
                            </Button>
                          </form>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-complementary text-body">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    Attendance History
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
                  {loading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : attendance.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-body">Date</TableHead>
                          <TableHead className="text-body">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendance.map((att) => (
                          <TableRow key={att._id}>
                            <TableCell className="text-body">{format(new Date(att.date), 'MMM d, yyyy')}</TableCell>
                            <TableCell
                              className={
                                att.status === 'present'
                                  ? 'text-green-500'
                                  : att.status === 'absent'
                                  ? 'text-red-500'
                                  : 'text-yellow-500'
                              }
                            >
                              {att.status.charAt(0).toUpperCase() + att.status.slice(1)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-body">No attendance records found</p>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-complementary text-body">
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => setUploadForm({ id: employee._id })}
                        >
                          <Upload className="h-4 w-4 mr-2 text-accent" />
                          Upload Document
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-complementary text-body">
                        <DialogHeader>
                          <DialogTitle>Upload Document</DialogTitle>
                        </DialogHeader>
                        {uploadForm && (
                          <form onSubmit={handleDocumentSubmit} className="space-y-4">
                            <div>
                              <Label htmlFor="document">Document (PDF, JPEG, PNG)</Label>
                              <Input
                                id="document"
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => setDocumentFile(e.target.files[0])}
                                className="bg-complementary text-body border-accent"
                              />
                            </div>
                            <Button
                              type="submit"
                              className="bg-accent text-body hover:bg-accent-hover"
                              disabled={loading}
                            >
                              Upload
                            </Button>
                          </form>
                        )}
                      </DialogContent>
                    </Dialog>
                    {employee.documents.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-body">Name</TableHead>
                            <TableHead className="text-body">Uploaded At</TableHead>
                            <TableHead className="text-body">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employee.documents.map((doc, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-body">{doc.name}</TableCell>
                              <TableCell className="text-body">
                                {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="link"
                                  onClick={() => window.open(`http://localhost:5000${doc.path}`, '_blank')}
                                  className="text-accent"
                                >
                                  Download
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-body">No documents uploaded</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default EmployeeProfile;
