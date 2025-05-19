import { Routes, Route } from 'react-router-dom';
import Login from './components/auth/Login';
import Dashboard from './features/siteincharge/pages/Dashboard';
import Attendance from './features/siteincharge/pages/Attendance';
import RegisterEmployee from './features/siteincharge/pages/RegisterEmployee';
import Employees from './features/siteincharge/pages/Employees';
import Reports from './features/siteincharge/pages/Reports';
import MarkAttendance from './features/siteincharge/pages/MarkAttendance';
import Profile from './features/siteincharge/pages/Profile';
import Locations from './features/admin/pages/Locations';
import Settings from './features/admin/pages/Settings';
import AdminDashboard from './features/admin/pages/Dashboard';
import AdminReports from './features/admin/pages/Reports';
import AdminAttendance from './features/admin/pages/Attendance';
import AdminEmployees from './features/admin/pages/Employees';
import AdminEmployeeRegister from './features/admin/pages/AdminRegisterEmployee';
import AdminProfile from './features/admin/pages/Profile';


const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/siteincharge/dashboard" element={<Dashboard />} />
      <Route path="/siteincharge/attendance" element={<Attendance />} />
      <Route path="/siteincharge/register-employee" element={<RegisterEmployee />} />
      <Route path="/siteincharge/employees" element={<Employees />} />
      <Route path="/siteincharge/reports" element={<Reports />} />
      <Route path="/siteincharge/mark-attendance" element={<MarkAttendance />} />
      <Route path="/siteincharge/profile" element={<Profile />} />
      <Route path="/admin/locations" element={<Locations />} />
      <Route path="/admin/settings" element={<Settings />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/reports" element={<AdminReports />} />
      <Route path="/admin/attendance" element={<AdminAttendance />} />
      <Route path="/admin/employees" element={<AdminEmployees />} />
      <Route path="/admin/register-employee" element={<AdminEmployeeRegister />} />
      <Route path="/admin/profile" element={<AdminProfile />} />
    </Routes>
  );
};

export default App;