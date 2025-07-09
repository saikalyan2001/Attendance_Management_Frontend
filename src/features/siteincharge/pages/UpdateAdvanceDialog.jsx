import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateEmployeeAdvance, reset } from '../redux/employeeSlice';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const updateAdvanceSchema = z.object({
  advance: z
    .string()
    .min(1, 'Advance is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Advance must be a non-negative number',
    }),
  month: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1 && Number(val) <= 12, {
      message: 'Valid month (1-12) is required',
    }),
  year: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 2000 && Number(val) <= new Date().getFullYear() + 1, {
      message: 'Valid year is required',
    }),
});

const UpdateAdvanceDialog = ({ open, onOpenChange, employee }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.siteInchargeEmployee);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationTriggered, setValidationTriggered] = useState(false);

  const form = useForm({
    resolver: zodResolver(updateAdvanceSchema),
    defaultValues: {
      advance: '0',
      month: employee?.currentMonth?.toString() || (new Date().getMonth() + 1).toString(),
      year: employee?.currentYear?.toString() || new Date().getFullYear().toString(),
    },
  });

  useEffect(() => {
    if (employee?.advances && Array.isArray(employee.advances)) {
      const advanceEntry = employee.advances.find(
        (adv) => adv.year === Number(form.getValues('year')) && adv.month === Number(form.getValues('month'))
      );
      form.setValue('advance', advanceEntry ? advanceEntry.amount.toString() : '0');
    }
  }, [employee, form]);

  useEffect(() => {
    if (validationTriggered && !isSubmitting) {
            const errors = [];
      if (form.formState.errors.advance?.message) {
        errors.push({ field: 'advance', message: form.formState.errors.advance.message });
      }
      if (form.formState.errors.month?.message) {
        errors.push({ field: 'month', message: form.formState.errors.month.message });
      }
      if (form.formState.errors.year?.message) {
        errors.push({ field: 'year', message: form.formState.errors.year.message });
      }

      
      if (errors.length > 0) {
        const firstError = errors[0];
        toast.error(firstError.message, {
          id: `update-advance-validation-error-${firstError.field}`,
          duration: 5000,
          position: 'top-center',
        });
        const fieldElement = document.querySelector(`[name="${firstError.field}"]`) || document.querySelector(`.select-trigger[name="${firstError.field}"]`);
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fieldElement.focus();
        }
      } else if (form.formState.isValid) {
        form.handleSubmit(handleSubmit)();
      }

      setValidationTriggered(false);
    }
  }, [validationTriggered, form.formState.errors, form.formState.isValid, form, isSubmitting]);

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const payload = {
        id: employee._id,
        advance: Number(data.advance),
        month: Number(data.month),
        year: Number(data.year),
      };
      await dispatch(updateEmployeeAdvance(payload)).unwrap();
      toast.success('Employee advance updated successfully', {
        id: 'update-advance-success',
        duration: 10000,
        position: 'top-center',
      });
      onOpenChange(false);
      form.reset();
      setTimeout(() => {
        dispatch(reset());
      }, 5000);
    } catch (error) {
      toast.error(error.message || 'Failed to update employee advance', {
        id: 'update-advance-error',
        duration: 5000,
        position: 'top-center',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveClick = async () => {
    try {
            await form.trigger();
      setValidationTriggered(true);
    } catch (error) {
      ('handleSaveClick error:', error);
      toast.error('Error submitting form, please try again', {
        id: 'update-advance-form-error',
        duration: 5000,
        position: 'top-center',
      });
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2025, i), 'MMMM'),
  }));
  const years = [2024, 2025, 2026].map(y => y.toString());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-complementary text-body max-h-[80vh] overflow-y-auto max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
            Update Advance: {employee?.name}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4 p-4">
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Month</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.trigger('month');
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary select-trigger"
                        aria-label="Select month"
                        disabled={employeesLoading || isSubmitting}
                      >
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-complementary text-body">
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value} className="text-[10px] sm:text-sm xl:text-base">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Year</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.trigger('year');
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary select-trigger"
                        aria-label="Select year"
                        disabled={employeesLoading || isSubmitting}
                      >
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-complementary text-body">
                      {years.map((y) => (
                        <SelectItem key={y} value={y} className="text-[10px] sm:text-sm xl:text-base">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="advance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Advance (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        form.trigger('advance');
                      }}
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      placeholder="Enter advance amount"
                      disabled={employeesLoading || isSubmitting}
                      aria-label="Advance amount"
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base" />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading || isSubmitting}
                aria-label="Cancel update advance"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveClick}
                className="bg-accent text-bg-accent hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading || isSubmitting}
                aria-label="Save advance"
              >
                {employeesLoading || isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateAdvanceDialog;