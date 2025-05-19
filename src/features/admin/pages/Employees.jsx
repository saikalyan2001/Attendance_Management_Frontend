import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmployees, updateEmployee, reset as resetEmployees } from '../redux/employeeSlice';
import { fetchLocations, reset as resetLocations } from '../redux/locationsSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { logout } from '../../../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const Employees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { employees, loading: employeesLoading, error: employeesError } = useSelector((state) => state.adminEmployees);
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.adminLocations);

  const [location, setLocation] = useState('all');
  const [editDialog, setEditDialog] = useState(null);
  const [transferDialog, setTransferDialog] = useState(null);

  useEffect(() => {
    dispatch(fetchEmployees({ location }));
    dispatch(fetchLocations());
  }, [dispatch, location]);

  useEffect(() => {
    if (employeesError || locationsError) {
      toast.error(employeesError || locationsError);
      dispatch(resetEmployees());
      dispatch(resetLocations());
    }
  }, [employeesError, locationsError, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleEditEmployee = (employee) => {
    dispatch(updateEmployee({ id: employee._id, data: editDialog }))
      .unwrap()
      .then(() => {
        toast.success('Employee updated successfully');
        setEditDialog(null);
      })
      .catch((err) => toast.error(err));
  };

  const handleTransferEmployee = (employeeId, newLocationId) => {
    dispatch(updateEmployee({ id: employeeId, data: { location: newLocationId } }))
      .unwrap()
      .then(() => {
        toast.success('Employee transferred successfully');
        setTransferDialog(null);
      })
      .catch((err) => toast.error(err));
  };

  const calculateSalary = (employee) => {
    const usedLeaves = employee.paidLeaves.used;
    const maxAllowedLeaves = 2;
    const dailySalary = employee.salary / 30; // Assuming 30-day month
    if (usedLeaves <= maxAllowedLeaves) {
      return employee.salary;
    }
    const excessLeaves = usedLeaves - maxAllowedLeaves;
    return employee.salary - excessLeaves * dailySalary;
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
        <main className="flex-1 p-6 space-y-6">
          {(employeesError || locationsError) && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{employeesError || locationsError}</AlertDescription>
            </Alert>
          )}
          <Card className="bg-complementary text-body">
            <CardHeader>
              <CardTitle>Employee Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Label htmlFor="location">Location</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger id="location" className="bg-complementary text-body border-accent">
                      <SelectValue placeholder="Select location" />
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
                </div>
              </div>
              {employeesLoading || locationsLoading ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              ) : employees.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-body">Employee ID</TableHead>
                      <TableHead className="text-body">Name</TableHead>
                      <TableHead className="text-body">Designation</TableHead>
                      <TableHead className="text-body">Department</TableHead>
                      <TableHead className="text-body">Location</TableHead>
                      <TableHead className="text-body">Salary</TableHead>
                      <TableHead className="text-body">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp._id}>
                        <TableCell className="text-body">{emp.employeeId}</TableCell>
                        <TableCell className="text-body">{emp.name}</TableCell>
                        <TableCell className="text-body">{emp.designation}</TableCell>
                        <TableCell className="text-body">{emp.department}</TableCell>
                        <TableCell className="text-body">{emp.location?.name}</TableCell>
                        <TableCell className="text-body">
                          ${calculateSalary(emp).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-body">
                          <div className="flex gap-2">
                            <Dialog open={editDialog?.id === emp._id} onOpenChange={() => setEditDialog(null)}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setEditDialog({
                                      id: emp._id,
                                      designation: emp.designation,
                                      department: emp.department,
                                    })
                                  }
                                  className="border-accent text-accent hover:bg-accent-hover hover:text-body"
                                >
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md bg-complementary text-body">
                                <DialogHeader>
                                  <DialogTitle>Edit Employee: {emp.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="designation">Designation</Label>
                                    <Input
                                      id="designation"
                                      value={editDialog?.designation || ''}
                                      onChange={(e) =>
                                        setEditDialog({ ...editDialog, designation: e.target.value })
                                      }
                                      className="bg-complementary text-body border-accent"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="department">Department</Label>
                                    <Input
                                      id="department"
                                      value={editDialog?.department || ''}
                                      onChange={(e) =>
                                        setEditDialog({ ...editDialog, department: e.target.value })
                                      }
                                      className="bg-complementary text-body border-accent"
                                    />
                                  </div>
                                  <Button
                                    onClick={() => handleEditEmployee(emp)}
                                    className="bg-accent text-body hover:bg-accent-hover"
                                  >
                                    Save
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Dialog open={transferDialog?.id === emp._id} onOpenChange={() => setTransferDialog(null)}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTransferDialog({ id: emp._id, location: emp.location?._id })}
                                  className="border-accent text-accent hover:bg-accent-hover hover:text-body"
                                >
                                  Transfer
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md bg-complementary text-body">
                                <DialogHeader>
                                  <DialogTitle>Transfer Employee: {emp.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Select
                                    value={transferDialog?.location || ''}
                                    onValueChange={(value) =>
                                      setTransferDialog({ ...transferDialog, location: value })
                                    }
                                  >
                                    <SelectTrigger className="bg-complementary text-body border-accent">
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
                                  <Button
                                    onClick={() => handleTransferEmployee(emp._id, transferDialog.location)}
                                    className="bg-accent text-body hover:bg-accent-hover"
                                    disabled={!transferDialog?.location}
                                  >
                                    Transfer
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toast.info('Document management coming soon!')}
                              className="border-accent text-accent hover:bg-accent-hover hover:text-body"
                            >
                              Documents
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-complementary">No employees found for the selected filters.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Employees;