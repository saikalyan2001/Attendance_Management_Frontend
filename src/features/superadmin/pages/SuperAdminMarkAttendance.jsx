// src/features/superadmin/pages/SuperAdminMarkAttendance.jsx
import BaseMarkAttendance from '../../../components/attendance/BaseMarkAttendance';
import { bulkMarkAttendance, fetchAttendance } from '../redux/superAdminAttendanceSlice';
import { fetchEmployees } from '../redux/superadminEmployeeSlice';
import { fetchLocations } from '../redux/locationsSlice';

const SuperAdminMarkAttendance = (props) => {
  return (
    <BaseMarkAttendance
      {...props}
      role="super_admin"
      employeeSelector={(state) => ({
        // ✅ Fix: Return employees array directly, like Admin does
        data: state.superadminEmployees.employees,
        loading: state.superadminEmployees.loading,
        pagination: state.superadminEmployees.pagination
      })}
      attendanceSelector={(state) => state.superAdminAttendance}
      locationSelector={(state) => {
        // ✅ Fix: Ensure locations is always an array
        const locationState = state.superAdminLocations;
        if (Array.isArray(locationState)) {
          return locationState;
        }
        if (locationState?.locations && Array.isArray(locationState.locations)) {
          return locationState.locations;
        }
        return [];
      }}
      actions={{
        bulkMarkAttendance,
        fetchAttendance,
        fetchEmployees,
        fetchLocations
      }}
    />
  );
};

export default SuperAdminMarkAttendance;
