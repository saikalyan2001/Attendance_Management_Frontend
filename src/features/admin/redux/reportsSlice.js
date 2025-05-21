import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchAttendanceReport = createAsyncThunk(
  'adminReports/fetchAttendanceReport',
  async ({ startDate, endDate, location }, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/reports/attendance', {
        params: { startDate, endDate, location },
      });
      return response.data;
    } catch (error) {
      console.error('Fetch attendance report error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch attendance report');
    }
  }
);

export const fetchLeaveReport = createAsyncThunk(
  'adminReports/fetchLeaveReport',
  async ({ location }, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/reports/leaves', {
        params: { location },
      });
      return response.data;
    } catch (error) {
      console.error('Fetch leave report error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch leave report');
    }
  }
);

export const fetchSalaryReport = createAsyncThunk(
  'adminReports/fetchSalaryReport',
  async ({ startDate, endDate, location }, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/reports/salary', {
        params: { startDate, endDate, location },
      });
      return response.data;
    } catch (error) {
      console.error('Fetch salary report error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch salary report');
    }
  }
);

const reportsSlice = createSlice({
  name: 'adminReports',
  initialState: {
    attendanceReport: null,
    leaveReport: null,
    salaryReport: null,
    loading: false,
    error: null,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendanceReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceReport.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceReport = action.payload;
      })
      .addCase(fetchAttendanceReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchLeaveReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeaveReport.fulfilled, (state, action) => {
        state.loading = false;
        state.leaveReport = action.payload;
      })
      .addCase(fetchLeaveReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSalaryReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSalaryReport.fulfilled, (state, action) => {
        state.loading = false;
        state.salaryReport = action.payload;
      })
      .addCase(fetchSalaryReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = reportsSlice.actions;
export default reportsSlice.reducer;
