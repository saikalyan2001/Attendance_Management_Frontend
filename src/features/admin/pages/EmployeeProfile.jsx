import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchEmployeeById,
  fetchEmployeeAttendance,
  addEmployeeDocuments,
  updateEmployee,
  reset as resetEmployees,
  fetchEmployeeAdvances,
} from '../redux/employeeSlice';
import { fetchSettings } from '../redux/settingsSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Loader2,
  X,
  Copy,
  ArrowLeft,
} from 'lucide-react';
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
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  email: z.string().email('Invalid email address'),
  designation: z.string().min(1, 'Designation is required').max(50, 'Designation must be 50 characters or less'),
  department: z.string().min(1, 'Department is required').max(50, 'Department must be 50 characters or less'),
  salary: z.string().min(1, 'Salary is required').refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 1000;
  }, { message: 'Invalid salary' }),
  phone: z.string().optional().refine((val) => !val || /^\d{10}$/.test(val), { message: 'Invalid phone number' }),
  dob: z.string().optional().refine((val) => !val || (new Date(val) <= new Date() && !isNaN(new Date(val))), { message: 'Invalid date of birth' }),
  bankDetails: bankDetailsSchema,
  paidLeaves: z.object({
    available: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Available leaves must be a non-negative number',
    }),
    used: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Used leaves must be a non-negative number',
    }),
    carriedForward: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Carried forward leaves must be a non-negative number',
    }),
  }).refine((data) => Number(data.available) >= Number(data.used), {
    message: 'Available leaves cannot be less than used leaves',
    path: ['paidLeaves.available'],
  }),
});

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
  const {
    currentEmployee,
    attendance,
    attendancePagination,
    advances,
    advancesPagination,
    loading,
    error,
  } = useSelector((state) => state.adminEmployees);
  const { settings, loading: loadingSettings, error: settingsError } = useSelector(
    (state) => state.adminSettings
  );

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [advancesSortField, setAdvancesSortField] = useState('year');
  const [advancesSortOrder, setAdvancesSortOrder] = useState('desc');
  const [advancesCurrentPage, setAdvancesCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('profile');
  const autoDismissDuration = 5000;
  const ITEMS_PER_PAGE = 10; // For attendance and documents
  const ADVANCES_ITEMS_PER_PAGE = 5; // For advances

  // Define tabs for navigation
  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'advances', label: 'Advances' },
    { id: 'documents', label: 'Documents' },
  ];

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
      paidLeaves: {
        available: '0',
        used: '0',
        carriedForward: '0',
      },
    },
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
    if (user?.role !== 'admin') {
      navigate('/login');
      return;
    }

    // Validate id format
    const employeeId = String(id); // Ensure string
    if (!/^[0-9a-fA-F]{24}$/.test(employeeId)) {
      console.error("Invalid employee ID format:", employeeId);
      toast.error("Invalid employee ID format", { id: 'invalid-employee-id', duration: 5000, position: 'top-center' });
      navigate('/admin/employees');
      return;
    }

    console.log("Fetching employee with ID:", employeeId);
    dispatch(fetchEmployeeById(employeeId)); // Pass string ID
    dispatch(
      fetchEmployeeAttendance({
        employeeId,
        month: monthFilter,
        year: yearFilter,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sortField,
        sortOrder,
      })
    );
    if (activeTab === 'advances') {
      dispatch(
        fetchEmployeeAdvances({
          id: employeeId,
          page: advancesCurrentPage,
          limit: ADVANCES_ITEMS_PER_PAGE,
          sortField: advancesSortField,
          sortOrder: advancesSortOrder,
        })
      );
    }
    dispatch(fetchSettings());

    return () => {
      dispatch(resetEmployees());
    };
  }, [
    dispatch,
    id,
    user,
    navigate,
    monthFilter,
    yearFilter,
    currentPage,
    activeTab,
    advancesCurrentPage,
    advancesSortField,
    advancesSortOrder,
    sortField,
    sortOrder,
  ]);

  useEffect(() => {
    if (settingsError) {
      toast.dismiss();
      toast.error(settingsError, {
        id: 'settings-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
    }
  }, [settingsError]);

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
    if (error) {
      toast.dismiss();
      toast.error(error.message || 'Operation failed', {
        id: 'form-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
    }
  }, [error]);

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
    setCurrentPage(1); // Reset to first page on sort change
  };

  const handleEditSubmit = async (data) => {
    try {
      toast.dismiss();
      const employeeData = {
        name: data.name,
        email: data.email,
        designation: data.designation,
        department: data.department,
        salary: Number(data.salary),
        phone: data.phone || undefined,
        dob: data.dob || undefined,
        bankDetails: data.bankDetails,
        paidLeaves: {
          available: Number(data.paidLeaves.available),
          used: Number(data.paidLeaves.used),
          carriedForward: Number(data.paidLeaves.carriedForward),
        },
      };

      await dispatch(updateEmployee({ id, data: employeeData })).unwrap();
      toast.success('Employee updated successfully', {
        id: 'edit-success',
        duration: autoDismissDuration,
        position: 'top-center',
      });
      setEditDialogOpen(false);
    } catch (err) {
      console.error('Submit error:', err);
      toast.dismiss();
      toast.error(err.message || 'Failed to update employee', {
        id: 'form-submit-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
    }
  };

  const handleEditSaveClick = async () => {
  try {
    toast.dismiss();
    const isValid = await editForm.trigger();
    if (!isValid) {
      const errors = editForm.formState.errors;
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
        'paidLeaves.available': 'Available Leaves',
        'paidLeaves.used': 'Used Leaves',
        'paidLeaves.carriedForward': 'Carried Forward Leaves',
      };

      // Find the first error, handling nested fields
      let errorField = '';
      let errorMessage = 'Please fill in all required fields';
      
      const findFirstError = (errors, prefix = '') => {
        for (const [key, value] of Object.entries(errors)) {
          if (value.message) {
            return { field: prefix ? `${prefix}.${key}` : key, message: value.message };
          }
          if (typeof value === 'object' && value !== null) {
            const nestedError = findFirstError(value, prefix ? `${prefix}.${key}` : key);
            if (nestedError) return nestedError;
          }
        }
        return null;
      };

      const firstError = findFirstError(errors);
      if (firstError) {
        errorField = firstError.field;
        const fieldLabel = fieldLabels[errorField] || errorField;
        errorMessage = firstError.message || `${fieldLabel} is invalid`;
      }

      toast.error(errorMessage, {
        id: `validation-error-${errorField.replace('.', '-')}`,
        duration: autoDismissDuration,
        position: 'top-center',
      });

      // Focus the first invalid field
      if (errorField) {
        const firstErrorField = document.querySelector(`[name="${errorField}"]`);
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErrorField.focus();
        }
      }
      return;
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

  const openEditDialog = (emp) => {
    toast.dismiss();
    editForm.reset({
      name: emp.name,
      email: emp.email,
      designation: emp.designation,
      department: emp.department,
      salary: emp.salary.toString(),
      phone: emp.phone || '',
      dob: emp.dob && !isNaN(new Date(emp.dob).getTime()) ? new Date(emp.dob).toISOString().split('T')[0] : '',
      bankDetails: {
        accountNo: emp.bankDetails?.accountNo || '',
        ifscCode: emp.bankDetails?.ifscCode || '',
        bankName: emp.bankDetails?.bankName || '',
        accountHolder: emp.bankDetails?.accountHolder || '',
      },
      paidLeaves: {
        available: emp.paidLeaves?.available?.toString() || '0',
        used: emp.paidLeaves?.used?.toString() || '0',
        carriedForward: emp.paidLeaves?.carriedForward?.toString() || '0',
      },
    });
    setEditDialogOpen(true);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

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
              totalYearlyPaidLeaves={totalYearlyPaidLeaves}
              openEditDialog={openEditDialog}
              CopyButton={CopyButton}
            />
          )}
          {activeTab === 'attendance' && (
            <EmployeeAttendanceSection
              attendance={attendance}
              monthFilter={monthFilter}
              yearFilter={yearFilter}
              months={months}
              years={years}
              currentPage={currentPage}
              totalPages={attendancePagination.totalPages}
              paginatedAttendance={attendance}
              sortField={sortField}
              sortOrder={sortOrder}
              handleMonthChange={handleMonthChange}
              handleYearChange={handleYearChange}
              handleSort={handleSort}
              setCurrentPage={setCurrentPage}
              employeeName={currentEmployee.name}
              isLoading={loading}
                      employeeId={id} // Pass employeeId

            />
          )}
          {activeTab === 'advances' && (
            <EmployeeAdvancesSection
              advances={advances}
              currentPage={advancesCurrentPage}
              setCurrentPage={setAdvancesCurrentPage}
              sortField={advancesSortField}
              setSortField={setAdvancesSortField}
              sortOrder={advancesSortOrder}
              setSortOrder={setAdvancesSortOrder}
              employeeName={currentEmployee.name}
              totalPages={advancesPagination.totalPages}
              isLoading={loading}
              dispatch={dispatch}
              id={id}
              itemsPerPage={ADVANCES_ITEMS_PER_PAGE}
            />
          )}
          {activeTab === 'documents' && (
            <EmployeeDocumentsSection
              currentEmployee={currentEmployee}
              dispatch={dispatch}
              id={id}
              employeeName={currentEmployee.name}
              isLoading={loading}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-complementary text-body rounded-lg max-h-[90vh] max-w-[90vw] xs:max-w-[85vw] sm:max-w-2xl mx-auto px-2 xs:px-3 sm:px-4 py-2 xs:py-3 sm:py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-track-complementary">
            <DialogHeader>
              <DialogTitle className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold text-body">Edit Employee</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form className="space-y-3 xs:space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xs:gap-4 sm:gap-6">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-body text-body border-complementary focus:border-accent rounded-lg text-xs xs:text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2"
                            disabled={editForm.formState.isSubmitting}
                            aria-label="Employee name"
                          />
                        </FormControl>
                        <FormMessage className="text-error text-2xs xs:text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            {...field}
                            className="bg-body text-body border-complementary focus:border-accent rounded-lg text-xs xs:text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2"
                            disabled={editForm.formState.isSubmitting}
                            aria-label="Employee email"
                          />
                        </FormControl>
                        <FormMessage className="text-error text-2xs xs:text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Designation *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-body text-body border-complementary focus:border-accent rounded-lg text-xs xs:text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2"
                            disabled={editForm.formState.isSubmitting}
                            aria-label="Employee designation"
                          />
                        </FormControl>
                        <FormMessage className="text-error text-2xs xs:text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Department *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-body text-body border-complementary focus:border-accent rounded-lg text-xs xs:text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2"
                            disabled={editForm.formState.isSubmitting}
                            aria-label="Employee department"
                          />
                        </FormControl>
                        <FormMessage className="text-error text-2xs xs:text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Salary *</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            {...field}
                            className="bg-body text-body border-complementary focus:border-accent rounded-lg text-xs xs:text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2"
                            disabled={editForm.formState.isSubmitting}
                            aria-label="Employee salary"
                          />
                        </FormControl>
                        <FormMessage className="text-error text-2xs xs:text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Phone</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-body text-body border-complementary focus:border-accent rounded-lg text-xs xs:text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2"
                            disabled={editForm.formState.isSubmitting}
                            aria-label="Employee phone"
                          />
                        </FormControl>
                        <FormMessage className="text-error text-2xs xs:text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Date of Birth</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            className="bg-body text-body border-complementary focus:border-accent rounded-lg text-xs xs:text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2"
                            disabled={editForm.formState.isSubmitting}
                            aria-label="Employee date of birth"
                          />
                        </FormControl>
                        <FormMessage className="text-error text-2xs xs:text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-3 xs:space-y-4 sm:space-y-6">
                  <FormLabel className="text-2xs xs:text-xs sm:text-base md:text-lg font-semibold text-body">Bank Details</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xs:gap-4 sm:gap-6">
                    <FormField
                      control={editForm.control}
                      name="bankDetails.accountNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Account Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-body text-body border-complementary focus:border-accent rounded-lg text-xs xs:text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2"
                              disabled={editForm.formState.isSubmitting}
                              aria-label="Bank account number"
                            />
                          </FormControl>
                          <FormMessage className="text-error text-2xs xs:text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="bankDetails.ifscCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">IFSC Code</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-body text-body border-complementary focus:border-accent rounded-lg text-xs xs:text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2"
                              disabled={editForm.formState.isSubmitting}
                              aria-label="Bank IFSC code"
                            />
                          </FormControl>
                          <FormMessage className="text-error text-2xs xs:text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="bankDetails.bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Bank Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-body text-body border-complementary focus:border-accent rounded-lg text-xs xs:text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2"
                              disabled={editForm.formState.isSubmitting}
                              aria-label="Bank name"
                            />
                          </FormControl>
                          <FormMessage className="text-error text-2xs xs:text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="bankDetails.accountHolder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Account Holder</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-body text-body border-complementary focus:border-accent rounded-lg text-xs xs:text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2"
                              disabled={editForm.formState.isSubmitting}
                              aria-label="Bank account holder"
                            />
                          </FormControl>
                          <FormMessage className="text-error text-2xs xs:text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-3 xs:space-y-4 sm:space-y-6">
                  <FormLabel className="text-2xs xs:text-xs sm:text-base md:text-lg font-semibold text-body">Paid Leaves</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xs:gap-4 sm:gap-6">
                    <FormField
                      control={editForm.control}
                      name="paidLeaves.available"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Available Leaves</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              className="bg-body text-body border-complementary focus:border-accent rounded-lg text-xs xs:text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2"
                              disabled={editForm.formState.isSubmitting}
                              aria-label="Available leaves"
                            />
                          </FormControl>
                          <FormMessage className="text-error text-2xs xs:text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="paidLeaves.used"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Used Leaves</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              className="bg-body text-body border-complementary focus:border-accent rounded-lg text-xs xs:text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2"
                              disabled={editForm.formState.isSubmitting}
                              aria-label="Used leaves"
                            />
                          </FormControl>
                          <FormMessage className="text-error text-2xs xs:text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="paidLeaves.carriedForward"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Carried Forward Leaves</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              className="bg-body text-body border-complementary focus:border-accent rounded-lg text-xs xs:text-sm sm:text-base md:text-lg focus:ring-2 focus:ring-accent focus:ring-offset-2"
                              disabled={editForm.formState.isSubmitting}
                              aria-label="Carried forward leaves"
                            />
                          </FormControl>
                          <FormMessage className="text-error text-2xs xs:text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-3 xs:mt-4 sm:mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-1.5 xs:px-2 py-0.5 xs:py-1 sm:px-4 sm:py-2 text-2xs xs:text-xs sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    disabled={editForm.formState.isSubmitting}
                    aria-label="Cancel edit employee"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleEditSaveClick}
                    disabled={editForm.formState.isSubmitting}
                    className="bg-accent text-body hover:bg-accent-hover rounded-lg px-1.5 xs:px-2 py-0.5 xs:py-1 sm:px-4 sm:py-2 text-2xs xs:text-xs sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    aria-label="Save employee details"
                  >
                    {editForm.formState.isSubmitting ? (
                      <Loader2 className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-5 sm:w-5 animate-spin" />
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
