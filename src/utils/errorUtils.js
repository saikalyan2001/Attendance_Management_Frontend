export const parseServerError = (error) => {
  if (!error) {
    return { message: 'Something went wrong. Please try again.', fields: {} };
  }
  // If the error is a plain string
  if (typeof error === 'string') {
    return mapStringError(error);
  }
  // If we have a standard API error object { message, data?, status? }
  if (error.message && !error.fields) {
    return mapStringError(error.message);
  }
  // Already structured error with fields
  return {
    message: error.message || 'Something went wrong. Please try again.',
    fields: error.fields || {},
  };
};

function mapStringError(message) {
  const fieldErrors = {};
  
  if (message.includes('Email already exists')) {
    fieldErrors.email = 'An account with this email already exists';
  } else if (message.includes('EmployeeId already exists')) {
    fieldErrors.employeeId = 'This Employee ID is already in use';
  } else if (message.includes('Phone number must be 10 digits')) {
    fieldErrors.phone = 'Please enter a valid 10-digit phone number';
  } else if (message.includes('Salary must be a number greater than or equal to 1000')) {
    fieldErrors.salary = 'Salary must be at least ₹1,000';
  } else if (message.includes('Invalid location ID')) {
    fieldErrors.location = 'Please select a valid location';
  } else if (message.includes('Invalid rejoin date')) {
    fieldErrors.rejoinDate = 'Please enter a valid rejoin date';
  } else if (message.includes('Advance must be a non-negative number')) {
    fieldErrors.advance = 'Advance amount cannot be negative';
  } else if (message.includes('Invalid month')) {
    fieldErrors.month = 'Please select a valid month';
  } else if (message.includes('Invalid year')) {
    fieldErrors.year = 'Please enter a valid year';
  } else if (message.includes('At least one document is required')) {
    fieldErrors.documents = 'Please upload at least one document';
  } else if (message.includes('Invalid join date')) {
    fieldErrors.joinDate = 'Please enter a valid join date';
  } else if (message.includes('Invalid credentials')) {
    fieldErrors.email = 'Please check your email and password';
    fieldErrors.password = 'Please check your email and password';
  } else if (message.includes('Account setup incomplete')) {
    return { 
      message: 'Your account setup is incomplete. Please check your email for setup instructions.', 
      fields: {} 
    };
  } else if (message.includes('At least one location is required')) {
    fieldErrors.locations = 'Please select at least one location';
  } else if (message.includes('cannot be assigned locations')) {
    fieldErrors.locations = 'Locations cannot be assigned to this role';
  }
  
  return { message, fields: fieldErrors };
}
