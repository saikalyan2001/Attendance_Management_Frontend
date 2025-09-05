// src/features/superadmin/pages/AttendanceRequests.jsx
import { useDispatch, useSelector } from "react-redux";
import { fetchAttendanceRequests, handleAttendanceRequest, reset } from "../redux/superAdminAttendanceSlice";
import { fetchEmployees } from "../redux/superadminEmployeeSlice";
import { fetchLocations } from "../redux/locationsSlice";
import { useNavigate } from "react-router-dom";
import AttendanceRequestsTable from "../../../components/attendance/AttendanceRequestsTable";

const SuperAdminAttendanceRequests = ({ locationId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const reduxConfig = {
    attendanceSelector: (state) => ({
      attendanceRequests: state.superAdminAttendance.attendanceRequests,
      requestsPagination: state.superAdminAttendance.requestsPagination,
      loading: state.superAdminAttendance.loading,
      error: state.superAdminAttendance.error,
    }),
    employeesSelector: (state) => ({
      employees: state.superadminEmployees.employees,
      loading: state.superadminEmployees.loading,
      error: state.superadminEmployees.error,
    }),
    locationsSelector: (state) => ({
      locations: state.superAdminLocations.locations,
      loading: state.superAdminLocations.loading,
    }),
    fetchRequestsAction: fetchAttendanceRequests,
    handleRequestActionRedux: handleAttendanceRequest, // ← Changed this line
    fetchEmployeesAction: fetchEmployees,
    fetchLocationsAction: fetchLocations,
    resetAction: reset,
  };

  return (
    <AttendanceRequestsTable
      userRole="super_admin"
      reduxConfig={reduxConfig}
      user={user}
      canApproveReject={true}
      showLocationFilter={true}
      navigate={navigate}
    />
  );
};

export default SuperAdminAttendanceRequests;
