import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
    .preprocess(
      (value) => {
        if (value === '' || value == null) return undefined;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? undefined : parsed;
      },
      z
        .number({
          required_error: 'Please enter a valid number for paid leaves per year',
          invalid_type_error: 'Please enter a valid number for paid leaves per year',
        })
        .int()
        .min(12, 'Paid leaves per year must be at least 12 days')
        .max(360, 'Paid leaves per year cannot exceed 360 days')
    )
    .optional(),
  updatePaidLeavesPerYear: z.boolean().optional(),
  halfDayDeduction: z
    .preprocess(
      (value) => {
        if (value === '' || value == null) return undefined;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? undefined : parsed;
      },
      z
        .number({
          required_error: 'Please enter a valid number for half-day deduction',
          invalid_type_error: 'Please enter a valid number for half-day deduction',
        })
        .min(0, 'Half-day deduction must be between 0 and 1')
        .max(1, 'Half-day deduction must be between 0 and 1')
    )
    .optional(),
  highlightDuration: z
    .preprocess(
      (value) => {
        if (value === '' || value == null) return undefined;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? undefined : parsed;
      },
      z
        .number({
          required_error: 'Please enter a valid number for highlight duration',
          invalid_type_error: 'Please enter a valid number for highlight duration',
        })
        .min(0.0167, 'Highlight duration must be at least 1 minute')
        .max(168, 'Highlight duration cannot exceed 7 days')
    )
    .optional(),
  updateHighlightDuration: z.boolean().optional(),
  applyLeaveChanges: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // If a checkbox is checked, the corresponding field must have a valid value
  if (data.updatePaidLeavesPerYear && data.paidLeavesPerYear == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please enter a valid number for paid leaves per year',
      path: ['paidLeavesPerYear'],
    });
  }
  if (data.updateHalfDayDeduction && data.halfDayDeduction == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please enter a valid number for half-day deduction',
      path: ['halfDayDeduction'],
    });
  }
  if (data.updateHighlightDuration && data.highlightDuration == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please enter a valid number for highlight duration',
      path: ['highlightDuration'],
    });
  }
});

const SettingsForm = ({ role, settingsSelector, fetchSettings, updateSettings, updateEmployeeLeaves, reset, employeeCountEndpoint }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { settings, loadingFetch, loadingUpdate, loadingLeaves, error, successUpdate, successLeaves } = useSelector(settingsSelector);
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

  const watchedCheckboxes = form.watch([
    'updatePaidLeavesPerYear',
    'updateHalfDayDeduction',
    'updateHighlightDuration',
  ]);

  useEffect(() => {
    if (!form.getValues('updatePaidLeavesPerYear')) {
      form.setValue('applyLeaveChanges', false);
    }
  }, [watchedCheckboxes, form]);

  useEffect(() => {
    if (!user || user.role !== role) {
      navigate('/login');
    }
    dispatch(fetchSettings());
  }, [dispatch, user, navigate, fetchSettings, role]);

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

  useEffect(() => {
    if (error) {
      console.log('Error in Redux state:', error); // Debug log
      const userFriendlyErrorMessage =
        error === 'Failed to fetch settings'
          ? 'Could not load system settings. Please check your connection and try again.'
          : error === 'Failed to update settings'
          ? 'Settings update failed. Please try again or contact support if the issue persists.'
          : error === 'Failed to update employee leaves'
          ? 'Could not update employee leave balances. Please try again or contact support.'
          : 'Something went wrong. Please refresh the page and try again.';
      
      toast.error(userFriendlyErrorMessage, {
        id: `fetch-error-${role}`,
        duration: 5000,
        position: 'top-center',
        action: {
          label: 'Try Again',
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
      
      toast.success(`Settings updated: ${updatedFields.join(', ').toLowerCase()}`, {
        id: 'update-success',
        duration: 5000,
        position: 'top-center',
      });
      dispatch(reset());
      form.setValue('updatePaidLeavesPerYear', false);
      form.setValue('updateHalfDayDeduction', false);
      form.setValue('updateHighlightDuration', false);
      form.setValue('applyLeaveChanges', false);
    }

    if (successLeaves) {
      toast.success(`Leave balances updated successfully for ${employeeCount} active employee${employeeCount !== 1 ? 's' : ''}`, {
        id: 'leaves-success',
        duration: 5000,
        position: 'top-center',
      });
      dispatch(reset());
      setIsDialogOpen(false);
    }
  }, [error, successUpdate, successLeaves, employeeCount, dispatch, form, reset, role]);

  const handleUpdateClick = async () => {
    try {
      const fieldsToUpdate = [
        { name: 'paidLeavesPerYear', checkbox: 'updatePaidLeavesPerYear' },
        { name: 'halfDayDeduction', checkbox: 'updateHalfDayDeduction' },
        { name: 'highlightDuration', checkbox: 'updateHighlightDuration' },
      ].filter(field => form.getValues(field.checkbox));

      if (fieldsToUpdate.length === 0) {
        console.log('No fields selected for update'); // Debug log
        toast.error('Select at least one setting to update by checking the boxes above', {
          id: 'no-selection-error',
          duration: 5000,
          position: 'top-center',
        });
        return;
      }

      const isValid = await form.trigger();
      if (!isValid) {
        const errors = Object.entries(form.formState.errors).map(([field, error]) => ({
          field,
          message: error.message,
        }));
        console.log('Form validation errors:', errors); // Debug log
        const firstError = errors[0];
        if (firstError) {
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
        }
        return;
      }

      if (form.getValues('updatePaidLeavesPerYear') && form.getValues('applyLeaveChanges')) {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found in localStorage'); // Debug log
          throw new Error('No token found in localStorage');
        }

        const response = await fetch(employeeCountEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        console.log('Employee count response:', data); // Debug log

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch employee count');
        }

        setEmployeeCount(data.count || 0);
        setIsDialogOpen(true);
      } else {
        await submitFields(fieldsToUpdate);
      }
    } catch (error) {
      console.log('Update settings error:', error); // Debug log
      const userFriendlyErrorMessage =
        error.message === 'No token found in localStorage'
          ? 'Your session has expired. Please log in again.'
          : 'Could not update settings. Please check your connection and try again.';
      
      toast.error(userFriendlyErrorMessage, {
        id: 'submit-error',
        duration: 5000,
        position: 'top-center',
        action: {
          label: 'Try Again',
          onClick: () => handleUpdateClick(),
        },
      });
    }
  };

  const submitFields = (fieldsToUpdate) => {
    const data = form.getValues();
    const submissionData = {};

    fieldsToUpdate.forEach(field => {
      if (field.name === 'paidLeavesPerYear') {
        submissionData.paidLeavesPerYear = parseInt(data.paidLeavesPerYear, 10);
      } else if (field.name === 'halfDayDeduction') {
        submissionData.halfDayDeduction = parseFloat(data.halfDayDeduction);
      } else if (field.name === 'highlightDuration') {
        submissionData.highlightDuration = parseFloat(data.highlightDuration) * 60 * 60 * 1000;
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
        
        toast.success(`Settings updated: ${updatedFields.join(', ').toLowerCase()}`, {
          id: 'update-success',
          duration: 5000,
          position: 'top-center',
        });

        if (form.getValues('updatePaidLeavesPerYear') && data.applyLeaveChanges) {
          dispatch(updateEmployeeLeaves())
            .unwrap()
            .then((response) => {
              console.log('Update employee leaves response:', response); // Debug log
              setEmployeeCount(response.employeeCount || 0);
            })
            .catch((err) => {
              console.log('Update employee leaves error:', err); // Debug log
              const userFriendlyErrorMessage =
                err.message === 'Settings not found'
                  ? 'System settings not found. Please contact support.'
                  : 'Could not update employee leave balances. Please try again or contact support.';
              
              toast.error(userFriendlyErrorMessage, {
                id: 'leaves-error',
                duration: 5000,
                position: 'top-center',
                action: {
                  label: 'Try Again',
                  onClick: () => dispatch(updateEmployeeLeaves()),
                },
              });
            });
        }
      })
      .catch((err) => {
        console.log('Update settings error:', err); // Debug log
        const userFriendlyErrorMessage =
          err.message === 'Settings not found'
            ? 'System settings not found. Please contact support.'
            : 'Settings update failed. Please try again or contact support if the issue persists.';
        
        toast.error(userFriendlyErrorMessage, {
          id: 'update-error',
          duration: 5000,
          position: 'top-center',
          action: {
            label: 'Try Again',
            onClick: () => dispatch(updateSettings(submissionData)),
          },
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
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {error && (
        <Alert variant="destructive" className="mb-6 border-error text-error animate-fade-in max-w-2xl mx-auto">
          <AlertDescription className="flex justify-between items-center">
            <span>
              {error === 'Failed to fetch settings'
                ? 'Could not load system settings. Please check your connection and try again.'
                : error === 'Failed to update settings'
                ? 'Settings update failed. Please try again or contact support if the issue persists.'
                : error === 'Failed to update employee leaves'
                ? 'Could not update employee leave balances. Please try again or contact support.'
                : 'Something went wrong. Please refresh the page and try again.'}
            </span>
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
              <RefreshCw className="h-4 w-4 mr-2" /> Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
                          onCheckedChange={checkboxField.onChange}
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
                              onChange={(e) => field.onChange(e.target.value)}
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
                          onCheckedChange={checkboxField.onChange}
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
                              onChange={(e) => field.onChange(e.target.value)}
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
                          onCheckedChange={checkboxField.onChange}
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
                              onChange={(e) => field.onChange(e.target.value)}
                              aria-label="Highlight Duration"
                              disabled={loadingUpdate || !form.getValues('updateHighlightDuration')}
                            />
                          </FormControl>
                          <p className="text-sm text-body/60 mt-1">
                            Duration in hours for highlighting records (e.g., 24 hours for one day, 0.5 for 30 minutes). Must be between 1 minute and 7 days.
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
                  Select at least one setting to update by checking the boxes above.
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
    </div>
  );
};

export default SettingsForm;
