import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSettings, updateSettings, updateEmployeeLeaves, reset } from '../redux/settingsSlice';
import { logout } from '../../../redux/slices/authSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
    .max(360, 'Paid Leaves Per Year cannot exceed 360')
    .optional(),
  updatePaidLeavesPerYear: z.boolean().optional(),
  halfDayDeduction: z
    .number()
    .min(0, 'Half-Day Deduction must be at least 0')
    .max(1, 'Half-Day Deduction cannot exceed 1')
    .optional(),
  updateHalfDayDeduction: z.boolean().optional(),
  highlightDuration: z
    .number()
    .min(0.0167, 'Highlight Duration must be at least 0.0167 hours (1 minute)')
    .max(168, 'Highlight Duration cannot exceed 168 hours (7 days)')
    .optional(),
  updateHighlightDuration: z.boolean().optional(),
  applyLeaveChanges: z.boolean().optional(),
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
      updatePaidLeavesPerYear: false,
      halfDayDeduction: 0.5,
      updateHalfDayDeduction: false,
      highlightDuration: 24,
      updateHighlightDuration: false,
      applyLeaveChanges: false,
    },
  });

  // Watch checkbox states to enable/disable the button
  const watchedCheckboxes = form.watch([
    'updatePaidLeavesPerYear',
    'updateHalfDayDeduction',
    'updateHighlightDuration',
  ]);

  // Reset applyLeaveChanges when updatePaidLeavesPerYear is unchecked
  useEffect(() => {
    if (!form.getValues('updatePaidLeavesPerYear')) {
      form.setValue('applyLeaveChanges', false);
    }
  }, [watchedCheckboxes, form]);

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
        updatePaidLeavesPerYear: false,
        halfDayDeduction: settings.halfDayDeduction,
        updateHalfDayDeduction: false,
        highlightDuration: settings.highlightDuration / (60 * 60 * 1000),
        updateHighlightDuration: false,
        applyLeaveChanges: false,
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
      min: 'Highlight Duration must be at least 0.0167 hours (1 minute)',
      max: 'Highlight Duration cannot exceed 168 hours (7 days)',
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
      const updatedFields = [];
      if (form.getValues('updatePaidLeavesPerYear')) updatedFields.push('Paid Leaves Per Year');
      if (form.getValues('updateHalfDayDeduction')) updatedFields.push('Half-Day Deduction');
      if (form.getValues('updateHighlightDuration')) updatedFields.push('Highlight Duration');
      toast.success(`${updatedFields.join(', ')} updated successfully`, {
        id: 'update-success',
        duration: 5000,
        position: 'top-center',
      });
      dispatch(reset());
      // Reset checkboxes after successful update
      form.setValue('updatePaidLeavesPerYear', false);
      form.setValue('updateHalfDayDeduction', false);
      form.setValue('updateHighlightDuration', false);
      form.setValue('applyLeaveChanges', false);
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
  }, [error, successUpdate, successLeaves, employeeCount, dispatch, form]);

  const handleUpdateClick = async () => {
    try {
      const fieldsToUpdate = [
        { name: 'paidLeavesPerYear', checkbox: 'updatePaidLeavesPerYear' },
        { name: 'halfDayDeduction', checkbox: 'updateHalfDayDeduction' },
        { name: 'highlightDuration', checkbox: 'updateHighlightDuration' },
      ].filter(field => form.getValues(field.checkbox));

      console.log('Fields to update:', fieldsToUpdate.map(field => field.name));
      console.log('Checkbox values:', {
        updatePaidLeavesPerYear: form.getValues('updatePaidLeavesPerYear'),
        updateHalfDayDeduction: form.getValues('updateHalfDayDeduction'),
        updateHighlightDuration: form.getValues('updateHighlightDuration'),
        applyLeaveChanges: form.getValues('applyLeaveChanges'),
      });

      if (fieldsToUpdate.length === 0) {
        toast.error('Please select at least one setting to update', {
          id: 'no-selection-error',
          duration: 5000,
          position: 'top-center',
        });
        return;
      }

      const errors = [];
      for (const field of fieldsToUpdate) {
        const isValid = await form.trigger(field.name);
        if (!isValid && form.formState.errors[field.name]) {
          const errorType = form.formState.errors[field.name].type === 'number' ? 'type' : form.formState.errors[field.name].type;
          errors.push({ field: field.name, message: fieldErrorMessages[field.name][errorType] });
        }
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

      if (form.getValues('updatePaidLeavesPerYear') && form.getValues('applyLeaveChanges')) {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token found in localStorage');
        }
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
      } else {
        await submitFields(fieldsToUpdate);
      }
    } catch (error) {
      console.error('Update settings error:', error);
      toast.error(error.message || 'Error updating settings', {
        id: 'submit-error',
        duration: 5000,
        position: 'top-center',
      });
    }
  };

  const submitFields = (fieldsToUpdate) => {
    const data = form.getValues();
    const submissionData = {};
    fieldsToUpdate.forEach(field => {
      if (field.name === 'paidLeavesPerYear') {
        submissionData.paidLeavesPerYear = data.paidLeavesPerYear;
      } else if (field.name === 'halfDayDeduction') {
        submissionData.halfDayDeduction = data.halfDayDeduction;
      } else if (field.name === 'highlightDuration') {
        submissionData.highlightDuration = data.highlightDuration * 60 * 60 * 1000;
      }
    });

    dispatch(updateSettings(submissionData))
      .unwrap()
      .then(() => {
        const updatedFields = fieldsToUpdate.map(field => 
          field.name === 'paidLeavesPerYear' ? 'Paid Leaves Per Year' :
          field.name === 'halfDayDeduction' ? 'Half-Day Deduction' :
          'Highlight Duration'
        );
        toast.success(`${updatedFields.join(', ')} updated successfully`, {
          id: 'update-success',
          duration: 5000,
          position: 'top-center',
        });
        if (form.getValues('updatePaidLeavesPerYear') && data.applyLeaveChanges) {
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
        }
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to update settings', {
          id: 'update-error',
          duration: 5000,
          position: 'top-center',
        });
      });
  };

  const confirmUpdateLeaves = () => {
    const fieldsToUpdate = [
      { name: 'paidLeavesPerYear', checkbox: 'updatePaidLeavesPerYear' },
      { name: 'halfDayDeduction', checkbox: 'updateHalfDayDeduction' },
      { name: 'highlightDuration', checkbox: 'updateHighlightDuration' },
    ].filter(field => form.getValues(field.checkbox));
    submitFields(fieldsToUpdate);
    setIsDialogOpen(false);
  };

  const isUpdateButtonDisabled = !watchedCheckboxes.some(Boolean) || loadingUpdate || loadingLeaves;

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
      <div className="max-w-2xl mx-auto">
        <Card className="bg-complementary text-body shadow-md animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl">System Settings</CardTitle>
            <p className="text-sm text-body/60">
              Select the settings to update by checking the boxes, then click Update Selected Settings. For Paid Leaves Per Year, you can optionally apply changes to employee leave balances.
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form ref={formRef} className="space-y-6">
                <FormField
                  control={form.control}
                  name="updatePaidLeavesPerYear"
                  render={({ field: checkboxField }) => (
                    <FormItem>
                      <div className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={checkboxField.value}
                            onCheckedChange={(checked) => {
                              checkboxField.onChange(checked);
                              console.log('updatePaidLeavesPerYear changed:', checked);
                            }}
                            disabled={loadingUpdate || loadingLeaves}
                            aria-label="Update Paid Leaves Per Year"
                          />
                        </FormControl>
                        <FormLabel className="text-sm sm:text-base">Paid Leaves Per Year</FormLabel>
                      </div>
                      <FormField
                        control={form.control}
                        name="paidLeavesPerYear"
                        render={({ field }) => (
                          <FormItem className="ml-8">
                            <FormControl>
                              <Input
                                type="number"
                                className="bg-complementary text-body border-accent"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                aria-label="Paid Leaves Per Year"
                                disabled={loadingUpdate || loadingLeaves || !form.getValues('updatePaidLeavesPerYear')}
                              />
                            </FormControl>
                            <p className="text-sm text-body/60 mt-1">
                              Employees receive {Math.floor((form.getValues('paidLeavesPerYear') || 24) / 12)} leaves per month. For employees joining in {new Date().getFullYear()}, leaves are allocated for the remaining months (e.g., a July joiner gets {Math.floor((form.getValues('paidLeavesPerYear') || 24) / 12) * (12 - 6)} leaves for July to December). Employees from previous years get {Math.floor((form.getValues('paidLeavesPerYear') || 24) / 12) * (12 - 6)} leaves for the remaining months.
                            </p>
                            <FormMessage className="text-error text-xs sm:text-sm" />
                            {form.getValues('updatePaidLeavesPerYear') && (
                              <FormField
                                control={form.control}
                                name="applyLeaveChanges"
                                render={({ field: applyField }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-2">
                                    <FormControl>
                                      <Checkbox
                                        checked={applyField.value}
                                        onCheckedChange={applyField.onChange}
                                        disabled={loadingUpdate || loadingLeaves}
                                        aria-label="Apply leave changes to all employees"
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="text-sm sm:text-base">
                                        Apply Leave Changes to All Employees
                                      </FormLabel>
                                      <p className="text-sm text-body/60">
                                        Check to update leave balances for {employeeCount || 'all active'} employees based on the Paid Leaves Per Year setting ({form.getValues('paidLeavesPerYear') || 24} leaves, allocated for July to December {new Date().getFullYear()}). This action cannot be undone.
                                      </p>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            )}
                          </FormItem>
                        )}
                      />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="updateHalfDayDeduction"
                  render={({ field: checkboxField }) => (
                    <FormItem>
                      <div className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={checkboxField.value}
                            onCheckedChange={(checked) => {
                              checkboxField.onChange(checked);
                              console.log('updateHalfDayDeduction changed:', checked);
                            }}
                            disabled={loadingUpdate}
                            aria-label="Update Half-Day Deduction Rate"
                          />
                        </FormControl>
                        <FormLabel className="text-sm sm:text-base">Half-Day Deduction Rate</FormLabel>
                      </div>
                      <FormField
                        control={form.control}
                        name="halfDayDeduction"
                        render={({ field }) => (
                          <FormItem className="ml-8">
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                className="bg-complementary text-body border-accent"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                aria-label="Half-Day Deduction Rate"
                                disabled={loadingUpdate || !form.getValues('updateHalfDayDeduction')}
                              />
                            </FormControl>
                            <p className="text-sm text-body/60 mt-1">
                              Specifies the leave deduction for a half-day (e.g., 0.5 deducts half a leave). Must be between 0 and 1.
                            </p>
                            <FormMessage className="text-error text-xs sm:text-sm" />
                          </FormItem>
                        )}
                      />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="updateHighlightDuration"
                  render={({ field: checkboxField }) => (
                    <FormItem>
                      <div className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={checkboxField.value}
                            onCheckedChange={(checked) => {
                              checkboxField.onChange(checked);
                              console.log('updateHighlightDuration changed:', checked);
                            }}
                            disabled={loadingUpdate}
                            aria-label="Update Highlight Duration"
                          />
                        </FormControl>
                        <FormLabel className="text-sm sm:text-base">Highlight Duration (hours)</FormLabel>
                      </div>
                      <FormField
                        control={form.control}
                        name="highlightDuration"
                        render={({ field }) => (
                          <FormItem className="ml-8">
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                className="bg-complementary text-body border-accent"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                aria-label="Highlight Duration"
                                disabled={loadingUpdate || !form.getValues('updateHighlightDuration')}
                              />
                            </FormControl>
                            <p className="text-sm text-body/60 mt-1">
                              Duration in hours for highlighting records (e.g., 24 hours for one day, 0.5 for 30 minutes). Must be between 0.0167 hours (1 minute) and 168 hours (7 days).
                            </p>
                            <FormMessage className="text-error text-xs sm:text-sm" />
                          </FormItem>
                        )}
                      />
                    </FormItem>
                  )}
                />
                {isUpdateButtonDisabled && !loadingUpdate && !loadingLeaves && (
                  <p className="text-sm text-error mt-2">
                    Please select at least one setting to update.
                  </p>
                )}
                <Button
                  type="button"
                  onClick={handleUpdateClick}
                  className={cn(
                    'bg-accent text-body hover:bg-accent-hover w-full sm:w-auto transition-all duration-300',
                    !isUpdateButtonDisabled && 'animate-pulse'
                  )}
                  disabled={isUpdateButtonDisabled}
                  aria-label="Update Selected Settings"
                >
                  {loadingUpdate || loadingLeaves ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Update Selected Settings'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-complementary text-body border-accent">
          <DialogHeader>
            <DialogTitle>Confirm Leave Balance Update</DialogTitle>
            <DialogDescription>
              This will reset the available paid leaves for {employeeCount} active employee{employeeCount !== 1 ? 's' : ''} based on the Paid Leaves Per Year setting ({form.getValues('paidLeavesPerYear') || 24} leaves, allocated for July to December {new Date().getFullYear()}). This action cannot be undone.
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