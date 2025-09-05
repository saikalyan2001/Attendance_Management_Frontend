import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { editEmployee, fetchEmployees, reset as resetEmployees } from '../redux/employeeSlice';
import EditEmployeeDialog from '../../../components/employees/EditEmployeeDialog';
import { siteInchargeEditEmployeeSchema } from '../../../components/employees/employeeSchemas';

const SiteInchargeEditEmployeeDialog = ({ open, onOpenChange, employee }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.siteInchargeEmployee);
  const { user } = useSelector((state) => state.auth);
  const locationId = user?.locations?.[0]?._id;

  if (!employee || !employee._id || !locationId) {
    return null; // Prevent rendering if employee or locationId is invalid
  }

  return (
    <EditEmployeeDialog
      open={open}
      onOpenChange={onOpenChange}
      employee={employee}
      dispatchAction={({ id, data }) => // ← Changed: destructure the parameters correctly
        dispatch(editEmployee({ id, data })).then(() =>
          dispatch(fetchEmployees({ location: locationId, status: '', cache: false }))
        )
      }
      resetAction={() => dispatch(resetEmployees())}
      titlePrefix="Site Incharge Edit Employee"
      successMessage="Employee updated successfully"
      additionalFields={[]}
      isLoading={employeesLoading}
      maxWidth="sm:max-w-2xl"
      schema={siteInchargeEditEmployeeSchema}
    />
  );
};

export default SiteInchargeEditEmployeeDialog;
