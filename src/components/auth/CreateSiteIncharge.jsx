import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createSiteIncharge, resetError } from "../../redux/slices/authSlice";
import { fetchLocations } from "../../features/admin/redux/locationsSlice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import Layout from "../layout/Layout";
import { cn } from "@/lib/utils";
import { parseServerError } from "@/utils/errorUtils";

const siteInchargeSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  name: z
    .string()
    .min(1, "Name is required"),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{10}$/.test(val), "Phone number must be 10 digits"),
  locations: z
    .array(z.string())
    .min(1, "At least one location is required"),
});

const CreateSiteIncharge = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((state) => state.auth);
  const { locations, loading: locationsLoading } = useSelector((state) => state.adminLocations);
  const formRef = useRef(null);
  const locationSelectRef = useRef(null);
  const [serverError, setServerError] = useState(null);

  const form = useForm({
    resolver: zodResolver(siteInchargeSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      phone: "",
      locations: [],
    },
  });

  useEffect(() => {
        dispatch(fetchLocations());
    dispatch(resetError());
  }, [dispatch, user]);

  useEffect(() => {
    if (error) {
            const parsedError = parseServerError(error);
      setServerError(parsedError);
      toast.error(parsedError.message, {
        id: 'create-error',
        duration: 5000,
        position: 'top-center',
      });
      Object.entries(parsedError.fields).forEach(([field, message], index) => {
        setTimeout(() => {
          toast.error(message, {
            id: `create-error-${field}-${index}`,
            duration: 5000,
            position: 'top-center',
          });
        }, (index + 1) * 500);
      });
      const firstErrorFieldName = Object.keys(parsedError.fields)[0];
      if (firstErrorFieldName) {
        const fieldElement = firstErrorFieldName === 'locations'
          ? locationSelectRef.current
          : document.querySelector(`[name="${firstErrorFieldName}"]`);
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fieldElement.focus();
        }
      }
    }
  }, [error]);

  useEffect(() => {
    if (locations.length > 0) {
      form.setValue("locations", [locations[0]._id]);
    }
  }, [locations, form]);

  const fieldErrorMessages = {
    email: {
      required: 'Email is required',
      email: 'Invalid email address',
      invalid_type: 'Email is required',
    },
    password: {
      required: 'Password is required',
      min: 'Password must be at least 6 characters',
      invalid_type: 'Password is required',
    },
    name: {
      required: 'Name is required',
      min: 'Name is required',
      invalid_type: 'Name is required',
    },
    phone: {
      refine: 'Phone number must be 10 digits',
    },
    locations: {
      min: 'At least one location is required',
      required: 'At least one location is required',
      invalid_type: 'At least one location is required',
    },
  };

  const handleSaveClick = async () => {
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        const errors = [];
        const addError = (field, errorObj) => {
          if (errorObj) {
            const errorType = errorObj.type === 'string' || errorObj.type === 'array' ? 'required' : errorObj.type;
            errors.push({ field, message: fieldErrorMessages[field][errorType] || errorObj.message });
          }
        };

        const fieldOrder = ['email', 'password', 'name', 'phone', 'locations'];
        for (const field of fieldOrder) {
          addError(field, form.formState.errors[field]);
        }

        if (errors.length > 0) {
          const firstError = errors[0];
          toast.error(firstError.message, {
            id: `create-validation-error-${firstError.field}`,
            duration: 5000,
            position: 'top-center',
          });
          const firstErrorField = firstError.field === 'locations'
            ? locationSelectRef.current
            : document.querySelector(`[name="${firstError.field}"]`) || formRef.current;
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
          }
          return;
        }
      }
      await form.handleSubmit(handleSubmit)();
    } catch (error) {
      ('Save click error:', error);
      toast.error('Error submitting form, please try again', {
        id: 'submit-error',
        duration: 5000,
        position: 'top-center',
      });
    }
  };

  const handleSubmit = (data) => {
        dispatch(createSiteIncharge(data)).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        toast.success(`Site Incharge ${data.name} created successfully`, {
          id: 'create-success',
          duration: 5000,
          position: 'top-center',
        });
        form.reset();
        navigate("/admin/dashboard");
      } else {
        const parsedError = parseServerError(result.error);
                setServerError(parsedError);
        toast.error(parsedError.message, {
          id: 'create-error',
          duration: 5000,
          position: 'top-center',
        });
        Object.entries(parsedError.fields).forEach(([field, message], index) => {
          setTimeout(() => {
            toast.error(message, {
              id: `create-error-${field}-${index}`,
              duration: 5000,
              position: 'top-center',
            });
          }, (index + 1) * 500);
        });
        const firstErrorFieldName = Object.keys(parsedError.fields)[0];
        if (firstErrorFieldName) {
          const fieldElement = firstErrorFieldName === 'locations'
            ? locationSelectRef.current
            : document.querySelector(`[name="${firstErrorFieldName}"]`);
          if (fieldElement) {
            fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            fieldElement.focus();
          }
        }
      }
    });
  };

  return (
    <Layout title="Create Site Incharge" role="admin">
      <div className="min-h-screen flex items-center justify-center bg-body text-body">
        <Card className="w-full max-w-md bg-complementary text-body">
          <CardHeader>
            <CardTitle>Create Site Incharge</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form ref={formRef} className="space-y-4">
                {locationsLoading && (
                  <div className="text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    <p className="text-sm text-body">Loading locations...</p>
                  </div>
                )}
                {serverError && (
                  <Alert variant="destructive" className="border-error text-error">
                    <AlertDescription>{serverError.message}</AlertDescription>
                  </Alert>
                )}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          className="bg-complementary text-body border-accent"
                          disabled={loading || locationsLoading}
                          aria-label="Email"
                        />
                      </FormControl>
                      <FormMessage className="text-error text-xs sm:text-sm">
                        {serverError?.fields?.email || form.formState.errors.email?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          className="bg-complementary text-body border-accent"
                          disabled={loading || locationsLoading}
                          aria-label="Password"
                        />
                      </FormControl>
                      <FormMessage className="text-error text-xs sm:text-sm">
                        {serverError?.fields?.password || form.formState.errors.password?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-complementary text-body border-accent"
                          disabled={loading || locationsLoading}
                          aria-label="Name"
                        />
                      </FormControl>
                      <FormMessage className="text-error text-xs sm:text-sm">
                        {serverError?.fields?.name || form.formState.errors.name?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-complementary text-body border-accent"
                          disabled={loading || locationsLoading}
                          aria-label="Phone"
                        />
                      </FormControl>
                      <FormMessage className="text-error text-xs sm:text-sm">
                        {serverError?.fields?.phone || form.formState.errors.phone?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location *</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange([value])}
                        value={field.value[0] || ""}
                        disabled={loading || locationsLoading || locations.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger ref={locationSelectRef} className="bg-complementary text-body border-accent">
                            <SelectValue
                              placeholder={
                                locations.length === 0
                                  ? "No locations available"
                                  : "Select location"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-complementary text-body">
                          {locations.map((loc) => (
                            <SelectItem key={loc._id} value={loc._id}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {locations.length === 0 && !locationsLoading && (
                        <p className="text-sm text-error">
                          No locations available. Please add locations first.
                        </p>
                      )}
                      <FormMessage className="text-error text-xs sm:text-sm">
                        {serverError?.fields?.locations || form.formState.errors.locations?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  onClick={handleSaveClick}
                  className={cn(
                    "w-full bg-accent text-body hover:bg-accent-hover transition-all duration-300",
                    !loading && !locationsLoading && locations.length > 0 && "animate-pulse"
                  )}
                  disabled={loading || locationsLoading || locations.length === 0}
                  aria-label="Create Site Incharge"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Create Site Incharge"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CreateSiteIncharge;