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
import { toast } from "sonner";

const rejoinSchema = z.object({
  rejoinDate: z.string().min(1, "Please select a rejoin date"),
});

const RejoinDialog = ({ open, onOpenChange, employee }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.siteInchargeEmployee);
  const form = useForm({
    resolver: zodResolver(rejoinSchema),
    defaultValues: { rejoinDate: "" },
  });

  const handleSubmit = (data) => {
    dispatch(
      rejoinEmployee({
        id: employee._id,
        rejoinDate: new Date(data.rejoinDate).toISOString(),
      })
    )
      .unwrap()
      .then(() => {
        toast.success("Employee rejoined successfully", { duration: 5000 });
        onOpenChange(false);
        form.reset();
      })
      .catch((error) => {
        toast.error(error || "Failed to rejoin employee", { duration: 5000 });
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-complementary text-body max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
            Rejoin

 Employee: {employee?.name}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="rejoinDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                    Rejoin Date
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent rounded-md text-[10px] sm:text-sm xl:text-lg"
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
                className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading}
                aria-label="Cancel rejoin"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading}
                aria-label="Confirm rejoin"
              >
                {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Rejoin"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RejoinDialog;