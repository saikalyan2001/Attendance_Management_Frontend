import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchAttendance = createAsyncThunk(
  'attendance/fetchAttendance',
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
  'attendance/markAttendance',
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
  'attendance/editAttendance',
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
  'attendance/fetchAttendanceRequests',
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
  'attendance/handleAttendanceRequest',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/admin/attendance/requests/${id}`, { status });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to handle attendance request');
    }
  }
);

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
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

export const { reset } = attendanceSlice.actions;
export default attendanceSlice.reducer;