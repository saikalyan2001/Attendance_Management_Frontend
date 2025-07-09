import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmployeeById, fetchEmployeeAttendance, addEmployeeDocuments, updateEmployee, reset as resetEmployees } from '../redux/employeeSlice';
import { fetchSettings } from '../redux/settingsSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, X, AlertCircle, Copy, ArrowLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { useNavigate, useParams } from 'react-router-dom';
import EmployeeProfileSection from './EmployeeProfileSection';
import EmployeeAttendanceSection from './EmployeeAttendanceSection';
import EmployeeDocumentsSection from './EmployeeDocumentsSection';
import EmployeeAdvancesSection from './EmployeeAdvancesSection';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

// Define validation schemas
const bankDetailsSchema = z.object({
  accountNo: z.string().min(1, 'Account number is required').optional(),
  ifscCode: z.string().min(1, 'IFSC code is required').optional(),
  bankName: z.string().min(1, 'Bank name is required').optional(),
  accountHolder: z.string().min(1, 'Account holder is required').optional(),
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
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  designation: z.string().min(1, 'Designation is required'),
  department: z.string().min(1, 'Department is required'),
  salary: z.string().min(1, 'Salary is required').refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 1000;
  }, { message: 'Invalid salary' }),
  phone: z.string().optional().refine((val) => !val || /^\d{10}$/.test(val), { message: 'Invalid phone number' }),
  dob: z.string().optional().refine((val) => !val || (new Date(val) <= new Date() && !isNaN(new Date(val))), { message: 'Invalid date of birth' }),
  bankDetails: bankDetailsSchema,
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

// Reusable CopyButton component
const CopyButton = ({ text, fieldId }) => {
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldId);
      toast.dismiss();
      toast.success('Copied to clipboard!', { id: `copy-${fieldId}`, duration: 2000, position: 'top-center' });
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {
      toast.dismiss();
      toast.error('Failed to copy to clipboard', { id: `copy-error-${fieldId}`, duration: 2000, position: 'top-center' });
    });
  };

  return (
    <div className="relative inline-block">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="ml-2 sm:ml-3 text-accent hover:text-accent-hover relative focus:ring-2 focus:ring-accent focus:ring-offset-2"
        aria-label={`Copy ${fieldId}`}
      >
        <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
    </div>
  );
};

const EmployeeProfile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const { currentEmployee, attendance, loading, error } = useSelector((state) => state.adminEmployees);
  const { settings, loadingFetch: loadingSettings, error: settingsError } = useSelector((state) => state.adminSettings);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [formErrors, setFormErrors] = useState([]);
  const [serverError, setServerError] = useState(null);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [advancesSortField, setAdvancesSortField] = useState('year');
  const [advancesSortOrder, setAdvancesSortOrder] = useState('desc');
  const [advancesCurrentPage, setAdvancesCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('profile');
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

  const totalYearblyPaidLeaves = useMemo(() => {
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
    if (settingsError) {
      toast.dismiss();
      setServerError({ message: settingsError, fields: {} });
      setShowErrorAlert(true);
      toast.error(settingsError, {
        id: 'settings-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });

      const errorTimer = setTimeout(() => {
        setShowErrorAlert(false);
        setServerError(null);
        dispatch(resetEmployees());
        toast.dismiss();
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
      toast.dismiss();
      const parsedError = error ? parseServerError(error) : { message: 'Form validation failed', fields: {} };
      setServerError(parsedError);
      setShowErrorAlert(true);
      toast.error(parsedError.message, {
        id: 'form-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });

      const errorTimer = setTimeout(() => {
        setShowErrorAlert(false);
        setServerError(null);
        setFormErrors([]);
        if (error) dispatch(resetEmployees());
        toast.dismiss();
      }, autoDismissDuration);

      return () => clearTimeout(errorTimer);
    }
  }, [error, formErrors, dispatch]);

  const sortedAttendance = useMemo(() => {
    const filteredAttendance = attendance.filter(
      (record) => record && record.employee && record.employee._id && record.employee._id.toString() === id
    );

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

  const handleMonthChange = (value) => {
    setMonthFilter(parseInt(value));
    setCurrentPage(1);
  };

  const handleYearChange = (value) => {
    setYearFilter(parseInt(value));
    setCurrentPage(1);
  };

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
      toast.dismiss();

      const isValid = await editForm.trigger();
      if (!isValid) {
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
      toast.dismiss();
      toast.success('Employee updated successfully', { id: 'edit-success', duration: autoDismissDuration, position: 'top-center' });
      setEditDialogOpen(false);
      setTimeout(() => {
        dispatch(resetEmployees());
        toast.dismiss();
      }, autoDismissDuration);
    } catch (err) {
      console.error('Submit error:', err);
      toast.dismiss();
      const parsedError = parseServerError(err);
      setServerError(parsedError);
      setShowErrorAlert(true);
      toast.error(parsedError.message, { id: 'form-submit-error', duration: autoDismissDuration, position: 'top-center' });
      Object.entries(parsedError.fields).forEach(([field, message], index) => {
        setTimeout(() => {
          toast.error(message, { id: `server-error-${field}-${index}`, duration: autoDismissDuration, position: 'top-center' });
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

  const handleEditSaveClick = async () => {
    try {
      toast.dismiss();
      const isValid = await editForm.trigger();
      if (!isValid) {
        const errors = [];
        const fieldLabels = {
          name: 'Name',
          email: 'Email',
          designation: 'Designation',
          department: 'Department',
          salary: 'Salary',
          phone: 'Phone number',
          dob: 'Date of birth',
          'bankDetails.accountNo': 'Account number',
          'bankDetails.ifscCode': 'IFSC code',
          'bankDetails.bankName': 'Bank name',
          'bankDetails.accountHolder': 'Account holder',
          bankDetails: 'Bank details',
        };

        const addError = (field, message) => {
          if (message && !errors.some((e) => e.field === field)) {
            const fieldLabel = fieldLabels[field] || field;
            const displayMessage = message.includes('is required') ? `${fieldLabel} is required` : message;
            errors.push({ field, message: displayMessage });
          }
        };

        const fieldOrder = [
          'name',
          'email',
          'designation',
          'department',
          'salary',
          'phone',
          'dob',
          'bankDetails.accountNo',
          'bankDetails.ifscCode',
          'bankDetails.bankName',
          'bankDetails.accountHolder',
          'bankDetails',
        ];

        for (const field of fieldOrder) {
          const error = editForm.formState.errors[field.split('.')[0]]?.[field.split('.')[1]] || editForm.formState.errors[field];
          addError(field, error?.message);
        }

        if (editForm.formState.errors.bankDetails && editForm.formState.errors.bankDetails.message) {
          addError('bankDetails', editForm.formState.errors.bankDetails.message);
        }

        if (errors.length > 0) {
          const firstError = errors[0];
          toast.error(firstError.message, {
            id: `validation-error-${firstError.field.replace('.', '-')}`,
            duration: autoDismissDuration,
            position: 'top-center',
          });
          const firstErrorField = document.querySelector(`[name="${firstError.field}"]`);
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
          }
          return;
        }
      }

      await editForm.handleSubmit(handleEditSubmit)();
    } catch (error) {
      console.error('handleEditSaveClick error:', error);
      toast.dismiss();
      toast.error('Error submitting form, please try again', {
        id: 'form-submit-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
    }
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
    toast.dismiss();

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

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const ITEMS_PER_PAGE = 10;

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'advances', label: 'Advances' },
    { id: 'documents', label: 'Documents' },
  ];

  if (loading || !currentEmployee || loadingSettings) {
    return (
      <Layout title="Employee Profile">
        <div className="max-w-5xl mx-auto p-4 sm:p-6">
          <Skeleton className="h-8 w-1/3" />
          <div className="mt-4 sm:mt-6 grid grid-cols-1 gap-4 sm:gap-6">
            {Array(5).fill().map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Employee Profile">
      <Toaster position="top-center" />
      {serverError && showErrorAlert && (
        <Alert
          variant="destructive"
          className={cn(
            'fixed top-2 right-2 w-[calc(100%-1rem)] sm:w-80 md:w-96 z-[100] border-error text-error rounded-lg shadow-md bg-complementary-light',
            showErrorAlert ? 'animate-fade-in' : 'animate-fade-out'
          )}
        >
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          <AlertTitle className="text-xs sm:text-sm md:text-base font-bold">Error</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm md:text-base">
            <p>{serverError.message}</p>
            {Object.keys(serverError.fields).length > 0 && (
              <div className="mt-1 sm:mt-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-track-complementary">
                <ul className="list-disc pl-4 sm:pl-5 space-y-1">
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
            className="absolute top-1 right-1 sm:top-2 sm:right-2 text-error hover:text-error-hover focus:ring-2 focus:ring-error focus:ring-offset-2"
            aria-label="Dismiss error alert"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Alert>
      )}

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Button
          variant="outline"
          onClick={() => navigate('/admin/employees')}
          className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
          aria-label="Go back to employee list"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
          Back to Employees
        </Button>

        {/* Tab Navigation */}
        <div className="block sm:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full p-2 border border-accent rounded-lg bg-body text-body focus:ring-2 focus:ring-accent focus:ring-offset-2 text-sm"
            aria-label="Select employee profile section"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden sm:flex border-b border-accent/20">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium',
                activeTab === tab.id
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-body hover:text-accent',
                'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2'
              )}
              aria-label={`View ${tab.label} tab`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'profile' && (
            <EmployeeProfileSection
              currentEmployee={currentEmployee}
              isHighlighted={isHighlighted}
              totalYearlyPaidLeaves={totalYearblyPaidLeaves}
              openEditDialog={openEditDialog}
              CopyButton={CopyButton}
            />
          )}
          {activeTab === 'attendance' && (
            <EmployeeAttendanceSection
              attendance={sortedAttendance}
              monthFilter={monthFilter}
              yearFilter={yearFilter}
              months={months}
              years={years}
              currentPage={currentPage}
              totalPages={Math.ceil(sortedAttendance.length / ITEMS_PER_PAGE)}
              paginatedAttendance={sortedAttendance.slice(
                (currentPage - 1) * ITEMS_PER_PAGE,
                currentPage * ITEMS_PER_PAGE
              )}
              sortField={sortField}
              sortOrder={sortOrder}
              handleMonthChange={handleMonthChange}
              handleYearChange={handleYearChange}
              handleSort={handleSort}
              setCurrentPage={setCurrentPage}
              employeeName={currentEmployee.name}
            />
          )}
          {activeTab === 'advances' && (
            <EmployeeAdvancesSection
              advances={currentEmployee?.advances || []}
              currentPage={advancesCurrentPage}
              setCurrentPage={setAdvancesCurrentPage}
              sortField={advancesSortField}
              setSortField={setAdvancesSortField}
              sortOrder={advancesSortOrder}
              setSortOrder={setAdvancesSortOrder}
              employeeName={currentEmployee.name}
            />
          )}
          {activeTab === 'documents' && (
            <EmployeeDocumentsSection
              currentEmployee={currentEmployee}
              dispatch={dispatch}
              id={id}
              employeeName={currentEmployee.name}
            />
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-complementary text-body rounded-lg max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-track-complementary p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl md:text-2xl font-semibold text-body">Edit Employee</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm md:text-base font-semibold text-body">Name *</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-lg text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2" />
                        </FormControl>
                        <FormMessage className="text-error text-xs sm:text-sm" />
                        {serverError?.fields?.name && <p className="text-error text-xs sm:text-sm">{serverError.fields.name}</p>}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm md:text-base font-semibold text-body">Email *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" className="bg-body text-body border-complementary focus:border-accent rounded-lg text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2" />
                        </FormControl>
                        <FormMessage className="text-error text-xs sm:text-sm" />
                        {serverError?.fields?.email && <p className="text-error text-xs sm:text-sm">{serverError.fields.email}</p>}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm md:text-base font-semibold text-body">Designation *</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-lg text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2" />
                        </FormControl>
                        <FormMessage className="text-error text-xs sm:text-sm" />
                        {serverError?.fields?.designation && <p className="text-error text-xs sm:text-sm">{serverError.fields.designation}</p>}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm md:text-base font-semibold text-body">Department *</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-lg text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2" />
                        </FormControl>
                        <FormMessage className="text-error text-xs sm:text-sm" />
                        {serverError?.fields?.department && <p className="text-error text-xs sm:text-sm">{serverError.fields.department}</p>}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm md:text-base font-semibold text-body">Salary *</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" className="bg-body text-body border-complementary focus:border-accent rounded-lg text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2" />
                        </FormControl>
                        <FormMessage className="text-error text-xs sm:text-sm" />
                        {serverError?.fields?.salary && <p className="text-error text-xs sm:text-sm">{serverError.fields.salary}</p>}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm md:text-base font-semibold text-body">Phone</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-lg text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2" />
                        </FormControl>
                        <FormMessage className="text-error text-xs sm:text-sm" />
                        {serverError?.fields?.phone && <p className="text-error text-xs sm:text-sm">{serverError.fields.phone}</p>}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm md:text-base font-semibold text-body">Date of Birth</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className="bg-body text-body border-complementary focus:border-accent rounded-lg text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2" />
                        </FormControl>
                        <FormMessage className="text-error text-xs sm:text-sm" />
                        {serverError?.fields?.dob && <p className="text-error text-xs sm:text-sm">{serverError.fields.dob}</p>}
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <FormLabel className="text-sm sm:text-base md:text-lg font-semibold text-body">Bank Details</FormLabel>
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    <FormField
                      control={editForm.control}
                      name="bankDetails.accountNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm md:text-base font-semibold text-body">Account Number</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-lg text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2" />
                          </FormControl>
                          <FormMessage className="text-error text-xs sm:text-sm" />
                          {serverError?.fields?.['bankDetails.accountNo'] && <p className="text-error text-xs sm:text-sm">{serverError.fields['bankDetails.accountNo']}</p>}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="bankDetails.ifscCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm md:text-base font-semibold text-body">IFSC Code</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-lg text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2" />
                          </FormControl>
                          <FormMessage className="text-error text-xs sm:text-sm" />
                          {serverError?.fields?.['bankDetails.ifscCode'] && <p className="text-error text-xs sm:text-sm">{serverError.fields['bankDetails.ifscCode']}</p>}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="bankDetails.bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm md:text-base font-semibold text-body">Bank Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-lg text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2" />
                          </FormControl>
                          <FormMessage className="text-error text-xs sm:text-sm" />
                          {serverError?.fields?.['bankDetails.bankName'] && <p className="text-error text-xs sm:text-sm">{serverError.fields['bankDetails.bankName']}</p>}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="bankDetails.accountHolder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm md:text-base font-semibold text-body">Account Holder</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-body text-body border-complementary focus:border-accent rounded-lg text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2" />
                          </FormControl>
                          <FormMessage className="text-error text-xs sm:text-sm" />
                          {serverError?.fields?.['bankDetails.accountHolder'] && <p className="text-error text-xs sm:text-sm">{serverError.fields['bankDetails.accountHolder']}</p>}
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4 sm:mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    aria-label="Cancel edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleEditSaveClick}
                    disabled={editForm.formState.isSubmitting}
                    className="bg-accent text-body hover:bg-accent-hover rounded-lg px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    aria-label="Save employee"
                  >
                    {editForm.formState.isSubmitting ? (
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default EmployeeProfile;