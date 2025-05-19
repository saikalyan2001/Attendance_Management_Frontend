import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmployees, editEmployee, transferEmployee, uploadDocument, deleteEmployee } from '../redux/employeeSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Upload, Trash } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { logout } from '../../../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const Employees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { employees, locations, loading, error } = useSelector((state) => state.siteInchargeEmployee);

  const [editForm, setEditForm] = useState(null);
  const [transferForm, setTransferForm] = useState(null);
  const [uploadForm, setUploadForm] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);

  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch({ type: 'siteInchargeEmployee/reset' });
    }
  }, [error, dispatch]);

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const { id, name, email, designation, department, salary, phone, dob } = editForm;

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

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    const { id, location } = transferForm;

    dispatch(transferEmployee({ id, location: location === 'none' ? null : location }))
      .unwrap()
      .then(() => {
        toast.success('Employee transferred successfully');
        setTransferForm(null);
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

    dispatch(uploadDocument({ id: uploadForm.id, formData }))
      .unwrap()
      .then(() => {
        toast.success('Document uploaded successfully');
        setUploadForm(null);
        setDocumentFile(null);
      })
      .catch((err) => toast.error(err));
  };

  const handleDelete = () => {
    dispatch(deleteEmployee(deleteId))
      .unwrap()
      .then(() => {
        toast.success('Employee deleted successfully');
        setDeleteId(null);
      })
      .catch((err) => toast.error(err));
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
          <h1 className="text-xl font-bold">Employees</h1>
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
          {error && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Employee List</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array(3)
                    .fill()
                    .map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
              ) : employees.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-body">Employee ID</TableHead>
                      <TableHead className="text-body">Name</TableHead>
                      <TableHead className="text-body">Email</TableHead>
                      <TableHead className="text-body">Designation</TableHead>
                      <TableHead className="text-body">Department</TableHead>
                      <TableHead className="text-body">Salary</TableHead>
                      <TableHead className="text-body">Location</TableHead>
                      <TableHead className="text-body">Phone</TableHead>
                      <TableHead className="text-body">DOB</TableHead>
                      <TableHead className="text-body">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp._id}>
                        <TableCell className="text-body">{emp.employeeId}</TableCell>
                        <TableCell className="text-body">{emp.name}</TableCell>
                        <TableCell className="text-body">{emp.email}</TableCell>
                        <TableCell className="text-body">{emp.designation}</TableCell>
                        <TableCell className="text-body">{emp.department}</TableCell>
                        <TableCell className="text-body">₹{emp.salary.toFixed(2)}</TableCell>
                        <TableCell className="text-body">{emp.location?.name || 'Not assigned'}</TableCell>
                        <TableCell className="text-body">{emp.phone || '-'}</TableCell>
                        <TableCell className="text-body">
                          {emp.dob ? new Date(emp.dob).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-body">
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    setEditForm({
                                      id: emp._id,
                                      name: emp.name,
                                      email: emp.email,
                                      designation: emp.designation,
                                      department: emp.department,
                                      salary: emp.salary.toString(),
                                      phone: emp.phone || '',
                                      dob: emp.dob ? new Date(emp.dob).toISOString().split('T')[0] : '',
                                    })
                                  }
                                >
                                  <Edit className="h-4 w-4 text-accent" />
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
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setTransferForm({ id: emp._id, location: emp.location?._id || 'none' })}
                                >
                                  <Upload className="h-4 w-4 text-accent" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-complementary text-body">
                                <DialogHeader>
                                  <DialogTitle>Transfer Employee</DialogTitle>
                                </DialogHeader>
                                {transferForm && (
                                  <form onSubmit={handleTransferSubmit} className="space-y-4">
                                    <input type="hidden" name="id" value={transferForm.id} />
                                    <div>
                                      <Label htmlFor="transfer-location">Location</Label>
                                      <Select
                                        value={transferForm.location}
                                        onValueChange={(value) => setTransferForm({ ...transferForm, location: value })}
                                      >
                                        <SelectTrigger id="transfer-location" className="bg-complementary text-body border-accent">
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
                                    <Button
                                      type="submit"
                                      className="bg-accent text-body hover:bg-accent-hover"
                                      disabled={loading}
                                    >
                                      Transfer
                                    </Button>
                                  </form>
                                )}
                              </DialogContent>
                            </Dialog>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setUploadForm({ id: emp._id })}
                                >
                                  <Upload className="h-4 w-4 text-accent" />
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
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setDeleteId(emp._id)}
                            >
                              <Trash className="h-4 w-4 text-error" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-complementary">No employees found</p>
              )}
            </CardContent>
          </Card>
          <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
            <AlertDialogContent className="bg-complementary text-body">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {employees.find((emp) => emp._id === deleteId)?.name}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-complementary text-body border-accent">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-error text-body hover:bg-error-hover"
                  onClick={handleDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  );
};

export default Employees;