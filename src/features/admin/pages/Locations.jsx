import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLocations, addLocation, editLocation, deleteLocation } from '../redux/locationsSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Debug import
console.log('Imported thunks:', { fetchLocations, addLocation, editLocation, deleteLocation });

const Locations = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { locations, loading, error } = useSelector((state) => state.adminLocations);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLocationState, setEditLocationState] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLocationId, setDeleteLocationId] = useState(null);
  const [form, setForm] = useState({ name: '', address: '' });

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

  const handleAddSubmit = () => {
    if (!form.name || !form.address) {
      toast.error('Name and address are required');
      return;
    }
    dispatch(addLocation(form))
      .unwrap()
      .then(() => {
        toast.success('Location added successfully');
        setAddOpen(false);
        setForm({ name: '', address: '' });
      })
      .catch((err) => {
        console.error('Add location failed:', err);
        toast.error(err || 'Failed to add location');
      });
  };

  const handleEditOpen = (loc) => {
    console.log('Opening edit for location:', loc);
    setEditLocationState(loc);
    setForm({ name: loc.name, address: loc.address });
    setEditOpen(true);
  };

  const handleEditSubmit = () => {
    if (!form.name || !form.address) {
      toast.error('Name and address are required');
      return;
    }
    if (!editLocation || typeof editLocation !== 'function') {
      console.error('editLocation is not a function:', editLocation);
      toast.error('Edit functionality is unavailable');
      return;
    }
    console.log('Submitting edit for location:', { id: editLocationState._id, data: form });
    dispatch(editLocation({ id: editLocationState._id, data: form }))
      .unwrap()
      .then(() => {
        toast.success('Location updated successfully');
        setEditOpen(false);
        setEditLocationState(null);
        setForm({ name: '', address: '' });
      })
      .catch((err) => {
        console.error('Edit location failed:', err);
        toast.error(err || 'Failed to edit location');
      });
  };

  const handleDeleteOpen = (id) => {
    console.log('Opening delete for location ID:', id);
    setDeleteLocationId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteLocation || typeof deleteLocation !== 'function') {
      console.error('deleteLocation is not a function:', deleteLocation);
      toast.error('Delete functionality is unavailable');
      return;
    }
    console.log('Confirming delete for location ID:', deleteLocationId);
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
      });
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
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="bg-complementary text-body border-accent"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          className="bg-complementary text-body border-accent"
                          disabled={loading}
                        />
                      </div>
                      <Button
                        onClick={handleAddSubmit}
                        className="bg-accent text-body hover:bg-accent-hover"
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Add'}
                      </Button>
                    </div>
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
                      <TableHead className="text-body">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((loc) => (
                      <TableRow key={loc._id}>
                        <TableCell className="text-body">{loc.name}</TableCell>
                        <TableCell className="text-body">{loc.address}</TableCell>
                        <TableCell className="text-body">
                          <div className="flex gap-2">
                            <Dialog open={editOpen && editLocationState?._id === loc._id} onOpenChange={(open) => setEditOpen(open)}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditOpen(loc)}
                                  className="border-accent text-accent hover:bg-accent-hover hover:text-body"
                                  disabled={loading}
                                >
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md bg-complementary text-body">
                                <DialogHeader>
                                  <DialogTitle>Edit Location</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                      id="name"
                                      value={form.name}
                                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                                      className="bg-complementary text-body border-accent"
                                      disabled={loading}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                      id="address"
                                      value={form.address}
                                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                                      className="bg-complementary text-body border-accent"
                                      disabled={loading}
                                    />
                                  </div>
                                  <Button
                                    onClick={handleEditSubmit}
                                    className="bg-accent text-body hover:bg-accent-hover"
                                    disabled={loading}
                                  >
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <AlertDialog open={deleteOpen && deleteLocationId === loc._id} onOpenChange={(open) => setDeleteOpen(open)}>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteOpen(loc._id)}
                                  className="border-error text-error hover:bg-error hover:text-body"
                                  disabled={loading}
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
                                    disabled={loading}
                                  >
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Delete'}
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