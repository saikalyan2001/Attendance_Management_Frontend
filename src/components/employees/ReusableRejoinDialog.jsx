import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReusableDialog from './ReusableDialog';
import useFormHandler from './useFormHandler';
import { parseServerError } from '@/utils/errorUtils';

const rejoinSchema = z.object({
  rejoinDate: z
    .string()
    .min(1, 'Please select a rejoin date')
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid rejoin date')
    .refine((val) => new Date(val) > new Date(), 'Rejoin date must be in the future'),
});

const ReusableRejoinDialog = ({
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
  const [validationTriggered, setValidationTriggered] = useState(false);

  const form = useForm({
    resolver: zodResolver(rejoinSchema),
    defaultValues: {
      rejoinDate: '',
    },
  });

  const { handleSubmitClick, isSubmitting, serverError } = useFormHandler(
    form,
    async (data) => {
      const payload = {
        id: employee._id,
        rejoinDate: new Date(data.rejoinDate).toISOString(),
      };
      return dispatch(actions.rejoinEmployee(payload));
    },
    () => {
      // Defer setSuccessMessage to avoid rendering issues
      setTimeout(() => {
        if (role === 'siteincharge') {
          toast.success('Employee rejoined successfully', {
            id: 'rejoin-employee-success',
            duration: 10000,
            position: 'top-center',
          });
        } else {
          setSuccessMessage('Employee rejoined successfully');
        }
      }, 0);
      onOpenChange(false);
      if (actions.reset) {
        dispatch(actions.reset());
      }
    },
    null, // Let useFormHandler handle error toasts
    actions.reset
  );

  useEffect(() => {
    if (!open) {
      form.reset({ rejoinDate: '' });
      setValidationTriggered(false);
    }
  }, [open, form]);

  useEffect(() => {
    if (validationTriggered && !isSubmitting && role === 'siteincharge') {
      const errors = [];
      if (form.formState.errors.rejoinDate?.message) {
        errors.push({ field: 'rejoinDate', message: form.formState.errors.rejoinDate.message });
      }
      if (errors.length > 0) {
        const firstError = errors[0];
        toast.error(firstError.message, {
          id: `rejoin-employee-validation-error-${firstError.field}`,
          duration: 5000,
          position: 'top-center',
        });
        const fieldElement = document.querySelector(`[name="${firstError.field}"]`);
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fieldElement.focus();
        }
      } else if (form.formState.isValid) {
        form.handleSubmit(handleSubmitClick)();
      }
      setValidationTriggered(false);
    }
  }, [validationTriggered, form, isSubmitting, role]);

  const handleRejoinClick = async () => {
    await form.trigger();
    if (role === 'siteincharge') {
      setValidationTriggered(true);
    } else {
      handleSubmitClick();
    }
  };

  return (
    <ReusableDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Rejoin Employee: ${employee?.name}`}
      onSubmit={handleRejoinClick}
      submitLabel="Rejoin"
      isSubmitting={isSubmitting}
      isLoading={employeesLoading}
      submitDisabled={employeesLoading || isSubmitting}
      maxWidth="sm:max-w-md"
    >
      <Form {...form}>
        <form className="space-y-4 p-4">
          <FormField
            control={form.control}
            name="rejoinDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                  Rejoin Date <span className={role === 'siteincharge' ? 'text-error' : ''}>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      if (role === 'siteincharge') form.trigger('rejoinDate');
                    }}
                    className={`h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 ${
                      role !== 'siteincharge' ? 'focus:ring-2 focus:ring-accent/20 hover:shadow-md' : ''
                    }`}
                    aria-label="Rejoin Date"
                    disabled={employeesLoading || isSubmitting}
                  />
                </FormControl>
                <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                  {serverError?.fields?.rejoinDate || form.formState.errors.rejoinDate?.message || ''}
                </FormMessage>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </ReusableDialog>
  );
};

export default ReusableRejoinDialog;