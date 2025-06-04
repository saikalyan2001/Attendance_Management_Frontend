import { useEffect, useState } from 'react';
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
import { Loader2, Eye, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';

const locationSchema = z.object({
  name: z.string().nonempty('This field is required'),
  address: z.string().nonempty('This field is required'),
  city: z.string().nonempty('This field is required'),
  state: z.string().nonempty('This field is required'),
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
  const [newLocationId, setNewLocationId] = useState(null); // Track newly added location for animation
  const [deletedLocationId, setDeletedLocationId] = useState(null); // Track deleted location for animation

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
      console.error('Locations error:', error);
      toast.error(error);
      dispatch({ type: 'adminLocations/reset' });
    }
  }, [error, dispatch]);

  const handleAddSubmit = (data) => {
    setActionLoading((prev) => ({ ...prev, add: true }));
    dispatch(addLocation(data))
      .unwrap()
      .then((newLocation) => {
        toast.success('Location added successfully');
        setNewLocationId(newLocation._id); // Set the new location ID for animation
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
    editForm.reset({ name: loc.name, address: loc.address, city: loc.city || '', state: loc.state || '' });
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
    setDeletedLocationId(deleteLocationId); // Mark the location as being deleted for animation
    setTimeout(() => {
      dispatch(deleteLocation(deleteLocationId))
        .unwrap()
        .then(() => {
          toast.success('Location deleted successfully');
          setDeleteOpen(false);
          setDeleteLocationId(null);
          setDeletedLocationId(null);
        })
        .catch((err) => {
          console.error('Delete location failed:', err);
          toast.error(err || 'Failed to delete location');
          setDeletedLocationId(null);
        })
        .finally(() => {
          setActionLoading((prev) => ({ ...prev, delete: false }));
        });
    }, 300); // Delay the actual deletion to allow the fade-out animation to complete
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
    return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameB);
  });

  return (
    <Layout title="Locations">
      {error && (
        <Alert variant="destructive" className="mb-4 sm:mb-5 md:mb-6 border-error text-error max-w-2xl mx-auto rounded-md animate-fade-in">
          <AlertDescription className="text-[10px] sm:text-sm md:text-base xl:text-lg">{error}</AlertDescription>
        </Alert>
      )}
      <Card className="bg-complementary text-body max-w-full mx-auto shadow-lg rounded-lg border border-accent/10 animate-fade-in">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <span className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Location List</span>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-52 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-body h-4 w-4 sm:h-5 sm:w-5" />
                <Input
                  placeholder="Search locations"
                  className="pl-9 sm:pl-10 h-9 sm:h-10 md:h-11 xl:h-12 w-full bg-body text-body rounded-md border border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-300 text-[10px] sm:text-sm md:text-base xl:text-lg hover:shadow-md"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                />
              </div>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-lg">
                    Add Location
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className={cn(
                    'bg-complementary text-body rounded-lg shadow-2xl max-w-[90vw] sm:max-w-[70vw] md:max-w-[500px] xl:max-w-[600px] max-h-[90vh] overflow-y-auto p-3 sm:p-4 md:p-6 xl:p-8 z-[1400] transition-all duration-200',
                    addOpen ? 'animate-scale-in' : 'animate-fade-out',
                    'scrollbar-thin scrollbar-thumb-accent scrollbar-track-complementary scrollbar-rounded'
                  )}
                >
                  <DialogHeader>
                    <DialogTitle className="text-sm sm:text-base md:text-lg xl:text-2xl font-bold text-body">
                      Add Location
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...addForm}>
                    <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={addForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-body text-[10px] sm:text-sm md:text-base xl:text-lg font-medium">
                              Name *
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="h-9 sm:h-10 md:h-11 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg transition-all duration-300 hover:shadow-sm"
                                disabled={actionLoading.add}
                              />
                            </FormControl>
                            <FormMessage className="text-error text-[9px] sm:text-xs md:text-sm xl:text-base" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-body text-[10px] sm:text-sm md:text-base xl:text-lg font-medium">
                              City *
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="h-9 sm:h-10 md:h-11 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg transition-all duration-300 hover:shadow-sm"
                                disabled={actionLoading.add}
                              />
                            </FormControl>
                            <FormMessage className="text-error text-[9px] sm:text-xs md:text-sm xl:text-base" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className="text-body text-[10px] sm:text-sm md:text-base xl:text-lg font-medium">
                              Address *
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="h-9 sm:h-10 md:h-11 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg transition-all duration-300 hover:shadow-sm"
                                disabled={actionLoading.add}
                              />
                            </FormControl>
                            <FormMessage className="text-error text-[9px] sm:text-xs md:text-sm xl:text-base" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-body text-[10px] sm:text-sm md:text-base xl:text-lg font-medium">
                              State *
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="h-9 sm:h-10 md:h-11 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg transition-all duration-300 hover:shadow-sm"
                                disabled={actionLoading.add}
                              />
                            </FormControl>
                            <FormMessage className="text-error text-[9px] sm:text-xs md:text-sm xl:text-base" />
                          </FormItem>
                        )}
                      />
                      <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-3 sm:mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setAddOpen(false)}
                          className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-md"
                          disabled={actionLoading.add}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className={cn(
                            'bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-lg',
                            !actionLoading.add && 'animate-pulse' // Pulse effect after successful action
                          )}
                          disabled={actionLoading.add}
                        >
                          {actionLoading.add ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : 'Add'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-3 sm:p-4 text-center">
              <div className="space-y-3 sm:space-y-4">
                {Array(3)
                  .fill()
                  .map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md bg-complementary/20 animate-pulse" />
                  ))}
              </div>
            </div>
          ) : sortedLocations.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="border border-accent/20 rounded-md min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-complementary hover:bg-accent/10 border-b border-body/20">
                    <TableHead className="text-body text-[10px] sm:text-sm md:text-base xl:text-lg px-3 sm:px-4 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        onClick={handleSort}
                        className="text-body hover:text-accent font-semibold text-[10px] sm:text-sm md:text-base xl:text-lg transition-colors duration-300"
                      >
                        Name {sortOrder === 'asc' ? '↑' : '↓'}
                      </Button>
                    </TableHead>
                    <TableHead className="text-body text-[10px] sm:text-sm md:text-base xl:text-lg px-3 sm:px-4 whitespace-nowrap">
                      Address
                    </TableHead>
                    <TableHead className="text-body text-[10px] sm:text-sm md:text-base xl:text-lg px-3 sm:px-4 whitespace-nowrap">
                      City
                    </TableHead>
                    <TableHead className="text-body text-[10px] sm:text-sm md:text-base xl:text-lg px-3 sm:px-4 whitespace-nowrap">
                      State
                    </TableHead>
                    <TableHead className="text-body text-[10px] sm:text-sm md:text-base xl:text-lg px-3 sm:px-4 whitespace-nowrap">
                      Employees
                    </TableHead>
                    <TableHead className="text-body text-[10px] sm:text-sm md:text-base xl:text-lg px-3 sm:px-4 whitespace-nowrap">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLocations.map((loc) => (
                    <TableRow
                      key={loc._id}
                      className={cn(
                        'border-b border-accent/10 transition-all duration-300',
                        deletedLocationId === loc._id ? 'animate-fade-out' : newLocationId === loc._id ? 'animate-slide-in-row' : 'hover:bg-black/5 dark:hover:bg-white/5'
                      )}
                    >
                      <TableCell className="text-[10px] sm:text-sm md:text-base xl:text-lg text-body font-medium px-3 sm:px-4 whitespace-nowrap">
                        {loc.name}
                      </TableCell>
                      <TableCell className="text-[10px] sm:text-sm md:text-base xl:text-lg text-body px-3 sm:px-4">
                        {loc.address}
                      </TableCell>
                      <TableCell className="text-[10px] sm:text-sm md:text-base xl:text-lg text-body px-3 sm:px-4 whitespace-nowrap">
                        {loc.city || '-'}
                      </TableCell>
                      <TableCell className="text-[10px] sm:text-sm md:text-base xl:text-lg text-body px-3 sm:px-4 whitespace-nowrap">
                        {loc.state || '-'}
                      </TableCell>
                      <TableCell className="text-[10px] sm:text-sm md:text-base xl:text-lg text-body px-3 sm:px-4 whitespace-nowrap">
                        {typeof loc.employeeCount === 'number' ? loc.employeeCount : '-'}
                      </TableCell>
                      <TableCell className="px-3 sm:px-4">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewEmployees(loc._id)}
                            className="bg-transparent border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-xs md:text-sm xl:text-base py-1 sm:py-1.5 px-2 sm:px-3 transition-all duration-300 hover:shadow-md"
                            disabled={actionLoading.edit || actionLoading.delete}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Dialog
                            open={editOpen && editLocationState?._id === loc._id}
                            onOpenChange={(open) => setEditOpen(open)}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditOpen(loc)}
                                className="bg-transparent border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-xs md:text-sm xl:text-base py-1 sm:py-1.5 px-2 sm:px-3 transition-all duration-300 hover:shadow-md"
                                disabled={actionLoading.edit || actionLoading.delete}
                              >
                                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"
                                  />
                                </svg>
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent
                              className={cn(
                                'bg-complementary text-body rounded-lg shadow-2xl max-w-[90vw] sm:max-w-[70vw] md:max-w-[500px] xl:max-w-[600px] max-h-[90vh] overflow-y-auto p-3 sm:p-4 md:p-6 xl:p-8 z-[1400] transition-all duration-200',
                                editOpen ? 'animate-scale-in' : 'animate-fade-out',
                                'scrollbar-thin scrollbar-thumb-accent scrollbar-track-complementary scrollbar-rounded'
                              )}
                            >
                              <DialogHeader>
                                <DialogTitle className="text-sm sm:text-base md:text-lg xl:text-2xl font-bold text-body">
                                  Edit Location
                                </DialogTitle>
                              </DialogHeader>
                              <Form {...editForm}>
                                <form
                                  onSubmit={editForm.handleSubmit(handleEditSubmit)}
                                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
                                >
                                  <FormField
                                    control={editForm.control}
                                    name="name"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-body text-[10px] sm:text-sm md:text-base xl:text-lg font-medium">
                                          Name *
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            className="h-9 sm:h-10 md:h-11 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg transition-all duration-300 hover:shadow-sm"
                                            disabled={actionLoading.edit}
                                          />
                                        </FormControl>
                                        <FormMessage className="text-error text-[9px] sm:text-xs md:text-sm xl:text-base" />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={editForm.control}
                                    name="city"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-body text-[10px] sm:text-sm md:text-base xl:text-lg font-medium">
                                          City *
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            className="h-9 sm:h-10 md:h-11 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg transition-all duration-300 hover:shadow-sm"
                                            disabled={actionLoading.edit}
                                          />
                                        </FormControl>
                                        <FormMessage className="text-error text-[9px] sm:text-xs md:text-sm xl:text-base" />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={editForm.control}
                                    name="address"
                                    render={({ field }) => (
                                      <FormItem className="sm:col-span-2">
                                        <FormLabel className="text-body text-[10px] sm:text-sm md:text-base xl:text-lg font-medium">
                                          Address *
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            className="h-9 sm:h-10 md:h-11 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg transition-all duration-300 hover:shadow-sm"
                                            disabled={actionLoading.edit}
                                          />
                                        </FormControl>
                                        <FormMessage className="text-error text-[9px] sm:text-xs md:text-sm xl:text-base" />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={editForm.control}
                                    name="state"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-body text-[10px] sm:text-sm md:text-base xl:text-lg font-medium">
                                          State *
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            className="h-9 sm:h-10 md:h-11 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg transition-all duration-300 hover:shadow-sm"
                                            disabled={actionLoading.edit}
                                          />
                                        </FormControl>
                                        <FormMessage className="text-error text-[9px] sm:text-xs md:text-sm xl:text-base" />
                                      </FormItem>
                                    )}
                                  />
                                  <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-3 sm:mt-4">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => setEditOpen(false)}
                                      className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-md"
                                      disabled={actionLoading.edit}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      type="submit"
                                      className={cn(
                                        'bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-lg',
                                        !actionLoading.edit && 'animate-pulse'
                                      )}
                                      disabled={actionLoading.edit}
                                    >
                                      {actionLoading.edit ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : 'Save'}
                                    </Button>
                                  </div>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                          <AlertDialog
                            open={deleteOpen && deleteLocationId === loc._id}
                            onOpenChange={(open) => setDeleteOpen(open)}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteLocationId(loc._id)}
                                className="bg-transparent border-complementary text-red-500 hover:bg-complementary/10 rounded-md text-[10px] sm:text-xs md:text-sm xl:text-base py-1 sm:py-1.5 px-2 sm:px-3 transition-all duration-300 hover:shadow-md"
                                disabled={actionLoading.edit || actionLoading.delete}
                              >
                                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4M3 7h18"
                                  />
                                </svg>
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent
                              className={cn(
                                'bg-complementary text-body rounded-lg shadow-2xl max-w-[90vw] sm:max-w-[70vw] md:max-w-[500px] xl:max-w-[600px] max-h-[90vh] overflow-y-auto p-3 sm:p-4 md:p-6 xl:p-8 z-[1400] transition-all duration-200',
                                deleteOpen ? 'animate-scale-in' : 'animate-fade-out',
                                'scrollbar-thin scrollbar-thumb-accent scrollbar-track-complementary scrollbar-rounded'
                              )}
                            >
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-sm sm:text-base md:text-lg xl:text-2xl font-bold text-body">
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-[10px] sm:text-sm md:text-base xl:text-lg text-body/80">
                                  This action cannot be undone. This will permanently delete the location "{loc.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                                <AlertDialogCancel
                                  className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-md"
                                  disabled={actionLoading.delete}
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDeleteConfirm}
                                  className={cn(
                                    'bg-red-500 text-white hover:bg-red-600 rounded-md text-[10px] sm:text-sm md:text-base xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-lg',
                                    !actionLoading.delete && 'animate-pulse'
                                  )}
                                  disabled={actionLoading.delete}
                                >
                                  {actionLoading.delete ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : 'Delete'}
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
            <div className="p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-sm md:text-base xl:text-lg text-body animate-fade-in">
                No locations found. Add a location to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Locations;