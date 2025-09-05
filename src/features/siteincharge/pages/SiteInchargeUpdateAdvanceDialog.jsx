import React, { useMemo } from 'react';
import ReusableUpdateAdvanceDialog from '@/components/employees/ReusableUpdateAdvanceDialog';
import { updateEmployeeAdvance, reset } from '../redux/employeeSlice';

const SiteInchargeUpdateAdvanceDialog = ({ open, onOpenChange, employee, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.siteInchargeEmployee,
  };

  const actions = useMemo(
    () => ({
      updateEmployeeAdvance,
      reset,
    }),
    []
  );

  return (
    <ReusableUpdateAdvanceDialog
      open={open}
      onOpenChange={onOpenChange}
      employee={employee}
      role="siteincharge"
      reduxSelectors={reduxSelectors}
      actions={actions}
      setSuccessMessage={setSuccessMessage}
    />
  );
};

export default SiteInchargeUpdateAdvanceDialog;