import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getEmployee, fetchSettings, fetchEmployeeAttendance, reset, editEmployee, uploadDocument } from '../redux/employeeSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Badge } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import EmployeeProfileSection from '../../../components/employees/EmployeeProfileSection';
import EmployeeAttendanceSection from '../../../components/employees/EmployeeAttendanceSection'; 
import AdvanceHistory from '../../../components/employees/AdvanceHistory';
import DocumentsSection from '../../../components/employees/DocumentsSection';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';

const editEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  email: z.string().email('Invalid email address'),
  designation: z.string().min(1, 'Designation is required').max(50, 'Designation must be 50 characters or less'),
  department: z.string().min(1, 'Department is required').max(50, 'Department must be 50 characters or less'),
  salary: z.string().min(1, 'Salary is required').refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Invalid salary',
  }),
  phone: z.string().optional().refine((val) => !val || (/^\d+$/.test(val) && val.length >= 10 && val.length <= 15), {
    message: 'Invalid phone number',
  }),
  dob: z.string().optional().refine((val) => !val || (new Date(val) <= new Date() && !isNaN(new Date(val))), { message: 'Invalid date of birth' }),
  bankDetails: z.object({
    accountNo: z.string().min(1, 'Account number is required').max(20, 'Account number must be 20 characters or less').optional(),
    ifscCode: z.string().min(1, 'IFSC code is required').max(11, 'IFSC code must be 11 characters').optional(),
    bankName: z.string().min(1, 'Bank name is required').max(50, 'Bank name must be 50 characters or less').optional(),
    accountHolder: z.string().min(1, 'Account holder is required').max(50, 'Account holder name must be 50 characters or less').optional(),
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
  ),
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

const SiteInchargeEmployeeProfile = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { employee, attendance, attendancePagination, loadingGeneral, settings, loadingFetch: loadingSettings, error } = useSelector((state) => state.siteInchargeEmployee);
  const [advancesSortField, setAdvancesSortField] = useState('year');
  const [advancesSortOrder, setAdvancesSortOrder] = useState('desc');
  const [advancesCurrentPage, setAdvancesCurrentPage] = useState(1);
  const [documentsCurrentPage, setDocumentsCurrentPage] = useState(1);
  const [attendanceCurrentPage, setAttendanceCurrentPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activeTab, setActiveTab] = useState('profile');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const autoDismissDuration = 5000;

  const editForm = useForm({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      name: '',
      email: '',
      designation: '',
      department: '',
      salary: '',
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

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'advances', label: 'Advances' },
    { id: 'documents', label: 'Documents' },
  ];

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const handleMonthChange = (value) => {
    setMonthFilter(parseInt(value));
    setAttendanceCurrentPage(1);
  };

  const handleYearChange = (value) => {
    setYearFilter(parseInt(value));
    setAttendanceCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setAttendanceCurrentPage(1);
  };

  const handleEditSubmit = async (id, data) => {
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
      await dispatch(editEmployee({ id, data: employeeData })).unwrap();
      toast.success('Employee updated successfully', {
        id: 'edit-success',
        duration: autoDismissDuration,
        position: 'top-center',
      });
      setEditDialogOpen(false);
    } catch (err) {
      
      toast.error(err.message || 'Failed to update employee', {
        id: 'form-submit-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
      throw err;
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

  useEffect(() => {
        dispatch(getEmployee({
      id,
      documentsPage: documentsCurrentPage,
      documentsLimit: 10,
      advancesPage: advancesCurrentPage,
      advancesLimit: 5,
    }));
    dispatch(fetchEmployeeAttendance({
      employeeId: id,
      month: monthFilter,
      year: yearFilter,
      page: attendanceCurrentPage,
      limit: 10,
      sortField,
      sortOrder,
    }));
    dispatch(fetchSettings());
    return () => dispatch(reset());
  }, [dispatch, id, documentsCurrentPage, advancesCurrentPage, attendanceCurrentPage, monthFilter, yearFilter, sortField, sortOrder]);

  if (loadingGeneral || !employee || loadingSettings) {
    return (
      <Layout title="Employee Profile" role="siteincharge">
        <div className="max-w-5xl mx-auto p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-complementary text-body shadow-md rounded-md p-2 xs:p-3 sm:p-4">
              <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xs:gap-4 sm:gap-6 mt-3 xs:mt-4 sm:mt-4">
                {Array(5).fill().map((_, i) => (
                  <div key={i} className="h-12 w-full bg-gray-200 animate-pulse rounded" />
                ))}
              </div>
            </div>
            <div className="bg-complementary text-body shadow-md rounded-md p-2 xs:p-3 sm:p-4">
              <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded" />
              <div className="space-y-3 xs:space-y-4 sm:space-y-6 mt-3 xs:mt-4 sm:mt-4">
                {Array(3).fill().map((_, i) => (
                  <div key={i} className="h-12 w-full bg-gray-200 animate-pulse rounded" />
                ))}
              </div>
            </div>
            <div className="bg-complementary text-body shadow-md rounded-md p-2 xs:p-3 sm:p-4">
              <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded" />
              <div className="space-y-3 xs:space-y-4 sm:space-y-6 mt-3 xs:mt-4 sm:mt-4">
                {Array(3).fill().map((_, i) => (
                  <div key={i} className="h-12 w-full bg-gray-200 animate-pulse rounded" />
                ))}
              </div>
            </div>
            <div className="bg-complementary text-body shadow-md rounded-md p-2 xs:p-3 sm:p-4">
              <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded" />
              <div className="space-y-3 xs:space-y-4 sm:space-y-6 mt-3 xs:mt-4 sm:mt-4">
                {Array(3).fill().map((_, i) => (
                  <div key={i} className="h-12 w-full bg-gray-200 animate-pulse rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Employee Profile" role="siteincharge">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="mb-3 xs:mb-4 border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md px-1.5 xs:px-2 py-0.5 xs:py-1 sm:px-4 sm:py-2 text-2xs xs:text-xs sm:text-base"
          aria-label="Go back to employee list"
        >
          <ArrowLeft className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-4 sm:w-4 mr-0.5 xs:mr-1 sm:mr-2" />
          Back to Employees
        </Button>

        {/* Tab Navigation */}
        <div className="block sm:hidden mb-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full p-2 border border-accent rounded-md bg-body text-body focus:ring-2 focus:ring-accent focus:ring-offset-2 text-sm"
            aria-label="Select employee profile section"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden sm:flex border-b border-accent/20 mb-4">
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
        <div className="space-y-4 sm:space-y-6">
          {activeTab === 'profile' && (
            <EmployeeProfileSection
              employee={employee}
              canEdit={true}
              title="Details"
              onEditClick={handleEditSubmit}
              settings={settings}
            />
          )}
          {activeTab === 'attendance' && (
            <EmployeeAttendanceSection
              employeeId={id}
              employeeName={employee?.name}
              attendanceData={attendance}
              isLoading={loadingGeneral}
              error={error}
              currentPage={attendanceCurrentPage}
              setCurrentPage={setAttendanceCurrentPage}
              totalPages={attendancePagination?.totalPages || 1}
              itemsPerPage={10}
              sortField={sortField}
              setSortField={setSortField}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              monthFilter={monthFilter}
              yearFilter={yearFilter}
              months={months}
              years={years}
              handleMonthChange={handleMonthChange}
              handleYearChange={handleYearChange}
              handleSort={handleSort}
              fetchAttendance={fetchEmployeeAttendance}
              dispatch={dispatch}
              role="siteincharge"
            />
          )}
          {activeTab === 'advances' && (
            <AdvanceHistory
              advances={employee?.advances || []}
              advancesPagination={employee?.advancesPagination}
              currentPage={advancesCurrentPage}
              setCurrentPage={setAdvancesCurrentPage}
              sortField={advancesSortField}
              setSortField={setAdvancesSortField}
              sortOrder={advancesSortOrder}
              setSortOrder={setAdvancesSortOrder}
              employeeName={employee?.name}
              isLoading={loadingGeneral}
              role="siteincharge"
            />
          )}
    {activeTab === 'documents' && (
  <DocumentsSection
    documents={employee.documents}
    documentsPagination={employee.documentsPagination}
    employeeName={employee.name}
    employeeId={id}
    isLoading={loadingGeneral}
    currentPage={documentsCurrentPage}
    setCurrentPage={setDocumentsCurrentPage}
    itemsPerPage={10}
    showSearch={true}
    showUpload={true}
    showSorting={true} // This one has sorting enabled
    onUploadDocuments={async (documents) => {
      await dispatch(uploadDocument({ 
        id, 
        documents 
      })).unwrap();
      // Refresh data after upload
      dispatch(getEmployee({
        id,
        documentsPage: 1,
        documentsLimit: 10,
        advancesPage: advancesCurrentPage,
        advancesLimit: 5,
      }));
    }}
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
                    type="submit"
                    onClick={editForm.handleSubmit(async (data) => {
                      await handleEditSubmit(id, data);
                    })}
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

export default SiteInchargeEmployeeProfile;