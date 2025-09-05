// src/features/superadmin/pages/SuperAdminMonthlyAttendance.jsx
import { useDispatch, useSelector } from "react-redux";
import { fetchMonthlyAttendance, editAttendance } from "../redux/superAdminAttendanceSlice";
import { fetchEmployees } from "../redux/superadminEmployeeSlice";
import { fetchLocations } from "../redux/locationsSlice";
import { useNavigate } from "react-router-dom";
import MonthlyAttendanceTable from "../../../components/attendance/MonthlyAttendanceTable";

const SuperAdminMonthlyAttendance = ({ month, year, location, setLocation, setMonth, setYear }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const reduxConfig = {
    attendanceSelector: (state) => ({
      attendanceData: state.superAdminAttendance.monthlyAttendance,
      pagination: state.superAdminAttendance.monthlyPagination,
      loading: state.superAdminAttendance.loading,
      error: state.superAdminAttendance.error,
    }),
    employeesSelector: (state) => ({
      employees: state.superadminEmployees.employees,
      loading: state.superadminEmployees.loading,
    }),
    locationsSelector: (state) => ({
      locations: state.superAdminLocations.locations,
      loading: state.superAdminLocations.loading,
    }),
    fetchAttendanceAction: fetchMonthlyAttendance,
    fetchEmployeesAction: fetchEmployees,
    fetchLocationsAction: fetchLocations,
    editAttendanceAction: editAttendance,
  };

  return (
    <MonthlyAttendanceTable
      userRole="super_admin"
      reduxConfig={reduxConfig}
      user={user}
      canEditDirectly={true}
      showLocationFilter={true}
      requireLocationSelection={false}
      month={month}
      year={year}
      location={location}
      setLocation={setLocation}
      setMonth={setMonth}
      setYear={setYear}
      navigate={navigate}
    />
  );
};

export default SuperAdminMonthlyAttendance;
