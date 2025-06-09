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
import { Loader2 } from "lucide-react";
import { transferEmployee } from "../redux/employeeSlice";
import { toast } from "sonner";

const transferEmployeeSchema = z.object({
  location: z.string().min(1, "Please select a location"),
});

const TransferDialog = ({ open, onOpenChange, employeeId, allLocations }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.siteInchargeEmployee);
  const form = useForm({
    resolver: zodResolver(transferEmployeeSchema),
    defaultValues: { location: "" },
  });

  const handleSubmit = (data) => {
    dispatch(
      transferEmployee({
        id: employeeId,
        location: data.location,
        transferTimestamp: new Date().toISOString(),
      })
    )
      .unwrap()
      .then(() => {
        const newLocation = allLocations.find((loc) => loc._id === data.location);
        toast.success(
          `Employee transferred to ${newLocation?.name || newLocation?.city || "new location"} successfully`,
          { duration: 5000 }
        );
        onOpenChange(false);
        form.reset();
      })
      .catch((error) => {
        toast.error(error || "Failed to transfer employee", { duration: 5000 });
      });
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                    New Location
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent rounded-md text-[10px] sm:text-sm xl:text-lg">
                        <SelectValue placeholder="Select new location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-complementary text-body">
                      {allLocations.map((loc) => (
                        <SelectItem
                          key={loc._id}
                          value={loc._id}
                          className="text-[10px] sm:text-sm xl:text-base"
                        >
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
                className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading}
                aria-label="Cancel transfer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading}
                aria-label="Confirm transfer"
              >
                {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferDialog;