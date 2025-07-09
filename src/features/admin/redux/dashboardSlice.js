import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import api from '../../../utils/api';

export const fetchDashboard = createAsyncThunk(
  'dashboard/fetchDashboard',
  async ({ date } = {}, { rejectWithValue }) => {
    try {
      const timeZone = 'Asia/Kolkata';
      const dateString = date ? format(toZonedTime(date, timeZone), 'yyyy-MM-dd') : format(toZonedTime(new Date(), timeZone), 'yyyy-MM-dd');
      ('Making API call for date:', dateString); // Debug
      const response = await api.get('/admin/dashboard', {
        params: { date: dateString },
      });
      ('API response:', response.data); // Debug
      return response.data;
    } catch (error) {
      ('Fetch dashboard error:', error.response?.data || error.message); // Debug
      const message =
        error.response?.status === 400
          ? 'Invalid date format'
          : error.response?.data?.message || 'Failed to fetch dashboard data';
      return rejectWithValue(message);
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    dashboardData: null,
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
      });
  },
});

export const { reset } = dashboardSlice.actions;
export default dashboardSlice.reducer;