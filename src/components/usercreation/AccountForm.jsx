import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { parseServerError } from '@/utils/errorUtils';
import Layout from '@/components/layout/Layout';
import { Link } from 'react-router-dom';

const AccountForm = ({
  schema,
  defaultValues,
  title,
  buttonText,
  locationsSelector,
  createAction,
  navigatePath,
  getToastMessage,
  showRoleField = false,
  fixedRole,
  handleError = (error) => toast.error(error),
  locationsLabelFn = () => 'Locations *',
  fetchLocationsAction,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  const locations = useSelector(locationsSelector);
  const formRef = useRef(null);
  const locationSelectRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    dispatch(fetchLocationsAction());
  }, [dispatch, fetchLocationsAction]);

  useEffect(() => {
    if (error) {
      const parsedError = parseServerError(error);

      if (Object.keys(parsedError.fields).length > 0) {
        // Show per-field validation toasts only
        Object.entries(parsedError.fields).forEach(([field, message], index) => {
          setTimeout(() => {
            toast.error(message, {
              id: `create-error-${field}-${index}`,
              duration: 6000,
              position: 'top-center',
            });
          }, (index + 1) * 500);
        });

        // Focus/scroll first error field
        const firstErrorFieldName = Object.keys(parsedError.fields)[0];
        if (firstErrorFieldName) {
          const fieldElement =
            firstErrorFieldName === 'locations'
              ? locationSelectRef.current
              : document.querySelector(`[name="${firstErrorFieldName}"]`);
          if (fieldElement) {
            fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            fieldElement.focus();
          }
        }
      } else {
        // No field errors → show one top-level toast
        handleError(parsedError.message);
      }
    }
  }, [error, handleError]);

  // Enhanced field error messages
  const fieldErrorMessages = {
    email: {
      required: 'Email address is required',
      email: 'Please enter a valid email address',
      invalid_type: 'Please enter a valid email address',
    },
    name: {
      required: 'Full name is required',
      min: 'Please enter your full name',
      invalid_type: 'Please enter a valid name',
    },
    phone: {
      refine: 'Please enter a valid 10-digit phone number',
    },
    locations: {
      min: 'Please select at least one location',
      required: 'Location selection is required',
      invalid_type: 'Please select a valid location',
    },
    role: {
      required: 'Please select a role',
      invalid_type: 'Please select a valid role',
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
            errors.push({ 
              field, 
              message: fieldErrorMessages[field]?.[errorType] || errorObj.message || 'Please check this field'
            });
          }
        };

        const fieldOrder = ['email', 'name', 'phone', 'role', 'locations'];
        for (const field of fieldOrder) {
          addError(field, form.formState.errors[field]);
        }

        if (errors.length > 0) {
          const firstError = errors[0];
          toast.error(firstError.message, {
            id: `create-validation-error-${firstError.field}`,
            duration: 6000,
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
      console.error('Save click error:', error);
      toast.error('Unable to submit the form. Please try again.', {
        id: 'submit-error',
        duration: 6000,
        position: 'top-center',
      });
    }
  };

  const handleSubmit = (data) => {
    if (fixedRole) {
      data.role = fixedRole;
    }
    dispatch(createAction(data)).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success(getToastMessage(data), {
          id: 'create-success',
          duration: 6000,
          position: 'top-center',
        });
        form.reset();
        navigate(navigatePath);
      }
    });
  };

  // Enhanced error handling function
  const enhancedHandleError = (error) => {
    if (error.includes('Forbidden: Insufficient role')) {
      toast.error('You don\'t have permission to perform this action. Please contact your administrator for assistance.');
    } else if (error.includes('Network Error') || error.includes('timeout')) {
      toast.error('Connection problem. Please check your internet connection and try again.');
    } else if (error.includes('500') || error.includes('Server Error')) {
      toast.error('Server is currently unavailable. Please try again in a few minutes.');
    } else {
      toast.error(error || 'Something went wrong. Please try again or contact support if the problem persists.');
    }
  };

  const selectedRole = showRoleField ? form.watch('role') : fixedRole;

  return (
    <Layout title={title}>
      <div className="min-h-screen flex items-center justify-center bg-body text-body">
        <Card className="w-full max-w-md bg-complementary text-body">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form ref={formRef} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter email address"
                          className="bg-complementary text-body border-accent"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter full name"
                          className="bg-complementary text-body border-accent"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter 10-digit phone number"
                          className="bg-complementary text-body border-accent"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Role */}
                {showRoleField && (
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                          <FormControl>
                            <SelectTrigger className="bg-complementary text-body border-accent">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-complementary text-body">
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="siteincharge">Site Incharge</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Locations */}
                <FormField
                  control={form.control}
                  name="locations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{locationsLabelFn(selectedRole)}</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange([value])}
                        value={field.value[0] || ''}
                        disabled={
                          loading ||
                          locations.length === 0 ||
                          (showRoleField && selectedRole === 'admin')
                        }
                      >
                        <FormControl>
                          <SelectTrigger ref={locationSelectRef} className="bg-complementary text-body border-accent">
                            <SelectValue
                              placeholder={
                                locations.length === 0
                                  ? 'No locations available. Please add locations first.'
                                  : showRoleField && selectedRole === 'admin'
                                  ? 'Not applicable for Admin accounts'
                                  : 'Select a location'
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
                      {locations.length === 0 && (
                        <p className="text-sm text-error">
                          No locations available. Please{' '}
                          <Link
                            to={showRoleField ? '/superadmin/locations' : '/admin/locations'}
                            className="underline text-accent hover:text-accent-hover"
                          >
                            add locations
                          </Link>{' '}
                          first.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="button"
                  onClick={handleSaveClick}
                  className="w-full bg-accent text-body hover:bg-accent-hover"
                  disabled={
                    loading ||
                    locations.length === 0 ||
                    (showRoleField &&
                      selectedRole === 'siteincharge' &&
                      locations.length === 0)
                  }
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    buttonText
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

export default AccountForm;
