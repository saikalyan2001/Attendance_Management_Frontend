import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateEmployee, reset as resetEmployees } from '../redux/employeeSlice';
import EditEmployeeDialog from '../../../components/employees/EditEmployeeDialog';
import { updateEmployeeSchema } from '../../../components/employees/employeeSchemas';

const AdminEditEmployeeDialog = ({ open, onOpenChange, employee }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.adminEmployees);

  if (!employee || !employee._id) {
    return null; // Prevent rendering if employee is invalid
  }

  return (
    <EditEmployeeDialog
      open={open}
      onOpenChange={onOpenChange}
      employee={employee}
      dispatchAction={(data) => dispatch(updateEmployee(data))}
      resetAction={() => dispatch(resetEmployees())}
      titlePrefix="Admin Edit Employee"
      additionalFields={[]}
      isLoading={employeesLoading}
      schema={updateEmployeeSchema}
      successMessage="Employee updated successfully"
      maxWidth="sm:max-w-2xl"
    />
  );
};

export default AdminEditEmployeeDialog;