// src/features/superadmin/pages/SuperAdminMarkAttendance.jsx
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import BaseMarkAttendance from "../../../components/attendance/BaseMarkAttendance";
import {
  bulkMarkAttendance,
  bulkMarkAttendanceWithRefresh,
  clearWorkingDayPolicy,
  fetchAttendance,
  fetchWorkingDayPolicy,
} from "../redux/superAdminAttendanceSlice";
import {
  fetchEmployees,
  forceRefreshEmployees,
  setAttendanceUpdateTrigger,
} from "../redux/superadminEmployeeSlice";
import { fetchLocations } from "../redux/locationsSlice";

const SuperAdminMarkAttendance = (props) => {
  const dispatch = useDispatch();
  const refreshTimeoutRef = useRef(null);

  const { success: employeeUpdateSuccess, lastUpdated } = useSelector(
    (state) => state.superadminEmployees
  );

  const { lastAttendanceUpdate } = useSelector(
    (state) => state.superAdminAttendance
  );

  // ✅ Enhanced: Force refresh with proper debouncing
  useEffect(() => {
    if (employeeUpdateSuccess || lastUpdated) {
      

      // Clear previous timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Debounced refresh
      refreshTimeoutRef.current = setTimeout(() => {
        dispatch(
          fetchEmployees({
            location: props.location === "all" ? undefined : props.location,
            month: props.month,
            year: props.year,
            page: 1,       
          limit: 1000,
            _cacheBuster: Date.now(), // Force fresh data
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
// In SuperAdminMarkAttendance.jsx
// ✅ UPDATED: src/features/superadmin/pages/SuperAdminMarkAttendance.jsx

// Replace the existing useEffect for lastAttendanceUpdate
useEffect(() => {
  if (lastAttendanceUpdate) {
    // ✅ ENHANCED: More aggressive refresh with proper delay
    setTimeout(async () => {
      try {
        // ✅ Force complete employee data refresh
        await dispatch(forceRefreshEmployees({
          location: props.location === "all" ? undefined : props.location,
          month: props.month,
          year: props.year,
          page: 1,
          limit: 1000,
          _cacheBuster: Date.now(),
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }));
      } catch (error) {
        // ✅ Fallback: Try regular fetchEmployees
        try {
          await dispatch(fetchEmployees({
            location: props.location === "all" ? undefined : props.location,
            month: props.month,
            year: props.year,
            page: 1,
            limit: 1000,
            _cacheBuster: Date.now(),
          }));
        } catch (fallbackError) {
        }
      }
    }, 1500); // ✅ Increased delay to ensure backend processing completes
  }
}, [lastAttendanceUpdate, props.location, props.month, props.year, dispatch, forceRefreshEmployees, fetchEmployees]);


  // ✅ Regular refresh on filter changes
  useEffect(() => {
    
    dispatch(
      fetchEmployees({
        location: props.location === "all" ? undefined : props.location,
        month: props.month,
        year: props.year,
        page: 1,        
        limit: 1000,
      })
    );
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
      role="super_admin"
      employeeSelector={(state) => ({
        data: state.superadminEmployees.employees,
        loading: state.superadminEmployees.loading,
        pagination: state.superadminEmployees.pagination,
      })}
      attendanceSelector={(state) => state.superAdminAttendance}
      locationSelector={(state) => {
        const locationState = state.superAdminLocations;
        if (Array.isArray(locationState)) {
          return locationState;
        }
        if (
          locationState?.locations &&
          Array.isArray(locationState.locations)
        ) {
          return locationState.locations;
        }
        return [];
      }}
      actions={{
        bulkMarkAttendance: bulkMarkAttendanceWithRefresh,
        fetchAttendance,
        fetchEmployees: (params) => dispatch(fetchEmployees({
      ...params,
      page: 1,
      limit: 1000,
    })),
    forceRefreshEmployees: (params) => dispatch(forceRefreshEmployees({
      ...params,
      page: 1,
      limit: 1000,
    })),
        forceRefreshEmployees, // ✅ Add this explicitly
        setAttendanceUpdateTrigger, // ✅ Add trigger action
        fetchLocations,
           fetchWorkingDayPolicy, // ✅ ADD
        clearWorkingDayPolicy, // ✅ ADD
      }}
    />
  );
};

export default SuperAdminMarkAttendance;
