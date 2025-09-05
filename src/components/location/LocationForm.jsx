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
import { locationToasts } from "../../utils/toastMessages";

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
      console.error("Form submission error:", err);
    }
  };

  const onSubmitWithValidation = form.handleSubmit(
    handleSubmit,
    (errors) => {
      // Enhanced validation error handling
      const errorEntries = Object.entries(errors);
      
      if (errorEntries.length === 1) {
        const [field, error] = errorEntries[0];
        locationToasts.validationError(field, error.message);
      } else if (errorEntries.length > 1) {
        // Show first error with count of remaining errors
        locationToasts.multipleValidationErrors(errors);
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
                <FormLabel className="text-body text-sm font-medium cursor-default">
                  Name *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id={`${mode}-location-name`}
                    className={cn(
                      "h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm",
                      isLoading ? "cursor-not-allowed" : "cursor-text"
                    )}
                    disabled={isLoading}
                    aria-label="Location name"
                    aria-describedby={`${mode}-location-name-error`}
                  />
                </FormControl>
                <FormMessage
                  id={`${mode}-location-name-error`}
                  className="text-error text-xs cursor-default"
                />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-body text-sm font-medium cursor-default">
                  City *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id={`${mode}-location-city`}
                    className={cn(
                      "h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm",
                      isLoading ? "cursor-not-allowed" : "cursor-text"
                    )}
                    disabled={isLoading}
                    aria-label="City"
                    aria-describedby={`${mode}-location-city-error`}
                  />
                </FormControl>
                <FormMessage
                  id={`${mode}-location-city-error`}
                  className="text-error text-xs cursor-default"
                />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-body text-sm font-medium cursor-default">
                  State *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id={`${mode}-location-state`}
                    className={cn(
                      "h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm",
                      isLoading ? "cursor-not-allowed" : "cursor-text"
                    )}
                    disabled={isLoading}
                    aria-label="State"
                    aria-describedby={`${mode}-location-state-error`}
                  />
                </FormControl>
                <FormMessage
                  id={`${mode}-location-state-error`}
                  className="text-error text-xs cursor-default"
                />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-body text-sm font-medium cursor-default">
                  Address *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id={`${mode}-location-address`}
                    className={cn(
                      "h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm",
                      isLoading ? "cursor-not-allowed" : "cursor-text"
                    )}
                    disabled={isLoading}
                    aria-label="Address"
                    aria-describedby={`${mode}-location-address-error`}
                  />
                </FormControl>
                <FormMessage
                  id={`${mode}-location-address-error`}
                  className="text-error text-xs cursor-default"
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
            className={cn(
              "border-complementary text-body hover:bg-complementary/20 rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md",
              isLoading ? "cursor-not-allowed" : "cursor-pointer"
            )}
            disabled={isLoading}
            aria-label={`Cancel ${mode} location`}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className={cn(
              "bg-accent text-body hover:bg-accent-hover rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md flex items-center gap-2",
              isLoading ? "cursor-not-allowed" : "cursor-pointer"
            )}
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
