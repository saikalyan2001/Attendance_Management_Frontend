import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { transferEmployee, reset as resetEmployees } from '../redux/employeeSlice';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const transferEmployeeSchema = z.object({
  location: z.string().min(1, 'Please select a location'),
});

const TransferEmployeeDialog = ({
  open,
  onOpenChange,
  employeeId,
  setSuccessMessage,
  setShowSuccessAlert,
}) => {
  const dispatch = useDispatch();
  const { locations } = useSelector((state) => state.adminLocations);
  const { loading: employeesLoading } = useSelector((state) => state.adminEmployees);

  const form = useForm({
    resolver: zodResolver(transferEmployeeSchema),
    defaultValues: {
      location: '',
    },
  });

  const handleSubmit = (data) => {
    dispatch(
      transferEmployee({
        id: employeeId,
        locationId: data.location,
        transferTimestamp: new Date().toISOString(),
      })
    )
      .unwrap()
      .then(() => {
        const newLocation = locations.find((loc) => loc._id === data.location);
        setSuccessMessage(
          `Employee transferred to ${newLocation?.name || newLocation?.city || 'new location'} successfully`
        );
        setShowSuccessAlert(true);
        onOpenChange(false);
        form.reset();
      })
      .catch((error) => {
        toast.error(error || 'Failed to transfer employee', { duration: 5000 });
      });
  };

  return (
    <DialogContent className="bg-complementary text-body max-w-[90vw] sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Transfer Employee</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">New Location</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg">
                      <SelectValue placeholder="Select new location" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-complementary text-body">
                    {locations.map((loc) => (
                      <SelectItem key={loc._id} value={loc._id} className="text-[10px] sm:text-sm xl:text-base">
                        {loc.name || loc.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              aria-label="Cancel transfer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
              disabled={employeesLoading}
              aria-label="Confirm transfer"
            >
              {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Transfer'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
};

export default TransferEmployeeDialog;