import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Dashboard from './features/siteincharge/pages/Dashboard';
import Attendance from './features/siteincharge/pages/Attendance';
import RegisterEmployee from './features/siteincharge/pages/RegisterEmployee';
import Employees from './features/siteincharge/pages/Employees';
import Reports from './features/siteincharge/pages/Reports';
import Profile from './features/siteincharge/pages/Profile';
import Locations from './features/admin/pages/Locations';
import Settings from './features/admin/pages/Settings';
import AdminDashboard from './features/admin/pages/Dashboard';
import AdminReports from './features/admin/pages/Reports';
import AdminAttendance from './features/admin/pages/Attendance';
import AdminEmployees from './features/admin/pages/Employees';
import AdminEmployeeRegister from './features/admin/pages/RegisterEmployee';
import AdminProfile from './features/admin/pages/Profile';
import EmployeeProfile from './features/siteincharge/pages/EmployeeProfile';
import AdminEmployeeProfile from './features/admin/pages/EmployeeProfile';
import EmployeeHistory from './features/admin/pages/EmployeeHistory';
import SiteInchargeEmployeeHistory from './features/siteincharge/pages/SiteInchargeEmployeeHistory';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useSelector((state) => state.auth);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Site Incharge Routes */}
      <Route
        path="/siteincharge/dashboard"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/attendance"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']}>
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/register-employee"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']}>
            <RegisterEmployee />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/employees"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']}>
            <Employees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/reports"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']}>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/profile"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']}>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/employees/:id"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']}>
            <EmployeeProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/employees/:employeeId/history"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']}>
            <SiteInchargeEmployeeHistory />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/locations"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Locations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminEmployees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/register-employee"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminEmployeeRegister />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminEmployeeProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees/:employeeId/history"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EmployeeHistory />
          </ProtectedRoute>
        }
      />

      {/* Default Route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;