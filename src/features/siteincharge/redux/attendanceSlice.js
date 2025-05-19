import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchAttendance = createAsyncThunk(
  'siteInchargeAttendance/fetchAttendance',
  async (filters = {}, { rejectWithValue }) => {
    try {
      // Remove status filter if 'all' is selected
      const cleanedFilters = { ...filters };
      if (cleanedFilters.status === 'all') {
        delete cleanedFilters.status;
      }
      const response = await axios.get('http://localhost:5000/api/siteincharge/attendance', {
        params: cleanedFilters,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch attendance data');
    }
  }
);

const attendanceSlice = createSlice({
  name: 'siteInchargeAttendance',
  initialState: {
    attendance: [],
    loading: false,
    error: null,
  },
  reducers: {},
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
      });
  },
});

export default attendanceSlice.reducer;