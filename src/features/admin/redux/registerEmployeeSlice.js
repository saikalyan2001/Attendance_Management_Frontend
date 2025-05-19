import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const registerEmployee = createAsyncThunk(
  'registerEmployee/registerEmployee',
  async (employeeData, { rejectWithValue }) => {
    try {
      const response = await axios.post('http://localhost:5000/api/admin/employees', employeeData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to register employee');
    }
  }
);

const registerEmployeeSlice = createSlice({
  name: 'registerEmployee',
  initialState: {
    employee: null,
    loading: false,
    error: null,
    success: false,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
      state.success = false;
      state.employee = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(registerEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.employee = action.payload;
        state.success = true;
      })
      .addCase(registerEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      });
  },
});

export const { reset } = registerEmployeeSlice.actions;
export default registerEmployeeSlice.reducer;