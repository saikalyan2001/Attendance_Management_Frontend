import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateEmployeeAdvance, reset as resetEmployees } from '../redux/employeeSlice';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { parseServerError } from '@/utils/errorUtils';

const updateAdvanceSchema = z.object({
  advance: z
    .string()
    .min(1, 'Advance is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Advance must be a non-negative number'),
  month: z
    .string()
    .min(1, 'Month is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1 && Number(val) <= 12, 'Invalid month'),
  year: z
    .string()
    .min(1, 'Year is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 2000, 'Invalid year'),
});

const UpdateAdvanceDialog = ({ open, onOpenChange, employee, setSuccessMessage }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.adminEmployees);
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-based
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2025, i), 'MMMM'),
  }));
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  const form = useForm({
    resolver: zodResolver(updateAdvanceSchema),
    defaultValues: {
      advance: employee?.advances?.[0]?.amount ? employee.advances[0].amount.toString() : '0',
      month: currentMonth.toString(),
      year: currentYear.toString(),
    },
  });

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const isValid = await form.trigger();
      if (!isValid) {
        return;
      }

      const advance = Number(data.advance);
      const year = Number(data.year);
      const month = Number(data.month);
      await dispatch(updateEmployeeAdvance({ id: employee._id, advance, year, month })).unwrap();
      setSuccessMessage('Employee advance updated successfully');
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

        const fieldOrder = ['advance', 'month', 'year'];
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
    <DialogContent className="bg-complementary text-body max-h-[80vh] overflow-y-auto max-w-[90vw] sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
          Update Advance: {employee?.name}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form className="space-y-4 p-4" ref={formRef}>
          <FormField
            control={form.control}
            name="advance"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Advance (₹) *</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    {...field}
                    className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                    aria-label="Advance"
                    placeholder="Enter advance amount"
                    disabled={employeesLoading || isSubmitting}
                  />
                </FormControl>
                <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                  {serverError?.fields?.advance || form.formState.errors.advance?.message}
                </FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="month"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Month *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={employeesLoading || isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-complementary text-body">
                    {months.map((m) => (
                      <SelectItem
                        key={m.value}
                        value={m.value}
                        className="text-[10px] sm:text-sm xl:text-lg"
                      >
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                  {serverError?.fields?.month || form.formState.errors.month?.message}
                </FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Year *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={employeesLoading || isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-complementary text-body">
                    {years.map((y) => (
                      <SelectItem key={y} value={y} className="text-[10px] sm:text-sm xl:text-lg">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                  {serverError?.fields?.year || form.formState.errors.year?.message}
                </FormMessage>
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
              disabled={employeesLoading || isSubmitting}
              aria-label="Cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveClick}
              className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
              disabled={employeesLoading || isSubmitting}
              aria-label="Save advance"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Advance'}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
};

export default UpdateAdvanceDialog;