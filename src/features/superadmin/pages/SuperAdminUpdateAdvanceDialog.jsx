import React, { useMemo } from 'react';
import ReusableUpdateAdvanceDialog from '@/components/employees/ReusableUpdateAdvanceDialog';
import { updateEmployeeAdvance, fetchEmployeeAdvances, reset as resetEmployees } from '../redux/superadminEmployeeSlice';

const SuperAdminUpdateAdvanceDialog = ({ open, onOpenChange, employee, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.superadminEmployees,
  };

  const actions = useMemo(
    () => ({
      updateEmployeeAdvance,
      fetchEmployeeAdvances,
      reset: resetEmployees,
    }),
    []
  );

  return (
    <ReusableUpdateAdvanceDialog
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

export default SuperAdminUpdateAdvanceDialog;