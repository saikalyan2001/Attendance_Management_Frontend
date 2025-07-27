export const parseServerError = (error) => {
  if (!error) return { message: 'An unknown error occurred', fields: {} };

  if (typeof error === 'string') {
    const fieldErrors = {};
    if (error.includes('Email already exists')) {
      fieldErrors.email = 'Email already exists';
    } else if (error.includes('EmployeeId already exists')) {
      fieldErrors.employeeId = 'Employee ID already exists';
    } else if (error.includes('Phone number must be 10 digits')) {
      fieldErrors.phone = 'Phone number must be 10 digits';
    } else if (error.includes('Salary must be a number greater than or equal to 1000')) {
      fieldErrors.salary = 'Salary must be at least ₹1000';
    } else if (error.includes('Invalid location ID')) {
      fieldErrors.location = 'Invalid location';
    } else if (error.includes('Invalid rejoin date')) {
      fieldErrors.rejoinDate = 'Invalid rejoin date';
    } else if (error.includes('Advance must be a non-negative number')) {
      fieldErrors.advance = 'Advance must be non-negative';
    } else if (error.includes('Invalid month')) {
      fieldErrors.month = 'Invalid month';
    } else if (error.includes('Invalid year')) {
      fieldErrors.year = 'Invalid year';
    } else if (error.includes('At least one document is required')) {
      fieldErrors.documents = 'At least one document is required';
    } else if (error.includes('Invalid join date')) {
      fieldErrors.joinDate = 'Invalid join date';
    }
    return { message: error, fields: fieldErrors };
  }

  if (error.message && error.errors) {
    const fieldErrors = error.errors.reduce((acc, err) => {
      // Map row-specific errors to a generic field for display
      acc[`row_${err.row}`] = `Row ${err.row}: ${err.message}`;
      return acc;
    }, {});
    return { message: error.message || 'Validation failed', fields: fieldErrors };
  }

  if (error.message && error.field) {
    return { message: error.message, fields: { [error.field]: error.message } };
  }

  return { message: error.message || 'An unknown error occurred', fields: {} };
};