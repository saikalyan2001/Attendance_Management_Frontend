import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { rejoinEmployee, reset as resetEmployees } from '../redux/employeeSlice';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { parseServerError } from '@/utils/errorUtils';

const rejoinSchema = z.object({
  rejoinDate: z
    .string()
    .min(1, 'Please select a rejoin date')
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid rejoin date')
    .refine((val) => new Date(val) > new Date(), 'Rejoin date must be in the future'),
});

const RejoinEmployeeDialog = ({ open, onOpenChange, employee, setSuccessMessage }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.adminEmployees);
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(rejoinSchema),
    defaultValues: {
      rejoinDate: '',
    },
  });

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const isValid = await form.trigger();
      if (!isValid) {
        return;
      }

      await dispatch(
        rejoinEmployee({ id: employee._id, rejoinDate: new Date(data.rejoinDate).toISOString() })
      ).unwrap();
      setSuccessMessage('Employee rejoined successfully');
      onOpenChange(false);
      form.reset();
      dispatch(resetEmployees());
    } catch (error) {
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

  const handleSaveClick = async () => {
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        const errors = [];
        const addError = (field, message) => {
          if (message && !errors.some((e) => e.field === field)) {
            errors.push({ field, message });
          }
        };

        const fieldOrder = ['rejoinDate'];
        for (const field of fieldOrder) {
          addError(field, form.formState.errors[field]?.message);
        }

        if (errors.length > 0) {
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

      await form.handleSubmit(handleSubmit)();
    } catch (error) {
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
        <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
          Rejoin Employee: {employee?.name}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form className="space-y-4" ref={formRef}>
          <FormField
            control={form.control}
            name="rejoinDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Rejoin Date *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-md"
                    aria-label="Rejoin Date"
                    disabled={employeesLoading || isSubmitting}
                  />
                </FormControl>
                <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                  {serverError?.fields?.rejoinDate || form.formState.errors.rejoinDate?.message}
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
              aria-label="Cancel rejoin"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveClick}
              className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
              disabled={employeesLoading || isSubmitting}
              aria-label="Confirm rejoin"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Rejoin'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
};

export default RejoinEmployeeDialog;
