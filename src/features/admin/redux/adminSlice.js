import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchDashboard = createAsyncThunk(
  'admin/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/dashboard');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard data');
    }
  }
);

export const fetchAttendanceReport = createAsyncThunk(
  'admin/fetchAttendanceReport',
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
  'admin/fetchLeaveReport',
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

export const fetchLocations = createAsyncThunk(
  'admin/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/locations');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch locations');
    }
  }
);

export const fetchAttendance = createAsyncThunk(
  'admin/fetchAttendance',
  async ({ month, year, location }, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/attendance', {
        params: { month, year, location },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch attendance');
    }
  }
);

export const markAttendance = createAsyncThunk(
  'admin/markAttendance',
  async ({ date, location, absentEmployees }, { rejectWithValue }) => {
    try {
      const response = await axios.post('http://localhost:5000/api/admin/attendance', {
        date,
        location,
        absentEmployees,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark attendance');
    }
  }
);

export const editAttendance = createAsyncThunk(
  'admin/editAttendance',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/admin/attendance/${id}`, { status });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to edit attendance');
    }
  }
);

export const fetchAttendanceRequests = createAsyncThunk(
  'admin/fetchAttendanceRequests',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/attendance/requests');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch attendance requests');
    }
  }
);

export const handleAttendanceRequest = createAsyncThunk(
  'admin/handleAttendanceRequest',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/admin/attendance/requests/${id}`, { status });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to handle attendance request');
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    dashboardData: null,
    attendanceReport: null,
    leaveReport: null,
    locations: [],
    attendance: [],
    attendanceRequests: [],
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
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardData = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
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
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance = action.payload;
      })
      .addCase(fetchAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAttendance.fulfilled, (state, action) => {
        state.loading = false;
      })
      .addCase(markAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(editAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editAttendance.fulfilled, (state, action) => {
        state.loading = false;
      })
      .addCase(editAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAttendanceRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceRequests = action.payload;
      })
      .addCase(fetchAttendanceRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(handleAttendanceRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(handleAttendanceRequest.fulfilled, (state, action) => {
        state.loading = false;
      })
      .addCase(handleAttendanceRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = adminSlice.actions;
export default adminSlice.reducer;