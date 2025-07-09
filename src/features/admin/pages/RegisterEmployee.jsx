import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerEmployee, reset as resetEmployees } from '../redux/employeeSlice';
import { fetchLocations, reset as resetLocations } from '../redux/locationsSlice';
import Layout from '../../../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, Plus, FileText, Image, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import toast, { Toaster } from 'react-hot-toast';
import { File as FileIcon } from 'lucide-react';

const employeeSchema = z.object({
  employeeId: z
    .string()
    .min(1, 'Employee ID is required')
    .regex(/^[A-Z0-9-]+$/, 'Employee ID must be alphanumeric with optional hyphens'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters and spaces'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  designation: z
    .string()
    .min(1, 'Designation is required')
    .max(100, 'Designation cannot exceed 100 characters'),
  department: z
    .string()
    .min(1, 'Department is required')
    .max(100, 'Department cannot exceed 100 characters'),
  salary: z
    .string()
    .min(1, 'Salary is required')
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, 'Salary must be a positive number')
    .refine(val => Number(val) <= 10000000, 'Salary cannot exceed ₹1,00,00,000'),
  location: z
    .string()
    .min(1, 'Location is required'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number cannot exceed 15 digits')
    .regex(/^\d+$/, 'Phone number must contain only digits'),
  joinDate: z
    .string()
    .min(1, 'Join date is required')
    .refine(val => !isNaN(Date.parse(val)), 'Invalid date format')
    .refine(val => new Date(val) <= new Date(), 'Join date cannot be in the future'),
  bankDetails: z.object({
    accountNo: z
      .string()
      .min(1, 'Account number is required')
      .regex(/^\d+$/, 'Account number must contain only digits')
      .max(20, 'Account number cannot exceed 20 digits'),
    ifscCode: z
      .string()
      .min(1, 'IFSC code is required')
      .max(11, 'IFSC code cannot exceed 11 characters'),
    bankName: z
      .string()
      .min(1, 'Bank name is required')
      .max(100, 'Bank name cannot exceed 100 characters'),
    accountHolder: z
      .string()
      .min(1, 'Account holder name is required')
      .max(100, 'Account holder name cannot exceed 100 characters')
      .regex(/^[a-zA-Z\s]+$/, 'Account holder name must contain only letters and spaces'),
  }),
  documents: z
    .array(
      z.object({
        file: z
          .any()
          .refine(file => file instanceof File, 'Please upload a file')
          .refine(file => {
            if (!(file instanceof File)) return false;
            const filetypes = /pdf|doc|docx|jpg|jpeg|png/;
            const extname = filetypes.test(file.name.toLowerCase().split('.').pop());
            const mimetype = filetypes.test(file.type.toLowerCase().split('/')[1] || '');
            return extname && mimetype;
          }, 'File must be PDF, DOC, DOCX, JPG, JPEG, or PNG')
          .refine(file => {
            if (!(file instanceof File)) return false;
            return file.size <= 5 * 1024 * 1024;
          }, 'File size must be less than 5MB'),
      })
    )
    .min(1, 'At least one valid document is required')
    .max(5, 'Cannot upload more than 5 documents'),
});

const parseServerError = (error) => {
  if (!error) return { message: 'An unknown error occurred', fields: {} };
  if (typeof error === 'string') {
    const fieldErrors = {};
    if (error.includes('Email already exists')) {
      fieldErrors.email = 'Email already exists';
    } else if (error.includes('Employee ID already exists')) {
      fieldErrors.employeeId = 'Employee ID already exists';
    } else if (error.includes('Phone number already exists')) {
      fieldErrors.phone = 'Phone number already exists';
    }
    return { message: error, fields: fieldErrors };
  }
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
  const [serverError, setServerError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [removingIndices, setRemovingIndices] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragStates, setDragStates] = useState({});
  const [previews, setPreviews] = useState({});
  const maxRetries = 3;
  const autoDismissDuration = 5000;
  const formRef = useRef(null);
  const documentsSectionRef = useRef(null);

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

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previews]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/login');
    }
    dispatch(fetchLocations());
  }, [dispatch, user, navigate]);

  useEffect(() => {
    if (employeesError || locationsError) {
      // Dismiss existing toasts before showing a new one
      toast.dismiss();
      const error = parseServerError(employeesError || locationsError);
      setServerError(error);
      toast.error(error.message, {
        id: 'server-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
      const errorTimer = setTimeout(() => {
        setServerError(null);
        dispatch(resetEmployees());
        dispatch(resetLocations());
        toast.dismiss('server-error');
      }, autoDismissDuration);
      return () => clearTimeout(errorTimer);
    }
  }, [employeesError, locationsError, dispatch]);

  useEffect(() => {
    if (success) {
      // Dismiss existing toasts before showing success
      toast.dismiss();
      toast.success('Employee registered successfully', {
        id: 'success',
        duration: autoDismissDuration,
        position: 'top-center',
      });
      const successTimer = setTimeout(() => {
        dispatch(resetEmployees());
        form.reset();
        setServerError(null);
        setRetryCount(0);
        setRemovingIndices([]);
        setDragStates({});
        setPreviews({});
        toast.dismiss('success');
        navigate('/admin/employees');
      }, autoDismissDuration);
      return () => clearTimeout(successTimer);
    }
  }, [success, dispatch, form, navigate]);

  useEffect(() => {
    if (!employeesLoading) {
      setIsSubmitting(false);
    }
  }, [employeesLoading]);

  const handleSubmit = async (data) => {
        try {
      setIsSubmitting(true);
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
      ('Submission error:', error);
      // Dismiss existing toasts before showing submission error
      toast.dismiss();
      const parsedError = parseServerError(error);
      setServerError(parsedError);
      setRetryCount((prev) => prev + 1);
      toast.error(parsedError.message, {
        id: 'server-error-submit',
        duration: 10000,
        position: 'top-center',
        action: retryCount < maxRetries && {
          text: 'Retry',
          onClick: () => form.handleSubmit(handleSubmit)(),
        },
      });
      const firstErrorFieldName = Object.keys(parsedError.fields)[0];
      if (firstErrorFieldName) {
        const fieldElement = document.querySelector(`[name="${firstErrorFieldName}"]`);
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fieldElement.focus();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveClick = async () => {
        try {
      const isValid = await form.trigger();
            
      if (!isValid) {
        const errors = [];
        const fieldLabels = {
          employeeId: 'Employee ID',
          name: 'Name',
          email: 'Email',
          designation: 'Designation',
          department: 'Department',
          salary: 'Salary',
          location: 'Location',
          phone: 'Phone number',
          joinDate: 'Join date',
          'bankDetails.accountNo': 'Account number',
          'bankDetails.ifscCode': 'IFSC code',
          'bankDetails.bankName': 'Bank name',
          'bankDetails.accountHolder': 'Account holder name',
          documents: 'Documents',
        };

        const fieldOrder = [
          'employeeId',
          'name',
          'email',
          'designation',
          'department',
          'salary',
          'location',
          'phone',
          'joinDate',
          'bankDetails.accountNo',
          'bankDetails.ifscCode',
          'bankDetails.bankName',
          'bankDetails.accountHolder',
          'documents',
        ];

        const addError = (field, message) => {
          if (message && !errors.some((e) => e.field === field)) {
            const displayMessage = message.includes('is required') ? `${fieldLabels[field] || field} is required` : message;
            errors.push({ field, message: displayMessage });
          }
        };

        for (const field of fieldOrder) {
          if (field.startsWith('bankDetails.')) {
            const subField = field.split('.')[1];
            const error = form.formState.errors.bankDetails?.[subField];
            addError(field, error?.message);
          } else if (field === 'documents' && form.formState.errors.documents?.message) {
            addError(field, form.formState.errors.documents.message);
          } else if (field === 'documents' && Array.isArray(form.formState.errors.documents)) {
            form.formState.errors.documents.forEach((docError, index) => {
              if (docError?.file?.message) {
                addError(`documents[${index}].file`, docError.file.message);
              }
            });
          } else {
            const error = form.formState.errors[field];
            addError(field, error?.message);
          }
        }

        if (form.getValues().documents.length === 0 || !form.getValues().documents.every(doc => doc.file instanceof File)) {
          addError('documents', 'At least one valid document is required');
        }

        
        if (errors.length > 0) {
          // Dismiss existing toasts before showing validation error
          toast.dismiss();
          const firstError = errors.sort((a, b) => fieldOrder.indexOf(a.field) - fieldOrder.indexOf(b.field))[0];
          toast.error(firstError.message, {
            id: `validation-error-${firstError.field.replace('.', '-')}`,
            duration: autoDismissDuration,
            position: 'top-center',
          });

          if (firstError.field !== 'documents' && !firstError.field.startsWith('documents[')) {
            const firstErrorField = document.querySelector(`[name="${firstError.field}"]`);
            if (firstErrorField) {
              firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
              firstErrorField.focus();
            }
          } else if (documentsSectionRef.current) {
            documentsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }
      }

      await form.handleSubmit(handleSubmit)();
    } catch (error) {
      ('handleSaveClick error:', error);
      // Dismiss existing toasts before showing general error
      toast.dismiss();
      toast.error('Error submitting form, please try again', {
        id: 'form-submit-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
    }
  };

  const addDocumentField = () => {
    if (documentFields.length >= 5) {
      // Dismiss existing toasts before showing max documents error
      toast.dismiss();
      toast.error('Cannot add more than 5 documents', {
        id: 'max-documents',
        duration: autoDismissDuration,
        position: 'top-center',
      });
      return;
    }
    appendDocument({ file: null });
  };

  const handleRemoveDocument = (index) => {
    setRemovingIndices((prev) => [...prev, index]);
    setTimeout(() => {
      setPreviews((prev) => {
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
      setPreviews((prev) => ({ ...prev, [index]: previewUrl }));
      onChange(file);
    }
    setDragStates((prev) => ({ ...prev, [index]: false }));
  };

  const handleFileChange = (index, file, onChange) => {
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreviews((prev) => ({ ...prev, [index]: previewUrl }));
      onChange(file);
    }
  };

  return (
    <Layout title="Register Employee">
      <Toaster position="top-center" />
      <Card className="bg-complementary text-body max-w-full sm:max-w-3xl xl:max-w-4xl mx-auto shadow-lg rounded-md border border-accent/10 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Add New Employee</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <Form {...form}>
            <form className="space-y-6 sm:space-y-8" ref={formRef}>
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
                            disabled={employeesLoading || locationsLoading || isSubmitting}
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
                            disabled={employeesLoading || locationsLoading || isSubmitting}
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
                            disabled={employeesLoading || locationsLoading || isSubmitting}
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
                            disabled={employeesLoading || locationsLoading || isSubmitting}
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
                          disabled={employeesLoading || locationsLoading || locations.length === 0 || isSubmitting}
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
                            disabled={employeesLoading || locationsLoading || isSubmitting}
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
                            disabled={employeesLoading || locationsLoading || isSubmitting}
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
                            disabled={employeesLoading || locationsLoading || isSubmitting}
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
                            disabled={employeesLoading || locationsLoading || isSubmitting}
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
                            disabled={employeesLoading || locationsLoading || isSubmitting}
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
                            disabled={employeesLoading || locationsLoading || isSubmitting}
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
                            disabled={employeesLoading || locationsLoading || isSubmitting}
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
                            disabled={employeesLoading || locationsLoading || isSubmitting}
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
              <div ref={documentsSectionRef}>
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
                      render={({ field: fieldProps }) => (
                        <FormItem className="p-3 sm:p-4">
                          <div
                            className={cn(
                              'relative border-2 border-dashed rounded-md p-4 sm:p-6 text-center transition-all duration-300',
                              dragStates[index] ? 'border-accent bg-accent/10' : 'border-complementary',
                              fieldProps.value ? 'bg-body' : 'bg-complementary/10',
                              (employeesLoading || locationsLoading || isSubmitting) && 'opacity-50 cursor-not-allowed'
                            )}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={() => handleDragLeave(index)}
                            onDrop={(e) => handleDrop(e, index, fieldProps.onChange)}
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
                              onChange={(e) => handleFileChange(index, e.target.files[0], fieldProps.onChange)}
                              className="hidden"
                              disabled={employeesLoading || locationsLoading || isSubmitting}
                            />
                            {!fieldProps.value ? (
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
                                    disabled={employeesLoading || locationsLoading || isSubmitting}
                                  >
                                    Choose File
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleRemoveDocument(index)}
                                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                                    disabled={employeesLoading || locationsLoading || isSubmitting}
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
                                    {getFileIcon(fieldProps.value)}
                                    <div className="truncate">
                                      <span className="text-[10px] sm:text-sm xl:text-base text-body truncate">
                                        {fieldProps.value.name}
                                      </span>
                                      <span className="text-[9px] sm:text-xs xl:text-sm text-body/60 block">
                                        ({(fieldProps.value.size / 1024 / 1024).toFixed(2)} MB)
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <a
                                      href={previews[index]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        "p-1 text-accent hover:text-accent-hover focus:ring-2 focus:ring-accent/20 rounded-full",
                                        (employeesLoading || locationsLoading || isSubmitting || !previews[index]) && "opacity-50 cursor-not-allowed"
                                      )}
                                      aria-label={`Preview document ${fieldProps.value.name}`}
                                      onClick={(e) => {
                                        if (employeesLoading || locationsLoading || isSubmitting || !previews[index]) {
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
                                      disabled={employeesLoading || locationsLoading || isSubmitting}
                                      aria-label={`Remove document ${fieldProps.value.name}`}
                                    >
                                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </Button>
                                  </div>
                                </div>
                                {isImageFile(fieldProps.value) && previews[index] && (
                                  <div className="mt-2 flex justify-center">
                                    <img
                                      src={previews[index]}
                                      alt={`Preview of ${fieldProps.value.name}`}
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
                  disabled={employeesLoading || locationsLoading || isSubmitting}
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
                  className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                  disabled={employeesLoading || locationsLoading || isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveClick}
                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md"
                  disabled={employeesLoading || locationsLoading || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Register Employee'
                  )}
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