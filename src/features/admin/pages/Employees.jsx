import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmployees, registerEmployee, updateEmployee, deleteEmployee, reset as resetEmployees, uploadDocument, deleteDocument } from '../redux/employeeSlice';
import { fetchLocations, reset as resetLocations } from '../redux/locationsSlice';
import { logout } from '../../../redux/slices/authSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, Download, Loader2, LogOut, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const createEmployeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').regex(/^EMP\d+$/, 'Employee ID must be EMP followed by numbers'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  designation: z.string().min(1, 'Designation is required'),
  department: z.string().min(1, 'Department is required'),
  salary: z.number().min(1000, 'Salary must be at least $1000'),
  location: z.string().min(1, 'Location is required'),
  phone: z.string().optional(),
  dob: z.string().optional(),
  paidLeavesAvailable: z.number().min(0, 'Available leaves cannot be negative').default(3),
  paidLeavesUsed: z.number().min(0, 'Used leaves cannot be negative').default(0),
  paidLeavesCarriedForward: z.number().min(0, 'Carried forward leaves cannot be negative').default(0),
});

const updateEmployeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').regex(/^EMP\d+$/, 'Employee ID must be EMP followed by numbers').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  designation: z.string().min(1, 'Designation is required'),
  department: z.string().min(1, 'Department is required'),
  salary: z.number().min(1000, 'Salary must be at least $1000').optional(),
  location: z.string().min(1, 'Location is required'),
  phone: z.string().optional(),
  dob: z.string().optional(),
  paidLeavesAvailable: z.number().min(0, 'Available leaves cannot be negative').optional(),
  paidLeavesUsed: z.number().min(0, 'Used leaves cannot be negative').optional(),
  paidLeavesCarriedForward: z.number().min(0, 'Carried forward leaves cannot be negative').optional(),
});

const Employees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { employees, loading: employeesLoading, error: employeesError } = useSelector((state) => state.adminEmployees);
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.adminLocations);

  const [filterLocation, setFilterLocation] = useState('all');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState(null);
  const [manageDocumentsEmployee, setManageDocumentsEmployee] = useState(null);
  const [newDocument, setNewDocument] = useState(null);
  const [documentError, setDocumentError] = useState('');

  const createForm = useForm({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      employeeId: '',
      name: '',
      email: '',
      designation: '',
      department: '',
      salary: 1000,
      location: '',
      phone: '',
      dob: '',
      paidLeavesAvailable: 3,
      paidLeavesUsed: 0,
      paidLeavesCarriedForward: 0,
    },
  });

  const updateForm = useForm({
    resolver: zodResolver(updateEmployeeSchema),
    defaultValues: {
      employeeId: '',
      name: '',
      email: '',
      designation: '',
      department: '',
      salary: 1000,
      location: '',
      phone: '',
      dob: '',
      paidLeavesAvailable: 3,
      paidLeavesUsed: 0,
      paidLeavesCarriedForward: 0,
    },
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/login');
    }
    dispatch(fetchEmployees({ location: filterLocation === 'all' ? '' : filterLocation }));
    dispatch(fetchLocations());
  }, [dispatch, filterLocation, user, navigate]);

  useEffect(() => {
    if (employeesError || locationsError) {
      toast.error(employeesError || locationsError);
      dispatch(resetEmployees());
      dispatch(resetLocations());
    }
  }, [employeesError, locationsError, dispatch]);

  const handleCreateSubmit = (data) => {
    const employeeData = {
      ...data,
      paidLeaves: {
        available: data.paidLeavesAvailable,
        used: data.paidLeavesUsed,
        carriedForward: data.paidLeavesCarriedForward,
      },
      salary: Number(data.salary),
      dob: data.dob ? new Date(data.dob) : undefined,
      createdBy: user._id,
    };
    dispatch(registerEmployee({ employeeData, documents: newDocument ? [newDocument] : [] })).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        setOpenCreateDialog(false);
        createForm.reset();
        setNewDocument(null);
        toast.success('Employee created successfully');
      } else {
        toast.error(result.payload || 'Failed to create employee');
      }
    });
  };

  const handleEditClick = (employee) => {
    setEditEmployee(employee);
    updateForm.reset({
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      designation: employee.designation,
      department: employee.department,
      salary: employee.salary,
      location: employee.location?._id,
      phone: employee.phone || '',
      dob: employee.dob ? new Date(employee.dob).toISOString().split('T')[0] : '',
      paidLeavesAvailable: employee.paidLeaves.available,
      paidLeavesUsed: employee.paidLeaves.used,
      paidLeavesCarriedForward: employee.paidLeaves.carriedForward,
    });
    setOpenEditDialog(true);
  };

  const handleEditSubmit = (data) => {
    const employeeData = {
      ...data,
      paidLeaves: {
        available: data.paidLeavesAvailable,
        used: data.paidLeavesUsed,
        carriedForward: data.paidLeavesCarriedForward,
      },
      salary: data.salary ? Number(data.salary) : undefined,
      dob: data.dob ? new Date(data.dob) : undefined,
    };
    dispatch(updateEmployee({ id: editEmployee._id, data: employeeData })).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        setOpenEditDialog(false);
        setEditEmployee(null);
        toast.success('Employee updated successfully');
      } else {
        toast.error(result.payload || 'Failed to update employee');
      }
    });
  };

  const handleDeleteClick = (id) => {
    setDeleteEmployeeId(id);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    dispatch(deleteEmployee(deleteEmployeeId)).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        setOpenDeleteDialog(false);
        toast.success('Employee deleted successfully');
      } else {
        toast.error(result.payload || 'Failed to delete employee');
      }
    });
  };

  const handleDocumentChange = (e) => {
    const file = e.target.files[0];
    const filetypes = /pdf|doc|docx|jpg|jpeg|png/;
    const isValidType = filetypes.test(file.name.toLowerCase());
    const isValidSize = file.size <= 5 * 1024 * 1024;

    if (!isValidType) {
      setDocumentError(`Invalid file type for ${file.name}. Only PDF, DOC, DOCX, JPG, JPEG, PNG allowed.`);
      toast.error(documentError);
      return;
    }
    if (!isValidSize) {
      setDocumentError(`File ${file.name} exceeds 5MB limit.`);
      toast.error(documentError);
      return;
    }

    setNewDocument(file);
    setDocumentError('');
  };

  const handleUploadDocument = () => {
    if (!newDocument) {
      toast.error('Please select a file to upload');
      return;
    }
    dispatch(uploadDocument({ id: manageDocumentsEmployee._id, file: newDocument })).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        setNewDocument(null);
        toast.success('Document uploaded successfully');
        dispatch(fetchEmployees({ location: filterLocation === 'all' ? '' : filterLocation }));
      } else {
        toast.error(result.payload || 'Failed to upload document');
      }
    });
  };

  const handleDeleteDocument = (documentId) => {
    dispatch(deleteDocument({ id: manageDocumentsEmployee._id, documentId })).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Document deleted successfully');
        dispatch(fetchEmployees({ location: filterLocation === 'all' ? '' : filterLocation }));
      } else {
        toast.error(result.payload || 'Failed to delete document');
      }
    });
  };

  const handleLogout = () => {
    dispatch(logout()).then(() => {
      toast.success('Logged out successfully');
      navigate('/login');
    });
  };

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Employees</h1>
          <div className="flex items-center space-x-4">
            <span>{user?.name || 'Guest'}</span>
            <ThemeToggle />
            <Button variant="outline" size="icon" onClick={handleLogout} aria-label="Log out">
              <LogOut className="h-5 w-5 text-accent" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-x-hidden">
          {(employeesError || locationsError) && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{employeesError || locationsError}</AlertDescription>
            </Alert>
          )}
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Employee List
                <div className="flex items-center space-x-4">
                  <Select value={filterLocation} onValueChange={setFilterLocation}>
                    <SelectTrigger className="w-[180px] bg-complementary text-body border-accent">
                      <SelectValue placeholder="Filter by location" />
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
                  <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-accent text-body hover:bg-accent-hover">
                        <Plus className="h-5 w-5 mr-2" />
                        Add Employee
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-complementary text-body max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create Employee</DialogTitle>
                      </DialogHeader>
                      <Form {...createForm}>
                        <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                          <FormField
                            control={createForm.control}
                            name="employeeId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Employee ID *</FormLabel>
                                <FormControl>
                                  <Input {...field} className="bg-complementary text-body border-accent" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} className="bg-complementary text-body border-accent" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input {...field} type="email" className="bg-complementary text-body border-accent" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="designation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Designation *</FormLabel>
                                <FormControl>
                                  <Input {...field} className="bg-complementary text-body border-accent" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Department *</FormLabel>
                                <FormControl>
                                  <Input {...field} className="bg-complementary text-body border-accent" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="salary"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Salary ($/year) *</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    className="bg-complementary text-body border-accent"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-complementary text-body border-accent">
                                      <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-complementary text-body">
                                    {locations.map((loc) => (
                                      <SelectItem key={loc._id} value={loc._id}>
                                        {loc.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                  <Input {...field} className="bg-complementary text-body border-accent" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="dob"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date of Birth</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" className="bg-complementary text-body border-accent" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="paidLeavesAvailable"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Available Leaves *</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    className="bg-complementary text-body border-accent"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="paidLeavesUsed"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Used Leaves *</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    className="bg-complementary text-body border-accent"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="paidLeavesCarriedForward"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Carried Forward Leaves *</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    className="bg-complementary text-body border-accent"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div>
                            <Label htmlFor="newDocument">Upload Document (Max 5MB)</Label>
                            <Input
                              id="newDocument"
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={handleDocumentChange}
                              className="bg-complementary text-body border-accent"
                            />
                            {documentError && <p className="text-sm text-error mt-1">{documentError}</p>}
                          </div>
                          <Button
                            type="submit"
                            className="bg-accent text-body hover:bg-accent-hover"
                            disabled={employeesLoading}
                          >
                            {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Employee'}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employeesLoading || locationsLoading ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              ) : employees.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[1000px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-complementary z-10">Employee ID</TableHead>
                          <TableHead className="sticky left-[120px] bg-complementary z-10">Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Designation</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Salary</TableHead>
                          <TableHead>Leaves (A/U/C)</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((employee) => (
                          <TableRow key={employee._id}>
                            <TableCell className="sticky left-0 bg-complementary z-10">{employee.employeeId}</TableCell>
                            <TableCell className="sticky left-[120px] bg-complementary z-10">{employee.name}</TableCell>
                            <TableCell>{employee.email}</TableCell>
                            <TableCell>{employee.designation}</TableCell>
                            <TableCell>{employee.department}</TableCell>
                            <TableCell>{employee.location?.name || 'N/A'}</TableCell>
                            <TableCell>${employee.salary.toLocaleString()}</TableCell>
                            <TableCell>
                              {employee.paidLeaves.available}/{employee.paidLeaves.used}/{employee.paidLeaves.carriedForward}
                            </TableCell>
                            <TableCell className="space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(employee)}
                                className="text-accent hover:text-accent-hover"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(employee)}
                                className="text-accent hover:text-accent-hover"
                              >
                                Transfer
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(employee._id)}
                                className="text-error hover:text-error-hover"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setManageDocumentsEmployee(employee)}
                                    className="text-accent hover:text-accent-hover"
                                  >
                                    Manage Documents
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-complementary text-body">
                                  <DialogHeader>
                                    <DialogTitle>Manage Documents for {employee.name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="newDocument">Upload Document (Max 5MB)</Label>
                                      <Input
                                        id="newDocument"
                                        type="file"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={handleDocumentChange}
                                        className="bg-complementary text-body border-accent"
                                      />
                                      {documentError && <p className="text-sm text-error mt-1">{documentError}</p>}
                                    </div>
                                    <Button
                                      onClick={handleUploadDocument}
                                      className="bg-accent text-body hover:bg-accent-hover"
                                      disabled={employeesLoading || !newDocument}
                                    >
                                      {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Upload'}
                                    </Button>
                                    {employee.documents?.length > 0 ? (
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Uploaded</TableHead>
                                            <TableHead>Download</TableHead>
                                            <TableHead>Delete</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {employee.documents.map((doc) => (
                                            <TableRow key={doc._id}>
                                              <TableCell>{doc.name}</TableCell>
                                              <TableCell>{new Date(doc.uploadedAt).toLocaleDateString()}</TableCell>
                                              <TableCell>
                                                <a
                                                  href={`http://localhost:5000${doc.path}`}
                                                  download
                                                  className="text-accent hover:text-accent-hover"
                                                >
                                                  <Download className="h-5 w-5" />
                                                </a>
                                              </TableCell>
                                              <TableCell>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleDeleteDocument(doc._id)}
                                                  className="text-error hover:text-error-hover"
                                                >
                                                  <Trash2 className="h-5 w-5" />
                                                </Button>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    ) : (
                                      <p className="text-body">No documents available</p>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <p className="text-body">No employees found</p>
              )}
            </CardContent>
          </Card>

          {/* Edit Dialog */}
          <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
            <DialogContent className="bg-complementary text-body max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Employee: {editEmployee?.name}</DialogTitle>
              </DialogHeader>
              <Form {...updateForm}>
                <form onSubmit={updateForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                  <FormField
                    control={updateForm.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee ID *</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-complementary text-body border-accent" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-complementary text-body border-accent" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" className="bg-complementary text-body border-accent" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation *</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-complementary text-body border-accent" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department *</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-complementary text-body border-accent" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salary ($/year) *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            className="bg-complementary text-body border-accent"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-complementary text-body border-accent">
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-complementary text-body">
                            {locations.map((loc) => (
                              <SelectItem key={loc._id} value={loc._id}>
                                {loc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-complementary text-body border-accent" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className="bg-complementary text-body border-accent" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="paidLeavesAvailable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Leaves *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            className="bg-complementary text-body border-accent"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="paidLeavesUsed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Used Leaves *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            className="bg-complementary text-body border-accent"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="paidLeavesCarriedForward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carried Forward Leaves *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            className="bg-complementary text-body border-accent"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="bg-accent text-body hover:bg-accent-hover"
                    disabled={employeesLoading}
                  >
                    {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
            <DialogContent className="bg-complementary text-body">
              <DialogHeader>
                <DialogTitle>Delete Employee</DialogTitle>
              </DialogHeader>
              <p className="text-body">Are you sure you want to delete this employee? This action cannot be undone.</p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpenDeleteDialog(false)}
                  className="text-body border-accent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  className="bg-error text-body hover:bg-error-hover"
                  disabled={employeesLoading}
                >
                  {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default Employees;
