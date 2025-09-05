import React, { useMemo } from 'react';
import AddDocumentsDialog from '@/components/employees/AddDocumentsDialog';
import { addEmployeeDocuments, reset as resetEmployees } from '../redux/employeeSlice';

const AdminAddDocumentsDialog = ({ open, onOpenChange, employeeId, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.adminEmployees,
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
      role="admin"
      reduxSelectors={reduxSelectors}
      actions={actions}
      setSuccessMessage={setSuccessMessage}
      animateRows={false}
    />
  );
};

export default AdminAddDocumentsDialog;