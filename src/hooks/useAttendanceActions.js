// src/hooks/useAttendanceActions.js (Updated)
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

export const useAttendanceActions = (role, actions) => {
  const dispatch = useDispatch();

  const filterEmployees = useCallback((employees, filters) => {
    const { location, locationId, employeeFilter, locations } = filters;
    
    if (!Array.isArray(employees)) return [];
    
    return employees.filter(emp => {
      // Role-based location filtering
      let matchesLocation = true;
      
if (role === 'super_admin') {
  if (!location || location === 'select') {
    // ✅ Force location selection - show no employees
    matchesLocation = false;
  } else {
    // Filter by specific location only
    const selectedLocation = locations?.find(loc => loc._id === location);
    matchesLocation = emp.location?._id?.toString() === location || 
                     emp.location?.name === selectedLocation?.name;
  }
        // If location === 'all', SuperAdmin sees all employees (matchesLocation stays true)
      } else if (role === 'admin') {
        // Admin must select specific location
        if (location && location !== 'all') {
          const selectedLocation = locations?.find(loc => loc._id === location);
          matchesLocation = emp.location?._id?.toString() === location || 
                           emp.location?.name === selectedLocation?.name;
        } else {
          matchesLocation = false; // Admin cannot view 'all'
        }
      } else if (role === 'siteincharge') {
        // Site-in-charge only sees their assigned location
        matchesLocation = emp.location?._id?.toString() === locationId;
      }
      
      // Text filter
      const matchesFilter = employeeFilter ? 
        emp.name?.toLowerCase().includes(employeeFilter.toLowerCase()) ||
        emp.employeeId?.toLowerCase().includes(employeeFilter.toLowerCase()) : true;
      
      return matchesLocation && matchesFilter;
    });
  }, [role]);

  const validateSubmission = useCallback((data) => {
    const { selectedDate, selectedTime, location, locationId, employees } = data;
    
    if (!selectedDate) {
      return { isValid: false, message: 'Please select a valid date.' };
    }
    if (!selectedTime) {
      return { isValid: false, message: 'Please select a valid time.' };
    }
    
    // Role-specific validations
    if (role === 'admin' && (!location || location === 'all')) {
      return { isValid: false, message: 'Please select a specific location.' };
    }
    if (role === 'siteincharge' && !locationId) {
      return { isValid: false, message: 'No location assigned. Please contact admin.' };
    }
    // ✅ SuperAdmin validation - can use 'all' locations
    if (role === 'super_admin' && !location) {
      return { isValid: false, message: 'Please select a location filter.' };
    }
    
    if (!employees.length) {
      return { isValid: false, message: 'No employees available to mark attendance.' };
    }
    
    return { isValid: true };
  }, [role]);

  const prepareRecords = useCallback((data) => {
    const { bulkSelectedEmployees, bulkEmployeeStatuses, filteredEmployees, timestamp, location, locationId } = data;
    
    const selectedRecords = bulkSelectedEmployees.map(employeeId => ({
      employeeId,
      date: timestamp,
      status: bulkEmployeeStatuses[employeeId] || 'absent',
      // ✅ Handle location for different roles
      location: role === 'siteincharge' ? locationId : (location !== 'all' ? location : undefined),
    }));

    const remainingEmployees = filteredEmployees.filter(emp => 
      !bulkSelectedEmployees.includes(emp._id?.toString())
    );
    
    const remainingRecords = remainingEmployees.map(emp => ({
      employeeId: emp._id,
      date: timestamp,
      status: 'present',
      // ✅ Handle location for different roles
      location: role === 'siteincharge' ? locationId : (location !== 'all' ? location : undefined),
    }));

    return { selectedRecords, remainingRecords };
  }, [role]);

const fetchInitialData = useCallback(async (params) => {
  const { location, locationId, month, year } = params;
  
  try {
    // Fetch locations for all roles
    if (actions.fetchLocations) {
      await dispatch(actions.fetchLocations());
    }
    
    if (role === 'super_admin') {
      // ✅ Always fetch regular employees first
      await dispatch(actions.fetchEmployees({ location, month, year }));
      
      // ✅ Only fetch all employees if we have a valid location or "all"
      if (actions.fetchAllEmployeesByLocation) {
        try {
          await dispatch(actions.fetchAllEmployeesByLocation({ location }));
        } catch (error) {
          
          // Continue with regular employee list if this fails
        }
      }
    } else if (role === 'admin') {
      if (location && location !== 'all') {
        await dispatch(actions.fetchEmployees({ location, month, year }));
      }
    } else if (role === 'siteincharge') {
      if (locationId) {
        await dispatch(actions.fetchEmployees({ location: locationId, status: 'active' }));
        if (actions.fetchAllEmployees) {
          await dispatch(actions.fetchAllEmployees({ location: locationId, status: 'active' }));
        }
      }
    }
  } catch (error) {
    
    // Don't throw error, let component handle gracefully
  }
}, [dispatch, actions, role]);

  return {
    filterEmployees,
    validateSubmission,
    prepareRecords,
  submitAttendance: useCallback(async (data) => {
  const { records, remaining, overwrite } = data;
  const allRecords = [...records, ...remaining];
  
  const validRecords = allRecords.map(record => {
    if (role === 'super_admin' && !record.location) {
      return record;
    }
    return record;
  });
  
  try {
    const result = await dispatch(actions.bulkMarkAttendance({
      attendance: validRecords,
      overwrite
    })).unwrap();

    const statusCounts = records.reduce((acc, record) => ({
      ...acc,
      [record.status]: (acc[record.status] || 0) + 1,
    }), {});
    
    const statusMessage = Object.entries(statusCounts)
      .map(([status, count]) => `${count} as ${status}`)
      .join(', ');
    
    const message = records.length > 0 
      ? `Marked ${records.length} employee(s): ${statusMessage}, and ${remaining.length} as Present`
      : `Marked all ${remaining.length} employee(s) as Present`;
    
    return { ...result, message };
  } catch (error) {
    // ✅ FIXED: Ensure proper error message is thrown
    const errorMessage = typeof error === 'string' ? error :
                        error?.message || 
                        "Failed to submit attendance";
    throw new Error(errorMessage);
  }
}, [dispatch, actions, role]),
    fetchInitialData,
 // In src/hooks/useAttendanceActions.js
// ✅ FIXED: src/hooks/useAttendanceActions.js
refreshData: useCallback(async (params) => {
  const { location, locationId, month, year, selectedDate } = params;
  
  try {
    // ✅ CRITICAL: Force refresh employee data with latest monthly calculations
    if (role === 'super_admin') {
      // ✅ Use forceRefreshEmployees to ensure fresh data
      await dispatch(actions.forceRefreshEmployees({
        location: location === 'all' ? undefined : location,
        month,
        year,
        page: 1,
        limit: 1000,
        _cacheBuster: Date.now(),
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }));
    } else if (role === 'admin') {
      if (location && location !== 'all') {
        await dispatch(actions.forceRefreshEmployees({
          location,
          month,
          year,
          page: 1,
          limit: 1000,
          _cacheBuster: Date.now(),
        }));
      }
    } else if (role === 'siteincharge') {
      if (locationId) {
        await dispatch(actions.forceRefreshEmployees({
          location: locationId,
          status: 'active',
          page: 1,
          limit: 1000,
          _cacheBuster: Date.now(),
        }));
      }
    }
    // ✅ Also refresh attendance data if needed
    if (selectedDate && actions.fetchAttendance) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const locationParam = role === 'siteincharge' ? locationId : 
                           (role === 'super_admin' && location === 'all' ? undefined : location);
      
      await dispatch(actions.fetchAttendance({ 
        date: dateStr, 
        location: locationParam, 
        month, 
        year,
        _cacheBuster: Date.now(),
      }));
    }

  } catch (error) {
    throw error; // Re-throw so calling code can handle
  }
}, [dispatch, actions, role])

  };
};
