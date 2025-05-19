import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchAttendanceReport = createAsyncThunk(
  'reports/fetchAttendanceReport',
  async ({ startDate, endDate, location }, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/reports/attendance', {
        params: { startDate, endDate, location },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch attendance report');
    }
  }
);

export const fetchLeaveReport = createAsyncThunk(
  'reports/fetchLeaveReport',
  async ({ location }, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/reports/leaves', {
        params: { location },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch leave report');
    }
  }
);

const reportsSlice = createSlice({
  name: 'reports',
  initialState: {
    attendanceReport: null,
    leaveReport: null,
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
      });
  },
});

export const { reset } = reportsSlice.actions;
export default reportsSlice.reducer;