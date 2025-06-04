import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerEmployee, reset as resetEmployees } from '../redux/employeeSlice';
import { fetchLocations, reset as resetLocations } from '../redux/locationsSlice';
import Layout from '../../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, Plus, AlertCircle, X, CheckCircle, FileText, Image, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';

// Renamed File to FileIcon to avoid conflict with DOM File class
import { File as FileIcon } from 'lucide-react';

const employeeSchema = z.object({
  employeeId: z.string().min(1, 'This field is required'),
  name: z.string().min(1, 'This field is required'),
  email: z.string().email('Invalid email address'),
  designation: z.string().min(1, 'This field is required'),
  department: z.string().min(1, 'This field is required'),
  salary: z.string().min(1, 'This field is required').refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Salary must be a positive number',
  }),
  location: z.string().min(1, 'This field is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number cannot exceed 15 digits').refine(val => /^\d+$/.test(val), {
    message: 'Phone number must contain only digits',
  }),
  joinDate: z.string().min(1, 'This field is required').refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  bankDetails: z.object({
    accountNo: z.string().min(1, 'This field is required'),
    ifscCode: z.string().min(1, 'This field is required'),
    bankName: z.string().min(1, 'This field is required'),
    accountHolder: z.string().min(1, 'This field is required'),
  }),
  documents: z.array(
    z.object({
      file: z.any()
        .refine((file) => file instanceof File, 'Please upload a file')
        .refine((file) => {
          if (!(file instanceof File)) return false;
          const filetypes = /pdf|doc|docx|jpg|jpeg|png/;
          const extname = filetypes.test(file.name.toLowerCase().split('.').pop());
          const mimetype = filetypes.test(file.type.toLowerCase().split('/')[1] || '');
          return extname && mimetype;
        }, 'File must be PDF, DOC, DOCX, JPG, JPEG, or PNG')
        .refine((file) => {
          if (!(file instanceof File)) return false;
          return file.size <= 5 * 1024 * 1024;
        }, 'File size must be less than 5MB'),
    })
  ).min(1, 'At least one valid document is required'),
});

const parseServerError = (error) => {
  if (!error) return { message: 'An unknown error occurred', fields: {} };
  if (typeof error === 'string') return { message: error, fields: {} };
  const message = error.message || 'Failed to register employee';
  const fields = error.errors?.reduce((acc, err) => {
    acc[err.field] = err.message;
    return acc;
  }, {}) || {};
  return { message, fields };
};

const getFileIcon = (file) => {
  if (!file) return <FileIcon className="h-5 w-5 text-body" />;
  const extension = file.name.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png'].includes(extension)) {
    return <Image className="h-5 w-5 text-body" />;
  }
  if (['pdf'].includes(extension)) {
    return <FileText className="h-5 w-5 text-body" />;
  }
  if (['doc', 'docx'].includes(extension)) {
    return <FileText className="h-5 w-5 text-body" />;
  }
  return <FileIcon className="h-5 w-5 text-body" />;
};

const isImageFile = (file) => {
  if (!file) return false;
  const extension = file.name.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png'].includes(extension);
};

const RegisterEmployee = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { loading: employeesLoading, error: employeesError, success } = useSelector((state) => state.adminEmployees);
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.adminLocations);
  const [formErrors, setFormErrors] = useState([]);
  const [serverError, setServerError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [removingIndices, setRemovingIndices] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [dragStates, setDragStates] = useState({});
  const [previewUrls, setPreviewUrls] = useState({}); // Track preview URLs for each file
  const maxRetries = 3;
  const autoDismissDuration = 5000;

  const form = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeId: '',
      name: '',
      email: '',
      designation: '',
      department: '',
      salary: '',
      location: '',
      phone: '',
      joinDate: '',
      bankDetails: {
        accountNo: '',
        ifscCode: '',
        bankName: '',
        accountHolder: '',
      },
      documents: [],
    },
  });

  const { fields: documentFields, append: appendDocument, remove: removeDocument } = useFieldArray({
    control: form.control,
    name: 'documents',
  });

  // Clean up preview URLs when component unmounts or documents are removed
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/login');
    }
    dispatch(fetchLocations());
  }, [dispatch, user, navigate]);

  useEffect(() => {
    if (employeesError || locationsError) {
      const error = parseServerError(employeesError || locationsError);
      setServerError(error);
      setShowErrorAlert(true);

      const errorTimer = setTimeout(() => {
        setShowErrorAlert(false);
        setServerError(null);
        dispatch(resetEmployees());
        dispatch(resetLocations());
      }, autoDismissDuration);

      return () => clearTimeout(errorTimer);
    }

    if (formErrors.length > 0) {
      setShowErrorAlert(true);

      const errorTimer = setTimeout(() => {
        setShowErrorAlert(false);
        setFormErrors([]);
      }, autoDismissDuration);

      return () => clearTimeout(errorTimer);
    }
  }, [employeesError, locationsError, formErrors, dispatch]);

  useEffect(() => {
    if (success) {
      toast.success('Employee registered successfully', { duration: autoDismissDuration });
      setShowSuccessAlert(true);

      const successTimer = setTimeout(() => {
        setShowSuccessAlert(false);
        dispatch(resetEmployees());
        form.reset();
        setFormErrors([]);
        setServerError(null);
        setRetryCount(0);
        setRemovingIndices([]);
        setDragStates({});
        setPreviewUrls({});
      }, autoDismissDuration);

      return () => clearTimeout(successTimer);
    }
  }, [success, dispatch, form]);

  useEffect(() => {
    if (!employeesLoading) {
      setIsSubmitting(false);
    }
  }, [employeesLoading]);

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      await form.trigger();
      const errors = Object.entries(form.formState.errors).flatMap(([field, error]) => {
        if (field === 'documents' && error.message) {
          return [{ field: 'documents', message: error.message }];
        }
        if (field === 'documents' && Array.isArray(error)) {
          return error.map((docError, index) => ({
            field: `documents[${index}].file`,
            message: docError.file?.message || 'Invalid document',
          }));
        }
        return [{ field, message: error.message || 'Invalid input' }];
      });

      if (data.documents.length === 0 || !data.documents.every(doc => doc.file instanceof File)) {
        errors.push({ field: 'documents', message: 'At least one valid document is required' });
      }

      setFormErrors(errors);

      if (errors.length > 0) {
        toast.error('Please fix the form errors before submitting', { duration: autoDismissDuration });
        const firstErrorField = errors[0].field.includes('documents')
          ? document.querySelector(`[name="${errors[0].field.replace(']', '').replace('[', '.')}"`) ||
            document.querySelector(`[name="${errors[0].field.split('.')[0]}"]`)
          : document.querySelector(`[name="${errors[0].field}"]`);
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErrorField.focus();
        }
        return;
      }

      const employeeData = {
        employeeId: data.employeeId,
        name: data.name,
        email: data.email,
        designation: data.designation,
        department: data.department,
        salary: Number(data.salary),
        location: data.location,
        phone: data.phone,
        joinDate: new Date(data.joinDate).toISOString(),
        bankDetails: data.bankDetails,
        paidLeaves: { available: 2, used: 0, carriedForward: 0 },
        createdBy: user._id,
      };

      await dispatch(registerEmployee({ employeeData, documents: data.documents })).unwrap();
    } catch (error) {
      console.error('Submission error:', error);
      const parsedError = parseServerError(error);
      setServerError(parsedError);
      setRetryCount((prev) => prev + 1);
      toast.error(parsedError.message, {
        action: retryCount < maxRetries && {
          label: 'Retry',
          onClick: () => form.handleSubmit(handleSubmit)(),
        },
        duration: 10000,
      });
    }
  };

  const addDocumentField = () => {
    appendDocument({ file: null });
  };

  const handleRemoveDocument = (index) => {
    setRemovingIndices((prev) => [...prev, index]);
    setTimeout(() => {
      // Revoke the preview URL for the removed document
      setPreviewUrls((prev) => {
        const newUrls = { ...prev };
        if (newUrls[index]) {
          URL.revokeObjectURL(newUrls[index]);
          delete newUrls[index];
        }
        return newUrls;
      });
      removeDocument(index);
      setRemovingIndices((prev) => prev.filter((i) => i !== index));
      setDragStates((prev) => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
    }, 300);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragStates((prev) => ({ ...prev, [index]: true }));
  };

  const handleDragLeave = (index) => {
    setDragStates((prev) => ({ ...prev, [index]: false }));
  };

  const handleDrop = (e, index, onChange) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrls((prev) => ({ ...prev, [index]: previewUrl }));
      onChange(file);
    }
    setDragStates((prev) => ({ ...prev, [index]: false }));
  };

  const handleFileChange = (index, file, onChange) => {
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrls((prev) => ({ ...prev, [index]: previewUrl }));
      onChange(file);
    }
  };

  const handleDismissErrors = () => {
    setShowErrorAlert(false);
    dispatch(resetEmployees());
    dispatch(resetLocations());
    setServerError(null);
    setFormErrors([]);
    setRemovingIndices([]);
    setDragStates({});
    toast.dismiss();
  };

  const handleDismissSuccess = () => {
    setShowSuccessAlert(false);
    dispatch(resetEmployees());
    form.reset();
    setFormErrors([]);
    setServerError(null);
    setRetryCount(0);
    setRemovingIndices([]);
    setDragStates({});
    // Clean up all preview URLs on success
    Object.values(previewUrls).forEach((url) => {
      if (url) URL.revokeObjectURL(url);
    });
    setPreviewUrls({});
  };

  return (
    <Layout title="Register Employee">
      {(serverError || formErrors.length > 0) && showErrorAlert && (
        <Alert
          variant="destructive"
          className={cn(
            'fixed top-4 right-4 w-80 sm:w-96 z-50 border-error text-error rounded-md shadow-lg bg-error-light',
            showErrorAlert ? 'animate-fade-in' : 'animate-fade-out'
          )}
        >
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          <AlertTitle className="text-[10px] sm:text-sm md:text-base xl:text-lg font-bold">Error</AlertTitle>
          <AlertDescription className="text-[10px] sm:text-sm md:text-base xl:text-lg">
            {serverError && <p>{serverError.message}</p>}
            {formErrors.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-track-complementary">
                <ul className="list-disc pl-5 space-y-1">
                  {formErrors.map((error, index) => (
                    <li key={index}>
                      {error.message} (Field: {error.field})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissErrors}
            className="absolute top-2 right-2 text-error hover:text-error-hover"
            aria-label="Dismiss errors"
            type="button" // Prevent form submission
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Alert>
      )}
      {showSuccessAlert && (
        <Alert
          className={cn(
            'fixed top-4 right-4 w-80 sm:w-96 z-50 border-accent text-accent rounded-md shadow-lg bg-accent-light',
            showSuccessAlert ? 'animate-fade-in' : 'animate-fade-out'
          )}
        >
          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          <AlertTitle className="text-[10px] sm:text-sm md:text-base xl:text-lg font-bold">Success</AlertTitle>
          <AlertDescription className="text-[10px] sm:text-sm md:text-base xl:text-lg">
            Registration Success
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissSuccess}
            className="absolute top-2 right-2 text-accent hover:text-accent-hover"
            aria-label="Dismiss success"
            type="button" // Prevent form submission
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Alert>
      )}
      <Card className="bg-complementary text-body max-w-full sm:max-w-3xl xl:max-w-4xl mx-auto shadow-lg rounded-md border border-accent/10 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Add New Employee</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 sm:space-y-8">
              <div>
                <h3 className="text-sm sm:text-base xl:text-lg font-semibold mb-3 sm:mb-4 text-body">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Employee ID *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., EMP003"
                            className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                            disabled={employeesLoading || locationsLoading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                          {serverError?.fields?.employeeId || form.formState.errors.employeeId?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Alice Johnson"
                            className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                            disabled={employeesLoading || locationsLoading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                          {serverError?.fields?.name || form.formState.errors.name?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Designation *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Analyst"
                            className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                            disabled={employeesLoading || locationsLoading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                          {serverError?.fields?.designation || form.formState.errors.designation?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Department *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Finance"
                            className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                            disabled={employeesLoading || locationsLoading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                          {serverError?.fields?.department || form.formState.errors.department?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Location *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={employeesLoading || locationsLoading || locations.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg">
                              <SelectValue placeholder={locations.length === 0 ? 'No locations available' : 'Select location'} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-complementary text-body">
                            {locations.map((loc) => (
                              <SelectItem key={loc._id} value={loc._id} className="text-[10px] sm:text-sm xl:text-base">
                                {loc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {locations.length === 0 && !locationsLoading && (
                          <p className="text-error text-[9px] sm:text-xs xl:text-base mt-1">
                            No locations available. Please add a location in the Locations page.
                          </p>
                        )}
                        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                          {serverError?.fields?.location || form.formState.errors.location?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Salary (₹/year) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            placeholder="e.g., 55000"
                            className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                            disabled={employeesLoading || locationsLoading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                          {serverError?.fields?.salary || form.formState.errors.salary?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="joinDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Join Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                            disabled={employeesLoading || locationsLoading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                          {serverError?.fields?.joinDate || form.formState.errors.joinDate?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            {...field}
                            placeholder="e.g., alice@example.com"
                            className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                            disabled={employeesLoading || locationsLoading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                          {serverError?.fields?.email || form.formState.errors.email?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Phone *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., 1234567890"
                            className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                            disabled={employeesLoading || locationsLoading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                          {serverError?.fields?.phone || form.formState.errors.phone?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm sm:text-base xl:text-lg font-semibold mb-3 sm:mb-4 text-body">Bank Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="bankDetails.accountNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Account Number *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., 123456789012"
                            className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                            disabled={employeesLoading || locationsLoading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                          {serverError?.fields?.['bankDetails.accountNo'] || form.formState.errors.bankDetails?.accountNo?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankDetails.ifscCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">IFSC Code *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., SBIN0001234"
                            className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                            disabled={employeesLoading || locationsLoading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                          {serverError?.fields?.['bankDetails.ifscCode'] || form.formState.errors.bankDetails?.ifscCode?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankDetails.bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Bank Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., State Bank of India"
                            className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                            disabled={employeesLoading || locationsLoading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                          {serverError?.fields?.['bankDetails.bankName'] || form.formState.errors.bankDetails?.bankName?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankDetails.accountHolder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Account Holder Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Alice Johnson"
                            className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                            disabled={employeesLoading || locationsLoading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                          {serverError?.fields?.['bankDetails.accountHolder'] || form.formState.errors.bankDetails?.accountHolder?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm sm:text-base xl:text-lg font-semibold mb-3 sm:mb-4 text-body">Employee Documents</h3>
                {documentFields.map((field, index) => (
                  <div
                    key={field.id}
                    className={cn(
                      'mb-3 sm:mb-4 rounded-md border border-complementary/30 bg-body shadow-sm hover:shadow-md transition-shadow duration-300',
                      removingIndices.includes(index) ? 'animate-fade-out' : 'animate-fade-in'
                    )}
                  >
                    <FormField
                      control={form.control}
                      name={`documents.${index}.file`}
                      render={({ field }) => (
                        <FormItem className="p-3 sm:p-4">
                          <div
                            className={cn(
                              'relative border-2 border-dashed rounded-md p-4 sm:p-6 text-center transition-all duration-300',
                              dragStates[index] ? 'border-accent bg-accent/10' : 'border-complementary',
                              field.value ? 'bg-body' : 'bg-complementary/10',
                              (employeesLoading || locationsLoading) && 'opacity-50 cursor-not-allowed'
                            )}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={() => handleDragLeave(index)}
                            onDrop={(e) => handleDrop(e, index, field.onChange)}
                            role="region"
                            aria-label={`Upload document ${index + 1}`}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                document.getElementById(`file-input-${index}`).click();
                              }
                            }}
                          >
                            <Input
                              id={`file-input-${index}`}
                              type="file"
                              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                              onChange={(e) => handleFileChange(index, e.target.files[0], field.onChange)}
                              className="hidden"
                              disabled={employeesLoading || locationsLoading}
                            />
                            {!field.value ? (
                              <div className="flex flex-col items-center space-y-2">
                                <FileIcon className="h-6 w-6 sm:h-8 sm:w-8 text-body/60" />
                                <p className="text-[10px] sm:text-sm xl:text-base text-body/60">
                                  Drag & drop a file here or click to upload
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    onClick={() => document.getElementById(`file-input-${index}`).click()}
                                    className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                                    disabled={employeesLoading || locationsLoading}
                                  >
                                    Choose File
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleRemoveDocument(index)}
                                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                                    disabled={employeesLoading || locationsLoading}
                                    aria-label="Cancel document upload"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                                <p className="text-[9px] sm:text-xs xl:text-sm text-body/50">
                                  (PDF, DOC, DOCX, JPG, JPEG, PNG; Max 5MB)
                                </p>
                              </div>
                            ) : (
                              <div className="flex flex-col space-y-2">
                                <div className="flex items-center justify-between space-x-2">
                                  <div className="flex items-center space-x-2 truncate">
                                    {getFileIcon(field.value)}
                                    <div className="truncate">
                                      <span className="text-[10px] sm:text-sm xl:text-base text-body truncate">
                                        {field.value.name}
                                      </span>
                                      <span className="text-[9px] sm:text-xs xl:text-sm text-body/60 block">
                                        ({(field.value.size / 1024 / 1024).toFixed(2)} MB)
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <a
                                      href={previewUrls[index]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        "p-1 text-accent hover:text-accent-hover focus:ring-2 focus:ring-accent/20 rounded-full",
                                        (employeesLoading || locationsLoading || !previewUrls[index]) && "opacity-50 cursor-not-allowed"
                                      )}
                                      aria-label={`Preview document ${field.value.name}`}
                                      onClick={(e) => {
                                        if (employeesLoading || locationsLoading || !previewUrls[index]) {
                                          e.preventDefault();
                                        }
                                      }}
                                    >
                                      <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </a>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveDocument(index)}
                                      className="text-error hover:text-error-hover focus:ring-2 focus:ring-error/20 rounded-full"
                                      disabled={employeesLoading || locationsLoading}
                                      aria-label={`Remove document ${field.value.name}`}
                                    >
                                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </Button>
                                  </div>
                                </div>
                                {isImageFile(field.value) && previewUrls[index] && (
                                  <div className="mt-2 flex justify-center">
                                    <img
                                      src={previewUrls[index]}
                                      alt={`Preview of ${field.value.name}`}
                                      className="h-24 w-24 object-cover rounded-md border border-complementary"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base mt-2">
                            {serverError?.fields?.[`documents[${index}].file`] || form.formState.errors.documents?.[index]?.file?.message}
                          </FormMessage>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  onClick={addDocumentField}
                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md"
                  disabled={employeesLoading || locationsLoading}
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Add Document
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/employees')}
                  className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-md"
                  disabled={employeesLoading || locationsLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={cn(
                    'bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-md',
                    isSubmitting && 'animate-scale-in',
                    success && !employeesLoading && 'animate-pulse'
                  )}
                  disabled={employeesLoading || locationsLoading || locations.length === 0}
                >
                  {employeesLoading ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : 'Register Employee'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default RegisterEmployee;