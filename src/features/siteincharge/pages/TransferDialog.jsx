import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { transferEmployee } from "../redux/employeeSlice";
import { toast } from "react-hot-toast";
import { useState, useEffect } from "react";

const transferEmployeeSchema = z.object({
  location: z.string().min(1, "Please select a location"),
  transferTimestamp: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date",
  }),
});

const TransferDialog = ({ open, onOpenChange, employeeId, allLocations }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading, employees } = useSelector((state) => state.siteInchargeEmployee);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationTriggered, setValidationTriggered] = useState(false);
  const currentEmployee = employees.find((emp) => emp._id === employeeId);

  const form = useForm({
    resolver: zodResolver(transferEmployeeSchema),
    defaultValues: {
      location: "",
      transferTimestamp: new Date().toISOString().split("T")[0], // Default to today’s date
    },
  });

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      await dispatch(
        transferEmployee({
          id: employeeId,
          location: data.location,
          transferTimestamp: new Date(data.transferTimestamp).toISOString(),
        })
      ).unwrap();
      const newLocation = allLocations?.find((loc) => loc._id === data.location);
      toast.success(
        `Employee transferred to ${newLocation?.name || newLocation?.city || "new location"} successfully`,
        {
          id: 'transfer-employee-success',
          duration: 10000,
          position: 'top-center',
        }
      );
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(error.message || "Failed to transfer employee", {
        id: 'transfer-employee-error',
        duration: 5000,
        position: 'top-center',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (validationTriggered && !isSubmitting) {
      const errors = [];
      const fieldOrder = ['location', 'transferTimestamp'];
      for (const field of fieldOrder) {
        const message = form.formState.errors[field]?.message;
        if (message) {
          errors.push({ field, message });
        }
      }
      if (errors.length > 0) {
        const firstError = errors[0];
        toast.error(firstError.message, {
          id: `transfer-employee-validation-error-${firstError.field}`,
          duration: 5000,
          position: 'top-center',
        });
        const fieldElement = document.querySelector(`[name="${firstError.field}"]`) || document.querySelector('.select-trigger');
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fieldElement.focus();
        }
      } else if (form.formState.isValid) {
        form.handleSubmit(handleSubmit)();
      }
      setValidationTriggered(false);
    }
  }, [validationTriggered, form.formState.errors, form.formState.isValid, form, handleSubmit, isSubmitting]);

  const handleTransferClick = async () => {
    try {
      await form.trigger();
      setValidationTriggered(true);
    } catch (error) {
      console.error('handleTransferClick error:', error);
      toast.error("Error submitting form, please try again", {
        id: 'transfer-employee-form-error',
        duration: 5000,
        position: 'top-center',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-complementary text-body max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
            Transfer Employee
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                    New Location <span className="text-error">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.trigger('location');
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent rounded-md text-[10px] sm:text-sm xl:text-lg select-trigger"
                        aria-label="New location"
                        disabled={employeesLoading || isSubmitting}
                      >
                        <SelectValue placeholder="Select new location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-complementary text-body">
                      {Array.isArray(allLocations) && allLocations.length > 0 ? (
                        allLocations.map((loc) => (
                          <SelectItem
                            key={loc._id}
                            value={loc._id}
                            className="text-[10px] sm:text-sm xl:text-base"
                            disabled={currentEmployee?.location?._id === loc._id}
                          >
                            {loc.name || loc.city}
                            {currentEmployee?.location?._id === loc._id && ' (Current)'}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="text-[10px] sm:text-sm xl:text-base text-center p-2">
                          No locations available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transferTimestamp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                    Transfer Date <span className="text-error">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent rounded-md text-[10px] sm:text-sm xl:text-lg"
                      disabled={employeesLoading || isSubmitting}
                      {...field}
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
                className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading || isSubmitting}
                aria-label="Cancel transfer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleTransferClick}
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading || isSubmitting}
                aria-label="Confirm transfer"
              >
                {employeesLoading || isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferDialog;