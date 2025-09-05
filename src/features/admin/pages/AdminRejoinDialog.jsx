import React, { useMemo } from 'react';
import ReusableRejoinDialog from '@/components/employees/ReusableRejoinDialog';
import { rejoinEmployee, reset as resetEmployees } from '../redux/employeeSlice';

const AdminRejoinDialog = ({ open, onOpenChange, employee, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.adminEmployees,
  };

  const actions = useMemo(
    () => ({
      rejoinEmployee,
      reset: resetEmployees,
    }),
    []
  );

  return (
    <ReusableRejoinDialog
      open={open}
      onOpenChange={onOpenChange}
      employee={employee}
      role="admin"
      reduxSelectors={reduxSelectors}
      actions={actions}
      setSuccessMessage={setSuccessMessage}
    />
  );
};

export default AdminRejoinDialog;