import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchAttendance = createAsyncThunk(
  'siteInchargeAttendance/fetchAttendance',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const cleanedFilters = { ...filters };
      if (cleanedFilters.status === 'all') {
        delete cleanedFilters.status;
      }
      console.log('Fetching attendance with filters:', cleanedFilters);
      const response = await axios.get('http://localhost:5000/api/siteincharge/attendance', {
        params: cleanedFilters,
      });
      return response.data.attendance;
    } catch (error) {
      console.error('Fetch attendance error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch attendance data');
    }
  }
);

export const markAttendance = createAsyncThunk(
  'siteInchargeAttendance/markAttendance',
  async (records, { rejectWithValue }) => {
    try {
      console.log('Marking attendance with records:', records);
      const response = await axios.post('http://localhost:5000/api/siteincharge/attendance/bulk', records);
      return response.data.attendance;
    } catch (error) {
      console.error('Mark attendance error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to mark attendance');
    }
  }
);

export const bulkMarkAttendance = createAsyncThunk(
  'siteInchargeAttendance/bulkMarkAttendance',
  async (records, { rejectWithValue }) => {
    try {
      console.log('Marking bulk attendance:', records);
      const response = await axios.post('http://localhost:5000/api/siteincharge/attendance/bulk', records);
      return response.data.attendance;
    } catch (error) {
      console.error('Bulk mark attendance error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to mark bulk attendance');
    }
  }
);

export const fetchMonthlyAttendance = createAsyncThunk(
  'siteInchargeAttendance/fetchMonthlyAttendance',
  async ({ month, year, location }, { rejectWithValue }) => {
    try {
      console.log('Fetching monthly attendance:', { month, year, location });
      const response = await axios.get('http://localhost:5000/api/siteincharge/attendance/monthly', {
        params: { month, year, location },
      });
      return response.data.attendance;
    } catch (error) {
      console.error('Fetch monthly attendance error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch monthly attendance');
    }
  }
);

export const requestAttendanceEdit = createAsyncThunk(
  'siteInchargeAttendance/requestAttendanceEdit',
  async ({ attendanceId, requestedStatus, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.post('http://localhost:5000/api/admin/attendance/requests', {
        attendanceId,
        requestedStatus,
        reason,
      });
      return response.data;
    } catch (error) {
      console.error('Request attendance edit error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to request attendance edit');
    }
  }
);

const attendanceSlice = createSlice({
  name: 'siteInchargeAttendance',
  initialState: {
    attendance: [],
    monthlyAttendance: [],
    loading: false,
    error: null,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
      state.loading = false;
    },
    resetMonthly: (state) => {
      state.monthlyAttendance = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance = action.payload || [];
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
        state.attendance.push(...action.payload);
      })
      .addCase(markAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(bulkMarkAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkMarkAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance.push(...action.payload);
      })
      .addCase(bulkMarkAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMonthlyAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.monthlyAttendance = action.payload || [];
      })
      .addCase(fetchMonthlyAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(requestAttendanceEdit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestAttendanceEdit.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance.push(action.payload);
      })
      .addCase(requestAttendanceEdit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset, resetMonthly } = attendanceSlice.actions;
export default attendanceSlice.reducer;
