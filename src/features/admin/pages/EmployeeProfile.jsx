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
  const fields = error.field ? { [error.field]: error.message } : 
    (error.errors?.reduce((acc, err) => {
      acc[err.field] = err.message;
      return acc;
    }, {}) || {});
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

  const totalYearlyPaidLeaves = useMemo(() => {
    if (!currentEmployee?.joinDate || !settings?.paidLeavesPerYear) {
      return settings?.paidLeavesPerYear || 0;
    }

    const joinDate = new Date(currentEmployee.joinDate);
    const joinYear = joinDate.getFullYear();
    const joinMonth = joinDate.getMonth();
    const currentYear = new Date().getFullYear();

    if (joinYear === currentYear) {
      const remainingMonths = 12 - joinMonth;
      return Math.round((settings.paidLeavesPerYear * remainingMonths) / 12);
    }

    return settings.paidLeavesPerYear;
  }, [currentEmployee?.joinDate, settings?.paidLeavesPerYear]);

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
    console.log('Attendance data:', attendance); // Debug attendance data
    return () => {
      Object.values(previewUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [attendance, previewUrls]);

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
    if (!employee?.transferTimestamp) return false;

    const transferDate = new Date(employee.transferTimestamp);
    if (isNaN(transferDate.getTime())) return false;

    const currentTime = new Date().getTime();
    const transferTime = transferDate.getTime();
    const timeDifference = currentTime - transferTime;

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
        if (error) dispatch(resetEmployees());
      }, autoDismissDuration);

      return () => clearTimeout(errorTimer);
    }
  }, [error, formErrors, dispatch, id, monthFilter, yearFilter]);

  const sortedAttendance = useMemo(() => {
    // Filter attendance records for the current employee, skipping null/undefined records
    const filteredAttendance = attendance.filter(
      (record) => record && record.employee && record.employee._id && record.employee._id.toString() === id
    );

    // Deduplicate by date and employee
    const uniqueAttendance = [];
    const seenKeys = new Set();
    filteredAttendance.forEach((record) => {
      const dateKey = `${record.employee._id}_${format(new Date(record.date), 'yyyy-MM-dd')}`;
      if (!seenKeys.has(dateKey)) {
        seenKeys.add(dateKey);
        uniqueAttendance.push(record);
      }
    });

    return uniqueAttendance.sort((a, b) => {
      const aValue = sortField === 'date' ? new Date(a.date) : a.status;
      const bValue = sortField === 'date' ? new Date(b.date) : b.status;
      if (sortField === 'date') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [attendance, sortField, sortOrder, id]);

  const totalPages = Math.ceil(sortedAttendance.length / ITEMS_PER_PAGE);
  const paginatedAttendance = sortedAttendance.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  console.log("paginatedAttendance", paginatedAttendance);
  console.log("sortedAttendance", sortedAttendance);

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
      setFormErrors([]);
      setServerError(null);
      setShowErrorAlert(false);

      const isValid = await editForm.trigger();
      if (!isValid) {
        const errors = Object.entries(editForm.formState.errors).map(([field, error]) => ({
          field,
          message: error.message || 'Invalid input',
        }));
        setFormErrors(errors);
        toast.error('Please fix the form errors before submitting', { duration: autoDismissDuration });
        return;
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
      setEditDialogOpen(false);
    } catch (err) {
      const parsedError = parseServerError(err);
      setServerError(parsedError);
      setShowErrorAlert(true);
      toast.error(parsedError.message, { duration: autoDismissDuration });
    }
  };

  const handleDocumentSubmit = async (data) => {
    try {
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
        return;
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
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`http://localhost:5000${docPath}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch document');

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
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`http://localhost:5000${docPath}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to download document');

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
                  <Skeleton key={i} className="h-10 w-full" />
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
      {serverError && showErrorAlert && (
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
            <p>{serverError.message}</p>
            {Object.keys(serverError.fields).length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-track-complementary">
                <ul className="list-disc pl-5 space-y-1">
                  {Object.entries(serverError.fields).map(([field, message], index) => (
                    <li key={index}>{message} (Field: {field})</li>
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
        <Button
          variant="outline"
          onClick={() => navigate('/admin/employees')}
          className="mb-4 border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md"
          aria-label="Go back to employee list"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className={cn(
          'bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in',
          isHighlighted && 'border-accent/50 bg-accent/5'
        )}>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl font-bold flex items-center justify-between">
              <span>{currentEmployee.name}'s Profile</span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(currentEmployee)}
                  className="border-accent text-accent rounded-md"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openUploadDialog}
                  className="border-accent text-accent rounded-md"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Employee ID</Label>
                <div className="flex items-center mt-1">
                  <p className="text-body">{currentEmployee.employeeId}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(currentEmployee.employeeId)}
                    className="ml-2"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <div className="flex items-center mt-1">
                  <p className="text-body">{currentEmployee.email}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(currentEmployee.email)}
                    className="ml-2"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Designation</Label>
                <p className="text-body mt-1">{currentEmployee.designation}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Department</Label>
                <p className="text-body mt-1">{currentEmployee.department}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Salary</Label>
                <p className="text-body mt-1">₹{currentEmployee.salary.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Phone</Label>
                <p className="text-body mt-1">{currentEmployee.phone || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Date of Birth</Label>
                <p className="text-body mt-1">
                  {currentEmployee.dob ? format(new Date(currentEmployee.dob), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Join Date</Label>
                <p className="text-body mt-1">
                  {currentEmployee.joinDate ? format(new Date(currentEmployee.joinDate), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Location</Label>
                <p className="text-body mt-1">{currentEmployee.location?.city || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Paid Leaves</Label>
                <p className="text-body mt-1">
                  {currentEmployee.paidLeaves?.available || 0} / {totalYearlyPaidLeaves} available
                </p>
              </div>
            </div>

            {currentEmployee.bankDetails && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold">Bank Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-sm font-medium">Account Number</Label>
                    <p className="text-body mt-1">{currentEmployee.bankDetails.accountNo || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">IFSC Code</Label>
                    <p className="text-body mt-1">{currentEmployee.bankDetails.ifscCode || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Bank Name</Label>
                    <p className="text-body mt-1">{currentEmployee.bankDetails.bankName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Account Holder</Label>
                    <p className="text-body mt-1">{currentEmployee.bankDetails.accountHolder || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-lg font-semibold">Attendance History</h3>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2">
                <div className="flex space-x-2">
                  <Select value={monthFilter.toString()} onValueChange={handleMonthChange}>
                    <SelectTrigger className="w-[140px] bg-body text-body border-complementary">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={yearFilter.toString()} onValueChange={handleYearChange}>
                    <SelectTrigger className="w-[100px] bg-body text-body border-complementary">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body">
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Table className="mt-4">
                <TableHeader>
                  <TableRow className="bg-accent/10">
                    <TableHead
                      onClick={() => handleSort('date')}
                      className="cursor-pointer flex items-center"
                    >
                      Date
                      {sortField === 'date' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort('status')}
                      className="cursor-pointer flex items-center"
                    >
                      Status
                      {sortField === 'status' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAttendance.length > 0 ? (
                    paginatedAttendance.map((record) => (
                      <TableRow key={record._id || Math.random()}>
                        <TableCell>{format(new Date(record.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === 'present'
                                ? 'success'
                                : record.status === 'absent'
                                ? 'destructive'
                                : 'default'
                            }
                          >
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.location?.name || 'N/A'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="border-accent text-accent rounded-md"
                  >
                    Previous
                  </Button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="border-accent text-accent rounded-md"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold">Documents</h3>
              <div className="flex items-center mt-2">
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm bg-body text-body border-complementary focus:border-accent rounded-md"
                />
                <Search className="h-5 w-5 ml-2 text-body" />
              </div>
              <Table className="mt-4">
                <TableHeader>
                  <TableRow className="bg-accent/10">
                    <TableHead>Name</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                      <TableRow key={doc._id}>
                        <TableCell className="flex items-center">
                          {getFileIcon(doc.name)}
                          <span className="ml-2">{doc.name}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {isImageFile(doc.name) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchDocumentForPreview(doc.path, doc.name)}
                                className="border-accent text-accent rounded-md"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDocument(doc.path, doc.name)}
                              className="border-accent text-accent rounded-md"
                            >
                              Download
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center">
                        No documents found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-complementary text-body rounded-md max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-track-complementary">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-md" />
                        </FormControl>
                        <FormMessage />
                        {serverError?.fields?.name && <p className="text-error text-xs">{serverError.fields.name}</p>}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" className="bg-body text-body border-complementary focus:border-accent rounded-md" />
                        </FormControl>
                        <FormMessage />
                        {serverError?.fields?.email && <p className="text-error text-xs">{serverError.fields.email}</p>}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation *</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-md" />
                        </FormControl>
                        <FormMessage />
                        {serverError?.fields?.designation && <p className="text-error text-xs">{serverError.fields.designation}</p>}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department *</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-md" />
                        </FormControl>
                        <FormMessage />
                        {serverError?.fields?.department && <p className="text-error text-xs">{serverError.fields.department}</p>}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salary *</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" className="bg-body text-body border-complementary focus:border-accent rounded-md" />
                        </FormControl>
                        <FormMessage />
                        {serverError?.fields?.salary && <p className="text-error text-xs">{serverError.fields.salary}</p>}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-md" />
                        </FormControl>
                        <FormMessage />
                        {serverError?.fields?.phone && <p className="text-error text-xs">{serverError.fields.phone}</p>}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className="bg-body text-body border-complementary focus:border-accent rounded-md" />
                        </FormControl>
                        <FormMessage />
                        {serverError?.fields?.dob && <p className="text-error text-xs">{serverError.fields.dob}</p>}
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>Bank Details</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="bankDetails.accountNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-md" />
                          </FormControl>
                          <FormMessage />
                          {serverError?.fields?.['bankDetails.accountNo'] && <p className="text-error text-xs">{serverError.fields['bankDetails.accountNo']}</p>}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="bankDetails.ifscCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IFSC Code</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-md" />
                          </FormControl>
                          <FormMessage />
                          {serverError?.fields?.['bankDetails.ifscCode'] && <p className="text-error text-xs">{serverError.fields['bankDetails.ifscCode']}</p>}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="bankDetails.bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-md" />
                          </FormControl>
                          <FormMessage />
                          {serverError?.fields?.['bankDetails.bankName'] && <p className="text-error text-xs">{serverError.fields['bankDetails.bankName']}</p>}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="bankDetails.accountHolder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Holder</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-md" />
                          </FormControl>
                          <FormMessage />
                          {serverError?.fields?.['bankDetails.accountHolder'] && <p className="text-error text-xs">{serverError.fields['bankDetails.accountHolder']}</p>}
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    className="border-accent text-accent rounded-md"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={editForm.formState.isSubmitting}
                    className="bg-accent text-white hover:bg-accent-hover rounded-md"
                  >
                    {editForm.formState.isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="bg-complementary text-body rounded-md max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-track-complementary">
            <DialogHeader>
              <DialogTitle>Upload Documents</DialogTitle>
            </DialogHeader>
            <Form {...uploadForm}>
              <form onSubmit={uploadForm.handleSubmit(handleDocumentSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>Documents *</FormLabel>
                  <div className="space-y-2">
                    {documentFields.map((field, index) => (
                      <div
                        key={field.id}
                        className={cn(
                          'flex items-center space-x-2 p-2 border rounded-md transition-all duration-300',
                          dragStates[index] ? 'border-accent bg-accent/10' : 'border-complementary',
                          removingIndices.includes(index) ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                        )}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={() => handleDragLeave(index)}
                        onDrop={(e) => handleDrop(e, index, uploadForm.setValue(`documents.${index}.file`))}
                      >
                        <FormField
                          control={uploadForm.control}
                          name={`documents.${index}.file`}
                          render={({ field: { onChange, value, ...field } }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <div className="flex items-center space-x-2">
                                  <Input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={(e) => handleFileChange(index, e.target.files[0], onChange)}
                                    className="bg-body text-body border-complementary focus:border-accent rounded-md text-sm"
                                    {...field}
                                  />
                                  {previewUrls[index] && (
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      type="button"
                                      onClick={() => handlePreviewDocument({ url: previewUrls[index], type: value?.type })}
                                      className="border-accent text-accent rounded-md"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    type="button"
                                    onClick={() => handleRemoveDocument(index)}
                                    className="border-error text-error rounded-md"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                              {serverError?.fields?.[`documents.${index}.file`] && (
                                <p className="text-error text-xs">{serverError.fields[`documents.${index}.file`]}</p>
                              )}
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => appendDocument({ file: null })}
                      className="border-accent text-accent rounded-md"
                    >
                      Add Document
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setUploadDialogOpen(false)}
                    className="border-accent text-accent rounded-md"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploadForm.formState.isSubmitting}
                    className="bg-accent text-white hover:bg-accent-hover rounded-md"
                  >
                    {uploadForm.formState.isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Upload'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="bg-complementary text-body rounded-md max-w-3xl">
            <DialogHeader>
              <DialogTitle>Document Preview</DialogTitle>
            </DialogHeader>
            {previewDocument && (
              <img
                src={previewDocument.url || URL.createObjectURL(previewDocument)}
                alt="Document Preview"
                className="w-full h-auto max-h-[60vh] object-contain"
              />
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setPreviewOpen(false);
                  setPreviewDocument(null);
                }}
                className="border-accent text-accent rounded-md"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default EmployeeProfile;