import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../utils/api';

export const fetchEmployees = createAsyncThunk(
  'siteInchargeEmployee/fetchEmployees',
  async ({ location, status }, { rejectWithValue }) => {
    try {
      const params = { location };
      if (status) params.status = status;
      const response = await api.get('/siteincharge/employees', { params });
      return response.data.employees;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employees');
    }
  }
);

export const fetchLocations = createAsyncThunk(
  'siteInchargeEmployee/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/siteincharge/locations');
      return response.data.locations;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch locations');
    }
  }
);

export const fetchAllLocations = createAsyncThunk(
  'siteInchargeEmployee/fetchAllLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/locations');
      const locations = response.data || [];
      console.log('Fetched allLocations:', locations);
      const invalidLocations = locations.filter(loc => !loc._id || !/^[0-9a-fA-F]{24}$/.test(loc._id));
      if (invalidLocations.length > 0) {
        console.error('Invalid location IDs found:', invalidLocations);
      }
      return locations;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch all locations');
    }
  }
);

// New thunk to fetch settings
export const fetchSettings = createAsyncThunk(
  'siteInchargeEmployee/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/siteincharge/settings');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings');
    }
  }
);

export const registerEmployee = createAsyncThunk(
  'siteInchargeEmployee/registerEmployee',
  async ({ employeeData, documents }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Object.keys(employeeData).forEach(key => {
        if (key === 'bankDetails') {
          formData.append(key, JSON.stringify(employeeData[key]));
        } else {
          formData.append(key, employeeData[key]);
        }
      });
      documents.forEach((file) => {
        formData.append('documents', file);
      });

      const response = await api.post('/siteincharge/employees/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to register employee');
    }
  }
);

export const getEmployee = createAsyncThunk(
  'siteInchargeEmployee/getEmployee',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/siteincharge/employees/${id}`);
      return response.data.employee;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employee');
    }
  }
);

export const editEmployee = createAsyncThunk(
  'siteInchargeEmployee/editEmployee',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/siteincharge/employees/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to edit employee');
    }
  }
);

export const transferEmployee = createAsyncThunk(
  'siteInchargeEmployee/transferEmployee',
  async ({ id, location }, { rejectWithValue }) => {
    try {
      console.log('Transfer employee request:', { id, location });
      const response = await api.put(`/siteincharge/employees/${id}/transfer`, { location });
      return response.data;
    } catch (error) {
      console.error('Transfer employee error:', error.response?.data);
      return rejectWithValue(error.response?.data?.message || 'Failed to transfer employee');
    }
  }
);


export const uploadDocument = createAsyncThunk(
  'siteInchargeEmployee/addEmployeeDocuments',
  async ({ id, formData }, { rejectWithValue }) => { // Change `documents` to `formData`
    try {
      const response = await api.post(`/siteincharge/employees/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add employee documents');
    }
  }
);

export const fetchEmployeeAttendance = createAsyncThunk(
  'siteInchargeEmployee/fetchEmployeeAttendance',
  async ({ employeeId, month, year }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/siteincharge/attendance/employee/${employeeId}`, {
        params: { month, year },
      });
      return response.data.attendance;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employee attendance');
    }
  }
);

export const deactivateEmployee = createAsyncThunk(
  'siteInchargeEmployee/deactivateEmployee',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.put(`/siteincharge/employees/${id}/deactivate`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to deactivate employee');
    }
  }
);

export const rejoinEmployee = createAsyncThunk(
  'siteInchargeEmployee/rejoinEmployee',
  async ({ id, rejoinDate }, { rejectWithValue }) => {
    try {
      const formattedRejoinDate = new Date(rejoinDate).toISOString();
      const response = await api.put(`/siteincharge/employees/${id}/rejoin`, { rejoinDate: formattedRejoinDate });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to rejoin employee';
      return rejectWithValue(errorMessage);
    }
  }
);

export const getEmployeeHistory = createAsyncThunk(
  'siteInchargeEmployee/getEmployeeHistory',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/siteincharge/employees/${id}/history`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employee history');
    }
  }
);

// Update the extraReducers to handle the new thunk
const employeeSlice = createSlice({
  name: 'siteInchargeEmployee',
  initialState: {
    employees: [],
    employee: null,
    history: null, // Add history to the state
    attendance: [],
    locations: [],
    allLocations: [],
    settings: null,
    loading: false,
    error: null,
    success: false,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
      state.success = false;
      state.employee = null;
      state.history = null; // Reset history
    },
  },
  extraReducers: (builder) => {
    builder
      // Existing cases...
      .addCase(fetchEmployees.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchEmployees.fulfilled, (state, action) => { state.loading = false; state.employees = (action.payload || []).filter(emp => emp && typeof emp === 'object' && emp._id); })
      .addCase(fetchEmployees.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchLocations.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchLocations.fulfilled, (state, action) => { state.loading = false; state.locations = (action.payload || []).filter(loc => loc && typeof loc === 'object' && loc._id); })
      .addCase(fetchLocations.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchAllLocations.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAllLocations.fulfilled, (state, action) => { state.loading = false; state.allLocations = (action.payload || []).filter(loc => loc && typeof loc === 'object' && loc._id); })
      .addCase(fetchAllLocations.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchSettings.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSettings.fulfilled, (state, action) => { state.loading = false; state.settings = action.payload; })
      .addCase(fetchSettings.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(registerEmployee.pending, (state) => { state.loading = true; state.error = null; state.success = false; })
      .addCase(registerEmployee.fulfilled, (state, action) => { state.loading = false; if (action.payload && typeof action.payload === 'object' && action.payload._id) { state.employees.push(action.payload); } state.success = true; })
      .addCase(registerEmployee.rejected, (state, action) => { state.loading = false; state.error = action.payload; state.success = false; })
      .addCase(getEmployee.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(getEmployee.fulfilled, (state, action) => { state.loading = false; state.employee = action.payload; })
      .addCase(getEmployee.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(editEmployee.pending, (state) => { state.loading = true; state.error = null; state.success = false; })
      .addCase(editEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.employees.findIndex((emp) => emp && emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        if (state.employee && state.employee._id === action.payload._id) state.employee = action.payload;
      })
      .addCase(editEmployee.rejected, (state, action) => { state.loading = false; state.error = action.payload; state.success = false; })
      .addCase(transferEmployee.pending, (state) => { state.loading = true; state.error = null; state.success = false; })
      .addCase(transferEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.employees.findIndex((emp) => emp && emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        if (state.employee && state.employee._id === action.payload._id) state.employee = action.payload;
      })
      .addCase(transferEmployee.rejected, (state, action) => { state.loading = false; state.error = action.payload; state.success = false; })
      .addCase(uploadDocument.pending, (state) => { state.loading = true; state.error = null; state.success = false; })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.employees.findIndex((emp) => emp && emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        if (state.employee && state.employee._id === action.payload._id) state.employee = action.payload;
      })
      .addCase(uploadDocument.rejected, (state, action) => { state.loading = false; state.error = action.payload; state.success = false; })
      .addCase(fetchEmployeeAttendance.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchEmployeeAttendance.fulfilled, (state, action) => { state.loading = false; state.attendance = action.payload || []; })
      .addCase(fetchEmployeeAttendance.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(deactivateEmployee.pending, (state) => { state.loading = true; state.error = null; state.success = false; })
      .addCase(deactivateEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.employees.findIndex((emp) => emp && emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        if (state.employee && state.employee._id === action.payload._id) state.employee = action.payload;
      })
      .addCase(deactivateEmployee.rejected, (state) => { state.loading = false; state.error = action.payload; state.success = false; })
      .addCase(rejoinEmployee.pending, (state) => { state.loading = true; state.error = null; state.success = false; })
      .addCase(rejoinEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.employees.findIndex((emp) => emp && emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        else state.employees.push(action.payload);
        if (state.employee && state.employee._id === action.payload._id) state.employee = action.payload;
      })
      .addCase(rejoinEmployee.rejected, (state, action) => { state.loading = false; state.error = action.payload; state.success = false; })
      // Add cases for getEmployeeHistory
      .addCase(getEmployeeHistory.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(getEmployeeHistory.fulfilled, (state, action) => { state.loading = false; state.history = action.payload; })
      .addCase(getEmployeeHistory.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export const { reset } = employeeSlice.actions;
export default employeeSlice.reducer;