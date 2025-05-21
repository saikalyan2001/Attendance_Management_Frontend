import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchAttendanceReports = createAsyncThunk(
  'siteInchargeReports/fetchAttendanceReports',
  async ({ startDate, endDate, location, department }, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/siteincharge/reports/attendance', {
        params: { startDate, endDate, location, department },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch attendance reports');
    }
  }
);

export const fetchLeaveReports = createAsyncThunk(
  'siteInchargeReports/fetchLeaveReports',
  async ({ startDate, endDate, location, department }, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/siteincharge/reports/leaves', {
        params: { startDate, endDate, location, department },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch leave reports');
    }
  }
);

const reportsSlice = createSlice({
  name: 'siteInchargeReports',
  initialState: {
    attendanceReports: [],
    leaveReports: [],
    locations: [],
    departments: [],
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
      .addCase(fetchAttendanceReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceReports.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceReports = action.payload.reports;
        state.locations = action.payload.locations;
        state.departments = action.payload.departments;
      })
      .addCase(fetchAttendanceReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchLeaveReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeaveReports.fulfilled, (state, action) => {
        state.loading = false;
        state.leaveReports = action.payload.reports;
        state.locations = action.payload.locations;
        state.departments = action.payload.departments;
      })
      .addCase(fetchLeaveReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = reportsSlice.actions;
export default reportsSlice.reducer;