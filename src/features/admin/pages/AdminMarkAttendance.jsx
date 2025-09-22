// src/features/admin/pages/AdminMarkAttendance.jsx
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import BaseMarkAttendance from "../../../components/attendance/BaseMarkAttendance";
import {
  bulkMarkAttendance,
  bulkMarkAttendanceWithRefresh,
  fetchAttendance,
   fetchWorkingDayPolicy,
  clearWorkingDayPolicy,
} from "../redux/attendanceSlice";
import {
  fetchEmployees,
  forceRefreshEmployees,
  setAttendanceUpdateTrigger,
} from "../redux/employeeSlice";
import { fetchLocations } from "../redux/locationsSlice";

const AdminMarkAttendance = (props) => {
  const dispatch = useDispatch();
  const refreshTimeoutRef = useRef(null);

  const { success: employeeUpdateSuccess, lastUpdated } = useSelector(
    (state) => state.adminEmployees
  );

  const { lastAttendanceUpdate } = useSelector(
    (state) => state.adminAttendance
  );

  // ✅ Enhanced: Force refresh with proper debouncing
  useEffect(() => {
    if (employeeUpdateSuccess || lastUpdated) {
      

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        dispatch(
          fetchEmployees({
            location: props.location,
            month: props.month,
            year: props.year,
            _cacheBuster: Date.now(),
          })
        );
      }, 800);
    }
  }, [
    employeeUpdateSuccess,
    lastUpdated,
    props.location,
    props.month,
    props.year,
    dispatch,
  ]);

  // ✅ Enhanced: Refresh when attendance operations complete
  useEffect(() => {
    if (lastAttendanceUpdate) {
      

      setTimeout(() => {
        dispatch(
          fetchEmployees({
            location: props.location,
            month: props.month,
            year: props.year,
            _cacheBuster: Date.now(),
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })
        );
      }, 1200);
    }
  }, [lastAttendanceUpdate, props.location, props.month, props.year, dispatch]);

  // ✅ Regular refresh on filter changes
  useEffect(() => {
    
    if (props.location && props.location !== 'all') {
      dispatch(
        fetchEmployees({
          location: props.location,
          month: props.month,
          year: props.year,
        })
      );
    }
  }, [props.location, props.month, props.year, dispatch]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return (
   <BaseMarkAttendance
      {...props}
      role="admin"
      employeeSelector={(state) => ({
        data: state.adminEmployees.employees,
        loading: state.adminEmployees.loading,
        pagination: state.adminEmployees.pagination,
      })}
      attendanceSelector={(state) => state.adminAttendance}
      locationSelector={(state) => {
        const locationState = state.adminLocations;
        if (Array.isArray(locationState)) {
          return locationState;
        }
        if (locationState?.locations && Array.isArray(locationState.locations)) {
          return locationState.locations;
        }
        if (locationState?.data && Array.isArray(locationState.data)) {
          return locationState.data;
        }
        return [];
      }}
      actions={{
        bulkMarkAttendance: bulkMarkAttendanceWithRefresh,
        fetchAttendance,
        fetchEmployees: forceRefreshEmployees,
        forceRefreshEmployees,
        setAttendanceUpdateTrigger,
        fetchLocations,
        fetchWorkingDayPolicy, // ✅ ADD
        clearWorkingDayPolicy, // ✅ ADD
      }}
    />
  );
};

export default AdminMarkAttendance;
