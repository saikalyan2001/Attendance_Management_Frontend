import React from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import ReusableDialog from './ReusableDialog';
import useFormHandler from './useFormHandler';
import { updateEmployeeSchema } from './employeeSchemas';

const EditEmployeeDialog = ({
  open,
  onOpenChange,
  employee,
  dispatchAction,
  successMessage = 'Employee updated successfully',
  resetAction,
  titlePrefix = 'Edit Employee',
  additionalFields = [],
  isLoading = false,
  maxWidth = 'sm:max-w-2xl',
  schema = updateEmployeeSchema, // Fallback to updateEmployeeSchema
}) => {
  if (!employee || !employee._id) {
    return null; // Prevent rendering if employee is invalid
  }

  const form = useForm({
    resolver: zodResolver(schema),
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
      ...additionalFields.reduce((acc, field) => ({ ...acc, [field.name]: field.defaultValue || '' }), {}),
    },
  });

  const { handleSubmitClick, isSubmitting, serverError, formRef } = useFormHandler(
    form,
    (data) => {
      const employeeData = {
        ...data,
        dob: data.dob ? new Date(data.dob).toISOString() : undefined,
        salary: Number(data.salary),
        paidLeaves: data.paidLeaves?.available ? data.paidLeaves : undefined,
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
      return dispatchAction({ id: employee._id, data: employeeData });
    },
    () => onOpenChange(false),
    successMessage,
    resetAction
  );

  // Define fields to render based on schema
  const schemaFields = Object.keys(schema.shape);
  const standardFields = ['name', 'email', 'designation', 'department', 'phone', 'salary'];
  const bankDetailFields = schemaFields.includes('bankDetails')
    ? ['accountNo', 'ifscCode', 'bankName', 'accountHolder']
    : [];
  const paidLeavesFields = schemaFields.includes('paidLeaves')
    ? ['available', 'used', 'carriedForward']
    : [];
  const otherFields = schemaFields.filter(
    (field) => !standardFields.includes(field) && !['bankDetails', 'paidLeaves'].includes(field)
  );

  return (
    <ReusableDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${titlePrefix}: ${employee?.name}`}
      isSubmitting={isSubmitting}
      isLoading={isLoading}
      submitLabel="Save Changes"
      maxWidth={maxWidth}
      onSubmit={handleSubmitClick}
    >
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
          {standardFields
            .filter((field) => schemaFields.includes(field))
            .map((field) => (
              <FormField
                key={field}
                control={form.control}
                name={field}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                      {field.charAt(0).toUpperCase() + field.slice(1)} {field !== 'phone' && field !== 'dob' ? '*' : ''}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type={field === 'dob' ? 'date' : 'text'}
                        {...f}
                        className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                        aria-label={field.charAt(0).toUpperCase() + field.slice(1)}
                        disabled={isLoading || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                      {serverError?.fields?.[field] || form.formState.errors[field]?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />
            ))}
          {bankDetailFields.map((subField) => (
            <FormField
              key={subField}
              control={form.control}
              name={`bankDetails.${subField}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                    {subField === 'accountNo'
                      ? 'Account Number'
                      : subField === 'ifscCode'
                      ? 'IFSC Code'
                      : subField === 'bankName'
                      ? 'Bank Name'
                      : 'Account Holder Name'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      aria-label={subField === 'accountNo'
                        ? 'Account Number'
                        : subField === 'ifscCode'
                        ? 'IFSC Code'
                        : subField === 'bankName'
                        ? 'Bank Name'
                        : 'Account Holder Name'}
                      disabled={isLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.[`bankDetails.${subField}`] || form.formState.errors.bankDetails?.[subField]?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
          ))}
          {paidLeavesFields.map((subField) => (
            <FormField
              key={subField}
              control={form.control}
              name={`paidLeaves.${subField}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">
                    {subField === 'available'
                      ? 'Available Leaves'
                      : subField === 'used'
                      ? 'Used Leaves'
                      : 'Carried Forward Leaves'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      aria-label={subField === 'available'
                        ? 'Available Leaves'
                        : subField === 'used'
                        ? 'Used Leaves'
                        : 'Carried Forward Leaves'}
                      disabled={isLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.[`paidLeaves.${subField}`] || form.formState.errors.paidLeaves?.[subField]?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
          ))}
          {additionalFields.map((field) => (
            <FormField
              key={field.name}
              control={form.control}
              name={field.name}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">{field.label}</FormLabel>
                  <FormControl>
                    {field.render ? (
                      field.render(f)
                    ) : (
                      <Input
                        type={field.type || 'text'}
                        {...f}
                        className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                        aria-label={field.label}
                        disabled={isLoading || isSubmitting}
                      />
                    )}
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.[field.name] || form.formState.errors[field.name]?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
          ))}
        </form>
      </Form>
    </ReusableDialog>
  );
};

export default EditEmployeeDialog;