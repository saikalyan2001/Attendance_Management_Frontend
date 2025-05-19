import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchEmployees = createAsyncThunk(
  'siteInchargeEmployee/fetchEmployees',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/siteincharge/employees');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employees');
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
      return rejectWithValue(error.response?.data?.message || 'Failed to register employee');
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
      return rejectWithValue(error.response?.data?.message || 'Failed to upload document');
    }
  }
);

export const fetchSettings = createAsyncThunk(
  'siteInchargeEmployee/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/settings');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings');
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
      return rejectWithValue(error.response?.data?.message || 'Failed to delete employee');
    }
  }
);

const employeeSlice = createSlice({
  name: 'siteInchargeEmployee',
  initialState: {
    employees: [],
    locations: [],
    settings: null,
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
        state.employees = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
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
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
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