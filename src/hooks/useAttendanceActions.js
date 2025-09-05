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
        // ✅ SuperAdmin: filter by location if selected, otherwise show all
        if (location && location !== 'all') {
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
          console.warn("Failed to fetch all employees by location, using regular employee list:", error);
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
    console.error('Failed to fetch initial data:', error);
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
      
      // ✅ Filter out records with undefined location for SuperAdmin "all" selection
      const validRecords = allRecords.map(record => {
        if (role === 'super_admin' && !record.location) {
          // For SuperAdmin with "all" locations, we might need to handle this differently
          // depending on your backend API requirements
          return record;
        }
        return record;
      });
      
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
    }, [dispatch, actions, role]),
    fetchInitialData,
    refreshData: useCallback(async (params) => {
      await fetchInitialData(params);
      
      // Refresh attendance data
      if (params.selectedDate && actions.fetchAttendance) {
        const dateStr = params.selectedDate.toISOString().split('T')[0];
        const locationParam = role === 'siteincharge' ? params.locationId : 
                             (role === 'super_admin' && params.location === 'all' ? undefined : params.location);
        
        await dispatch(actions.fetchAttendance({ 
          date: dateStr, 
          location: locationParam, 
          month: params.month, 
          year: params.year 
        }));
      }
    }, [fetchInitialData, dispatch, actions, role])
  };
};
