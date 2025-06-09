import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { rejoinEmployee, reset as resetEmployees } from '../redux/employeeSlice';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const rejoinSchema = z.object({
  rejoinDate: z.string().min(1, 'Please select a rejoin date'),
});

const RejoinEmployeeDialog = ({
  open,
  onOpenChange,
  employee,
  setSuccessMessage,
  setShowSuccessAlert,
}) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.adminEmployees);

  const form = useForm({
    resolver: zodResolver(rejoinSchema),
    defaultValues: {
      rejoinDate: '',
    },
  });

  const handleSubmit = (data) => {
    dispatch(
      rejoinEmployee({ id: employee._id, rejoinDate: new Date(data.rejoinDate).toISOString() })
    )
      .unwrap()
      .then(() => {
        setSuccessMessage('Employee rejoined successfully');
        setShowSuccessAlert(true);
        onOpenChange(false);
        form.reset();
      })
      .catch((error) => {
        const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to rejoin employee';
        toast.error(errorMessage, { duration: 5000 });
      });
  };

  return (
    <DialogContent className="bg-complementary text-body max-w-[90vw] sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
          Rejoin Employee: {employee?.name}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="rejoinDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Rejoin Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                    aria-label="Rejoin Date"
                  />
                </FormControl>
                <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base" />
              </FormItem>
            )}
          />
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
              disabled={employeesLoading}
              aria-label="Cancel rejoin"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
              disabled={employeesLoading}
              aria-label="Confirm rejoin"
            >
              {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Rejoin'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
};

export default RejoinEmployeeDialog;