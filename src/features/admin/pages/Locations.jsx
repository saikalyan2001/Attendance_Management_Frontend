import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLocations, addLocation, editLocation, deleteLocation } from '../redux/locationsSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogOut, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const locationSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name must be 50 characters or less'),
  address: z.string().min(5, 'Address must be at least 5 characters').max(200, 'Address must be 200 characters or less'),
});

const Locations = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { locations, loading, error } = useSelector((state) => state.adminLocations);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLocationState, setEditLocationState] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLocationId, setDeleteLocationId] = useState(null);
  const [actionLoading, setActionLoading] = useState({ add: false, edit: false, delete: false });

  const addForm = useForm({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: '', address: '' },
  });

  const editForm = useForm({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: '', address: '' },
  });

  useEffect(() => {
    dispatch(fetchLocations());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      console.error('Locations error:', error);
      toast.error(error);
      dispatch({ type: 'adminLocations/reset' });
    }
  }, [error, dispatch]);

  const handleAddSubmit = (data) => {
    setActionLoading((prev) => ({ ...prev, add: true }));
    dispatch(addLocation(data))
      .unwrap()
      .then(() => {
        toast.success('Location added successfully');
        setAddOpen(false);
        addForm.reset();
      })
      .catch((err) => {
        console.error('Add location failed:', err);
        toast.error(err || 'Failed to add location');
      })
      .finally(() => {
        setActionLoading((prev) => ({ ...prev, add: false }));
      });
  };

  const handleEditOpen = (loc) => {
    console.log('Opening edit for location:', loc);
    setEditLocationState(loc);
    editForm.reset({ name: loc.name, address: loc.address });
    setEditOpen(true);
  };

  const handleEditSubmit = (data) => {
    setActionLoading((prev) => ({ ...prev, edit: true }));
    dispatch(editLocation({ id: editLocationState._id, data }))
      .unwrap()
      .then(() => {
        toast.success('Location updated successfully');
        setEditOpen(false);
        setEditLocationState(null);
        editForm.reset();
      })
      .catch((err) => {
        console.error('Edit location failed:', err);
        toast.error(err || 'Failed to edit location');
      })
      .finally(() => {
        setActionLoading((prev) => ({ ...prev, edit: false }));
      });
  };

  const handleDeleteConfirm = () => {
    setActionLoading((prev) => ({ ...prev, delete: true }));
    dispatch(deleteLocation(deleteLocationId))
      .unwrap()
      .then(() => {
        toast.success('Location deleted successfully');
        setDeleteOpen(false);
        setDeleteLocationId(null);
      })
      .catch((err) => {
        console.error('Delete location failed:', err);
        toast.error(err || 'Failed to delete location');
      })
      .finally(() => {
        setActionLoading((prev) => ({ ...prev, delete: false }));
      });
  };

  const handleViewEmployees = (locationId) => {
    navigate(`/admin/employees?location=${locationId}`);
  };

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Locations</h1>
          <div className="flex items-center space-x-4">
            <span>Guest</span>
            <ThemeToggle />
            <Button variant="outline" size="icon" onClick={() => navigate('/login')} aria-label="Navigate to login">
              <LogOut className="h-5 w-5 text-accent" />
            </Button>
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
              <CardTitle className="flex justify-between items-center">
                Location List
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-accent text-body hover:bg-accent-hover">Add Location</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-complementary text-body">
                    <DialogHeader>
                      <DialogTitle>Add Location</DialogTitle>
                    </DialogHeader>
                    <Form {...addForm}>
                      <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-4">
                        <FormField
                          control={addForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="bg-complementary text-body border-accent"
                                  disabled={actionLoading.add}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="bg-complementary text-body border-accent"
                                  disabled={actionLoading.add}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="bg-accent text-body hover:bg-accent-hover"
                          disabled={actionLoading.add}
                        >
                          {actionLoading.add ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Add'}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
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
              ) : locations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-body">Name</TableHead>
                      <TableHead className="text-body">Address</TableHead>
                      <TableHead className="text-body">Employees</TableHead>
                      <TableHead className="text-body">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((loc) => (
                      <TableRow key={loc._id}>
                        <TableCell className="text-body">{loc.name}</TableCell>
                        <TableCell className="text-body">{loc.address}</TableCell>
                        <TableCell className="text-body">{loc.employeeCount}</TableCell>
                        <TableCell className="text-body">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewEmployees(loc._id)}
                              className="border-accent text-accent hover:bg-accent-hover hover:text-body"
                              disabled={actionLoading.edit || actionLoading.delete}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Employees
                            </Button>
                            <Dialog open={editOpen && editLocationState?._id === loc._id} onOpenChange={(open) => setEditOpen(open)}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditOpen(loc)}
                                  className="border-accent text-accent hover:bg-accent-hover hover:text-body"
                                  disabled={actionLoading.edit || actionLoading.delete}
                                >
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md bg-complementary text-body">
                                <DialogHeader>
                                  <DialogTitle>Edit Location</DialogTitle>
                                </DialogHeader>
                                <Form {...editForm}>
                                  <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                                    <FormField
                                      control={editForm.control}
                                      name="name"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Name *</FormLabel>
                                          <FormControl>
                                            <Input
                                              {...field}
                                              className="bg-complementary text-body border-accent"
                                              disabled={actionLoading.edit}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={editForm.control}
                                      name="address"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Address *</FormLabel>
                                          <FormControl>
                                            <Input
                                              {...field}
                                              className="bg-complementary text-body border-accent"
                                              disabled={actionLoading.edit}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <Button
                                      type="submit"
                                      className="bg-accent text-body hover:bg-accent-hover"
                                      disabled={actionLoading.edit}
                                    >
                                      {actionLoading.edit ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
                                    </Button>
                                  </form>
                                </Form>
                              </DialogContent>
                            </Dialog>
                            <AlertDialog open={deleteOpen && deleteLocationId === loc._id} onOpenChange={(open) => setDeleteOpen(open)}>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeleteLocationId(loc._id)}
                                  className="border-error text-error hover:bg-error hover:text-body"
                                  disabled={actionLoading.edit || actionLoading.delete}
                                >
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-complementary text-body">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the location "{loc.name}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-complementary text-body border-accent">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDeleteConfirm}
                                    className="bg-error text-body hover:bg-error"
                                    disabled={actionLoading.delete}
                                  >
                                    {actionLoading.delete ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Delete'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-body">No locations found. Add a location to get started.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Locations;
