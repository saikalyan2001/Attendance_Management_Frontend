import React, { useMemo } from 'react';
import AddDocumentsDialog from '@/components/employees/AddDocumentsDialog';
import { addEmployeeDocuments, reset as resetEmployees } from '../redux/superadminEmployeeSlice';

const SuperAdminAddDocumentsDialog = ({ open, onOpenChange, employeeId, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.superadminEmployees,
  };

  const actions = useMemo(() => ({
    addEmployeeDocuments,
    reset: resetEmployees,
  }), []);

  return (
    <AddDocumentsDialog
      open={open}
      onOpenChange={onOpenChange}
      employeeId={employeeId}
      role="super_admin"
      reduxSelectors={reduxSelectors}
      actions={actions}
      setSuccessMessage={setSuccessMessage}
      animateRows={false}
    />
  );
};

export default SuperAdminAddDocumentsDialog;