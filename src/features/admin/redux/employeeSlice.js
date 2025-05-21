import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async ({ location }, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/employees', {
        params: { location: location === 'all' ? '' : location },
      });
      return response.data;
    } catch (error) {
      console.error('Fetch employees error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employees');
    }
  }
);

export const registerEmployee = createAsyncThunk(
  'employees/registerEmployee',
  async ({ employeeData, documents }, { rejectWithValue }) => {
    try {
      const response = await axios.post('http://localhost:5000/api/admin/employees', employeeData);
      const employeeId = response.data._id;

      if (documents && documents.length > 0) {
        const uploadPromises = documents.map(async (file) => {
          const formData = new FormData();
          formData.append('document', file);
          await axios.post(`http://localhost:5000/api/admin/employees/${employeeId}/documents`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        });
        await Promise.all(uploadPromises);
      }

      const updatedEmployee = await axios.get(`http://localhost:5000/api/admin/employees/${employeeId}`);
      return updatedEmployee.data;
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
      const response = await axios.put(`http://localhost:5000/api/admin/employees/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update employee error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to update employee');
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  'employees/deleteEmployee',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`http://localhost:5000/api/admin/employees/${id}`);
      return id;
    } catch (error) {
      console.error('Delete employee error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to delete employee');
    }
  }
);

export const uploadDocument = createAsyncThunk(
  'employees/uploadDocument',
  async ({ id, file }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('document', file);
      const response = await axios.post(`http://localhost:5000/api/admin/employees/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Upload document error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to upload document');
    }
  }
);

export const deleteDocument = createAsyncThunk(
  'employees/deleteDocument',
  async ({ id, documentId }, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`http://localhost:5000/api/admin/employees/${id}/documents/${documentId}`);
      return response.data;
    } catch (error) {
      console.error('Delete document error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to delete document');
    }
  }
);

const employeesSlice = createSlice({
  name: 'employees',
  initialState: {
    employees: [],
    loading: false,
    error: null,
    success: false,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
      state.loading = false;
      state.success = false;
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
        state.employees = [];
      })
      .addCase(registerEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(registerEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.employees.push(action.payload);
        state.success = true;
      })
      .addCase(registerEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(updateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.employees.findIndex((emp) => emp._id === action.payload._id);
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
      })
      .addCase(updateEmployee.rejected, (state, action) => {
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
      .addCase(deleteDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.employees.findIndex((emp) => emp._id === action.payload._id);
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = employeesSlice.actions;
export default employeesSlice.reducer;
