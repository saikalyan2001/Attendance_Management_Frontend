import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../utils/api';

export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async ({ location, status }, { rejectWithValue }) => {
    try {
      const params = {};
      if (location && location !== 'all') params.location = location;
      if (status && status !== 'all') params.status = status;
      const response = await api.get('/admin/employees', { params });
      return response.data;
    } catch (error) {
      console.error('Fetch employees error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employees');
    }
  }
);

export const fetchEmployeeById = createAsyncThunk(
  'employees/fetchEmployeeById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/employees/${id}`);
      return response.data;
    } catch (error) {
      console.error('Fetch employee by ID error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employee');
    }
  }
);

export const registerEmployee = createAsyncThunk(
  'employees/registerEmployee',
  async ({ employeeData, documents }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Object.entries(employeeData).forEach(([key, value]) => {
        if (key === 'paidLeaves' || key === 'bankDetails') {
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined) {
          formData.append(key, value);
        }
      });
      documents.forEach((doc) => {
        if (doc.file instanceof File) {
          formData.append('documents', doc.file, doc.file.name);
        }
      });
      const response = await api.post('/admin/employees', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Register employee error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to register employee');
    }
  }
);

export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/employees/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update employee error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to update employee');
    }
  }
);

export const updateEmployeeAdvance = createAsyncThunk(
  'employees/updateEmployeeAdvance',
  async ({ id, advance }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/employees/${id}/advance`, { advance });
      return response.data;
    } catch (error) {
      console.error('Update employee advance error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to update employee advance');
    }
  }
);

export const deactivateEmployee = createAsyncThunk(
  'employees/deactivateEmployee',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/employees/${id}/deactivate`);
      return { id, message: response.data.message };
    } catch (error) {
      console.error('Deactivate employee error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to deactivate employee');
    }
  }
);

export const transferEmployee = createAsyncThunk(
  'employees/transferEmployee',
  async ({ id, locationId, transferTimestamp }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/employees/${id}/transfer`, {
        location: locationId,
        transferTimestamp,
      });
      return response.data;
    } catch (error) {
      console.error('Transfer employee error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to transfer employee');
    }
  }
);

export const rejoinEmployee = createAsyncThunk(
  'employees/rejoinEmployee',
  async ({ id, rejoinDate }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/employees/${id}/rejoin`, { rejoinDate });
      return response.data;
    } catch (error) {
      console.error('Rejoin employee error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to rejoin employee');
    }
  }
);

export const getEmployeeHistory = createAsyncThunk(
  'employees/getEmployeeHistory',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/employees/${id}/history`);
      return response.data;
    } catch (error) {
      console.error('Get employee history error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employee history');
    }
  }
);

export const addEmployeeDocuments = createAsyncThunk(
  'employees/addEmployeeDocuments',
  async ({ id, documents }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      documents.forEach((doc) => {
        if (doc.file instanceof File) {
          formData.append('documents', doc.file, doc.file.name);
        }
      });
      const response = await api.post(`/admin/employees/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Add employee documents error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to add employee documents');
    }
  }
);

export const fetchEmployeeAttendance = createAsyncThunk(
  'employees/fetchEmployeeAttendance',
  async ({ employeeId, month, year }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/employees/${employeeId}/attendance`, {
        params: { month, year },
      });
      return response.data;
    } catch (error) {
      console.error('Fetch employee attendance error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employee attendance');
    }
  }
);

export const fetchSettings = createAsyncThunk(
  'employees/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/employees/settings');
      return response.data;
    } catch (error) {
      console.error('Fetch settings error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings');
    }
  }
);

const employeesSlice = createSlice({
  name: 'employees',
  initialState: {
    employees: [],
    currentEmployee: null,
    history: null,
    attendance: [],
    settings: null,
    loading: false,
    error: null,
    success: false,
    successMessage: null,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
      state.loading = false;
      state.success = false;
      state.successMessage = null;
      state.currentEmployee = null;
      state.history = null;
      state.attendance = [];
      // Note: Not resetting settings to keep it cached
    },
  },
  extraReducers: (builder) => {
    // Fetch Employees
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload || [];
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.employees = [];
      })
      // Fetch Employee by ID
      .addCase(fetchEmployeeById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentEmployee = null;
      })
      .addCase(fetchEmployeeById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEmployee = action.payload;
      })
      .addCase(fetchEmployeeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.currentEmployee = null;
      })
      // Register Employee
      .addCase(registerEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(registerEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.employees.push(action.payload);
        state.success = true;
        state.successMessage = 'Employee registered successfully';
      })
      .addCase(registerEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Update Employee
      .addCase(updateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successMessage = 'Employee updated successfully';
        const index = state.employees.findIndex((emp) => emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        if (state.currentEmployee?._id === action.payload._id) state.currentEmployee = action.payload;
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Update Employee Advance
      .addCase(updateEmployeeAdvance.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(updateEmployeeAdvance.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successMessage = 'Employee advance updated successfully';
        const index = state.employees.findIndex((emp) => emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        if (state.currentEmployee?._id === action.payload._id) state.currentEmployee = action.payload;
      })
      .addCase(updateEmployeeAdvance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Deactivate Employee
      .addCase(deactivateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(deactivateEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successMessage = action.payload.message || 'Employee deactivated successfully';
        const index = state.employees.findIndex((emp) => emp._id === action.payload.id);
        if (index !== -1) state.employees[index].status = 'inactive';
        if (state.currentEmployee?._id === action.payload.id) state.currentEmployee = null;
      })
      .addCase(deactivateEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Transfer Employee
      .addCase(transferEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(transferEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successMessage = 'Employee transferred successfully';
        const index = state.employees.findIndex((emp) => emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        if (state.currentEmployee?._id === action.payload._id) state.currentEmployee = action.payload;
      })
      .addCase(transferEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Rejoin Employee
      .addCase(rejoinEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(rejoinEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successMessage = 'Employee rejoined successfully';
        const index = state.employees.findIndex((emp) => emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        else state.employees.push(action.payload);
        if (state.currentEmployee?._id === action.payload._id) state.currentEmployee = action.payload;
      })
      .addCase(rejoinEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Get Employee History
      .addCase(getEmployeeHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployeeHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload; // Includes transferHistory, employmentHistory, advanceHistory
      })
      .addCase(getEmployeeHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.history = null;
      })
      // Add Employee Documents
      .addCase(addEmployeeDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(addEmployeeDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successMessage = 'Documents added successfully';
        const index = state.employees.findIndex((emp) => emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        if (state.currentEmployee?._id === action.payload._id) state.currentEmployee = action.payload;
      })
      .addCase(addEmployeeDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Fetch Employee Attendance
      .addCase(fetchEmployeeAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance = action.payload;
      })
      .addCase(fetchEmployeeAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.attendance = [];
      })
      // Fetch Settings
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.settings = null;
      });
  },
});

export const { reset } = employeesSlice.actions;
export default employeesSlice.reducer;
