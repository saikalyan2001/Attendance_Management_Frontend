import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmployees, updateEmployee, reset as resetEmployees, uploadDocument, deleteDocument } from '../redux/employeeSlice';
import { fetchLocations, reset as resetLocations } from '../redux/locationsSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, Download, Loader2, LogOut } from 'lucide-react';
import { logout } from '../../../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const Employees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { employees, loading: employeesLoading, error: employeesError } = useSelector((state) => state.adminEmployees);
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.adminLocations);

  const [filterLocation, setFilterLocation] = useState('all');
  const [editEmployee, setEditEmployee] = useState(null);
  const [editForm, setEditForm] = useState({ designation: '', department: '', location: '' });
  const [manageDocumentsEmployee, setManageDocumentsEmployee] = useState(null);
  const [newDocument, setNewDocument] = useState(null);
  const [documentError, setDocumentError] = useState('');

  useEffect(() => {
    dispatch(fetchEmployees({ location: filterLocation }));
    dispatch(fetchLocations());
  }, [dispatch, filterLocation]);

  useEffect(() => {
    if (employeesError || locationsError) {
      toast.error(employeesError || locationsError);
      dispatch(resetEmployees());
      dispatch(resetLocations());
    }
  }, [employeesError, locationsError, dispatch]);

  const handleFilterChange = (value) => {
    setFilterLocation(value);
  };

  const handleEditClick = (employee) => {
    setEditEmployee(employee);
    setEditForm({
      designation: employee.designation,
      department: employee.department,
      location: employee.location._id,
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editForm.designation || !editForm.department || !editForm.location) {
      toast.error('Please fill in all required fields');
      return;
    }
    dispatch(updateEmployee({ id: editEmployee._id, data: editForm })).then(() => {
      setEditEmployee(null);
      setEditForm({ designation: '', department: '', location: '' });
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
    dispatch(uploadDocument({ id: manageDocumentsEmployee._id, file: newDocument })).then(() => {
      setNewDocument(null);
      dispatch(fetchEmployees({ location: filterLocation }));
    });
  };

  const handleDeleteDocument = (documentId) => {
    dispatch(deleteDocument({ id: manageDocumentsEmployee._id, documentId })).then(() => {
      dispatch(fetchEmployees({ location: filterLocation }));
    });
  };

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Employees</h1>
          <div className="flex items-center space-x-4">
            <span>Guest</span>
            <ThemeToggle />
            <Button variant="outline" size="icon" onClick={() => navigate('/login')} aria-label="Log out">
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
                <Select value={filterLocation} onValueChange={handleFilterChange}>
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
                          <TableHead>Designation</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Salary</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((employee) => (
                          <TableRow key={employee._id}>
                            <TableCell className="sticky left-0 bg-complementary z-10">{employee.employeeId}</TableCell>
                            <TableCell className="sticky left-[120px] bg-complementary z-10">{employee.name}</TableCell>
                            <TableCell>{employee.designation}</TableCell>
                            <TableCell>{employee.department}</TableCell>
                            <TableCell>{employee.location?.name || 'N/A'}</TableCell>
                            <TableCell>₹{employee.salary.toLocaleString()}</TableCell>
                            <TableCell>
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
                                onClick={() => toast.info('Transfer feature not implemented yet')}
                                className="text-accent hover:text-accent-hover"
                              >
                                Transfer
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

          {editEmployee && (
            <Dialog open={!!editEmployee} onOpenChange={() => setEditEmployee(null)}>
              <DialogContent className="bg-complementary text-body">
                <DialogHeader>
                  <DialogTitle>Edit Employee: {editEmployee.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="designation">Designation *</Label>
                    <Input
                      id="designation"
                      value={editForm.designation}
                      onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                      className="bg-complementary text-body border-accent"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department *</Label>
                    <Input
                      id="department"
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      className="bg-complementary text-body border-accent"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <Select
                      value={editForm.location}
                      onValueChange={(value) => setEditForm({ ...editForm, location: value })}
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
                  <Button
                    type="submit"
                    className="bg-accent text-body hover:bg-accent-hover"
                    disabled={employeesLoading}
                  >
                    {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
    </div>
  );
};

export default Employees;