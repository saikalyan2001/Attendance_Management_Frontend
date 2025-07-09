import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { rejoinEmployee } from "../redux/employeeSlice";
import { toast } from "react-hot-toast";
import { parseServerError } from "@/utils/errorUtils";

const rejoinSchema = z.object({
  rejoinDate: z
    .string()
    .min(1, "Please select a rejoin date")
    .refine((val) => !isNaN(Date.parse(val)), "Invalid rejoin date")
    .refine((val) => new Date(val) > new Date(), "Rejoin date must be in the future"),
});

const RejoinDialog = ({ open, onOpenChange, employee }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.siteInchargeEmployee);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationTriggered, setValidationTriggered] = useState(false);
  const [serverError, setServerError] = useState(null);

  const form = useForm({
    resolver: zodResolver(rejoinSchema),
    defaultValues: { rejoinDate: "" },
  });

  useEffect(() => {
    if (validationTriggered && !isSubmitting) {
      const errors = [];
      if (form.formState.errors.rejoinDate?.message) {
        errors.push({ field: "rejoinDate", message: form.formState.errors.rejoinDate.message });
      }

      if (errors.length > 0) {
        const firstError = errors[0];
        toast.error(firstError.message, {
          id: `rejoin-employee-validation-error-${firstError.field}`,
          duration: 5000,
          position: "top-center",
        });
        const fieldElement = document.querySelector(`[name="${firstError.field}"]`);
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: "smooth", block: "center" });
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
      await dispatch(
        rejoinEmployee({
          id: employee._id,
          rejoinDate: new Date(data.rejoinDate).toISOString(),
        })
      ).unwrap();
      toast.success("Employee rejoined successfully", {
        id: "rejoin-employee-success",
        duration: 10000,
        position: "top-center",
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      const parsedError = parseServerError(error);
      setServerError(parsedError);
      toast.error(parsedError.message, {
        id: "rejoin-employee-error",
        duration: 5000,
        position: "top-center",
      });
      Object.entries(parsedError.fields).forEach(([field, message], index) => {
        setTimeout(() => {
          toast.error(message, {
            id: `server-error-${field}-${index}`,
            position: "top-center",
            duration: 5000,
          });
        }, (index + 1) * 500);
      });
      const firstErrorFieldName = Object.keys(parsedError.fields)[0];
      if (firstErrorFieldName) {
        const fieldElement = document.querySelector(`[name="${firstErrorFieldName}"]`);
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: "smooth", block: "center" });
          fieldElement.focus();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejoinClick = async () => {
    try {
      await form.trigger();
      setValidationTriggered(true);
    } catch (error) {
      ("handleRejoinClick error:", error);
      toast.error("Error submitting form, please try again", {
        id: "rejoin-employee-form-error",
        duration: 5000,
        position: "top-center",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-complementary text-body max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
            Rejoin Employee: {employee?.name}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="rejoinDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                    Rejoin Date <span className="text-error">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        form.trigger("rejoinDate");
                      }}
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent rounded-md text-[10px] sm:text-sm xl:text-lg"
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
                className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading || isSubmitting}
                aria-label="Cancel rejoin"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleRejoinClick}
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading || isSubmitting}
                aria-label="Confirm rejoin"
              >
                {employeesLoading || isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Rejoin"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RejoinDialog;