import React, { useMemo } from 'react';
import ReusableUpdateAdvanceDialog from '@/components/employees/ReusableUpdateAdvanceDialog';
import { updateEmployeeAdvance, reset as resetEmployees } from '../redux/employeeSlice';

const AdminUpdateAdvanceDialog = ({ open, onOpenChange, employee, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.adminEmployees,
  };

  const actions = useMemo(
    () => ({
      updateEmployeeAdvance,
      reset: resetEmployees,
    }),
    []
  );

  return (
    <ReusableUpdateAdvanceDialog
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

export default AdminUpdateAdvanceDialog;