// src/features/siteincharge/pages/SiteInchargeMarkAttendance.jsx
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import BaseMarkAttendance from '../../../components/attendance/BaseMarkAttendance';
import { bulkMarkAttendance, bulkMarkAttendanceWithRefresh, fetchAttendance, fetchWorkingDayPolicy, clearWorkingDayPolicy } from '../redux/attendanceSlice';
import { fetchEmployees, forceRefreshEmployees, setAttendanceUpdateTrigger } from '../redux/employeeSlice';

const SiteInchargeMarkAttendance = (props) => {
  const dispatch = useDispatch();
  const refreshTimeoutRef = useRef(null);

  const { success: employeeUpdateSuccess, lastUpdated } = useSelector(
    (state) => state.siteInchargeEmployee
  );

  const { lastAttendanceUpdate } = useSelector(
    (state) => state.siteInchargeAttendance
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
            location: props.locationId,
            status: 'active',
            _cacheBuster: Date.now(),
          })
        );
      }, 800);
    }
  }, [
    employeeUpdateSuccess,
    lastUpdated,
    props.locationId,
    dispatch,
  ]);

  // ✅ Enhanced: Refresh when attendance operations complete
  useEffect(() => {
    if (lastAttendanceUpdate) {
      

      setTimeout(() => {
        dispatch(
          fetchEmployees({
            location: props.locationId,
            status: 'active',
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
  }, [lastAttendanceUpdate, props.locationId, dispatch]);

  // ✅ Regular refresh on location changes
  useEffect(() => {
    
    if (props.locationId) {
      dispatch(
        fetchEmployees({
          location: props.locationId,
          status: 'active',
        })
      );
    }
  }, [props.locationId, dispatch]);

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
      role="siteincharge"
      locationId={props.locationId}
      employeeSelector={(state) => {
        return {
          data: state.siteInchargeEmployee.employees || [],
          loading: state.siteInchargeEmployee.loading,
          pagination: state.siteInchargeEmployee.pagination
        };
      }}
      attendanceSelector={(state) => state.siteInchargeAttendance}
      locationSelector={(state) => state.auth.user?.locations || []}
      actions={{
        bulkMarkAttendance: bulkMarkAttendanceWithRefresh,
        fetchAttendance,
        fetchEmployees: forceRefreshEmployees,
        forceRefreshEmployees,
        setAttendanceUpdateTrigger,
        fetchWorkingDayPolicy, // ✅ ADD
        clearWorkingDayPolicy, // ✅ ADD
      }}
    />
  );
};

export default SiteInchargeMarkAttendance;
