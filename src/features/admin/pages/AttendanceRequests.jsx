// src/features/admin/pages/AttendanceRequests.jsx
import { useDispatch, useSelector } from "react-redux";
import { fetchAttendanceRequests, handleAttendanceRequest, reset } from "../redux/attendanceSlice";
import { fetchEmployees } from "../redux/employeeSlice";
import { useNavigate } from "react-router-dom";
import AttendanceRequestsTable from "../../../components/attendance/AttendanceRequestsTable";

const AttendanceRequests = ({ locationId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const reduxConfig = {
    attendanceSelector: (state) => ({
      attendanceRequests: state.adminAttendance.attendanceRequests,
      requestsPagination: state.adminAttendance.requestsPagination,
      loading: state.adminAttendance.loading,
      error: state.adminAttendance.error,
    }),
    employeesSelector: (state) => ({
      employees: state.adminEmployees.employees,
      loading: state.adminEmployees.loading,
      error: state.adminEmployees.error,
    }),
    locationsSelector: (state) => ({
      locations: state.adminLocations.locations,
      loading: state.adminLocations.loading,
    }),
    fetchRequestsAction: fetchAttendanceRequests,
    handleRequestActionRedux: handleAttendanceRequest, // ← Changed this line
    fetchEmployeesAction: fetchEmployees,
    fetchLocationsAction: null, // Uses locations from adminLocations
    resetAction: reset,
  };

  return (
    <AttendanceRequestsTable
      userRole="admin"
      reduxConfig={reduxConfig}
      user={user}
      canApproveReject={true}
      showLocationFilter={true}
      navigate={navigate}
    />
  );
};

export default AttendanceRequests;
