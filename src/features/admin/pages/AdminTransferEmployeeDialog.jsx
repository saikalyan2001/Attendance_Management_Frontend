import React from 'react';
import TransferEmployeeDialog from '@/components/employees/TransferEmployeeDialog';
import { fetchEmployeeById, transferEmployee, reset } from '../redux/employeeSlice';

const AdminTransferEmployeeDialog = ({ open, onOpenChange, employeeId, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.adminEmployees,
    locations: (state) => state.adminLocations,
  };

  const actions = {
    fetchEmployeeById,
    transferEmployee,
    reset,
  };

  return (
    <TransferEmployeeDialog
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

export default AdminTransferEmployeeDialog;