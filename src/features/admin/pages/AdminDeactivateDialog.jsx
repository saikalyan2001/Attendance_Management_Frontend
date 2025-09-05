import React, { useMemo } from 'react';
import ReusableDeactivateDialog from '@/components/employees/ReusableDeactivateDialog';
import { deactivateEmployee, reset as resetEmployees } from '../redux/employeeSlice';

const AdminDeactivateDialog = ({ open, onOpenChange, employeeId, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.adminEmployees,
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
      role="admin"
      reduxSelectors={reduxSelectors}
      actions={actions}
      setSuccessMessage={setSuccessMessage}
    />
  );
};

export default AdminDeactivateDialog;