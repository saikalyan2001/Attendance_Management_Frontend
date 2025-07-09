import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLocations, addLocation, editLocation, deleteLocation } from '../redux/locationsSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Eye, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
});

const Locations = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { locations, loading, error } = useSelector((state) => state.adminLocations);
  const [sortOrder, setSortOrder] = useState('asc');
  const [locationSearch, setLocationSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLocationState, setEditLocationState] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLocationId, setDeleteLocationId] = useState(null);
  const [actionLoading, setActionLoading] = useState({ add: false, edit: false, delete: false });

  const addFormRef = useRef(null);
  const editFormRef = useRef(null);

  const addForm = useForm({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: '', address: '', city: '', state: '' },
  });

  const editForm = useForm({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: '', address: '', city: '', state: '' },
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/login');
    }
    dispatch(fetchLocations());
  }, [dispatch, user, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error, {
        id: 'fetch-error',
        duration: 6000,
        position: 'top-center',
      });
      dispatch({ type: 'adminLocations/reset' });
    }
  }, [error, dispatch]);

  const handleAddSubmit = async (data) => {
    try {
      setActionLoading((prev) => ({ ...prev, add: true }));
      await dispatch(addLocation(data)).unwrap();
      toast.success('Location added successfully', {
        id: 'add-success',
        duration: 4000,
        position: 'top-center',
      });
      setAddOpen(false);
      addForm.reset();
    } catch (err) {
      toast.error(err || 'Failed to add location', {
        id: 'add-error',
        duration: 6000,
        position: 'top-center',
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, add: false }));
    }
  };

  const handleAddSaveClick = async () => {
    try {
      const isValid = await addForm.trigger();
      if (!isValid) {
        const errors = addForm.formState.errors;
        const firstErrorField = ['name', 'address', 'city', 'state'].find(
          (field) => errors[field]
        );
        if (firstErrorField) {
          toast.error(errors[firstErrorField].message, {
            id: `add-validation-error-${firstErrorField}`,
            duration: 6000,
            position: 'top-center',
          });
          const firstErrorElement = addFormRef.current?.querySelector(
            `[name="${firstErrorField}"]`
          );
          if (firstErrorElement) {
            firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorElement.focus();
          }
        }
        return;
      }
      await addForm.handleSubmit(handleAddSubmit)();
    } catch (error) {
      toast.error('Error submitting form, please try again', {
        id: 'add-submit-error',
        duration: 6000,
        position: 'top-center',
      });
    }
  };

  const handleEditOpen = (loc) => {
    setEditLocationState(loc);
    editForm.reset({ name: loc.name, address: loc.address, city: loc.city || '', state: loc.state || '' });
    setEditOpen(true);
  };

  const handleEditSubmit = async (data) => {
    try {
      setActionLoading((prev) => ({ ...prev, edit: true }));
      await dispatch(editLocation({ id: editLocationState._id, data })).unwrap();
      toast.success('Location updated successfully', {
        id: 'edit-success',
        duration: 4000,
        position: 'top-center',
      });
      setEditOpen(false);
      setEditLocationState(null);
      editForm.reset();
    } catch (err) {
      toast.error(err || 'Failed to update location', {
        id: 'edit-error',
        duration: 6000,
        position: 'top-center',
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, edit: false }));
    }
  };

  const handleEditSaveClick = async () => {
    try {
      const isValid = await editForm.trigger();
      if (!isValid) {
        const errors = editForm.formState.errors;
        const firstErrorField = ['name', 'address', 'city', 'state'].find(
          (field) => errors[field]
        );
        if (firstErrorField) {
          toast.error(errors[firstErrorField].message, {
            id: `edit-validation-error-${firstErrorField}`,
            duration: 6000,
            position: 'top-center',
          });
          const firstErrorElement = editFormRef.current?.querySelector(
            `[name="${firstErrorField}"]`
          );
          if (firstErrorElement) {
            firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorElement.focus();
          }
        }
        return;
      }
      await editForm.handleSubmit(handleEditSubmit)();
    } catch (error) {
      toast.error('Error submitting form, please try again', {
        id: 'edit-submit-error',
        duration: 6000,
        position: 'top-center',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setActionLoading((prev) => ({ ...prev, delete: true }));
      await dispatch(deleteLocation(deleteLocationId)).unwrap();
      toast.success('Location deleted successfully', {
        id: 'delete-success',
        duration: 4000,
        position: 'top-center',
      });
      setDeleteOpen(false);
      setDeleteLocationId(null);
    } catch (err) {
      toast.error(err || 'Failed to delete location', {
        id: 'delete-error',
        duration: 6000,
        position: 'top-center',
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, delete: false }));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteOpen(false);
    setDeleteLocationId(null);
  };

  const handleViewEmployees = (locationId) => {
    navigate(`/admin/employees?location=${locationId}`);
  };

  const handleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const filteredLocations = locations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
      loc.address.toLowerCase().includes(locationSearch.toLowerCase()) ||
      loc.city?.toLowerCase().includes(locationSearch.toLowerCase()) ||
      loc.state?.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const sortedLocations = [...filteredLocations].sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });

  return (
    <Layout title="Locations">
      {error && (
        <Alert
          variant="destructive"
          className="mb-6 max-w-3xl mx-auto rounded-lg border-error bg-error/10 text-error p-4 animate-fade-in"
          role="alert"
        >
          <AlertDescription className="text-sm md:text-base">{error}</AlertDescription>
        </Alert>
      )}
      <Card className="bg-complementary text-body max-w-7xl mx-auto shadow-xl rounded-xl border border-accent/20 animate-fade-in">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <span className="text-xl md:text-2xl font-bold">Location Management</span>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-body h-5 w-5" />
                <Input
                  placeholder="Search locations..."
                  className="pl-10 h-10 bg-body text-body rounded-lg border border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-300 text-sm md:text-base placeholder:text-body/50 hover:shadow-md"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  aria-label="Search locations"
                />
              </div>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-accent text-body hover:bg-accent-hover rounded-lg text-sm md:text-base py-2 px-4 transition-all duration-300 hover:shadow-lg flex items-center gap-2"
                    aria-label="Add new location"
                  >
                    <Plus className="h-5 w-5" />
                    Add Location
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className={cn(
                    'bg-complementary text-body rounded-xl shadow-2xl max-w-lg max-h-[90vh] overflow-y-auto p-6 z-[1400] animate-scale-in scrollbar-thin scrollbar-thumb-accent scrollbar-track-complementary'
                  )}
                >
                  <DialogHeader>
                    <DialogTitle className="text-lg md:text-xl font-bold text-body">
                      Add New Location
                    </DialogTitle>
                    <DialogDescription className="text-sm text-body/80">
                      Fill in the details to add a new location.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...addForm}>
                    <form ref={addFormRef} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={addForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-body text-sm font-medium">Name *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                                  disabled={actionLoading.add}
                                  aria-label="Location name"
                                />
                              </FormControl>
                              <FormMessage className="text-error text-xs" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-body text-sm font-medium">City *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                                  disabled={actionLoading.add}
                                  aria-label="City"
                                />
                              </FormControl>
                              <FormMessage className="text-error text-xs" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addForm.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-body text-sm font-medium">State *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                                  disabled={actionLoading.add}
                                  aria-label="State"
                                />
                              </FormControl>
                              <FormMessage className="text-error text-xs" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className="text-body text-sm font-medium">Address *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                                  disabled={actionLoading.add}
                                  aria-label="Address"
                                />
                              </FormControl>
                              <FormMessage className="text-error text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setAddOpen(false)}
                          className="border-complementary text-body hover:bg-complementary/20 rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md"
                          disabled={actionLoading.add}
                          aria-label="Cancel add location"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleAddSaveClick}
                          className="bg-accent text-body hover:bg-accent-hover rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md flex items-center gap-2"
                          disabled={actionLoading.add}
                          aria-label="Add location"
                        >
                          {actionLoading.add ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Add Location'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="space-y-4">
              {Array(3)
                .fill()
                .map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg bg-complementary/20 animate-pulse" />
                ))}
            </div>
          ) : sortedLocations.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-accent/20">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-complementary-light hover:bg-accent/10 border-b border-body/20">
                    <TableHead className="text-body text-sm md:text-base font-semibold px-4 py-3">
                      <Button
                        variant="ghost"
                        onClick={handleSort}
                        className="text-body hover:text-accent font-semibold text-sm md:text-base transition-colors duration-300"
                        aria-label={`Sort by name ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                      >
                        Name {sortOrder === 'asc' ? '↑' : '↓'}
                      </Button>
                    </TableHead>
                    <TableHead className="text-body text-sm md:text-base font-semibold px-4 py-3">Address</TableHead>
                    <TableHead className="text-body text-sm md:text-base font-semibold px-4 py-3">City</TableHead>
                    <TableHead className="text-body text-sm md:text-base font-semibold px-4 py-3">State</TableHead>
                    <TableHead className="text-body text-sm md:text-base font-semibold px-4 py-3">Employees</TableHead>
                    <TableHead className="text-body text-sm md:text-base font-semibold px-4 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLocations.map((loc) => (
                    <TableRow
                      key={loc._id}
                      className={cn(
                        'border-b border-accent/10 transition-all duration-300 hover:bg-accent/5',
                        actionLoading.delete && deleteLocationId === loc._id && 'opacity-50'
                      )}
                    >
                      <TableCell className="text-sm md:text-base text-body font-medium px-4 py-3">{loc.name}</TableCell>
                      <TableCell className="text-sm md:text-base text-body px-4 py-3">{loc.address}</TableCell>
                      <TableCell className="text-sm md:text-base text-body px-4 py-3">{loc.city || '-'}</TableCell>
                      <TableCell className="text-sm md:text-base text-body px-4 py-3">{loc.state || '-'}</TableCell>
                      <TableCell className="text-sm md:text-base text-body px-4 py-3">
                        {typeof loc.employeeCount === 'number' ? loc.employeeCount : '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewEmployees(loc._id)}
                            className="bg-transparent border-complementary text-body hover:bg-accent/20 rounded-lg text-sm py-1.5 px-3 transition-all duration-300 hover:shadow-md"
                            disabled={actionLoading.edit || actionLoading.delete}
                            aria-label={`View employees for ${loc.name}`}
                            title="View Employees"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Dialog
                            open={editOpen && editLocationState?._id === loc._id}
                            onOpenChange={(open) => {
                              setEditOpen(open);
                              if (!open) setEditLocationState(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditOpen(loc)}
                                className="bg-transparent border-complementary text-body hover:bg-accent/20 rounded-lg text-sm py-1.5 px-3 transition-all duration-300 hover:shadow-md"
                                disabled={actionLoading.edit || actionLoading.delete}
                                aria-label={`Edit ${loc.name}`}
                                title="Edit Location"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent
                              className={cn(
                                'bg-complementary text-body rounded-xl shadow-2xl max-w-lg max-h-[90vh] overflow-y-auto p-6 z-[1400] animate-scale-in scrollbar-thin scrollbar-thumb-accent scrollbar-track-complementary'
                              )}
                            >
                              <DialogHeader>
                                <DialogTitle className="text-lg md:text-xl font-bold text-body">
                                  Edit Location
                                </DialogTitle>
                                <DialogDescription className="text-sm text-body/80">
                                  Update the details for {loc.name}.
                                </DialogDescription>
                              </DialogHeader>
                              <Form {...editForm}>
                                <form ref={editFormRef} className="space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                      control={editForm.control}
                                      name="name"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-body text-sm font-medium">
                                            Name *
                                          </FormLabel>
                                          <FormControl>
                                            <Input
                                              {...field}
                                              className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                                              disabled={actionLoading.edit}
                                              aria-label="Location name"
                                            />
                                          </FormControl>
                                          <FormMessage className="text-error text-xs" />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={editForm.control}
                                      name="city"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-body text-sm font-medium">
                                            City *
                                          </FormLabel>
                                          <FormControl>
                                            <Input
                                              {...field}
                                              className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                                              disabled={actionLoading.edit}
                                              aria-label="City"
                                            />
                                          </FormControl>
                                          <FormMessage className="text-error text-xs" />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={editForm.control}
                                      name="state"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-body text-sm font-medium">
                                            State *
                                          </FormLabel>
                                          <FormControl>
                                            <Input
                                              {...field}
                                              className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                                              disabled={actionLoading.edit}
                                              aria-label="State"
                                            />
                                          </FormControl>
                                          <FormMessage className="text-error text-xs" />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={editForm.control}
                                      name="address"
                                      render={({ field }) => (
                                        <FormItem className="sm:col-span-2">
                                          <FormLabel className="text-body text-sm font-medium">
                                            Address *
                                          </FormLabel>
                                          <FormControl>
                                            <Input
                                              {...field}
                                              className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                                              disabled={actionLoading.edit}
                                              aria-label="Address"
                                            />
                                          </FormControl>
                                          <FormMessage className="text-error text-xs" />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="flex justify-end gap-3">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => setEditOpen(false)}
                                      className="border-complementary text-body hover:bg-complementary/20 rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md"
                                      disabled={actionLoading.edit}
                                      aria-label="Cancel edit location"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={handleEditSaveClick}
                                      className="bg-accent text-body hover:bg-accent-hover rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md flex items-center gap-2"
                                      disabled={actionLoading.edit}
                                      aria-label="Save location"
                                    >
                                      {actionLoading.edit ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                      ) : (
                                        'Save Changes'
                                      )}
                                    </Button>
                                  </div>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                          <AlertDialog
                            open={deleteOpen && deleteLocationId === loc._id}
                            onOpenChange={(open) => {
                              setDeleteOpen(open);
                              if (!open) setDeleteLocationId(null);
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDeleteLocationId(loc._id);
                                  setDeleteOpen(true);
                                }}
                                className="bg-transparent border-complementary text-error hover:bg-error/10 rounded-lg text-sm py-1.5 px-3 transition-all duration-300 hover:shadow-md"
                                disabled={actionLoading.edit || actionLoading.delete}
                                aria-label={`Delete ${loc.name}`}
                                title="Delete Location"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent
                              className={cn(
                                'bg-complementary text-body rounded-xl shadow-2xl max-w-lg p-6 z-[1400] animate-scale-in scrollbar-thin scrollbar-thumb-accent scrollbar-track-complementary'
                              )}
                            >
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-lg md:text-xl font-bold text-body">
                                  Confirm Deletion
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-sm text-body/80">
                                  Are you sure you want to delete "{loc.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex justify-end gap-3">
                                <AlertDialogCancel
                                  onClick={handleDeleteCancel}
                                  className="border-complementary text-body hover:bg-complementary/20 rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md"
                                  disabled={actionLoading.delete}
                                  aria-label="Cancel delete"
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDeleteConfirm}
                                  className="bg-error text-white hover:bg-error/80 rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md flex items-center gap-2"
                                  disabled={actionLoading.delete}
                                  aria-label="Confirm delete"
                                >
                                  {actionLoading.delete ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                  ) : (
                                    'Delete'
                                  )}
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
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm md:text-base text-body/80 animate-fade-in">
                No locations found. Click "Add Location" to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Locations;