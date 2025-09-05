import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../utils/api';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const fetchDashboardData = createAsyncThunk(
  'siteInchargeDashboard/fetchDashboardData',
  async ({ location, date }, { rejectWithValue }) => {
    try {
      const timeZone = 'Asia/Kolkata';
      const zonedDate = date ? toZonedTime(date, timeZone) : toZonedTime(new Date(), timeZone);
      const dateString = format(zonedDate, 'yyyy-MM-dd');
      ('Making API call for location:', location, 'date:', dateString); // Debug
      const response = await api.get('/siteincharge/dashboard', {
        params: { location, date: dateString },
      });
      ('API response:', {
        totalEmployees: response.data.totalEmployees,
        todayAttendance: response.data.todayAttendance,
        recentAttendance: response.data.recentAttendance
      }); // Debug
      return response.data;
    } catch (error) {
      ('Fetch dashboard error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard data');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'siteInchargeDashboard',
  initialState: {
    metrics: null,
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
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.metrics = action.payload;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = dashboardSlice.actions;
export default dashboardSlice.reducer;