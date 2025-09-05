import React, { useMemo } from 'react';
import ReusableDeactivateDialog from '@/components/employees/ReusableDeactivateDialog';
import { deactivateEmployee, reset as resetEmployees } from '../redux/superadminEmployeeSlice';

const SuperAdminDeactivateDialog = ({ open, onOpenChange, employeeId, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.superadminEmployees,
  };

  const actions = useMemo(
    () => ({
      deactivateEmployee,
      reset: resetEmployees,
    }),
    []
  );

  return (
    <ReusableDeactivateDialog
      open={open}
      onOpenChange={onOpenChange}
      employeeId={employeeId}
      role="super_admin"
      reduxSelectors={reduxSelectors}
      actions={actions}
      setSuccessMessage={setSuccessMessage}
    />
  );
};

export default SuperAdminDeactivateDialog;