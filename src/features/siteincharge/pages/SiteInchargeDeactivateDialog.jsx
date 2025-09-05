import React, { useMemo } from 'react';
import ReusableDeactivateDialog from '@/components/employees/ReusableDeactivateDialog';
import { deactivateEmployee } from '../redux/employeeSlice';

const SiteInchargeDeactivateDialog = ({ open, onOpenChange, employeeId, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.siteInchargeEmployee,
  };

  const actions = useMemo(
    () => ({
      deactivateEmployee,
    }),
    []
  );

  return (
    <ReusableDeactivateDialog
      open={open}
      onOpenChange={onOpenChange}
      employeeId={employeeId}
      role="siteincharge"
      reduxSelectors={reduxSelectors}
      actions={actions}
      setSuccessMessage={setSuccessMessage}
    />
  );
};

export default SiteInchargeDeactivateDialog;