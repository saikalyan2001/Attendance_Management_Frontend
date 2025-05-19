import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const markAttendance = createAsyncThunk(
  'siteInchargeMarkAttendance/markAttendance',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axios.post('http://localhost:5000/api/siteincharge/attendance', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark attendance');
    }
  }
);

export const fetchMonthlyAttendance = createAsyncThunk(
  'siteInchargeMarkAttendance/fetchMonthlyAttendance',
  async ({ month, year }, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/siteincharge/attendance/monthly', {
        params: { month, year },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch monthly attendance');
    }
  }
);

const markAttendanceSlice = createSlice({
  name: 'siteInchargeMarkAttendance',
  initialState: {
    attendance: [],
    monthlyAttendance: [],
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
      .addCase(markAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance.push(action.payload);
      })
      .addCase(markAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMonthlyAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.monthlyAttendance = action.payload;
      })
      .addCase(fetchMonthlyAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = markAttendanceSlice.actions;
export default markAttendanceSlice.reducer;