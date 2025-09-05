import React, { useMemo } from 'react';
import AddDocumentsDialog from '@/components/employees/AddDocumentsDialog';
import { reset, uploadDocument } from '../redux/employeeSlice';


const SiteInchargeAddDocumentsDialog = ({ open, onOpenChange, employeeId, setSuccessMessage }) => {
  const reduxSelectors = {
    employees: (state) => state.siteInchargeEmployee,
  };

  const actions = useMemo(() => ({
    addEmployeeDocuments: uploadDocument,
    reset: reset, 
  }), []);

  return (
    <AddDocumentsDialog
      open={open}
      onOpenChange={onOpenChange}
      employeeId={employeeId}
      role="siteincharge"
      reduxSelectors={reduxSelectors}
      actions={actions}
      setSuccessMessage={setSuccessMessage}
      animateRows={true}
    />
  );
};

export default SiteInchargeAddDocumentsDialog;