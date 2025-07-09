import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateEmployee, reset as resetEmployees } from '../redux/employeeSlice';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { parseServerError } from '@/utils/errorUtils';

const updateEmployeeSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters and spaces'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'),
  designation: z
    .string()
    .min(1, 'Designation is required')
    .max(50, 'Designation cannot exceed 50 characters'),
  department: z
    .string()
    .min(1, 'Department is required')
    .max(50, 'Department cannot exceed 50 characters'),
  salary: z
    .string()
    .min(1, 'Salary is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1000, 'Salary must be at least ₹1000'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{10}$/.test(val), 'Phone number must be 10 digits'),
  dob: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid date format'),
  bankDetails: z
    .object({
      accountNo: z
        .string()
        .min(1, 'Account number is required'),
      ifscCode: z
        .string()
        .min(1, 'IFSC code is required'),
      bankName: z
        .string()
        .min(1, 'Bank name is required'),
      accountHolder: z
        .string()
        .min(1, 'Account holder name is required'),
    })
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const { accountNo, ifscCode, bankName, accountHolder } = val;
        return accountNo && ifscCode && bankName && accountHolder;
      },
      { message: 'All bank details fields are required if any are provided' }
    ),
  paidLeaves: z
    .object({
      available: z
        .number()
        .min(0, 'Available leaves cannot be negative')
        .max(24, 'Available leaves cannot exceed 24'),
      used: z
        .number()
        .min(0, 'Used leaves cannot be negative'),
      carriedForward: z
        .number()
        .min(0, 'Carried forward leaves cannot be negative'),
    })
    .optional(),
});

const EditEmployeeDialog = ({ open, onOpenChange, employee }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.adminEmployees);
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(updateEmployeeSchema),
    defaultValues: {
      name: employee?.name || '',
      email: employee?.email || '',
      designation: employee?.designation || '',
      department: employee?.department || '',
      salary: employee?.salary ? employee.salary.toString() : '',
      phone: employee?.phone || '',
      dob: employee?.dob ? new Date(employee.dob).toISOString().split('T')[0] : '',
      bankDetails: {
        accountNo: employee?.bankDetails?.accountNo || '',
        ifscCode: employee?.bankDetails?.ifscCode || '',
        bankName: employee?.bankDetails?.bankName || '',
        accountHolder: employee?.bankDetails?.accountHolder || '',
      },
      paidLeaves: {
        available: employee?.paidLeaves?.available || 0,
        used: employee?.paidLeaves?.used || 0,
        carriedForward: employee?.paidLeaves?.carriedForward || 0,
      },
    },
  });

  const handleSubmit = async (data) => {
        try {
      setIsSubmitting(true);
      const isValid = await form.trigger();
            
      if (!isValid) {
                return;
      }

      const employeeData = {
        ...data,
        dob: data.dob ? new Date(data.dob).toISOString() : undefined,
        salary: Number(data.salary),
        paidLeaves: data.paidLeaves.available ? data.paidLeaves : undefined,
      };

      if (
        employeeData.bankDetails &&
        !employeeData.bankDetails.accountNo &&
        !employeeData.bankDetails.ifscCode &&
        !employeeData.bankDetails.bankName &&
        !employeeData.bankDetails.accountHolder
      ) {
        delete employeeData.bankDetails;
      }

      Object.keys(employeeData).forEach((key) => employeeData[key] === undefined && delete employeeData[key]);

      await dispatch(updateEmployee({ id: employee._id, data: employeeData })).unwrap();
      toast.success('Employee updated successfully', { position: 'top-center', duration: 5000 });
      onOpenChange(false);
      form.reset();
      dispatch(resetEmployees());
    } catch (error) {
      ('Submit error:', error);
      const parsedError = parseServerError(error);
      setServerError(parsedError);
      toast.error(parsedError.message, { position: 'top-center', duration: 5000 });
      Object.entries(parsedError.fields).forEach(([field, message], index) => {
        setTimeout(() => {
          toast.error(message, { position: 'top-center', duration: 5000 });
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveClick = async () => {
        try {
      const isValid = await form.trigger();
            
      if (!isValid) {
        const errors = [];
        const addError = (field, message) => {
          if (message) {
            errors.push({ field, message });
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
          'paidLeaves.available',
          'paidLeaves.used',
          'paidLeaves.carriedForward',
          'bankDetails',
        ];

        for (const field of fieldOrder) {
          if (field === 'bankDetails') {
            addError('bankDetails', form.formState.errors.bankDetails?.message);
          } else if (field.startsWith('bankDetails.')) {
            const subField = field.split('.')[1];
            addError(field, form.formState.errors.bankDetails?.[subField]?.message);
          } else if (field.startsWith('paidLeaves.')) {
            const subField = field.split('.')[1];
            addError(field, form.formState.errors.paidLeaves?.[subField]?.message);
          } else {
            addError(field, form.formState.errors[field]?.message);
          }
        }

        
        if (errors.length > 0) {
          const firstError = errors[0];
          toast.error(firstError.message, { position: 'top-center', duration: 5000 });
          const firstErrorField = firstError.field.includes('.')
            ? document.querySelector(`[name="${firstError.field}"]`)
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
      ('handleSaveClick error:', error);
      toast.error('Error submitting form, please try again', { position: 'top-center', duration: 5000 });
    }
  };

  return (
    <DialogContent className="bg-complementary text-body max-h-[80vh] overflow-y-auto max-w-[90vw] sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
          Edit Employee: {employee?.name}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4" ref={formRef}>
          <FormItem>
            <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Employee ID</FormLabel>
            <Input
              value={employee?.employeeId || ''}
              className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
              aria-label="Employee ID"
              disabled
            />
          </FormItem>
          <FormItem>
            <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Location</FormLabel>
            <Input
              value={employee?.location?.name || employee?.location?.city || 'N/A'}
              className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
              disabled
              aria-label="Location"
            />
          </FormItem>
          {['name', 'email', 'designation', 'department', 'phone', 'dob'].map((field) => (
            <FormField
              key={field}
              control={form.control}
              name={field}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                    {field.charAt(0).toUpperCase() + field.slice(1)} {field !== 'dob' && field !== 'phone' ? '*' : ''}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type={field === 'dob' ? 'date' : 'text'}
                      {...f}
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      aria-label={field.charAt(0).toUpperCase() + field.slice(1)}
                      disabled={employeesLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.[field] || form.formState.errors[field]?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
          ))}
          <FormField
            control={form.control}
            name="salary"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Salary *</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    {...field}
                    className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                    aria-label="Salary"
                    disabled={employeesLoading || isSubmitting}
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
            name="bankDetails.accountNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Account Number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                    aria-label="Account Number"
                    disabled={employeesLoading || isSubmitting}
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
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">IFSC Code</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                    aria-label="IFSC Code"
                    disabled={employeesLoading || isSubmitting}
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
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Bank Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                    aria-label="Bank Name"
                    disabled={employeesLoading || isSubmitting}
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
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Account Holder Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                    aria-label="Account Holder Name"
                    disabled={employeesLoading || isSubmitting}
                  />
                </FormControl>
                <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                  {serverError?.fields?.['bankDetails.accountHolder'] || form.formState.errors.bankDetails?.accountHolder?.message}
                </FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paidLeaves.available"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Available Leaves</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                    aria-label="Available Leaves"
                    disabled={employeesLoading || isSubmitting}
                  />
                </FormControl>
                <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                  {serverError?.fields?.['paidLeaves.available'] || form.formState.errors.paidLeaves?.available?.message}
                </FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paidLeaves.used"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Used Leaves</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                    aria-label="Used Leaves"
                    disabled={employeesLoading || isSubmitting}
                  />
                </FormControl>
                <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                  {serverError?.fields?.['paidLeaves.used'] || form.formState.errors.paidLeaves?.used?.message}
                </FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paidLeaves.carriedForward"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Carried Forward Leaves</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                    aria-label="Carried Forward Leaves"
                    disabled={employeesLoading || isSubmitting}
                  />
                </FormControl>
                <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                  {serverError?.fields?.['paidLeaves.carriedForward'] || form.formState.errors.paidLeaves?.carriedForward?.message}
                </FormMessage>
              </FormItem>
            )}
          />
          <div className="sm:col-span-2 flex justify-end gap-3 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
              disabled={employeesLoading || isSubmitting}
              aria-label="Cancel edit"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveClick}
              className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
              disabled={employeesLoading || isSubmitting}
              aria-label="Save changes"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
};

export default EditEmployeeDialog;
