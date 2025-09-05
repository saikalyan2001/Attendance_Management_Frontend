// src/features/siteincharge/pages/MarkAttendance.jsx
import BaseMarkAttendance from '../../../components/attendance/BaseMarkAttendance';
import { bulkMarkAttendance, fetchAttendance } from '../redux/attendanceSlice';
import { fetchEmployees } from '../redux/employeeSlice';

const SiteInchargeMarkAttendance = (props) => {
  return (
    <BaseMarkAttendance
      {...props}
      role="siteincharge"
      locationId={props.locationId}
      // ✅ Fix the employee selector to return the correct data structure
      employeeSelector={(state) => {
        console.log('🔍 Employee Selector State:', state.siteInchargeEmployee);
        return {
          data: state.siteInchargeEmployee.employees || [], // Assuming employees are in this path
          loading: state.siteInchargeEmployee.loading,
          pagination: state.siteInchargeEmployee.pagination
        };
      }}
      attendanceSelector={(state) => state.siteInchargeAttendance}
      locationSelector={(state) => state.auth.user?.locations || []}
      actions={{
        bulkMarkAttendance,
        fetchAttendance,
        fetchEmployees
      }}
    />
  );
};

export default SiteInchargeMarkAttendance;
