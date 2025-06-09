import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateEmployeeAdvance, reset as resetEmployees } from '../redux/employeeSlice';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const updateAdvanceSchema = z.object({
  advance: z
    .string()
    .min(1, 'Advance is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Advance must be a non-negative number',
    }),
});

const UpdateAdvanceDialog = ({
  open,
  onOpenChange,
  employee,
  setSuccessMessage,
  setShowSuccessAlert,
}) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.adminEmployees);

  const form = useForm({
    resolver: zodResolver(updateAdvanceSchema),
    defaultValues: {
      advance: employee?.advance ? employee.advance.toString() : '0',
    },
  });

  const handleSubmit = (data) => {
    const advance = Number(data.advance);
    dispatch(updateEmployeeAdvance({ id: employee._id, advance })).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        onOpenChange(false);
        setSuccessMessage('Employee advance updated successfully');
        setShowSuccessAlert(true);
        toast.success('Employee advance updated successfully', { duration: 5000 });
        setTimeout(() => {
          setShowSuccessAlert(false);
          setSuccessMessage(null);
          dispatch(resetEmployees());
        }, 5000);
      } else {
        toast.error(result.payload || 'Failed to update employee advance', { duration: 5000 });
      }
    });
  };

  return (
    <DialogContent className="bg-complementary text-body max-h-[80vh] overflow-y-auto max-w-[90vw] sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
          Update Advance: {employee?.name}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4">
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
                    className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                    aria-label="Advance"
                    placeholder="Enter advance amount"
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
              className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
              disabled={employeesLoading}
              aria-label="Cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
              disabled={employeesLoading}
              aria-label="Save advance"
            >
              {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Advance'}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
};

export default UpdateAdvanceDialog;
