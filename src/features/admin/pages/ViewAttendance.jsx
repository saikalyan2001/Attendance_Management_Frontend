// src/features/admin/pages/ViewAttendance.jsx
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees } from "../redux/employeeSlice";
import { fetchAttendance, reset, editAttendance } from "../redux/attendanceSlice";
import { fetchLocations } from "../redux/locationsSlice";
import { useNavigate } from "react-router-dom";
import ViewAttendanceTable from "../../../components/attendance/ViewAttendanceTable";

const ViewAttendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const reduxConfig = {
    attendanceSelector: (state) => ({
      attendance: state.adminAttendance.attendance,
      monthlyAttendance: state.adminAttendance.monthlyAttendance,
      pagination: state.adminAttendance.pagination,
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
    fetchAttendanceAction: fetchAttendance,
    fetchEmployeesAction: fetchEmployees,
    fetchLocationsAction: fetchLocations,
    editAttendanceAction: editAttendance,
    resetAction: reset,
  };

  return (
    <ViewAttendanceTable
      userRole="admin"
      reduxConfig={reduxConfig}
      user={user}
      canEditAttendance={true}
      showLocationFilter={true}
      requireLocationSelection={false} // ← Changed from true to false
      navigate={navigate}
    />
  );
};

export default ViewAttendance;
