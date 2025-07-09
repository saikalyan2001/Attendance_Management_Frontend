import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { editEmployee, fetchEmployees } from "../redux/employeeSlice";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useState } from "react";

const editEmployeeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name cannot exceed 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name must contain only letters and spaces"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Email must be a valid email address")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email must be a valid email address"),
  designation: z
    .string()
    .min(1, "Designation is required")
    .max(50, "Designation cannot exceed 50 characters"),
  department: z
    .string()
    .min(1, "Department is required")
    .max(50, "Department cannot exceed 50 characters"),
  salary: z
    .string()
    .min(1, "Salary is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1000, "Salary must be at least ₹1000"),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{10}$/.test(val), "Phone number must be 10 digits"),
});

const EditDialog = ({ open, onOpenChange, employee }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.siteInchargeEmployee);
  const { user } = useSelector((state) => state.auth);
  const locationId = user?.locations?.[0]?._id;
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const employeeData = { ...data, salary: Number(data.salary) };
      Object.keys(employeeData).forEach(
        (key) => employeeData[key] === undefined && delete employeeData[key]
      );
      await dispatch(editEmployee({ id: employee._id, data: employeeData })).unwrap();
      dispatch(fetchEmployees({
        location: locationId,
        status: "",
        cache: false
      }));
      onOpenChange(false);
      toast.success("Employee updated successfully", {
        id: 'edit-employee-success',
        duration: 10000,
        position: 'top-center',
      });
    } catch (error) {
      toast.error(error.message || "Failed to update employee", {
        id: 'edit-employee-error',
        duration: 5000,
        position: 'top-center',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveClick = async () => {
    try {
      // Trigger validation
            const isValid = await form.trigger();
      
      if (!isValid) {
        const errors = [];
        const fieldOrder = ['name', 'email', 'designation', 'department', 'salary', 'phone'];
        fieldOrder.forEach((field) => {
          if (form.formState.errors[field]?.message) {
            errors.push({ field, message: form.formState.errors[field].message });
          }
        });

        
        if (errors.length > 0) {
          const firstError = errors[0];
          toast.error(firstError.message, {
            id: `edit-employee-validation-error-${firstError.field}`,
            duration: 5000,
            position: 'top-center',
          });
          const fieldElement = document.querySelector(`[name="${firstError.field}"]`);
          if (fieldElement) {
            fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            fieldElement.focus();
          }
          return;
        }
      }

      // Proceed with submission if valid
      await form.handleSubmit(handleSubmit)();
    } catch (error) {
      ('handleSaveClick error:', error);
      toast.error("Error submitting form, please try again", {
        id: 'edit-employee-form-error',
        duration: 5000,
        position: 'top-center',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-complementary text-body max-h-[80vh] overflow-y-auto max-w-[90vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
            Edit Employee: {employee?.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-body">
            Update the employee’s details below. All fields except phone are required.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
            {["name", "email", "designation", "department", "phone"].map((field) => (
              <FormField
                key={field}
                control={form.control}
                name={field}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                      {field !== 'phone' && <span className="text-error"> *</span>}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...f}
                        className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent rounded-md text-[10px] sm:text-sm xl:text-lg"
                        aria-label={field.charAt(0).toUpperCase() + field.slice(1)}
                        disabled={employeesLoading || isSubmitting}
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
                    Salary <span className="text-error"> *</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      {...field}
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent rounded-md text-[10px] sm:text-sm xl:text-lg"
                      aria-label="Salary"
                      disabled={employeesLoading || isSubmitting}
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
                disabled={employeesLoading || isSubmitting}
                aria-label="Cancel edit"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveClick}
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading || isSubmitting}
                aria-label="Save employee changes"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditDialog;