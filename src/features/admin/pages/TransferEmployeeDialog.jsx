import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmployeeById, transferEmployee, reset as resetEmployees } from '../redux/employeeSlice';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { parseServerError } from '@/utils/errorUtils';
import { Input } from '@/components/ui/input';

const transferEmployeeSchema = z.object({
  location: z.string().min(1, 'Please select a location').refine((val) => /^[0-9a-fA-F]{24}$/.test(val), 'Invalid location ID'),
  transferTimestamp: z.string().min(1, 'Transfer date is required').refine((val) => !isNaN(Date.parse(val)), 'Invalid transfer date'),
});

const TransferEmployeeDialog = ({ open, onOpenChange, employeeId }) => {
  const dispatch = useDispatch();
  const { locations } = useSelector((state) => state.adminLocations);
  const { currentEmployee, loading: employeesLoading } = useSelector((state) => state.adminEmployees);
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(transferEmployeeSchema),
    defaultValues: {
      location: '',
      transferTimestamp: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (open && employeeId) {
      dispatch(fetchEmployeeById(employeeId));
    }
    return () => {
      dispatch(resetEmployees());
    };
  }, [open, employeeId, dispatch]);

  const handleSubmit = async (data) => {
        try {
      setIsSubmitting(true);
      const isValid = await form.trigger();
            
      if (!isValid) {
                return;
      }

      await dispatch(
        transferEmployee({
          id: employeeId,
          locationId: data.location,
          transferTimestamp: new Date(data.transferTimestamp).toISOString(),
        })
      ).unwrap();
      const newLocation = locations.find((loc) => loc._id === data.location);
      toast.success(`Employee transferred to ${newLocation?.name || newLocation?.city || 'new location'} successfully`, {
        position: 'top-center',
        duration: 5000,
      });
      onOpenChange(false);
      form.reset();
      dispatch(resetEmployees());
    } catch (error) {
      ('Submit error:', error);
      const parsedError = parseServerError(error);
      setServerError(parsedError);
      toast.error(parsedError.message, { id: 'form-submit-error', position: 'top-center', duration: 5000 });
      Object.entries(parsedError.fields).forEach(([field, message], index) => {
        setTimeout(() => {
          toast.error(message, { id: `server-error-${field}-${index}`, position: 'top-center', duration: 5000 });
        }, (index + 1) * 500);
      });
      const firstErrorFieldName = Object.keys(parsedError.fields)[0];
      if (firstErrorFieldName) {
        const fieldElement = document.querySelector(`[name="${firstErrorFieldName}"]`);
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fieldElement.focus();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferClick = async () => {
        try {
      // Manually trigger validation
      const isValid = await form.trigger();
            
      // Check for errors directly
      if (!isValid) {
        const errors = [];
        const addError = (field, message) => {
          if (message && !errors.some((e) => e.field === field)) {
            errors.push({ field, message });
          }
        };

        // Define field order for sequential error display
        const fieldOrder = ['location', 'transferTimestamp'];

        // Collect errors in the specified order
        for (const field of fieldOrder) {
          addError(field, form.formState.errors[field]?.message);
        }

        
        if (errors.length > 0) {
          // Show only the first error with a unique toast ID
          const firstError = errors[0];
          toast.error(firstError.message, {
            id: `validation-error-${firstError.field}`,
            position: 'top-center',
            duration: 5000,
          });
          const firstErrorField = document.querySelector(`[name="${firstError.field}"]`) || formRef.current;
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
          }
          return;
        }
      }

      // Proceed with form submission if no errors
      await form.handleSubmit(handleSubmit)();
    } catch (error) {
      ('handleTransferClick error:', error);
      toast.error('Error submitting form, please try again', {
        id: 'form-submit-error',
        position: 'top-center',
        duration: 5000,
      });
    }
  };

  return (
    <DialogContent className="bg-complementary text-body max-w-[90vw] sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Transfer Employee</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form className="space-y-4" ref={formRef}>
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">New Location *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={employeesLoading || isSubmitting}>
                  <FormControl>
                    <SelectTrigger className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg">
                      <SelectValue placeholder="Select new location" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-complementary text-body">
                    {locations.map((loc) => (
                      <SelectItem
                        key={loc._id}
                        value={loc._id}
                        disabled={currentEmployee?.location?._id === loc._id}
                        className="text-[10px] sm:text-sm xl:text-base"
                      >
                        {loc.name || loc.city}
                        {currentEmployee?.location?._id === loc._id && ' (Current)'}
                      </SelectItem>
                    ))}
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
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Transfer Date *</FormLabel>
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
                  {serverError?.fields?.transferTimestamp || form.formState.errors.transferTimestamp?.message}
                </FormMessage>
              </FormItem>
            )}
          />
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
              disabled={employeesLoading || isSubmitting}
              aria-label="Cancel transfer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleTransferClick}
              className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
              disabled={employeesLoading || isSubmitting}
              aria-label="Confirm transfer"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Transfer'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
};

export default TransferEmployeeDialog;