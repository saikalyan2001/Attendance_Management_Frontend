import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerEmployee, reset } from '../redux/employeeSlice';
import { fetchMe } from '../../../redux/slices/authSlice';
import Layout from '../../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, Plus, FileText, Image, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { parseServerError } from '@/utils/errorUtils';

// Renamed File to FileIcon to avoid conflict with DOM File class
import { File as FileIcon } from 'lucide-react';

const employeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  designation: z.string().min(1, 'Designation is required'),
  department: z.string().min(1, 'Department is required'),
  salary: z
    .string()
    .min(1, 'Salary is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Salary must be a positive number',
    }),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number cannot exceed 15 digits')
    .refine((val) => /^\d+$/.test(val), {
      message: 'Phone number must contain only digits',
    }),
  joinDate: z
    .string()
    .min(1, 'Join date is required')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
  bankDetails: z.object({
    accountNo: z.string().min(1, 'Account number is required'),
    ifscCode: z.string().min(1, 'IFSC code is required'),
    bankName: z.string().min(1, 'Bank name is required'),
    accountHolder: z.string().min(1, 'Account holder name is required'),
  }),
  documents: z
    .array(
      z.object({
        file: z
          .any()
          .refine((file) => file instanceof File, 'Please upload a file')
          .refine(
            (file) => {
              if (!(file instanceof File)) return false;
              const filetypes = /pdf|doc|docx|jpg|jpeg|png/;
              const extname = filetypes.test(file.name.toLowerCase().split('.').pop());
              const mimetype = filetypes.test(file.type.toLowerCase().split('/')[1] || '');
              return extname && mimetype;
            },
            'File must be PDF, DOC, DOCX, JPG, JPEG, or PNG'
          )
          .refine((file) => {
            if (!(file instanceof File)) return false;
            return file.size <= 5 * 1024 * 1024;
          }, 'File size must be less than 5MB'),
      })
    )
    .min(1, 'At least one valid document is required'),
});

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
  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const { loading, error, success } = useSelector((state) => state.siteInchargeEmployee);
  const [formErrors, setFormErrors] = useState([]);
  const [serverError, setServerError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [removingIndices, setRemovingIndices] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragStates, setDragStates] = useState({});
  const [previewUrls, setPreviewUrls] = useState({});
  const formRef = useRef(null);
  const maxRetries = 3;
  const autoDismissDuration = 5000;

  const locationId = user?.locations?.[0]?._id;

  const form = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeId: '',
      name: '',
      email: '',
      designation: '',
      department: '',
      salary: '',
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

  const fieldErrorMessages = {
    employeeId: {
      required: 'Employee ID is required',
      invalid_type: 'Employee ID is required',
    },
    name: {
      required: 'Name is required',
      invalid_type: 'Name is required',
    },
    email: {
      required: 'Email is required',
      email: 'Invalid email address',
      invalid_type: 'Email is required',
    },
    designation: {
      required: 'Designation is required',
      invalid_type: 'Designation is required',
    },
    department: {
      required: 'Department is required',
      invalid_type: 'Department is required',
    },
    salary: {
      required: 'Salary is required',
      refine: 'Salary must be a positive number',
      invalid_type: 'Salary is required',
    },
    phone: {
      required: 'Phone number is required',
      min: 'Phone number must be at least 10 digits',
      max: 'Phone number cannot exceed 15 digits',
      refine: 'Phone number must contain only digits',
      invalid_type: 'Phone number is required',
    },
    joinDate: {
      required: 'Join date is required',
      refine: 'Invalid date format',
      invalid_type: 'Join date is required',
    },
    'bankDetails.accountNo': {
      required: 'Account number is required',
      invalid_type: 'Account number is required',
    },
    'bankDetails.ifscCode': {
      required: 'IFSC code is required',
      invalid_type: 'IFSC code is required',
    },
    'bankDetails.bankName': {
      required: 'Bank name is required',
      invalid_type: 'Bank name is required',
    },
    'bankDetails.accountHolder': {
      required: 'Account holder name is required',
      invalid_type: 'Account holder name is required',
    },
    documents: {
      required: 'At least one valid document is required',
      min: 'At least one valid document is required',
      invalid_type: 'At least one valid document is required',
    },
  };

  // Clean up preview URLs when component unmounts or documents are removed
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  useEffect(() => {
    dispatch(fetchMe()).unwrap().catch((err) => {
      ('fetchMe error:', err);
      toast.error('Failed to fetch user data', {
        id: 'fetch-user-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
      navigate('/login');
    });
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'siteincharge')) {
      toast.error('Unauthorized access. Please log in as Site Incharge.', {
        id: 'auth-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
      navigate('/login');
      return;
    }
    if (!authLoading && !user?.locations?.length) {
      toast.error('No location assigned. Please contact an admin.', {
        id: 'no-location-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
      navigate('/siteincharge/dashboard');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (error) {
      const parsedError = parseServerError(error);
      setServerError(parsedError);
      toast.error(parsedError.message, {
        id: 'register-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
      Object.entries(parsedError.fields).forEach(([field, message], index) => {
        setTimeout(() => {
          toast.error(message, {
            id: `register-error-${field}-${index}`,
            duration: autoDismissDuration,
            position: 'top-center',
          });
        }, (index + 1) * 500);
      });
      const firstErrorFieldName = Object.keys(parsedError.fields)[0];
      if (firstErrorFieldName) {
        const fieldElement = document.querySelector(`[name="${firstErrorFieldName}"]`);
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fieldElement.focus();
        }
      }
      setTimeout(() => {
        setServerError(null);
        dispatch(reset());
      }, autoDismissDuration);
    }

    if (formErrors.length > 0) {
      const firstErrorField = formErrors[0].field.includes('documents')
        ? document.querySelector(`[name="${formErrors[0].field.replace(']', '').replace('[', '.')}"`) ||
          document.querySelector(`[name="${formErrors[0].field.split('.')[0]}"]`)
        : document.querySelector(`[name="${formErrors[0].field}"]`) || formRef.current;
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
      setTimeout(() => {
        setFormErrors([]);
      }, autoDismissDuration);
    }
  }, [error, formErrors, dispatch]);

  useEffect(() => {
    if (success) {
      toast.success('Employee registered successfully', {
        id: 'register-success',
        duration: autoDismissDuration,
        position: 'top-center',
      });
      setTimeout(() => {
        dispatch(reset());
        form.reset();
        setFormErrors([]);
        setServerError(null);
        setRetryCount(0);
        setRemovingIndices([]);
        setDragStates({});
        Object.values(previewUrls).forEach((url) => {
          if (url) URL.revokeObjectURL(url);
        });
        setPreviewUrls({});
      }, autoDismissDuration);
    }
  }, [success, dispatch, form, previewUrls]);

  useEffect(() => {
    if (!loading) {
      setIsSubmitting(false);
    }
  }, [loading]);

  const handleSaveClick = async () => {
    try {
      setIsSubmitting(true);
      const isValid = await form.trigger();
      if (!isValid || !form.getValues().documents.every((doc) => doc.file instanceof File)) {
        const errors = [];
        const addError = (field, errorObj) => {
          if (errorObj) {
            const errorType = errorObj.type === 'string' || errorObj.type === 'array' ? 'required' : errorObj.type;
            errors.push({ field, message: fieldErrorMessages[field]?.[errorType] || errorObj.message });
          }
        };

        const fieldOrder = [
          'employeeId',
          'name',
          'email',
          'designation',
          'department',
          'salary',
          'phone',
          'joinDate',
          'bankDetails.accountNo',
          'bankDetails.ifscCode',
          'bankDetails.bankName',
          'bankDetails.accountHolder',
          'documents',
        ];

        for (const field of fieldOrder) {
          if (field.startsWith('bankDetails.')) {
            const [_, subField] = field.split('.');
            addError(field, form.formState.errors.bankDetails?.[subField]);
          } else if (field === 'documents') {
            const docErrors = form.formState.errors.documents;
            if (docErrors?.message) {
              errors.push({ field: 'documents', message: docErrors.message });
            } else if (Array.isArray(docErrors)) {
              docErrors.forEach((docError, index) => {
                if (docError?.file) {
                  errors.push({
                    field: `documents[${index}].file`,
                    message: docError.file.message || 'Invalid document',
                  });
                }
              });
            }
            if (form.getValues().documents.length === 0) {
              errors.push({ field: 'documents', message: 'At least one valid document is required' });
            }
          } else {
            addError(field, form.formState.errors[field]);
          }
        }

        if (errors.length > 0) {
          setFormErrors(errors);
          const firstError = errors[0];
          toast.error(firstError.message, {
            id: `register-validation-error-${firstError.field}`,
            duration: autoDismissDuration,
            position: 'top-center',
          });
          const firstErrorField = firstError.field.includes('documents')
            ? document.querySelector(`[name="${firstError.field.replace(']', '').replace('[', '.')}"`) ||
              document.querySelector(`[name="${firstError.field.split('.')[0]}"]`)
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
        id: 'register-submit-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
      setIsSubmitting(false);
    }
  };

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
        location: locationId,
        phone: data.phone,
        joinDate: new Date(data.joinDate).toISOString(),
        bankDetails: data.bankDetails,
        paidLeaves: { available: 2, used: 0, carriedForward: 0 },
        createdBy: user._id,
      };
      const documentFiles = data.documents.map((doc) => doc.file);
      await dispatch(registerEmployee({ employeeData, documents: documentFiles })).unwrap();
    } catch (error) {
      ('Submission error:', error);
      const parsedError = parseServerError(error);
      setServerError(parsedError);
      setRetryCount((prev) => prev + 1);
      toast.error(parsedError.message, {
        id: 'register-error',
        duration: 10000,
        position: 'top-center',
        action:
          retryCount < maxRetries && {
            label: 'Retry',
            onClick: () => form.handleSubmit(handleSubmit)(),
          },
      });
      Object.entries(parsedError.fields).forEach(([field, message], index) => {
        setTimeout(() => {
          toast.error(message, {
            id: `register-error-${field}-${index}`,
            duration: autoDismissDuration,
            position: 'top-center',
          });
        }, (index + 1) * 500);
      });
      const firstErrorFieldName = Object.keys(parsedError.fields)[0];
      if (firstErrorFieldName) {
        const fieldElement = document.querySelector(`[name="${firstErrorFieldName}"]`);
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fieldElement.focus();
        }
      }
    }
  };

  const addDocumentField = () => {
    appendDocument({ file: null });
  };

  const handleRemoveDocument = (index) => {
    setRemovingIndices((prev) => [...prev, index]);
    setTimeout(() => {
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

  return (
    <Layout title="Register Employee" role="siteincharge">
      <form ref={formRef}>
        <Card className="bg-complementary text-body max-w-full sm:max-w-3xl xl:max-w-4xl mx-auto shadow-lg rounded-md border border-accent/10 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Add New Employee</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <Form {...form}>
              <div className="space-y-6 sm:space-y-8">
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
                              disabled={loading || !locationId}
                              aria-label="Employee ID"
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
                              disabled={loading || !locationId}
                              aria-label="Name"
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
                              disabled={loading || !locationId}
                              aria-label="Designation"
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
                              disabled={loading || !locationId}
                              aria-label="Department"
                            />
                          </FormControl>
                          <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                            {serverError?.fields?.department || form.formState.errors.department?.message}
                          </FormMessage>
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Location *</FormLabel>
                      <Input
                        value={user?.locations?.[0]?.name || 'No location'}
                        className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                        disabled
                        aria-label="Location"
                      />
                      {(!user?.locations || user?.locations.length === 0) && (
                        <p className="text-error text-[9px] sm:text-xs xl:text-base mt-1">
                          No location assigned. Please contact an admin.
                        </p>
                      )}
                    </div>
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
                              disabled={loading || !locationId}
                              aria-label="Salary"
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
                              disabled={loading || !locationId}
                              aria-label="Join Date"
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
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Phone *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., 1234567890"
                              className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                              disabled={loading || !locationId}
                              aria-label="Phone"
                            />
                          </FormControl>
                          <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                            {serverError?.fields?.phone || form.formState.errors.phone?.message}
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
                              disabled={loading || !locationId}
                              aria-label="Email"
                            />
                          </FormControl>
                          <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                            {serverError?.fields?.email || form.formState.errors.email?.message}
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
                              disabled={loading || !locationId}
                              aria-label="Account Number"
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
                              disabled={loading || !locationId}
                              aria-label="IFSC Code"
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
                        <FormItem className="sm:col-span-2">
                          <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Bank Name *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., State Bank of India"
                              className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                              disabled={loading || !locationId}
                              aria-label="Bank Name"
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
                        <FormItem className="sm:col-span-2">
                          <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">Account Holder Name *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., Alice Johnson"
                              className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                              disabled={loading || !locationId}
                              aria-label="Account Holder Name"
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
                        removingIndices.includes(index) ? 'animate-fade-out' : 'animate-slide-in-row'
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
                                (loading || !locationId) && 'opacity-50 cursor-not-allowed'
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
                                disabled={loading || !locationId}
                                aria-label={`Upload document ${index + 1}`}
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
                                      disabled={loading || !locationId}
                                      aria-label="Choose file"
                                    >
                                      Choose File
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => handleRemoveDocument(index)}
                                      className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                                      disabled={loading || !locationId}
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
                                          'p-1 text-accent hover:text-accent-hover focus:ring-2 focus:ring-accent/20 rounded-full',
                                          (loading || !locationId || !previewUrls[index]) && 'opacity-50 cursor-not-allowed'
                                        )}
                                        aria-label={`Preview document ${field.value.name}`}
                                        onClick={(e) => {
                                          if (loading || !locationId || !previewUrls[index]) {
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
                                        disabled={loading || !locationId}
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
                    disabled={loading || !locationId}
                    aria-label="Add document"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Add Document
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/siteincharge/employees')}
                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-md"
                    disabled={loading || !locationId}
                    aria-label="Cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveClick}
                    className={cn(
                      'bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-md',
                      isSubmitting && 'animate-scale-in',
                      success && !loading && 'animate-pulse'
                    )}
                    disabled={loading || !locationId}
                    aria-label="Register Employee"
                  >
                    {loading ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : 'Register Employee'}
                  </Button>
                </div>
              </div>
            </Form>
          </CardContent>
        </Card>
      </form>
    </Layout>
  );
};

export default RegisterEmployee;