// src/features/admin/pages/MonthlyAttendance.jsx
import { useDispatch, useSelector } from "react-redux";
import { fetchMonthlyAttendance, editAttendance } from "../redux/attendanceSlice";
import { fetchEmployees } from "../redux/employeeSlice";
import { fetchLocations } from "../redux/locationsSlice";
import { useNavigate } from "react-router-dom";
import MonthlyAttendanceTable from "../../../components/attendance/MonthlyAttendanceTable";

const MonthlyAttendance = ({ month, year, location, setLocation, setMonth, setYear }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const reduxConfig = {
    attendanceSelector: (state) => ({
      attendanceData: state.adminAttendance.monthlyAttendance,
      pagination: state.adminAttendance.monthlyPagination,
      loading: state.adminAttendance.loading,
      error: state.adminAttendance.error,
    }),
    employeesSelector: (state) => ({
      employees: state.adminEmployees.employees,
      loading: state.adminEmployees.loading,
    }),
    locationsSelector: (state) => ({
      locations: state.adminLocations.locations,
      loading: state.adminLocations.loading,
    }),
    fetchAttendanceAction: fetchMonthlyAttendance,
    fetchEmployeesAction: fetchEmployees,
    fetchLocationsAction: fetchLocations,
    editAttendanceAction: editAttendance,
  };

  return (
    <MonthlyAttendanceTable
      userRole="admin"
      reduxConfig={reduxConfig}
      user={user}
      canEditDirectly={true}
      showLocationFilter={true}
      requireLocationSelection={false} // ← Changed from true to false
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

export default MonthlyAttendance;
