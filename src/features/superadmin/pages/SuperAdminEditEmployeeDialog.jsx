// src/features/superadmin/pages/SuperAdminEditEmployeeDialog.jsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateEmployee, reset as resetEmployees } from '../redux/superadminEmployeeSlice';
import EditEmployeeDialog from '../../../components/employees/EditEmployeeDialog';
import { updateEmployeeSchema } from '../../../components/employees/employeeSchemas';

const SuperAdminEditEmployeeDialog = ({ open, onOpenChange, employee }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.superadminEmployees);
  
  const additionalFields = [
    {
      name: 'role',
      label: 'Role *',
      type: 'text',
      defaultValue: employee?.role || '',
    },
  ];

  if (!employee || !employee._id) {
    return null;
  }

  return (
    <EditEmployeeDialog
      open={open}
      onOpenChange={onOpenChange}
      employee={employee}
      dispatchAction={(data) => dispatch(updateEmployee(data))}
      resetAction={() => {}} // ✅ DISABLED: Prevent state reset that could trigger refetches
      titlePrefix="SuperAdmin Edit Employee"
      additionalFields={additionalFields}
      isLoading={employeesLoading}
      schema={updateEmployeeSchema}
      successMessage="Employee updated successfully"
      maxWidth="sm:max-w-2xl"
    />
  );
};

export default SuperAdminEditEmployeeDialog;
