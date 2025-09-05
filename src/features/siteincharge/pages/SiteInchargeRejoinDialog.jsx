import React, { useMemo } from 'react';
import ReusableRejoinDialog from '@/components/employees/ReusableRejoinDialog';
import { rejoinEmployee } from '../redux/employeeSlice';

const SiteInchargeRejoinDialog = ({ open, onOpenChange, employee, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.siteInchargeEmployee,
  };

  const actions = useMemo(
    () => ({
      rejoinEmployee,
    }),
    []
  );

  return (
    <ReusableRejoinDialog
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

export default SiteInchargeRejoinDialog;