// src/features/siteincharge/pages/ViewAttendance.jsx
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees } from "../redux/employeeSlice";
import { fetchAttendance, fetchMonthlyAttendance, reset } from "../redux/attendanceSlice";
import { useNavigate } from "react-router-dom";
import ViewAttendanceTable from "../../../components/attendance/ViewAttendanceTable";

const ViewAttendance = ({ locationId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const reduxConfig = {
    attendanceSelector: (state) => ({
      attendance: state.siteInchargeAttendance.attendance,
      monthlyAttendance: state.siteInchargeAttendance.monthlyAttendance,
      pagination: state.siteInchargeAttendance.pagination,
      loading: state.siteInchargeAttendance.loading,
      error: state.siteInchargeAttendance.error,
    }),
    employeesSelector: (state) => ({
      employees: state.siteInchargeEmployee.employees,
      loading: state.siteInchargeEmployee.loading,
    }),
    fetchAttendanceAction: fetchAttendance,
    fetchMonthlyAttendanceAction: fetchMonthlyAttendance,
    fetchEmployeesAction: fetchEmployees,
    resetAction: reset,
  };

  return (
    <ViewAttendanceTable
      userRole="siteincharge"
      reduxConfig={reduxConfig}
      user={user}
      canEditAttendance={false}
      showLocationFilter={false}
      requireLocationSelection={false}
      userLocationId={locationId}
      navigate={navigate}
    />
  );
};

export default ViewAttendance;
