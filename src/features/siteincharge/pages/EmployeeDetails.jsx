import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { editEmployee } from '../redux/employeeSlice';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Edit, Copy, User, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible';

// Reusable CopyButton component
const CopyButton = ({ text, fieldId }) => {
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldId);
      toast.dismiss();
      toast.success('Copied to clipboard!', {
        id: `copy-${fieldId}`,
        duration: 2000,
        position: 'top-center',
        style: { background: '#fff', color: '#28a745', border: '1px solid #28a745' },
      });
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {
      toast.dismiss();
      toast.error('Failed to copy to clipboard', {
        id: `copy-error-${fieldId}`,
        duration: 2000,
        position: 'top-center',
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative inline-block">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="ml-2 xs:ml-3 sm:ml-3 text-accent hover:text-accent-hover relative focus:ring-2 focus:ring-accent focus:ring-offset-2"
              aria-label={`Copy ${fieldId}`}
            >
              <Copy className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-complementary text-body border-accent text-2xs xs:text-xs sm:text-base max-w-[75vw] xs:max-w-[85vw] sm:max-w-none" side="top">
          Copy {fieldId.replace(/([A-Z])/g, ' $1').toLowerCase()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Validation schema for employee details
const editEmployeeSchema = z.object({
  name: z.string().min(1, 'This field is required').max(50, 'Name must be 50 characters or less'),
  email: z.string().email('Invalid email address'),
  designation: z.string().min(1, 'This field is required').max(50, 'Designation must be 50 characters or less'),
  department: z.string().min(1, 'This field is required').max(50, 'Department must be 50 characters or less'),
  salary: z.string().min(1, 'This field is required').refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Invalid salary',
  }),
  phone: z.string().optional().refine((val) => !val || (/^\d+$/.test(val) && val.length >= 10 && val.length <= 15), {
    message: 'Invalid phone number',
  }),
  dob: z.string().optional().refine((val) => !val || (new Date(val) <= new Date() && !isNaN(new Date(val))), { message: 'Invalid date of birth' }),
  bankDetails: z.object({
    accountNo: z.string().min(1, 'This field is required').max(20, 'Account number must be 20 characters or less').optional(),
    ifscCode: z.string().min(1, 'This field is required').max(11, 'IFSC code must be 11 characters').optional(),
    bankName: z.string().min(1, 'This field is required').max(50, 'Bank name must be 50 characters or less').optional(),
    accountHolder: z.string().min(1, 'This field is required').max(50, 'Account holder name must be 50 characters or less').optional(),
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
    available: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Available leaves must be a non-negative number',
    }),
    used: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Used leaves must be a non-negative number',
    }),
    carriedForward: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Carried forward leaves must be a non-negative number',
    }),
  }).refine(data => Number(data.available) >= Number(data.used), {
    message: 'Available leaves cannot be less than used leaves',
    path: ['paidLeaves.available'],
  }),
});

const EmployeeDetails = ({ employee }) => {
  const dispatch = useDispatch();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isPersonalOpen, setIsPersonalOpen] = useState(true);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [isLeavesOpen, setIsLeavesOpen] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
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

  // Calculate total yearly paid leaves with proration
  const totalYearlyPaidLeaves = useMemo(() => {
    if (!employee?.joinDate) return 0;
    const joinDate = new Date(employee.joinDate);
    const joinYear = joinDate.getFullYear();
    const joinMonth = joinDate.getMonth();
    const currentYear = new Date().getFullYear();
    const paidLeavesPerYear = 12; // Default value if settings not available
    if (joinYear === currentYear) {
      const remainingMonths = 12 - joinMonth;
      return Math.round((paidLeavesPerYear * remainingMonths) / 12);
    }
    return paidLeavesPerYear;
  }, [employee?.joinDate]);

  // Highlight logic
  const HIGHLIGHT_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  const shouldHighlightEmployee = (employee) => {
    if (!employee?.transferTimestamp) return false;
    const transferDate = new Date(employee.transferTimestamp);
    if (isNaN(transferDate.getTime())) return false;
    const currentTime = new Date().getTime();
    const transferTime = transferDate.getTime();
    return currentTime - transferTime <= HIGHLIGHT_DURATION;
  };

  useEffect(() => {
    if (!employee) return;
    setIsHighlighted(shouldHighlightEmployee(employee));
    const interval = setInterval(() => {
      setIsHighlighted(shouldHighlightEmployee(employee));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [employee]);

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

  const handleEditSubmit = async (data) => {
    try {
      setServerError(null);
      setShowErrorAlert(false);
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
      await dispatch(editEmployee({ id: employee._id, data: employeeData })).unwrap();
      toast.success('Employee updated successfully', {
        id: 'edit-employee-success',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#28a745', border: '1px solid #28a745' },
      });
      setEditDialogOpen(false);
    } catch (err) {
      const parsedError = parseServerError(err);
      setServerError(parsedError);
      setShowErrorAlert(true);
      toast.error(parsedError.message, {
        id: 'edit-employee-error',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
      Object.entries(parsedError.fields).forEach(([field, message], index) => {
        setTimeout(() => {
          toast.error(message, {
            id: `server-error-${field}-${index}`,
            duration: autoDismissDuration,
            position: 'top-center',
            style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
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
          phone: 'Phone',
          dob: 'Date of Birth',
          'bankDetails.accountNo': 'Account Number',
          'bankDetails.ifscCode': 'IFSC Code',
          'bankDetails.bankName': 'Bank Name',
          'bankDetails.accountHolder': 'Account Holder',
          bankDetails: 'Bank Details',
          'paidLeaves.available': 'Available Leaves',
          'paidLeaves.used': 'Used Leaves',
          'paidLeaves.carriedForward': 'Carried Forward Leaves',
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
          'paidLeaves.available',
          'paidLeaves.used',
          'paidLeaves.carriedForward',
        ];

        for (const field of fieldOrder) {
          const error = editForm.formState.errors[field.split('.')[0]]?.[field.split('.')[1]] || editForm.formState.errors[field];
          if (error?.message) {
            const fieldLabel = fieldLabels[field] || field;
            const displayMessage = error.message.includes('is required') ? `${fieldLabel} is required` : error.message;
            errors.push({ field, message: displayMessage });
          }
        }

        if (editForm.formState.errors.bankDetails && editForm.formState.errors.bankDetails.message) {
          errors.push({ field: 'bankDetails', message: editForm.formState.errors.bankDetails.message });
        }

        if (errors.length > 0) {
          const firstError = errors[0];
          toast.error(firstError.message, {
            id: `validation-error-${firstError.field.replace('.', '-')}`,
            duration: autoDismissDuration,
            position: 'top-center',
            style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
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
      toast.error('Error submitting form, please try again', {
        id: 'edit-employee-form-error',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
    }
  };

  const openEditDialog = (emp) => {
    setServerError(null);
    setShowErrorAlert(false);
    toast.dismiss();
    editForm.reset({
      name: emp.name,
      email: emp.email,
      designation: emp.designation,
      department: emp.department,
      salary: emp.salary ? emp.salary.toString() : '',
      phone: emp.phone || '',
      dob: emp.dob ? new Date(emp.dob).toISOString().split('T')[0] : '',
      bankDetails: {
        accountNo: emp.bankDetails?.accountNo || '',
        ifscCode: emp.bankDetails?.ifscCode || '',
        bankName: emp.bankDetails?.bankName || '',
        accountHolder: emp.bankDetails?.accountHolder || '',
      },
      paidLeaves: {
        available: emp.paidLeaves.available.toString(),
        used: emp.paidLeaves.used.toString(),
        carriedForward: emp.paidLeaves.carriedForward.toString(),
      },
    });
    setEditDialogOpen(true);
  };

  return (
    <Card 
      className={cn(
        'bg-complementary text-body shadow-lg rounded-xl border border-accent/10 transition-all duration-500',
        isHighlighted && 'border-accent/50 bg-accent/10 animate-pulse',
        'w-full max-w-[92vw] xs:max-w-[90vw] sm:max-w-none mx-auto'
      )}
      role="region"
      aria-labelledby="employee-details-title"
    >
      <CardHeader className="flex flex-row flex-wrap items-center justify-between px-2 xs:px-3 sm:px-6 py-2 xs:py-3 sm:py-6 gap-1 xs:gap-2">
        <CardTitle id="employee-details-title" className="text-2xs xs:text-base sm:text-2xl md:text-3xl font-bold flex items-center gap-1 xs:gap-2 sm:gap-3 truncate">
          <div className="flex items-center justify-center w-7 xs:w-8 sm:w-12 h-7 xs:h-8 sm:h-12 rounded-full bg-accent/20 text-accent">
            <User className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-6 sm:w-6" />
          </div>
          <span className="truncate">{employee.name}'s Details</span>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openEditDialog(employee)}
          className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-1.5 xs:px-2 py-0.5 xs:py-1 sm:px-4 sm:py-2 text-2xs xs:text-xs sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
          aria-label={`Edit details for ${employee.name}`}
        >
          <Edit className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-5 sm:w-5 mr-0.5 xs:mr-1 sm:mr-2" />
          Edit Details
        </Button>
      </CardHeader>
      <CardContent className="px-2 xs:px-3 sm:px-6 py-2 xs:py-3 sm:py-6 space-y-3 xs:space-y-4 sm:space-y-6">
        <Collapsible open={isPersonalOpen} onOpenChange={setIsPersonalOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-2xs xs:text-xs sm:text-lg md:text-xl font-semibold text-body hover:text-accent transition-colors">
            Personal Details
            {isPersonalOpen ? <ChevronUp className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-5 sm:w-5" /> : <ChevronDown className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-5 sm:w-5" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 xs:mt-1.5 sm:mt-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-6">
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Name</Label>
                <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                  <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg truncate">{employee.name}</p>
                  <CopyButton text={employee.name} fieldId="name" />
                </div>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Employee ID</Label>
                <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                  <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg">{employee.employeeId}</p>
                  <CopyButton text={employee.employeeId} fieldId="employeeId" />
                </div>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Email</Label>
                <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                  <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg truncate">{employee.email}</p>
                  <CopyButton text={employee.email} fieldId="email" />
                </div>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Designation</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">{employee.designation}</p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Department</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">{employee.department}</p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Salary</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">₹{(parseFloat(employee.salary) || 0).toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Phone</Label>
                <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                  <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg">{employee.phone || 'N/A'}</p>
                  {employee.phone && <CopyButton text={employee.phone} fieldId="phone" />}
                </div>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Date of Birth</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">
                  {employee.dob ? format(new Date(employee.dob), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Join Date</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">
                  {employee.joinDate ? format(new Date(employee.joinDate), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Location</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">{employee.location?.name || 'N/A'}</p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {employee.bankDetails && (
          <Collapsible open={isBankOpen} onOpenChange={setIsBankOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-2xs xs:text-xs sm:text-lg md:text-xl font-semibold text-body hover:text-accent transition-colors mt-2 xs:mt-3 sm:mt-6">
              Bank Details
              {isBankOpen ? <ChevronUp className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-5 sm:w-5" /> : <ChevronDown className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-5 sm:w-5" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 xs:mt-1.5 sm:mt-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xs:gap-4 sm:gap-6">
                <div>
                  <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Account Number</Label>
                  <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                    <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg">{employee.bankDetails.accountNo || 'N/A'}</p>
                    {employee.bankDetails.accountNo && <CopyButton text={employee.bankDetails.accountNo} fieldId="accountNo" />}
                  </div>
                </div>
                <div>
                  <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">IFSC Code</Label>
                  <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                    <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg">{employee.bankDetails.ifscCode || 'N/A'}</p>
                    {employee.bankDetails.ifscCode && <CopyButton text={employee.bankDetails.ifscCode} fieldId="ifscCode" />}
                  </div>
                </div>
                <div>
                  <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Bank Name</Label>
                  <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                    <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg">{employee.bankDetails.bankName || 'N/A'}</p>
                    {employee.bankDetails.bankName && <CopyButton text={employee.bankDetails.bankName} fieldId="bankName" />}
                  </div>
                </div>
                <div>
                  <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Account Holder</Label>
                  <div className="flex items-center mt-0.5 xs:mt-1 sm:mt-2 group">
                    <p className="text-body text-xs xs:text-sm sm:text-base md:text-lg">{employee.bankDetails.accountHolder || 'N/A'}</p>
                    {employee.bankDetails.accountHolder && <CopyButton text={employee.bankDetails.accountHolder} fieldId="accountHolder" />}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <Collapsible open={isLeavesOpen} onOpenChange={setIsLeavesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-2xs xs:text-xs sm:text-lg md:text-xl font-semibold text-body hover:text-accent transition-colors mt-2 xs:mt-3 sm:mt-6">
            Paid Leaves
            {isLeavesOpen ? <ChevronUp className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-5 sm:w-5" /> : <ChevronDown className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-5 sm:w-5" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 xs:mt-1.5 sm:mt-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xs:gap-4 sm:gap-6">
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Total Yearly</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">{totalYearlyPaidLeaves}</p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Available</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">{employee.paidLeaves.available}</p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Used</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">{employee.paidLeaves.used}</p>
              </div>
              <div>
                <Label className="text-2xs xs:text-xs sm:text-sm md:text-base font-semibold text-body">Carried Forward</Label>
                <p className="text-body mt-0.5 xs:mt-1 sm:mt-2 text-xs xs:text-sm sm:text-base md:text-lg">{employee.paidLeaves.carriedForward}</p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

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
                      {serverError?.fields?.name && <p className="text-error text-2xs xs:text-xs sm:text-sm">{serverError.fields.name}</p>}
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
                      {serverError?.fields?.email && <p className="text-error text-2xs xs:text-xs sm:text-sm">{serverError.fields.email}</p>}
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
                      {serverError?.fields?.designation && <p className="text-error text-2xs xs:text-xs sm:text-sm">{serverError.fields.designation}</p>}
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
                      {serverError?.fields?.department && <p className="text-error text-2xs xs:text-xs sm:text-sm">{serverError.fields.department}</p>}
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
                      {serverError?.fields?.salary && <p className="text-error text-2xs xs:text-xs sm:text-sm">{serverError.fields.salary}</p>}
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
                      {serverError?.fields?.phone && <p className="text-error text-2xs xs:text-xs sm:text-sm">{serverError.fields.phone}</p>}
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
                      {serverError?.fields?.dob && <p className="text-error text-2xs xs:text-xs sm:text-sm">{serverError.fields.dob}</p>}
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
                        {serverError?.fields?.['bankDetails.accountNo'] && <p className="text-error text-2xs xs:text-xs sm:text-sm">{serverError.fields['bankDetails.accountNo']}</p>}
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
                        {serverError?.fields?.['bankDetails.ifscCode'] && <p className="text-error text-2xs xs:text-xs sm:text-sm">{serverError.fields['bankDetails.ifscCode']}</p>}
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
                        {serverError?.fields?.['bankDetails.bankName'] && <p className="text-error text-2xs xs:text-xs sm:text-sm">{serverError.fields['bankDetails.bankName']}</p>}
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
                        {serverError?.fields?.['bankDetails.accountHolder'] && <p className="text-error text-2xs xs:text-xs sm:text-sm">{serverError.fields['bankDetails.accountHolder']}</p>}
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
                        {serverError?.fields?.['paidLeaves.available'] && <p className="text-error text-2xs xs:text-xs sm:text-sm">{serverError.fields['paidLeaves.available']}</p>}
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
                        {serverError?.fields?.['paidLeaves.used'] && <p className="text-error text-2xs xs:text-xs sm:text-sm">{serverError.fields['paidLeaves.used']}</p>}
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
                        {serverError?.fields?.['paidLeaves.carriedForward'] && <p className="text-error text-2xs xs:text-xs sm:text-sm">{serverError.fields['paidLeaves.carriedForward']}</p>}
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
    </Card>
  );
};

export default EmployeeDetails;