import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import api from '../../../utils/api';

export const fetchSuperAdminDashboard = createAsyncThunk(
  'superAdminDashboard/fetchSuperAdminDashboard',
  async ({ date } = {}, { rejectWithValue }) => {
    try {
      const timeZone = 'Asia/Kolkata';
      const dateString = date ? format(toZonedTime(date, timeZone), 'yyyy-MM-dd') : format(toZonedTime(new Date(), timeZone), 'yyyy-MM-dd');
      console.log('Making super admin dashboard API call for date:', dateString);
      const response = await api.get('/superadmin/dashboard', {
        params: { date: dateString },
      });
      console.log('Super Admin dashboard API response:', response.data);
      return response.data;
    } catch (error) {
      console.log('Fetch super admin dashboard error:', error.response?.data || error.message);
      const message = error.response?.data?.message || 'Failed to fetch dashboard data';
      return rejectWithValue(message);
    }
  }
);

const superAdminDashboardSlice = createSlice({
  name: 'superAdminDashboard',
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
      .addCase(fetchSuperAdminDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSuperAdminDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardData = action.payload;
      })
      .addCase(fetchSuperAdminDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = superAdminDashboardSlice.actions;
export default superAdminDashboardSlice.reducer;