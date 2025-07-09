import { useEffect, useState, useRef } from 'react';
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
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  paidLeavesPerYear: z
    .number()
    .int()
    .min(12, 'Paid Leaves Per Year must be at least 12')
    .max(360, 'Paid Leaves Per Year cannot exceed 360'),
  halfDayDeduction: z
    .number()
    .min(0, 'Half-Day Deduction must be at least 0')
    .max(1, 'Half-Day Deduction cannot exceed 1'),
  highlightDuration: z
    .number()
    .min(1, 'Highlight Duration must be at least 1 minute')
    .max(10080, 'Highlight Duration cannot exceed 10,080 minutes (7 days)'),
});

const Settings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { settings, loadingFetch, loadingUpdate, loadingLeaves, error, successUpdate, successLeaves } = useSelector((state) => state.adminSettings);
  const { user } = useSelector((state) => state.auth);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [employeeCount, setEmployeeCount] = useState(0);
  const formRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paidLeavesPerYear: 24,
      halfDayDeduction: 0.5,
      highlightDuration: 1440,
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
        paidLeavesPerYear: settings.paidLeavesPerYear || 24,
        halfDayDeduction: settings.halfDayDeduction,
        highlightDuration: settings.highlightDuration / (60 * 1000),
      });
    }
  }, [settings, form]);

  const fieldErrorMessages = {
    paidLeavesPerYear: {
      min: 'Paid Leaves Per Year must be at least 12',
      max: 'Paid Leaves Per Year cannot exceed 360',
      type: 'Paid Leaves Per Year must be a valid number',
    },
    halfDayDeduction: {
      min: 'Half-Day Deduction must be at least 0',
      max: 'Half-Day Deduction cannot exceed 1',
      type: 'Half-Day Deduction must be a valid number',
    },
    highlightDuration: {
      min: 'Highlight Duration must be at least 1 minute',
      max: 'Highlight Duration cannot exceed 10,080 minutes (7 days)',
      type: 'Highlight Duration must be a valid number',
    },
  };

  useEffect(() => {
    if (error) {
      toast.error(error, {
        id: 'fetch-error',
        duration: 5000,
        position: 'top-center',
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
      toast.success('Settings updated successfully', {
        id: 'update-success',
        duration: 5000,
        position: 'top-center',
      });
      dispatch(reset());
    }
    if (successLeaves) {
      toast.success(`Employee leaves updated successfully for ${employeeCount} employees`, {
        id: 'leaves-success',
        duration: 5000,
        position: 'top-center',
      });
      dispatch(reset());
      setIsDialogOpen(false);
    }
  }, [error, successUpdate, successLeaves, employeeCount, dispatch]);

  const handleSaveClick = async () => {
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        const errors = [];
        const addError = (field, errorObj) => {
          if (errorObj) {
            const errorType = errorObj.type === 'number' ? 'type' : errorObj.type;
            errors.push({ field, message: fieldErrorMessages[field][errorType] });
          }
        };

        const fieldOrder = ['paidLeavesPerYear', 'halfDayDeduction', 'highlightDuration'];
        for (const field of fieldOrder) {
          addError(field, form.formState.errors[field]);
        }

        if (errors.length > 0) {
          const firstError = errors[0];
          toast.error(firstError.message, {
            id: `settings-validation-error-${firstError.field}`,
            duration: 5000,
            position: 'top-center',
          });
          const firstErrorField = document.querySelector(`[name="${firstError.field}"]`) || formRef.current;
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
          }
          return;
        }
      }
      await form.handleSubmit(onSubmit)();
    } catch (error) {
      ('Save click error:', error);
      toast.error('Error submitting form, please try again', {
        id: 'submit-error',
        duration: 5000,
        position: 'top-center',
      });
    }
  };

  const onSubmit = (data) => {
    const submissionData = {
      paidLeavesPerYear: data.paidLeavesPerYear,
      halfDayDeduction: data.halfDayDeduction,
      highlightDuration: data.highlightDuration * 60 * 1000,
    };
    dispatch(updateSettings(submissionData))
      .unwrap()
      .then(() => {
        toast.success('Settings updated successfully', {
          id: 'update-success',
          duration: 5000,
          position: 'top-center',
        });
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to update settings', {
          id: 'update-error',
          duration: 5000,
          position: 'top-center',
        });
      });
  };

  const handleUpdateLeaves = async () => {
  try {
    const token = localStorage.getItem('token'); // Get token from localStorage
    if (!token) {
      throw new Error('No token found in localStorage');
    }
    ('Token before request:', token); // Log for debugging
    const response = await fetch('http://localhost:5000/api/admin/employees/count', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch employee count');
    }
    setEmployeeCount(data.count || 0);
    setIsDialogOpen(true);
  } catch (error) {
    ('Fetch employee count error:', error);
    toast.error(error.message || 'Failed to fetch employee count', {
      id: 'employee-count-error',
      duration: 5000,
      position: 'top-center',
    });
  }
};


  const confirmUpdateLeaves = () => {
    dispatch(updateEmployeeLeaves())
      .unwrap()
      .then((response) => {
        setEmployeeCount(response.employeeCount || 0);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to update employee leaves', {
          id: 'leaves-error',
          duration: 5000,
          position: 'top-center',
        });
      });
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
              aria-label="Retry fetching settings"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form ref={formRef} className="space-y-6">
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
                          aria-label="Paid Leaves Per Year"
                          disabled={loadingUpdate}
                        />
                      </FormControl>
                      <p className="text-sm text-body/60 mt-1">
                        Employees receive {field.value / 12} leaves per month, prorated for mid-year joiners (e.g., March joiners get {Math.round((field.value * 10) / 12) / 10} leaves for 10 months). Unused leaves are carried forward to the next month.
                      </p>
                      <FormMessage className="text-error text-xs sm:text-sm" />
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
                          aria-label="Half-Day Deduction Rate"
                          disabled={loadingUpdate}
                        />
                      </FormControl>
                      <FormMessage className="text-error text-xs sm:text-sm" />
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
                          aria-label="Highlight Duration"
                          disabled={loadingUpdate}
                        />
                      </FormControl>
                      <FormMessage className="text-error text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  onClick={handleSaveClick}
                  className={cn(
                    'bg-accent text-body hover:bg-accent-hover w-full sm:w-auto transition-all duration-300',
                    !loadingUpdate && 'animate-pulse'
                  )}
                  disabled={loadingUpdate}
                  aria-label="Save Settings"
                >
                  {loadingUpdate ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Settings'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">Employee Leave Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-body">
                Update the available paid leaves for all employees based on the current "Paid Leaves Per Year" setting. Leaves are prorated for mid-year joiners based on their join date, and unused leaves are carried forward to the next month.
              </p>
              <Button
                onClick={handleUpdateLeaves}
                className={cn(
                  'bg-accent text-body hover:bg-accent-hover w-full sm:w-auto transition-all duration-300',
                  !loadingLeaves && 'animate-pulse'
                )}
                disabled={loadingLeaves}
                aria-label="Update Employee Leaves"
              >
                {loadingLeaves ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Employee Leaves'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-complementary text-body border-accent">
          <DialogHeader>
            <DialogTitle>Confirm Employee Leave Update</DialogTitle>
            <DialogDescription>
              This action will update the available paid leaves for {employeeCount} employee{employeeCount !== 1 ? 's' : ''} based on the current "Paid Leaves Per Year" setting ({settings?.paidLeavesPerYear || 24} leaves, prorated for mid-year joiners). Unused leaves will be carried forward. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-accent text-accent hover:bg-accent-hover"
              aria-label="Cancel leave update"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUpdateLeaves}
              className={cn(
                'bg-accent text-body hover:bg-accent-hover transition-all duration-300',
                !loadingLeaves && 'animate-pulse'
              )}
              disabled={loadingLeaves}
              aria-label="Confirm leave update"
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