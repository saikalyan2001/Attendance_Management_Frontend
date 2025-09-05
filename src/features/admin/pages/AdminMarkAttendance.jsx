// src/features/admin/pages/MarkAttendance.jsx
import BaseMarkAttendance from '../../../components/attendance/BaseMarkAttendance';
import { bulkMarkAttendance, fetchAttendance } from '../redux/attendanceSlice';
import { fetchEmployees } from '../redux/employeeSlice';
import { fetchLocations } from '../redux/locationsSlice';

const AdminMarkAttendance = (props) => {
  return (
    <BaseMarkAttendance
      {...props}
      role="admin"
      employeeSelector={(state) => ({
        // ✅ Fix: Use correct Admin state keys from store configuration
        data: state.adminEmployees.employees,
        loading: state.adminEmployees.loading,
        pagination: state.adminEmployees.pagination
      })}
      attendanceSelector={(state) => state.adminAttendance}
      locationSelector={(state) => {
        // ✅ Fix: Use correct Admin locations state key
        const locationState = state.adminLocations;
        if (Array.isArray(locationState)) {
          return locationState;
        }
        if (locationState?.locations && Array.isArray(locationState.locations)) {
          return locationState.locations;
        }
        if (locationState?.data && Array.isArray(locationState.data)) {
          return locationState.data;
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

export default AdminMarkAttendance;
