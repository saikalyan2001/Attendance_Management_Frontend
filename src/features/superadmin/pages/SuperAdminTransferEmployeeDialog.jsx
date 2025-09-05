import React, { useMemo } from 'react';
import TransferEmployeeDialog from '@/components/employees/TransferEmployeeDialog';
import { fetchEmployeeById, transferEmployee, reset } from '../redux/superadminEmployeeSlice';

const SuperAdminTransferEmployeeDialog = ({ open, onOpenChange, employeeId, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.superadminEmployees,
    locations: (state) => state.superAdminLocations,
  };

  const actions = useMemo(() => ({
    fetchEmployeeById,
    transferEmployee,
    reset,
  }), []);

  return (
    <TransferEmployeeDialog
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

export default SuperAdminTransferEmployeeDialog;