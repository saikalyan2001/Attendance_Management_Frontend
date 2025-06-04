import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmployeeById, fetchEmployeeAttendance, addEmployeeDocuments, updateEmployee, reset as resetEmployees } from '../redux/employeeSlice';
import { fetchSettings } from '../redux/settingsSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Edit, Upload, Loader2, Eye, ArrowUpDown, X, AlertCircle, Trash, Copy, ArrowLeft, Search, FileText, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate, useParams } from 'react-router-dom';

// File icon component
const FileIcon = () => <svg className="h-5 w-5 text-body" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;

// Get file icon based on extension
const getFileIcon = (fileName) => {
  if (!fileName) return <FileIcon className="h-5 w-5 text-body" />;
  const extension = fileName.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png'].includes(extension)) {
    return <ImageIcon className="h-5 w-5 text-body" />;
  }
  if (['pdf'].includes(extension)) {
    return <FileText className="h-5 w-5 text-body" />;
  }
  if (['doc', 'docx'].includes(extension)) {
    return <FileText className="h-5 w-5 text-body" />;
  }
  return <FileIcon className="h-5 w-5 text-body" />;
};

// Check if file is an image for preview
const isImageFile = (fileName) => {
  if (!fileName) return false;
  const extension = fileName.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png'].includes(extension);
};

// Define validation schemas
const bankDetailsSchema = z.object({
  accountNo: z.string().min(1, 'This field is required').optional(),
  ifscCode: z.string().min(1, 'This field is required').optional(),
  bankName: z.string().min(1, 'This field is required').optional(),
  accountHolder: z.string().min(1, 'This field is required').optional(),
}).refine(
  (data) => {
    const hasAnyBankDetail = data.accountNo || data.ifscCode || data.bankName || data.accountHolder;
    if (hasAnyBankDetail) {
      return data.accountNo && data.ifscCode && data.bankName && data.accountHolder;
    }
    return true;
  },
  {
    message: 'All bank details are required if any bank detail is provided',
    path: ['bankDetails'],
  }
);

const editEmployeeSchema = z.object({
  name: z.string().min(3, 'This field is required').max(50, 'Name must be 50 characters or less'),
  email: z.string().email('Invalid email address'),
  designation: z.string().min(2, 'This field is required').max(50, 'Designation must be 50 characters or less'),
  department: z.string().min(2, 'This field is required').max(50, 'Department must be 50 characters or less'),
  salary: z.string().min(1, 'This field is required').refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 1000;
  }, { message: 'Invalid salary' }),
  phone: z.string().optional().refine((val) => !val || /^\d{10}$/.test(val), { message: 'Invalid phone number' }),
  dob: z.string().optional().refine((val) => !val || (new Date(val) <= new Date() && !isNaN(new Date(val))), { message: 'Invalid date of birth' }),
  bankDetails: bankDetailsSchema,
});

const uploadDocumentSchema = z.object({
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
  const message = error.message || 'Operation failed';
  const fields = error.errors?.reduce((acc, err) => {
    acc[err.field] = err.message;
    return acc;
  }, {}) || {};
  return { message, fields };
};

const EmployeeProfile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const { currentEmployee, attendance, loading, error } = useSelector((state) => state.adminEmployees);
  const { settings, loadingFetch: loadingSettings, error: settingsError } = useSelector((state) => state.adminSettings);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [formErrors, setFormErrors] = useState([]);
  const [serverError, setServerError] = useState(null);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragStates, setDragStates] = useState({});
  const [previewUrls, setPreviewUrls] = useState({});
  const [removingIndices, setRemovingIndices] = useState([]);
  const ITEMS_PER_PAGE = 10;
  const autoDismissDuration = 5000;

  const editForm = useForm({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      name: '',
      email: '',
      designation: '',
      department: '',
      salary: '1000',
      phone: '',
      dob: '',
      bankDetails: {
        accountNo: '',
        ifscCode: '',
        bankName: '',
        accountHolder: '',
      },
    },
  });

  const uploadForm = useForm({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: {
      documents: [],
    },
  });

  const { fields: documentFields, append: appendDocument, remove: removeDocument } = useFieldArray({
    control: uploadForm.control,
    name: 'documents',
  });

  useEffect(() => {
    if (user?.role !== 'admin') navigate('/login');
    dispatch(fetchEmployeeById(id));
    dispatch(fetchEmployeeAttendance({ employeeId: id, month: monthFilter, year: yearFilter }));
    dispatch(fetchSettings());
    return () => {
      dispatch(resetEmployees());
    };
  }, [dispatch, id, user, navigate, monthFilter, yearFilter]);

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  useEffect(() => {
    if (settingsError) {
      setServerError({ message: settingsError, fields: {} });
      setShowErrorAlert(true);
      toast.error(settingsError, {
        action: {
          label: 'Retry',
          onClick: () => {
            dispatch(fetchSettings());
            setShowErrorAlert(false);
            setServerError(null);
          },
        },
        duration: autoDismissDuration,
      });

      const errorTimer = setTimeout(() => {
        setShowErrorAlert(false);
        setServerError(null);
        dispatch(resetEmployees());
      }, autoDismissDuration);

      return () => clearTimeout(errorTimer);
    }
  }, [settingsError, dispatch]);

  const HIGHLIGHT_DURATION = settings?.highlightDuration ?? 24 * 60 * 60 * 1000;

  const shouldHighlightEmployee = (employee) => {
    if (!employee?.transferTimestamp) {
      console.log("No transferTimestamp found for employee:", employee);
      return false;
    }

    const transferDate = new Date(employee.transferTimestamp);
    if (isNaN(transferDate.getTime())) {
      console.error("Invalid transferTimestamp:", employee.transferTimestamp);
      return false;
    }

    const currentTime = new Date("2025-06-02T11:02:00+05:30").getTime(); // Updated to current date and time
    const transferTime = transferDate.getTime();
    const timeDifference = currentTime - transferTime;

    console.log({
      currentTime: new Date(currentTime).toISOString(),
      transferTime: new Date(transferTime).toISOString(),
      timeDifference: timeDifference / (1000 * 60 * 60),
      highlightDuration: HIGHLIGHT_DURATION / (1000 * 60 * 60),
      shouldHighlight: timeDifference <= HIGHLIGHT_DURATION,
    });

    return timeDifference <= HIGHLIGHT_DURATION;
  };

  useEffect(() => {
    if (!currentEmployee) return;

    setIsHighlighted(shouldHighlightEmployee(currentEmployee));

    const interval = setInterval(() => {
      const highlighted = shouldHighlightEmployee(currentEmployee);
      setIsHighlighted(highlighted);
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [currentEmployee, HIGHLIGHT_DURATION]);

  // Handle errors and form errors without affecting the modal
  useEffect(() => {
    if (error || formErrors.length > 0) {
      const parsedError = error ? parseServerError(error) : { message: 'Form validation failed', fields: {} };
      setServerError(parsedError);
      setShowErrorAlert(true);
      toast.error(parsedError.message, {
        action: {
          label: 'Retry',
          onClick: () => {
            if (error) {
              dispatch(fetchEmployeeById(id));
              dispatch(fetchEmployeeAttendance({ employeeId: id, month: monthFilter, year: yearFilter }));
            }
            setShowErrorAlert(false);
            setServerError(null);
            setFormErrors([]);
          },
        },
        duration: autoDismissDuration,
      });

      const errorTimer = setTimeout(() => {
        setShowErrorAlert(false);
        setServerError(null);
        setFormErrors([]);
        if (error) {
          dispatch(resetEmployees());
        }
      }, autoDismissDuration);

      return () => clearTimeout(errorTimer);
    }
  }, [error, formErrors, dispatch, id, monthFilter, yearFilter]);

  const sortedAttendance = useMemo(() => {
    return [...attendance].sort((a, b) => {
      const aValue = sortField === 'date' ? new Date(a.date) : a.status;
      const bValue = sortField === 'date' ? new Date(b.date) : b.status;
      if (sortField === 'date') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [attendance, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedAttendance.length / ITEMS_PER_PAGE);
  const paginatedAttendance = sortedAttendance.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const filteredDocuments = useMemo(() => {
    if (!currentEmployee?.documents) return [];
    if (!searchQuery) return currentEmployee.documents;
    return currentEmployee.documents.filter((doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentEmployee?.documents, searchQuery]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleEditSubmit = async (data) => {
    try {
      // Reset previous errors
      setFormErrors([]);
      setServerError(null);
      setShowErrorAlert(false);

      // Validate the form
      const isValid = await editForm.trigger();
      if (!isValid) {
        const errors = Object.entries(editForm.formState.errors).map(([field, error]) => ({
          field,
          message: error.message || 'Invalid input',
        }));
        setFormErrors(errors);
        toast.error('Please fix the form errors before submitting', { duration: autoDismissDuration });
        return; // Keep the modal open
      }

      const employeeData = {
        name: data.name,
        email: data.email,
        designation: data.designation,
        department: data.department,
        salary: Number(data.salary),
        phone: data.phone || undefined,
        dob: data.dob || undefined,
        bankDetails: data.bankDetails,
      };

      await dispatch(updateEmployee({ id, data: employeeData })).unwrap();
      toast.success('Employee updated successfully', { duration: autoDismissDuration });
      setEditDialogOpen(false); // Close the modal only on success
    } catch (err) {
      const parsedError = parseServerError(err);
      setServerError(parsedError);
      setShowErrorAlert(true);
      toast.error(parsedError.message, { duration: autoDismissDuration });
      // Do NOT close the modal on error, let the user fix the issue
    }
  };

  const handleDocumentSubmit = async (data) => {
    try {
      // Reset previous errors
      setFormErrors([]);
      setServerError(null);
      setShowErrorAlert(false);

      const isValid = await uploadForm.trigger();
      const errors = Object.entries(uploadForm.formState.errors).map(([field, error]) => ({
        field,
        message: error.message || 'Invalid input',
      }));
      setFormErrors(errors);

      if (!isValid) {
        toast.error('Please fix the form errors before submitting', { duration: autoDismissDuration });
        return; // Keep the modal open
      }

      await dispatch(addEmployeeDocuments({ id, documents: data.documents })).unwrap();
      toast.success('Documents uploaded successfully', { duration: autoDismissDuration });
      setUploadDialogOpen(false);
      setPreviewOpen(false);
      setPreviewDocument(null);
      setDragStates({});
      setPreviewUrls({});
      setRemovingIndices([]);
    } catch (err) {
      const parsedError = parseServerError(err);
      setServerError(parsedError);
      setShowErrorAlert(true);
      toast.error(parsedError.message, { duration: autoDismissDuration });
      // Do NOT close the modal on error
    }
  };

  const handlePreviewDocument = (file) => {
    if (file && ['image/jpeg', 'image/png'].includes(file.type)) {
      setPreviewDocument(file);
      setPreviewOpen(true);
    } else {
      toast.info('Preview available only for JPEG and PNG files', { duration: autoDismissDuration });
    }
  };

  const fetchDocumentForPreview = async (docPath, docName) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000${docPath}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }

      const blob = await response.blob();
      const file = new File([blob], docName, { type: blob.type });
      handlePreviewDocument(file);
    } catch (err) {
      toast.error('Failed to fetch document for preview: ' + err.message, { duration: autoDismissDuration });
    }
  };

  const handleDownloadDocument = async (docPath, docName) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000${docPath}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = docName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download document: ' + err.message, { duration: autoDismissDuration });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!', { duration: autoDismissDuration });
    }).catch(() => {
      toast.error('Failed to copy to clipboard', { duration: autoDismissDuration });
    });
  };

  const handleMonthChange = (value) => {
    setMonthFilter(parseInt(value));
    setCurrentPage(1);
  };

  const handleYearChange = (value) => {
    setYearFilter(parseInt(value));
    setCurrentPage(1);
  };

  const handleDismissErrors = () => {
    setShowErrorAlert(false);
    setServerError(null);
    setFormErrors([]);
    dispatch(resetEmployees());
    toast.dismiss();
  };

  const openEditDialog = (emp) => {
    // Reset errors when opening the dialog
    setFormErrors([]);
    setServerError(null);
    setShowErrorAlert(false);

    editForm.reset({
      name: emp.name,
      email: emp.email,
      designation: emp.designation,
      department: emp.department,
      salary: emp.salary.toString(),
      phone: emp.phone || '',
      dob: emp.dob ? new Date(emp.dob).toISOString().split('T')[0] : '',
      bankDetails: {
        accountNo: emp.bankDetails?.accountNo || '',
        ifscCode: emp.bankDetails?.ifscCode || '',
        bankName: emp.bankDetails?.bankName || '',
        accountHolder: emp.bankDetails?.accountHolder || '',
      },
    });
    setEditDialogOpen(true);
  };

  const openUploadDialog = () => {
    // Reset errors when opening the dialog
    setFormErrors([]);
    setServerError(null);
    setShowErrorAlert(false);

    uploadForm.reset({
      documents: [],
    });
    setUploadDialogOpen(true);
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

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  if (loading || !currentEmployee || loadingSettings) {
    return (
      <Layout title="Employee Profile">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <Card className="bg-complementary text-body shadow-md">
            <CardHeader>
              <Skeleton className="h-8 w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array(5).fill().map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
              <Skeleton className="h-10 w-32 mt-4" />
            </CardContent>
          </Card>
          <Card className="bg-complementary text-body shadow-md mt-6">
            <CardHeader>
              <Skeleton className="h-8 w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array(3).fill().map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Employee Profile">
      {/* Error Alert */}
      {(serverError || formErrors.length > 0) && showErrorAlert && (
        <Alert
          variant="destructive"
          className={cn(
            'fixed top-4 right-4 w-80 sm:w-96 z-[100] border-error text-error rounded-md shadow-lg bg-error-light',
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
                    <li key={index}>{error.message} (Field: {error.field})</li>
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
            aria-label="Dismiss error alert"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Alert>
      )}

      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => navigate('/admin/employees')}
          className="mb-4 border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md"
          aria-label="Go back to employee list"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="space-y-6">
          {/* Employee Details Card */}
          <Card
            className={cn(
              "bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in",
              isHighlighted ? "bg-accent-light animate-pulse" : ""
            )}
          >
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl font-bold flex items-center">
                Employee Details
                {isHighlighted && (
                  <span className="text-sm text-accent-dark font-normal ml-2">(Recently Transferred)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-body text-sm font-semibold">Name</Label>
                    <p className="text-body text-sm">{currentEmployee.name}</p>
                  </div>
                  <div>
                    <Label className="text-body text-sm font-semibold">Employee ID</Label>
                    <p className="text-body text-sm">{currentEmployee.employeeId}</p>
                  </div>
                  <div>
                    <Label className="text-body text-sm font-semibold">Email</Label>
                    <div className="flex items-center space-x-2">
                      <p className="text-body text-sm">{currentEmployee.email}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(currentEmployee.email)}
                        aria-label="Copy email to clipboard"
                      >
                        <Copy className="h-4 w-4 text-accent" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-body text-sm font-semibold">Designation</Label>
                    <p className="text-body text-sm">{currentEmployee.designation}</p>
                  </div>
                  <div>
                    <Label className="text-body text-sm font-semibold">Department</Label>
                    <p className="text-body text-sm">{currentEmployee.department}</p>
                  </div>
                  <div>
                    <Label className="text-body text-sm font-semibold">Salary</Label>
                    <p className="text-body text-sm">₹{(parseFloat(currentEmployee.salary) || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-body text-sm font-semibold">Location</Label>
                    <p className="text-body text-sm">{currentEmployee.location?.city || currentEmployee.location?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <Label className="text-body text-sm font-semibold">Phone</Label>
                    <div className="flex items-center space-x-2">
                      <p className="text-body text-sm">{currentEmployee.phone || '-'}</p>
                      {currentEmployee.phone && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(currentEmployee.phone)}
                          aria-label="Copy phone number to clipboard"
                        >
                          <Copy className="h-4 w-4 text-accent" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-body text-sm font-semibold">Date of Birth</Label>
                    <p className="text-body text-sm">
                      {currentEmployee.dob ? format(new Date(currentEmployee.dob), 'MMM d, yyyy') : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-body text-sm font-semibold">Join Date</Label>
                    <p className="text-body text-sm">
                      {currentEmployee.joinDate ? format(new Date(currentEmployee.joinDate), 'MMM d, yyyy') : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-body text-sm font-semibold">Paid Leaves</Label>
                    <p className="text-body text-sm">
                      Available: {currentEmployee.paidLeaves.available}, Used: {currentEmployee.paidLeaves.used}, Carried Forward: {currentEmployee.paidLeaves.carriedForward || 0}
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <Label className="text-body text-sm font-semibold">Bank Details</Label>
                  {currentEmployee.bankDetails ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div>
                        <Label className="text-body text-sm font-medium">Account Number</Label>
                        <p className="text-body text-sm">{currentEmployee.bankDetails.accountNo}</p>
                      </div>
                      <div>
                        <Label className="text-body text-sm font-medium">IFSC Code</Label>
                        <p className="text-body text-sm">{currentEmployee.bankDetails.ifscCode}</p>
                      </div>
                      <div>
                        <Label className="text-body text-sm font-medium">Bank Name</Label>
                        <p className="text-body text-sm">{currentEmployee.bankDetails.bankName}</p>
                      </div>
                      <div>
                        <Label className="text-body text-sm font-medium">Account Holder</Label>
                        <p className="text-body text-sm">{currentEmployee.bankDetails.accountHolder}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-body text-sm mt-2">No bank details available</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => openEditDialog(currentEmployee)}
                  className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md"
                  aria-label="Edit employee details"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Attendance History Card */}
          <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-xl md:text-2xl font-bold">
                Attendance History
                <div className="flex gap-2">
                  <Select value={monthFilter.toString()} onValueChange={handleMonthChange}>
                    <SelectTrigger className="bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md h-9 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()} className="text-sm">
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={yearFilter.toString()} onValueChange={handleYearChange}>
                    <SelectTrigger className="bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md h-9 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()} className="text-sm">
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {loading ? (
                <div className="space-y-4">
                  {Array(3).fill().map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : paginatedAttendance.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-body">
                            <Button variant="ghost" onClick={() => handleSort('date')} className="flex items-center space-x-1">
                              Date
                              <ArrowUpDown className="h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-body">
                            <Button variant="ghost" onClick={() => handleSort('status')} className="flex items-center space-x-1">
                              Status
                              <ArrowUpDown className="h-4 w-4" />
                            </Button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedAttendance.map((att) => (
                          <TableRow key={att._id}>
                            <TableCell className="text-body text-sm">
                              {format(new Date(att.date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  att.status === 'present'
                                    ? 'success'
                                    : att.status === 'absent'
                                    ? 'destructive'
                                    : 'warning'
                                }
                                className="text-sm"
                              >
                                {att.status.charAt(0).toUpperCase() + att.status.slice(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md"
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-body">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-body text-sm">No attendance records found</p>
              )}
            </CardContent>
          </Card>

          {/* Documents Card */}
          <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl font-bold">Documents</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={openUploadDialog}
                  className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md"
                  aria-label="Upload new documents"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>

                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search documents by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-sm pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-accent" />
                </div>

                {filteredDocuments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-body text-sm">Name</TableHead>
                          <TableHead className="text-body text-sm">Size</TableHead>
                          <TableHead className="text-body text-sm">Uploaded At</TableHead>
                          <TableHead className="text-body text-sm">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDocuments.map((doc, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-body text-sm">
                              <div className="flex items-center space-x-2">
                                {getFileIcon(doc.name)}
                                <span>{doc.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-body text-sm">
                              {(doc.size / 1024 / 1024).toFixed(2)} MB
                            </TableCell>
                            <TableCell className="text-body text-sm">
                              {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                {doc.path.match(/\.(jpeg|jpg|png)$/i) && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => fetchDocumentForPreview(doc.path, doc.name)}
                                    className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md"
                                    aria-label={`Preview ${doc.name}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDownloadDocument(doc.path, doc.name)}
                                  className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md"
                                  aria-label={`Download ${doc.name}`}
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 6l-4-4m0 0L8 6m4-4v12" />
                                  </svg>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-body text-sm">
                    {searchQuery ? 'No documents match your search.' : 'No documents uploaded.'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Employee Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(isOpen) => {
          setEditDialogOpen(isOpen);
          if (!isOpen) {
            setFormErrors([]);
            setServerError(null);
            setShowErrorAlert(false);
          }
        }}>
          <DialogContent className="bg-complementary text-body border-accent max-w-[90vw] sm:max-w-lg max-h-[70vh] h-full overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0 px-4 sm:px-6 pt-4">
              <DialogTitle className="text-lg">Edit Employee</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-3">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-sm font-medium">Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Alice Johnson"
                            className="h-9 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-sm"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-xs">
                          {serverError?.fields?.name || editForm.formState.errors.name?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-sm font-medium">Email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            {...field}
                            placeholder="e.g., alice@example.com"
                            className="h-9 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-sm"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-xs">
                          {serverError?.fields?.email || editForm.formState.errors.email?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-sm font-medium">Designation *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Analyst"
                            className="h-9 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-sm"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-xs">
                          {serverError?.fields?.designation || editForm.formState.errors.designation?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-sm font-medium">Department *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Finance"
                            className="h-9 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-sm"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-xs">
                          {serverError?.fields?.department || editForm.formState.errors.department?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-sm font-medium">Salary *</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            {...field}
                            placeholder="e.g., 55000"
                            className="h-9 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-sm"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-xs">
                          {serverError?.fields?.salary || editForm.formState.errors.salary?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-sm font-medium">Phone</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., 1234567890"
                            className="h-9 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-sm"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-xs">
                          {serverError?.fields?.phone || editForm.formState.errors.phone?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body text-sm font-medium">Date of Birth</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            className="h-9 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-sm"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage className="text-error text-xs">
                          {serverError?.fields?.dob || editForm.formState.errors.dob?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <div className="space-y-3">
                    <Label className="text-body text-sm font-medium">Bank Details</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={editForm.control}
                        name="bankDetails.accountNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-body text-sm font-medium">Account Number</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., 1234567890"
                                className="h-9 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-sm"
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage className="text-error text-xs">
                              {serverError?.fields?.bankDetails?.accountNo || editForm.formState.errors.bankDetails?.accountNo?.message}
                            </FormMessage>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="bankDetails.ifscCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-body text-sm font-medium">IFSC Code</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., ABCD0001234"
                                className="h-9 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-sm"
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage className="text-error text-xs">
                              {serverError?.fields?.bankDetails?.ifscCode || editForm.formState.errors.bankDetails?.ifscCode?.message}
                            </FormMessage>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="bankDetails.bankName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-body text-sm font-medium">Bank Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., State Bank of India"
                                className="h-9 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-sm"
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage className="text-error text-xs">
                              {serverError?.fields?.bankDetails?.bankName || editForm.formState.errors.bankDetails?.bankName?.message}
                            </FormMessage>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="bankDetails.accountHolder"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-body text-sm font-medium">Account Holder</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., Alice Johnson"
                                className="h-9 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-sm"
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage className="text-error text-xs">
                              {serverError?.fields?.bankDetails?.accountHolder || editForm.formState.errors.bankDetails?.accountHolder?.message}
                            </FormMessage>
                          </FormItem>
                        )}
                      />
                    </div>
                    {editForm.formState.errors.bankDetails && !editForm.formState.errors.bankDetails.accountNo && (
                      <p className="text-error text-xs mt-2">{editForm.formState.errors.bankDetails.message}</p>
                    )}
                  </div>
                </div>
                <DialogFooter className="shrink-0 px-4 sm:px-6 py-4 border-t border-accent/20 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    className="border-accent text-accent hover:bg-accent-hover rounded-md text-sm py-2 px-3"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-accent text-body hover:bg-accent-hover rounded-md text-sm py-2 px-3"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Upload Documents Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={(isOpen) => {
          setUploadDialogOpen(isOpen);
          if (!isOpen) {
            setFormErrors([]);
            setServerError(null);
            setShowErrorAlert(false);
          }
        }}>
          <DialogContent className="bg-complementary text-body max-h-[80vh] overflow-y-auto max-w-[90vw] sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Add Documents</DialogTitle>
              <DialogDescription>Upload documents (PDF, DOC, DOCX, JPG, JPEG, PNG; Max 5MB).</DialogDescription>
            </DialogHeader>
            <Form {...uploadForm}>
              <form onSubmit={uploadForm.handleSubmit(handleDocumentSubmit)} className="space-y-4 p-4">
                {documentFields.map((field, index) => (
                  <div
                    key={field.id}
                    className={cn(
                      'mb-3 sm:mb-4 rounded-md border border-complementary/30 bg-body shadow-sm hover:shadow-md transition-shadow duration-300',
                      removingIndices.includes(index) ? 'animate-fade-out' : 'animate-slide-in-row'
                    )}
                  >
                    <FormField
                      control={uploadForm.control}
                      name={`documents.${index}.file`}
                      render={({ field }) => (
                        <FormItem className="p-3 sm:p-4">
                          <div
                            className={cn(
                              'relative border-2 border-dashed rounded-md p-4 sm:p-6 text-center transition-all duration-300',
                              dragStates[index] ? 'border-accent bg-accent/10' : 'border-complementary',
                              field.value ? 'bg-body' : 'bg-complementary/10',
                              loading && 'opacity-50 cursor-not-allowed'
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
                                document.getElementById(`add-document-${index}`).click();
                              }
                            }}
                          >
                            <Input
                              id={`add-document-${index}`}
                              type="file"
                              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                              onChange={(e) => handleFileChange(index, e.target.files[0], field.onChange)}
                              className="hidden"
                              disabled={loading}
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
                                    onClick={() => document.getElementById(`add-document-${index}`).click()}
                                    className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                                    disabled={loading}
                                  >
                                    Choose File
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleRemoveDocument(index)}
                                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                                    disabled={loading}
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
                                    {getFileIcon(field.value.name)}
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
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handlePreviewDocument(field.value)}
                                      className={cn(
                                        "p-1 text-accent hover:text-accent-hover focus:ring-2 focus:ring-accent/20 rounded-full",
                                        (loading || !previewUrls[index]) && "opacity-50 cursor-not-allowed"
                                      )}
                                      disabled={loading || !isImageFile(field.value.name)}
                                      aria-label={`Preview document ${field.value.name}`}
                                    >
                                      <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveDocument(index)}
                                      className="text-error hover:text-error-hover focus:ring-2 focus:ring-error/20 rounded-full"
                                      disabled={loading}
                                      aria-label={`Remove document ${field.value.name}`}
                                    >
                                      <Trash className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </Button>
                                  </div>
                                </div>
                                {isImageFile(field.value.name) && previewUrls[index] && (
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
                          <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base mt-2" />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  onClick={() => appendDocument({ file: null })}
                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md"
                  disabled={loading}
                >
                  <Upload className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Add Document
                </Button>
                <DialogFooter className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUploadDialogOpen(false)}
                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
                    disabled={loading}
                    aria-label="Cancel add documents"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
                    disabled={loading}
                    aria-label="Upload documents"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Upload Documents'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Document Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl bg-complementary text-body border-accent">
            <DialogHeader>
              <DialogTitle>Document Preview</DialogTitle>
            </DialogHeader>
            {previewDocument ? (
              <div className="relative">
                <img
                  src={URL.createObjectURL(previewDocument)}
                  alt={previewDocument.name}
                  className="w-full h-48 object-contain rounded-md"
                />
                <p className="text-sm mt-1 truncate">{previewDocument.name}</p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setPreviewDocument(null);
                    setPreviewOpen(false);
                  }}
                  disabled={loading}
                  aria-label="Close preview"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-body text-sm">No document to preview</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default EmployeeProfile;