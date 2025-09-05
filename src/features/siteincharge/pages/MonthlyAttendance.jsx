// src/features/siteincharge/pages/MonthlyAttendance.jsx
import { useDispatch, useSelector } from "react-redux";
import { fetchMonthlyAttendance, requestAttendanceEdit } from "../redux/attendanceSlice";
import { fetchEmployees } from "../redux/employeeSlice";
import { useNavigate } from "react-router-dom";
import MonthlyAttendanceTable from "../../../components/attendance/MonthlyAttendanceTable";

const MonthlyAttendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const locationId = user?.locations?.[0]?._id;

  const reduxConfig = {
    attendanceSelector: (state) => ({
      attendanceData: state.siteInchargeAttendance.monthlyAttendance,
      pagination: state.siteInchargeAttendance.pagination,
      loading: state.siteInchargeAttendance.loading,
      error: state.siteInchargeAttendance.error,
    }),
    employeesSelector: (state) => ({
      employees: state.siteInchargeEmployee.employees,
      loading: state.siteInchargeEmployee.loading,
    }),
    locationsSelector: (state) => ({
      locations: state.siteInchargeEmployee.locations, // Locations are in employee slice
      loading: state.siteInchargeEmployee.loading,
    }),
    fetchAttendanceAction: fetchMonthlyAttendance,
    fetchEmployeesAction: fetchEmployees,
    fetchLocationsAction: null, // No separate locations action needed
    requestEditAction: requestAttendanceEdit,
  };

  return (
    <MonthlyAttendanceTable
      userRole="siteincharge"
      reduxConfig={reduxConfig}
      user={user}
      canEditDirectly={false}
      showLocationFilter={false}
      requireLocationSelection={false}
      userLocationId={locationId}
      navigate={navigate}
    />
  );
};

export default MonthlyAttendance;
