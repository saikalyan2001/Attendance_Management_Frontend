// src/App.jsx (only ProtectedRoute component updated)
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useState, useEffect, useCallback } from 'react';
import Login from './components/auth/Login';
import CreateSiteIncharge from './components/auth/CreateSiteIncharge';
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
import LoadingSpinner from './components/common/LoadingSpinner';
import { cn } from '@/lib/utils';
import { useTheme } from './components/common/ThemeToggle'; // Assuming ThemeToggle exports useTheme

const ProtectedRoute = ({ children, allowedRoles, loadingMessage = "Loading..." }) => {
  const { user, isLoading, error } = useSelector((state) => state.auth);
  const [loadingState, setLoadingState] = useState({
    isDelayLoading: true,
    hasTimedOut: false,
    shouldShowSpinner: false,
  });

  const handleTimeout = useCallback(() => {
    setLoadingState((prev) => ({ ...prev, hasTimedOut: true }));
    console.warn('Route loading timed out');
  }, []);

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      setLoadingState((prev) => ({
        ...prev,
        isDelayLoading: false,
        shouldShowSpinner: isLoading,
      }));
    }, 1000);

    if (!isLoading) {
      setLoadingState((prev) => ({
        ...prev,
        shouldShowSpinner: false,
      }));
    }

    return () => clearTimeout(delayTimer);
  }, [isLoading]);

  if (isLoading || loadingState.isDelayLoading || loadingState.shouldShowSpinner) {
    const message = loadingMessage !== "Loading..."
      ? loadingMessage
      : !user
        ? "Checking session..."
        : !user.role
          ? "Loading permissions..."
          : "Preparing dashboard...";

    return (
      <LoadingSpinner
        message={message}
        showProgress={true}
        timeout={8000}
        onTimeout={handleTimeout}
        size="default"
      />
    );
  }

  if (error || !user || !user.role || !allowedRoles.includes(user.role)) {
    const redirectState = {
      from: window.location.pathname,
      // Remove the error message to prevent the toast
      // error: 'Please log in to access this page',
    };

    return (
      <Navigate
        to="/login"
        state={redirectState}
        replace
      />
    );
  }

  return children;
};

// Rest of App.jsx remains unchanged
const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin/create-siteincharge"
        element={
          <ProtectedRoute allowedRoles={['admin']} loadingMessage="Loading sign up...">
            <CreateSiteIncharge />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/dashboard"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']} loadingMessage="Loading dashboard...">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/attendance"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']} loadingMessage="Loading attendance...">
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/register-employee"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']} loadingMessage="Loading employee registration...">
            <RegisterEmployee />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/employees"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']} loadingMessage="Loading employees...">
            <Employees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/reports"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']} loadingMessage="Loading reports...">
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/profile"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']} loadingMessage="Loading profile...">
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/employees/:id"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']} loadingMessage="Loading employee details...">
            <EmployeeProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/siteincharge/employees/:employeeId/history"
        element={
          <ProtectedRoute allowedRoles={['siteincharge']} loadingMessage="Loading employee history...">
            <SiteInchargeEmployeeHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/locations"
        element={
          <ProtectedRoute allowedRoles={['admin']} loadingMessage="Loading locations...">
            <Locations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={['admin']} loadingMessage="Loading settings...">
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']} loadingMessage="Loading admin dashboard...">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={['admin']} loadingMessage="Loading admin reports...">
            <AdminReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance"
        element={
          <ProtectedRoute allowedRoles={['admin']} loadingMessage="Loading attendance data...">
            <AdminAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees"
        element={
          <ProtectedRoute allowedRoles={['admin']} loadingMessage="Loading employees...">
            <AdminEmployees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/register-employee"
        element={
          <ProtectedRoute allowedRoles={['admin']} loadingMessage="Loading employee registration...">
            <AdminEmployeeRegister />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']} loadingMessage="Loading employee details...">
            <AdminEmployeeProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute allowedRoles={['admin']} loadingMessage="Loading profile...">
            <AdminProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees/:employeeId/history"
        element={
          <ProtectedRoute allowedRoles={['admin']} loadingMessage="Loading employee history...">
            <EmployeeHistory />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export const usePageLoading = (initialLoading = true) => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [error, setError] = useState(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const setLoadingError = useCallback((error) => {
    setError(error);
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
  };
};

export const PageLoadingWrapper = ({
  isLoading,
  error,
  children,
  loadingMessage = "Loading page...",
  errorMessage = "Failed to load page",
  onRetry = null,
}) => {
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <LoadingSpinner
        message={loadingMessage}
        showProgress={true}
        size="default"
      />
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center min-h-screen p-8',
          theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50',
        )}
      >
        <div
          className={cn(
            'text-center space-y-4 p-6 rounded-lg border',
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
          )}
        >
          <div className="text-error text-6xl">⚠️</div>
          <h2
            className={cn(
              'text-xl font-semibold',
              theme === 'dark' ? 'text-gray-200' : 'text-gray-800',
            )}
          >
            {errorMessage}
          </h2>
          <p
            className={cn(
              'text-sm',
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
            )}
          >
            {error.message || error}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                'bg-accent text-white hover:bg-accent-hover',
                'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
              )}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return children;
};

export default App;