// src/features/superadmin/pages/ViewAttendance.jsx
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees } from "../redux/superadminEmployeeSlice";
import { fetchAttendance, reset, editAttendance } from "../redux/superAdminAttendanceSlice";
import { fetchLocations } from "../redux/locationsSlice";
import { useNavigate } from "react-router-dom";
import ViewAttendanceTable from "../../../components/attendance/ViewAttendanceTable";

const SuperAdminViewAttendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const reduxConfig = {
    attendanceSelector: (state) => ({
      attendance: state.superAdminAttendance.attendance,
      monthlyAttendance: state.superAdminAttendance.monthlyAttendance,
      pagination: state.superAdminAttendance.pagination,
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
    fetchAttendanceAction: fetchAttendance,
    fetchEmployeesAction: fetchEmployees,
    fetchLocationsAction: fetchLocations,
    editAttendanceAction: editAttendance,
    resetAction: reset,
  };

  return (
    <ViewAttendanceTable
      userRole="super_admin"
      reduxConfig={reduxConfig}
      user={user}
      canEditAttendance={true}
      showLocationFilter={true}
      requireLocationSelection={false}
      navigate={navigate}
    />
  );
};

export default SuperAdminViewAttendance;
