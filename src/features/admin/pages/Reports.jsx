// pages/admin/reports/AdminReports.jsx
import { toast } from "sonner";
import {
  fetchAttendanceReport,
  fetchLeaveReport,
  fetchSalaryReport,
  reset as resetReports,
} from "../redux/reportsSlice";
import { fetchLocations, reset as resetLocations } from "../redux/locationsSlice";
import ReportsContainer from "../../../components/reports/ReportsContainer";
import AttendanceTable from "../../../components/reports/AttendanceTable";
import LeaveTable from "../../../components/reports/LeaveTable";
import SalaryTable from "../../../components/reports/SalaryTable";

const AdminReports = () => {
  const config = {
    title: "Reports",
    isSuperAdmin: false,
    userRole: "admin",
    showToast: toast,
    navigate: null,
    checkAuth: true
  };

  const slices = {
    reports: "adminReports",
    locations: "adminLocations"
  };

  const actions = {
    fetchAttendanceReport,
    fetchLeaveReport,
    fetchSalaryReport,
    fetchLocations,
    resetReports,
    resetLocations
  };

  const attendanceConfig = {
    title: "Attendance Report",
    isSuperAdmin: false,
    showToast: toast,
    checkMissingEmployeeData: false,
  };

  const leaveConfig = {
    title: "Leave Report",
    isSuperAdmin: false,
    showToast: toast,
    toastConfig: {
      id: "export-error",
      duration: 6000,
      position: "top-center",
    }
  };

  const salaryConfig = {
    title: "Salary Report",
    isSuperAdmin: false,
    showToast: toast,
    toastConfig: {
      id: "export-error",
      duration: 6000,
      position: "top-center",
    },
    useBackendSummary: false, // Admin calculates totals
  };

  const children = {
    attendance: (props) => (
      <AttendanceTable {...props} config={attendanceConfig} />
    ),
    leave: (props) => (
      <LeaveTable {...props} config={leaveConfig} />
    ),
    salary: (props) => (
      <SalaryTable {...props} config={salaryConfig} />
    ),
  };

  return (
    <ReportsContainer
      config={config}
      slices={slices}
      actions={actions}
      children={children}
    />
  );
};

export default AdminReports;
