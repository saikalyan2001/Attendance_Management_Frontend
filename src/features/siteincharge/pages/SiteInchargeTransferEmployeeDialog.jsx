import React from 'react';
import TransferEmployeeDialog from '@/components/employees/TransferEmployeeDialog';
import { transferEmployee, reset } from '../redux/employeeSlice';

const SiteInchargeTransferEmployeeDialog = ({ open, onOpenChange, employeeId, allLocations, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.siteInchargeEmployee,
    locations: () => null, // Locations provided via allLocations prop
  };

  
  

  const actions = {
    transferEmployee,
    reset,
    fetchEmployeeById: () => {}, // Not used for Site Incharge
  };

  return (
    <TransferEmployeeDialog
      open={open}
      onOpenChange={onOpenChange}
      employeeId={employeeId}
      role="siteincharge"
      reduxSelectors={reduxSelectors}
      actions={actions}
      allLocations={allLocations}
      setSuccessMessage={setSuccessMessage}
    />
  );
};

export default SiteInchargeTransferEmployeeDialog;