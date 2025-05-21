import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchEmployees = createAsyncThunk(
  'siteInchargeEmployee/fetchEmployees',
  async ({ location }, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/siteincharge/employees', {
        params: { location },
      });
      return response.data.employees;
    } catch (error) {
      console.error('Fetch employees error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employees');
    }
  }
);

export const fetchLocations = createAsyncThunk(
  'siteInchargeEmployee/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/siteincharge/locations');
      return response.data.locations;
    } catch (error) {
      console.error('Fetch locations error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch locations');
    }
  }
);

export const registerEmployee = createAsyncThunk(
  'siteInchargeEmployee/registerEmployee',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post('http://localhost:5000/api/siteincharge/employees/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Register employee error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to register employee');
    }
  }
);

export const bulkRegisterEmployees = createAsyncThunk(
  'siteInchargeEmployee/bulkRegisterEmployees',
  async (employees, { rejectWithValue }) => {
    try {
      console.log('Registering bulk employees:', employees);
      const response = await axios.post('http://localhost:5000/api/siteincharge/employees/bulk', employees);
      return response.data.employees;
    } catch (error) {
      console.error('Bulk register employees error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to register employees');
    }
  }
);

export const getEmployee = createAsyncThunk(
  'siteInchargeEmployee/getEmployee',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/siteincharge/employees/${id}`);
      return response.data.employee;
    } catch (error) {
      console.error('Get employee error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employee');
    }
  }
);

export const editEmployee = createAsyncThunk(
  'siteInchargeEmployee/editEmployee',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/siteincharge/employees/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Edit employee error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to edit employee');
    }
  }
);

export const transferEmployee = createAsyncThunk(
  'siteInchargeEmployee/transferEmployee',
  async ({ id, location }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/siteincharge/employees/${id}/transfer`, { location });
      return response.data;
    } catch (error) {
      console.error('Transfer employee error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to transfer employee');
    }
  }
);

export const uploadDocument = createAsyncThunk(
  'siteInchargeEmployee/uploadDocument',
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`http://localhost:5000/api/siteincharge/employees/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Upload document error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to upload document');
    }
  }
);

export const fetchEmployeeAttendance = createAsyncThunk(
  'siteInchargeEmployee/fetchEmployeeAttendance',
  async ({ employeeId, month, year }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/siteincharge/attendance/employee/${employeeId}`, {
        params: { month, year },
      });
      return response.data.attendance;
    } catch (error) {
      console.error('Fetch employee attendance error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employee attendance');
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  'siteInchargeEmployee/deleteEmployee',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`http://localhost:5000/api/siteincharge/employees/${id}`);
      return id;
    } catch (error) {
      console.error('Delete employee error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to delete employee');
    }
  }
);

const employeeSlice = createSlice({
  name: 'siteInchargeEmployee',
  initialState: {
    employees: [],
    employee: null,
    attendance: [],
    locations: [],
    loading: false,
    error: null,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
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
      })
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload || [];
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registerEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.employees.push(action.payload);
      })
      .addCase(registerEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(bulkRegisterEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkRegisterEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees.push(...action.payload);
      })
      .addCase(bulkRegisterEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.employee = action.payload;
      })
      .addCase(getEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(editEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editEmployee.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.employees.findIndex((emp) => emp._id === action.payload._id);
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
        if (state.employee && state.employee._id === action.payload._id) {
          state.employee = action.payload;
        }
      })
      .addCase(editEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(transferEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(transferEmployee.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.employees.findIndex((emp) => emp._id === action.payload._id);
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
        if (state.employee && state.employee._id === action.payload._id) {
          state.employee = action.payload;
        }
      })
      .addCase(transferEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(uploadDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.employees.findIndex((emp) => emp._id === action.payload._id);
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
        if (state.employee && state.employee._id === action.payload._id) {
          state.employee = action.payload;
        }
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchEmployeeAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance = action.payload || [];
      })
      .addCase(fetchEmployeeAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = state.employees.filter((emp) => emp._id !== action.payload);
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = employeeSlice.actions;
export default employeeSlice.reducer;
