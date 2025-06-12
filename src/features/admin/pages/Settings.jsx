import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSettings, updateSettings, updateEmployeeLeaves, reset } from '../redux/settingsSlice';
import { logout } from '../../../redux/slices/authSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

const formSchema = z.object({
  paidLeavesPerYear: z
    .number()
    .int()
    .min(12, 'Paid leaves per year must be at least 12')
    .max(360, 'Paid leaves per year cannot exceed 360'),
  halfDayDeduction: z
    .number()
    .min(0, 'Half-day deduction must be at least 0')
    .max(1, 'Half-day deduction cannot exceed 1'),
  highlightDuration: z
    .number()
    .min(1, 'Highlight duration must be at least 1 minute')
    .max(10080, 'Highlight duration cannot exceed 10,080 minutes (7 days)'),
});

const Settings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { settings, loadingFetch, loadingUpdate, loadingLeaves, error, successUpdate, successLeaves } = useSelector((state) => state.adminSettings);
  const { user } = useSelector((state) => state.auth);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [employeeCount, setEmployeeCount] = useState(0);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paidLeavesPerYear: 24, // Default to 24 leaves per year (2 per month)
      halfDayDeduction: 0.5,
      highlightDuration: 1440, // Default to 24 hours (1440 minutes)
    },
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
    dispatch(fetchSettings());
  }, [dispatch, user, navigate]);

  useEffect(() => {
    if (settings) {
      form.reset({
        paidLeavesPerYear: settings.paidLeavesPerYear || 24, // Use paidLeavesPerYear from settings
        halfDayDeduction: settings.halfDayDeduction,
        highlightDuration: settings.highlightDuration / (60 * 1000), // Convert milliseconds to minutes
      });
    }
  }, [settings, form]);

  useEffect(() => {
    if (error) {
      toast.error(error, {
        action: {
          label: 'Retry',
          onClick: () => {
            dispatch(fetchSettings());
            dispatch(reset());
          },
        },
      });
    }
    if (successUpdate) {
      toast.success('Settings updated successfully');
      dispatch(reset());
    }
    if (successLeaves) {
      toast.success(`Employee leaves updated successfully for ${employeeCount} employees`);
      dispatch(reset());
      setIsDialogOpen(false);
    }
  }, [error, successUpdate, successLeaves, employeeCount, dispatch]);

  const onSubmit = (data) => {
    // Convert highlightDuration from minutes to milliseconds before sending to backend
    const submissionData = {
      paidLeavesPerYear: data.paidLeavesPerYear,
      halfDayDeduction: data.halfDayDeduction,
      highlightDuration: data.highlightDuration * 60 * 1000, // Convert minutes to milliseconds
    };
    dispatch(updateSettings(submissionData))
      .unwrap()
      .then(() => {
        toast.success('Settings updated successfully');
      })
      .catch((err) => toast.error(err.message || 'Failed to update settings'));
  };

  const handleUpdateLeaves = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/employees/count', {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      const data = await response.json();
      setEmployeeCount(data.count || 0);
      setIsDialogOpen(true);
    } catch (error) {
      toast.error('Failed to fetch employee count');
    }
  };

  const confirmUpdateLeaves = () => {
    dispatch(updateEmployeeLeaves())
      .unwrap()
      .then((response) => {
        setEmployeeCount(response.employeeCount || 0);
      })
      .catch((err) => toast.error(err.message || 'Failed to update employee leaves'));
  };

  if (loadingFetch) {
    return (
      <Layout title="Settings">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-complementary text-body shadow-md">
            <CardHeader>
              <Skeleton className="h-8 w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-1/2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Settings">
      {error && (
        <Alert variant="destructive" className="mb-6 border-error text-error animate-fade-in max-w-2xl mx-auto">
          <AlertDescription className="flex justify-between items-center">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                dispatch(fetchSettings());
                dispatch(reset());
              }}
              className="border-accent text-accent hover:bg-accent-hover"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* System Settings */}
        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="paidLeavesPerYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Paid Leaves Per Year</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="bg-complementary text-body border-accent"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <p className="text-sm text-body/60 mt-1">
                        Employees receive {field.value / 12} leaves per month. For mid-year joiners (e.g., March), leaves are prorated based on remaining months.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="halfDayDeduction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Half-Day Deduction Rate</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          className="bg-complementary text-body border-accent"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="highlightDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Highlight Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          className="bg-complementary text-body border-accent"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="bg-accent text-body hover:bg-accent-hover w-full sm:w-auto"
                  disabled={loadingUpdate}
                >
                  {loadingUpdate ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Settings'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Employee Leave Management */}
        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">Employee Leave Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-body">
                Update the available paid leaves for all employees based on the current "Paid Leaves Per Year" setting. Leaves are prorated for mid-year joiners based on their join date. Excess leaves will be carried forward.
              </p>
              <Button
                onClick={handleUpdateLeaves}
                className="bg-accent text-body hover:bg-accent-hover w-full sm:w-auto"
                disabled={loadingLeaves}
              >
                {loadingLeaves ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Employee Leaves'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpen simulates={setIsDialogOpen}>
        <DialogContent className="bg-complementary text-body border-accent">
          <DialogHeader>
            <DialogTitle>Confirm Employee Leave Update</DialogTitle>
            <DialogDescription>
              This action will update the available paid leaves for {employeeCount} employee{employeeCount !== 1 ? 's' : ''} based on the current "Paid Leaves Per Year" setting ({settings?.paidLeavesPerYear || 24} leaves, prorated for mid-year joiners). Excess leaves will be carried forward. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-accent text-accent hover:bg-accent-hover"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUpdateLeaves}
              className="bg-accent text-body hover:bg-accent-hover"
              disabled={loadingLeaves}
            >
              {loadingLeaves ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Settings;