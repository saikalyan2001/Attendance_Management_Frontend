import React, { useMemo } from 'react';
import ReusableRejoinDialog from '@/components/employees/ReusableRejoinDialog';
import { rejoinEmployee, reset as resetEmployees } from '../redux/superadminEmployeeSlice';

const SuperAdminRejoinDialog = ({ open, onOpenChange, employee, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.superadminEmployees,
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
      role="super_admin"
      reduxSelectors={reduxSelectors}
      actions={actions}
      setSuccessMessage={setSuccessMessage}
    />
  );
};

export default SuperAdminRejoinDialog;