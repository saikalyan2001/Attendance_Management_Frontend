// src/hooks/useRolePermissions.js (Updated)
import { useMemo } from 'react';

export const useRolePermissions = (role) => {
  return useMemo(() => {
    const permissions = {
      // SuperAdmin permissions - ✅ Enhanced with location filtering
      super_admin: {
        canSelectAllLocations: true,
        canChangeLocation: true,
        canViewAllEmployees: true,
        canSelectDate: () => true,
        canSubmit: (location, locationId, selectedDate, employees) => {
          return selectedDate && employees.length > 0;
        },
        // ✅ SuperAdmin can filter by location but also access "all"
        locationRestrictions: (selectedLocation) => {
          return selectedLocation === "all" || Boolean(selectedLocation);
        },
        // ✅ SuperAdmin can see employees based on location selection
        shouldFilterByLocation: (location) => location && location !== "all",
        reduxSlicePrefix: 'superadmin'
      },
      
      // Admin permissions - keeping existing logic
      admin: {
        canSelectAllLocations: true,
        canChangeLocation: true,
        canViewAllEmployees: false,
        canSelectDate: (location, locationId) => location !== 'all',
        canSubmit: (location, locationId, selectedDate, employees) => {
          return location !== 'all' && selectedDate && employees.length > 0;
        },
        locationRestrictions: (location) => location !== 'all',
        shouldFilterByLocation: (location) => location && location !== "all",
        reduxSlicePrefix: 'admin'
      },
      
      // Site-in-charge permissions - keeping existing logic
      siteincharge: {
        canSelectAllLocations: false,
        canChangeLocation: false,
        canViewAllEmployees: false,
        canSelectDate: (location, locationId) => Boolean(locationId),
        canSubmit: (location, locationId, selectedDate, employees) => {
          return Boolean(locationId) && selectedDate && employees.length > 0;
        },
        locationRestrictions: (location, assignedLocationId) => location === assignedLocationId,
        shouldFilterByLocation: () => true, // Always filter by assigned location
        reduxSlicePrefix: 'siteIncharge'
      }
    };

    return permissions[role] || permissions.siteincharge;
  }, [role]);
};
