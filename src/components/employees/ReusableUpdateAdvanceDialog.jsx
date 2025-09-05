import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import ReusableDialog from './ReusableDialog';
import useFormHandler from './useFormHandler';
import { updateAdvanceSchema } from './employeeSchemas';

const ReusableUpdateAdvanceDialog = ({
  open,
  onOpenChange,
  employee,
  role,
  reduxSelectors,
  actions,
  setSuccessMessage,
}) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector(reduxSelectors.employees) || {};

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-based
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString(),
        label: format(new Date(2025, i), 'MMMM'),
      })),
    []
  );
  const years = useMemo(
    () => {
      const baseYears = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());
      return role === 'siteincharge' ? ['2024', '2025', '2026'] : baseYears;
    },
    [role]
  );

  const form = useForm({
    resolver: zodResolver(updateAdvanceSchema),
    defaultValues: {
      advance: employee?.advances?.[0]?.amount ? employee.advances[0].amount.toString() : '0',
      month: currentMonth.toString(),
      year: currentYear.toString(),
    },
  });

  const { handleSubmitClick, isSubmitting, serverError } = useFormHandler(
    form,
    async (data) => {
      const payload = {
        id: employee._id,
        advance: Number(data.advance),
        month: Number(data.month),
        year: Number(data.year),
      };
      return dispatch(actions.updateEmployeeAdvance(payload));
    },
    () => {
      if (actions.fetchEmployeeAdvances) {
        dispatch(
          actions.fetchEmployeeAdvances({
            id: employee._id,
            page: 1,
            limit: 5,
            sortField: 'year',
            sortOrder: 'desc',
          })
        );
      }
      setSuccessMessage('Employee advance updated successfully');
      onOpenChange(false);
    },
    null,
    actions.reset ? () => dispatch(actions.reset()) : null
  );

  useEffect(() => {
    if (!open) {
      form.reset({
        advance: employee?.advances?.[0]?.amount ? employee.advances[0].amount.toString() : '0',
        month: currentMonth.toString(),
        year: currentYear.toString(),
      });
    }
  }, [open, form, employee, currentMonth, currentYear]);

  useEffect(() => {
    if (employee?.advances && Array.isArray(employee.advances) && role === 'siteincharge') {
      const advanceEntry = employee.advances.find(
        (adv) => adv.year === Number(form.getValues('year')) && adv.month === Number(form.getValues('month'))
      );
      form.setValue('advance', advanceEntry ? advanceEntry.amount.toString() : '0');
    }
  }, [employee, form, role]);

  return (
    <ReusableDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Update Advance: ${employee?.name}`}
      onSubmit={handleSubmitClick}
      submitLabel="Save Advance"
      isSubmitting={isSubmitting}
      isLoading={employeesLoading}
      submitDisabled={employeesLoading || isSubmitting}
    >
      <Form {...form}>
        <form className="space-y-4 p-4">
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
                    onChange={(e) => {
                      field.onChange(e);
                      if (role === 'siteincharge') form.trigger('advance');
                    }}
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
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (role === 'siteincharge') form.trigger('month');
                  }}
                  value={field.value}
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
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (role === 'siteincharge') form.trigger('year');
                  }}
                  value={field.value}
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
        </form>
      </Form>
    </ReusableDialog>
  );
};

export default ReusableUpdateAdvanceDialog;