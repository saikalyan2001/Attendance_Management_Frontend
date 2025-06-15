import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../utils/api';

export const fetchAttendance = createAsyncThunk(
  'siteInchargeAttendance/fetchAttendance',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const cleanedFilters = { ...filters };
      if (cleanedFilters.status === 'all') {
        delete cleanedFilters.status;
      }
      console.log('Fetching attendance with filters:', cleanedFilters);
      const response = await api.get('/siteincharge/attendance', {
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
      if (!Array.isArray(records)) {
        throw new Error('Records must be an array');
      }
      const response = await api.post('/siteincharge/attendance', records);
      const attendance = Array.isArray(response.data.attendance)
        ? response.data.attendance
        : Array.isArray(response.data)
        ? response.data
        : [response.data];
      const attendanceIds = Array.isArray(response.data.attendanceIds)
        ? response.data.attendanceIds
        : attendance.map((rec) => rec._id);
      return { attendance, attendanceIds };
    } catch (error) {
      console.error('Mark attendance error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to mark attendance');
    }
  }
);

export const bulkMarkAttendance = createAsyncThunk(
  'siteInchargeAttendance/bulkMarkAttendance',
  async ({ attendance, overwrite }, { rejectWithValue }) => {
    try {
      console.log('Sending bulk attendance payload:', { attendance, overwrite }); // Debug log
      if (!Array.isArray(attendance)) {
        throw new Error('Attendance must be an array');
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await api.post(
        '/siteincharge/attendance/bulk',
        { attendance, overwrite }, // Ensure payload structure
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      const attendanceRecords = Array.isArray(response.data.attendance)
        ? response.data.attendance
        : [];
      const attendanceIds = Array.isArray(response.data.attendanceIds)
        ? response.data.attendanceIds
        : [];

      return {
        attendance: attendanceRecords,
        attendanceIds,
      };
    } catch (error) {
      console.error('Bulk mark attendance error:', error.response?.data || error.message); // Line ~79
      if (error.name === 'AbortError') {
        return rejectWithValue('Request timed out');
      }
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to mark bulk attendance');
    }
  }
);

export const undoAttendance = createAsyncThunk(
  'siteInchargeAttendance/undoAttendance',
  async ({ attendanceIds }, { rejectWithValue }) => {
    try {
      console.log('Undoing attendance:', attendanceIds);
      if (!Array.isArray(attendanceIds)) {
        throw new Error('attendanceIds must be an array');
      }
      await api.delete('/siteincharge/attendance', { data: { attendanceIds } });
      return attendanceIds;
    } catch (error) {
      console.error('Undo attendance error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to undo attendance');
    }
  }
);

export const fetchMonthlyAttendance = createAsyncThunk(
  'siteInchargeAttendance/fetchMonthlyAttendance',
  async ({ month, year, location }, { rejectWithValue }) => {
    try {
      console.log('Fetching monthly attendance:', { month, year, location });
      const response = await api.get('/siteincharge/attendance/monthly', {
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
  async ({ employeeId, location, date, requestedStatus, reason }, { rejectWithValue }) => {
    try {
      console.log('Requesting attendance edit:', { employeeId, location, date, requestedStatus, reason });
      const response = await api.post('/siteincharge/attendance/request-edit', {
        employeeId,
        location,
        date,
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

// New action to fetch attendance edit requests
export const fetchAttendanceEditRequests = createAsyncThunk(
  'siteInchargeAttendance/fetchAttendanceEditRequests',
  async ({ location }, { rejectWithValue }) => {
    try {
      console.log('Fetching attendance edit requests:', { location });
      const response = await api.get('/siteincharge/attendance/requests', {
        params: { location },
      });
      return response.data.requests;
    } catch (error) {
      console.error('Fetch attendance edit requests error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch attendance edit requests');
    }
  }
);

const attendanceSlice = createSlice({
  name: 'siteInchargeAttendance',
  initialState: {
    attendance: [],
    monthlyAttendance: [],
    attendanceEditRequests: [], // New state property to store edit requests
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
        state.attendance = action.payload.attendance;
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
      .addCase(requestAttendanceEdit.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(requestAttendanceEdit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // New cases for fetchAttendanceEditRequests
      .addCase(fetchAttendanceEditRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceEditRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceEditRequests = action.payload || [];
      })
      .addCase(fetchAttendanceEditRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset, resetMonthly } = attendanceSlice.actions;
export default attendanceSlice.reducer;