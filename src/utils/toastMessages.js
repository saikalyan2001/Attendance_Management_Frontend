import { toast } from 'react-hot-toast';

export const locationToasts = {
  // Success messages
  added: (locationName) => toast.success(`"${locationName}" location added successfully`, {
    id: 'location-add-success'
  }),
  
  updated: (locationName) => toast.success(`"${locationName}" location updated successfully`, {
    id: 'location-edit-success'
  }),
  
  deleted: (locationName) => toast.success(`"${locationName}" location deleted successfully`, {
    id: 'location-delete-success'
  }),
  
  // Error messages
  duplicate: (locationName) => toast.error(`Location name "${locationName}" already exists. Please choose a different name.`, {
    id: 'location-duplicate-error'
  }),
  
  hasEmployees: () => toast.error('Cannot delete this location because it has employees assigned to it. Please reassign or remove employees first.', {
    id: 'location-delete-employees-error'
  }),
  
  notFound: () => toast.error('Location not found. It may have been deleted by another user.', {
    id: 'location-not-found-error'
  }),
  
  serverError: (action = 'perform action') => toast.error(`Failed to ${action}. Please try again.`, {
    id: 'location-server-error'
  }),
  
  networkError: () => toast.error('Network error. Please check your connection and try again.', {
    id: 'location-network-error'
  }),
  
  // Enhanced validation messages
  validationError: (field, message) => {
    const fieldName = {
      name: 'Location name',
      address: 'Address',
      city: 'City',
      state: 'State'
    }[field] || field;
    
    return toast.error(`${message}`, {
      id: `validation-error-${field}`,
      duration: 5000,
    });
  },
  
  // Better multiple validation error handling
  multipleValidationErrors: (errors) => {
    // Show the first error with context
    const firstError = Object.entries(errors)[0];
    const [field, error] = firstError;
    const fieldName = {
      name: 'Location name',
      address: 'Address', 
      city: 'City',
      state: 'State'
    }[field] || field;
    
    const remainingCount = Object.keys(errors).length - 1;
    const message = remainingCount > 0 
      ? `${error.message}`
      : `${error.message}`;
    
    return toast.error(message, {
      id: 'validation-multiple-errors',
      duration: 6000,
    });
  }
};
