// src/features/siteincharge/pages/AttendanceRequests.jsx
import { useDispatch, useSelector } from "react-redux";
import { fetchAttendanceEditRequests, reset } from "../redux/attendanceSlice";
import { fetchEmployees, reset as resetEmployees } from "../redux/employeeSlice";
import { useNavigate } from "react-router-dom";
import AttendanceRequestsTable from "../../../components/attendance/AttendanceRequestsTable";

const AttendanceRequests = ({ locationId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const reduxConfig = {
    attendanceSelector: (state) => ({
      attendanceEditRequests: state.siteInchargeAttendance.attendanceEditRequests,
      pagination: state.siteInchargeAttendance.pagination,
      loading: state.siteInchargeAttendance.loading,
      error: state.siteInchargeAttendance.error,
    }),
    employeesSelector: (state) => ({
      employees: state.siteInchargeEmployee.employees,
      loading: state.siteInchargeEmployee.loading,
      error: state.siteInchargeEmployee.error,
    }),
    fetchRequestsAction: fetchAttendanceEditRequests,
    fetchEmployeesAction: fetchEmployees,
    resetAction: () => (dispatch) => {
      dispatch(reset());
      dispatch(resetEmployees());
    },
  };

  return (
    <AttendanceRequestsTable
      userRole="siteincharge"
      reduxConfig={reduxConfig}
      user={user}
      canApproveReject={false}
      showLocationFilter={false}
      userLocationId={locationId}
      navigate={navigate}
    />
  );
};

export default AttendanceRequests;
