import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import locationReducer from './slices/locationSlice';
import siteInchargeDashboardReducer from '../features/siteincharge/redux/dashboardSlice';
import siteInchargeAttendanceReducer from '../features/siteincharge/redux/attendanceSlice';
import siteInchargeEmployeeReducer from '../features/siteincharge/redux/employeeSlice';
import siteInchargeReportsReducer from '../features/siteincharge/redux/reportsSlice';
import siteInchargeMarkAttendanceReducer from '../features/siteincharge/redux/markAttendanceSlice';
import siteInchargeProfileReducer from '../features/siteincharge/redux/profileSlice';
import adminDashboardReducer from '../features/admin/redux/dashboardSlice';
import adminAttendanceReducer from '../features/admin/redux/attendanceSlice';
import adminReportsReducer from '../features/admin/redux/reportsSlice';
import adminLocationsReducer from '../features/admin/redux/locationsSlice';
import adminSettingsReducer from '../features/admin/redux/settingsSlice';
import adminEmployeesReducer from '../features/admin/redux/employeeSlice';
import adminProfileReducer from '../features/admin/redux/profileSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    location: locationReducer,
    siteInchargeDashboard: siteInchargeDashboardReducer,
    siteInchargeAttendance: siteInchargeAttendanceReducer,
    siteInchargeEmployee: siteInchargeEmployeeReducer,
    siteInchargeReports: siteInchargeReportsReducer,
    siteInchargeMarkAttendance: siteInchargeMarkAttendanceReducer,
    siteInchargeProfile: siteInchargeProfileReducer,
    adminDashboard: adminDashboardReducer,
    adminAttendance: adminAttendanceReducer,
    adminReports: adminReportsReducer,
    adminLocations: adminLocationsReducer,
    adminSettings: adminSettingsReducer,
    adminEmployees: adminEmployeesReducer,
    adminProfile: adminProfileReducer,
  },
});

export default store;