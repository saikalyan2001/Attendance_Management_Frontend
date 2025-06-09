import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { editEmployee } from "../redux/employeeSlice";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const editEmployeeSchema = z.object({
  name: z.string().min(1, "This field is required"),
  email: z.string().min(1, "This field is required").email("Please enter a valid email address"),
  designation: z.string().min(1, "This field is required"),
  department: z.string().min(1, "This field is required"),
  salary: z.string().min(1, "This field is required"),
  phone: z.string().optional(),
});

const EditDialog = ({ open, onOpenChange, employee }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.siteInchargeEmployee);
  const form = useForm({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      name: employee?.name || "",
      email: employee?.email || "",
      designation: employee?.designation || "",
      department: employee?.department || "",
      salary: employee?.salary ? employee.salary.toString() : "",
      phone: employee?.phone || "",
    },
  });

  const handleSubmit = (data) => {
    const employeeData = { ...data };
    Object.keys(employeeData).forEach(
      (key) => employeeData[key] === undefined && delete employeeData[key]
    );
    dispatch(editEmployee({ id: employee._id, data: employeeData })).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        onOpenChange(false);
        toast.success("Employee updated successfully", { duration: 5000 });
      } else {
        toast.error(result.payload || "Failed to update employee", { duration: 5000 });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-complementary text-body max-h-[80vh] overflow-y-auto max-w-[90vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
            Edit Employee: {employee?.name}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4"
          >
            {["name", "email", "designation", "department", "phone"].map((field) => (
              <FormField
                key={field}
                control={form.control}
                name={field}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...f}
                        className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent rounded-md text-[10px] sm:text-sm xl:text-lg"
                        aria-label={field}
                      />
                    </FormControl>
                    <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base" />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="salary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                    Salary
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      {...field}
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent rounded-md text-[10px] sm:text-sm xl:text-lg"
                      aria-label="Salary"
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base" />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                Location
              </FormLabel>
              <Input
                value={employee?.location?.name || employee?.location?.city || "N/A"}
                className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent rounded-md text-[10px] sm:text-sm xl:text-lg"
                disabled
                aria-label="Location"
              />
            </FormItem>
            <div className="sm:col-span-2 flex justify-end gap-3 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading}
                aria-label="Cancel edit"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading}
                aria-label="Save changes"
              >
                {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditDialog;