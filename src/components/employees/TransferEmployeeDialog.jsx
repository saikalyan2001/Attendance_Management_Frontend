import React, { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import ReusableDialog from './ReusableDialog';
import useFormHandler from './useFormHandler';
import { transferEmployeeSchema } from './employeeSchemas';

const TransferEmployeeDialog = ({
  open,
  onOpenChange,
  employeeId,
  role,
  reduxSelectors,
  actions,
  allLocations = [],
  setSuccessMessage,
}) => {
  const dispatch = useDispatch();
  const formRef = useRef(null);
  const locations = useSelector(reduxSelectors.locations)?.locations || allLocations;
  const employeesState = useSelector(reduxSelectors.employees);
  const { currentEmployee, loading: employeesLoading, error } = employeesState || {};

  const form = useForm({
    resolver: zodResolver(transferEmployeeSchema),
    defaultValues: {
      location: '',
      transferTimestamp: new Date().toISOString().split('T')[0],
    },
  });

  const { handleSubmitClick, isSubmitting, serverError } = useFormHandler(
    form,
    async (data) => {
      const payload = {
        id: String(employeeId),
       ...(role === 'siteincharge' 
    ? { location: data.location } 
    : { locationId: data.location }
  ),
        transferTimestamp: new Date(data.transferTimestamp).toISOString(),
      };
      return dispatch(actions.transferEmployee(payload));
    },
    () => {
      const newLocation = locations.find((loc) => loc._id === form.getValues('location'));
      const successMessage = `Employee transferred to ${newLocation?.name || newLocation?.city || 'new location'} successfully`;
      setSuccessMessage(successMessage);
      onOpenChange(false);
    },
    null,
    () => dispatch(actions.reset())
  );

  const fetchEmployee = useCallback(() => {
    if (open && employeeId && role !== 'siteincharge') {
      const id = String(employeeId);
      if (/^[0-9a-fA-F]{24}$/.test(id)) {
        dispatch(actions.fetchEmployeeById(id));
      } else {
        toast.error(`Cannot fetch employee: Invalid ID format (${id})`, {
          id: 'invalid-employee-id',
          position: 'top-center',
          duration: 5000,
        });
        onOpenChange(false);
      }
    }
  }, [open, employeeId, role, dispatch, actions.fetchEmployeeById, onOpenChange]);

  useEffect(() => {
    fetchEmployee();
    return () => {
      if (role !== 'siteincharge') {
        dispatch(actions.reset());
      }
    };
  }, [fetchEmployee, role, dispatch, actions.reset]);

  useEffect(() => {
    if (error && open) {
      const errorMessage = error.message || 'Failed to load employee data';
      toast.error(errorMessage, { id: 'fetch-error', position: 'top-center', duration: 5000 });
      onOpenChange(false);
    }
  }, [error, open, onOpenChange]);

  const employee = role === 'siteincharge'
    ? employeesState?.employees?.find((emp) => emp._id === employeeId)
    : currentEmployee;

  return (
    <ReusableDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Transfer Employee"
      onSubmit={handleSubmitClick}
      submitLabel="Transfer"
      isSubmitting={isSubmitting}
      isLoading={employeesLoading}
      maxWidth="sm:max-w-md"
    >
      {employee ? (
        <Form {...form}>
          <form className="space-y-4" ref={formRef}>
            <div className="text-sm">
              <p>
                <strong>Employee:</strong> {employee.name} ({employee.employeeId})
              </p>
              <p>
                <strong>Current Location:</strong>{' '}
                {employee.location?.name || employee.location?.city || 'N/A'}
              </p>
            </div>
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                    New Location *
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={employeesLoading || isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg"
                      >
                        <SelectValue placeholder="Select new location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-complementary text-body">
                      {locations.length > 0 ? (
                        locations.map((loc) => (
                          <SelectItem
                            key={loc._id}
                            value={String(loc._id)}
                            disabled={employee?.location?._id === loc._id}
                            className="text-[10px] sm:text-sm xl:text-base"
                          >
                            {loc.name || loc.city}
                            {employee?.location?._id === loc._id && ' (Current)'}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="text-[10px] sm:text-sm xl:text-base text-center p-2">
                          No locations available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.location || form.formState.errors.location?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transferTimestamp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                    Transfer Date *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      aria-label="Transfer Date"
                      disabled={employeesLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.transferTimestamp ||
                      form.formState.errors.transferTimestamp?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
          </form>
        </Form>
      ) : (
        <div className="text-center text-error py-4">
          Failed to load employee data. Please try again.
        </div>
      )}
    </ReusableDialog>
  );
};

export default TransferEmployeeDialog;
