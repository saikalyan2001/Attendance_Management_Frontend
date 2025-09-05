// pages/super-admin/reports/SuperAdminReports.jsx
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  fetchAttendanceReport,
  fetchLeaveReport,
  fetchSalaryReport,
  reset as resetReports,
} from "../redux/superAdminReportsSlice";
import { fetchLocations, reset as resetLocations } from "../redux/locationsSlice";
import ReportsContainer from "../../../components/reports/ReportsContainer";
import AttendanceTable from "../../../components/reports/AttendanceTable";
import LeaveTable from "../../../components/reports/LeaveTable";
import SalaryTable from "../../../components/reports/SalaryTable";

const SuperAdminReports = () => {
  const navigate = useNavigate();

  const config = {
    title: "Superadmin Reports",
    isSuperAdmin: true,
    userRole: "super_admin",
    showToast: toast,
    navigate,
    checkAuth: true
  };

  const slices = {
    reports: "superAdminReports",
    locations: "superAdminLocations"
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
    title: "Superadmin Attendance Report",
    isSuperAdmin: true,
    showToast: toast,
    checkMissingEmployeeData: true,
  };

  const leaveConfig = {
    title: "Superadmin Leave Report",
    isSuperAdmin: true,
    showToast: toast,
    toastConfig: {
      duration: 6000,
      position: "top-center",
    }
  };

  const salaryConfig = {
    title: "Superadmin Salary Report",
    isSuperAdmin: true,
    showToast: toast,
    toastConfig: {
      duration: 6000,
      position: "top-center",
    },
    useBackendSummary: true, // SuperAdmin uses backend summary
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

export default SuperAdminReports;
