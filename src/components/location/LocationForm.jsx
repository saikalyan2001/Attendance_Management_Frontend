// src/components/common/LocationForm.jsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

const locationSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .regex(/^[a-zA-Z0-9\s\-'&]+$/, "Name contains invalid characters"),
  address: z
    .string()
    .min(1, "Address is required")
    .max(200, "Address must be 200 characters or less"),
  city: z
    .string()
    .min(1, "City is required")
    .max(50, "City must be 50 characters or less")
    .regex(/^[a-zA-Z\s\-]+$/, "City contains invalid characters"),
  state: z
    .string()
    .min(1, "State is required")
    .max(50, "State must be 50 characters or less")
    .regex(/^[a-zA-Z\s\-]+$/, "State contains invalid characters"),
});

const LocationForm = ({
  mode = "add",
  defaultValues = { name: "", address: "", city: "", state: "" },
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const form = useForm({
    resolver: zodResolver(locationSchema),
    defaultValues,
  });
  const formRef = useRef(null);

  useEffect(() => {
    if (mode === "add" || mode === "edit") {
      formRef.current?.querySelector('[name="name"]')?.focus();
    }
  }, [mode]);

  const handleSubmit = async (data) => {
    try {
      await onSubmit(data);
    } catch (err) {
      // Errors from onSubmit (e.g., API errors) are handled in SuperAdminLocations.jsx
      console.error("Form submission error:", err);
    }
  };

  const onSubmitWithValidation = form.handleSubmit(
    handleSubmit,
    (errors) => {
      // Extract all validation errors
      const errorMessages = Object.values(errors).map((error) => error.message);
      // Show the first error as a toast to avoid overwhelming the user
      if (errorMessages.length > 0) {
        toast.error(errorMessages[0], {
          id: `form-error-${mode}`,
          duration: 6000,
          position: "top-center",
        });
      }
    }
  );

  return (
    <Form {...form}>
      <form
        onSubmit={onSubmitWithValidation}
        ref={formRef}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-body text-sm font-medium">
                  Name *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id={`${mode}-location-name`}
                    className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                    disabled={isLoading}
                    aria-label="Location name"
                    aria-describedby={`${mode}-location-name-error`}
                  />
                </FormControl>
                <FormMessage
                  id={`${mode}-location-name-error`}
                  className="text-error text-xs"
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-body text-sm font-medium">
                  City *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id={`${mode}-location-city`}
                    className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                    disabled={isLoading}
                    aria-label="City"
                    aria-describedby={`${mode}-location-city-error`}
                  />
                </FormControl>
                <FormMessage
                  id={`${mode}-location-city-error`}
                  className="text-error text-xs"
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-body text-sm font-medium">
                  State *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id={`${mode}-location-state`}
                    className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                    disabled={isLoading}
                    aria-label="State"
                    aria-describedby={`${mode}-location-state-error`}
                  />
                </FormControl>
                <FormMessage
                  id={`${mode}-location-state-error`}
                  className="text-error text-xs"
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-body text-sm font-medium">
                  Address *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id={`${mode}-location-address`}
                    className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                    disabled={isLoading}
                    aria-label="Address"
                    aria-describedby={`${mode}-location-address-error`}
                  />
                </FormControl>
                <FormMessage
                  id={`${mode}-location-address-error`}
                  className="text-error text-xs"
                />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-complementary text-body hover:bg-complementary/20 rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md"
            disabled={isLoading}
            aria-label={`Cancel ${mode} location`}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-accent text-body hover:bg-accent-hover rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md flex items-center gap-2"
            disabled={isLoading}
            aria-label={`${mode === "add" ? "Add" : "Save"} location`}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              mode === "add" ? "Add Location" : "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LocationForm;