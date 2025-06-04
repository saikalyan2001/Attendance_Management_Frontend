import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../utils/api';

export const fetchProfile = createAsyncThunk(
  'siteInchargeProfile/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/siteincharge/profile');
      return response.data;
    } catch (error) {
      console.error('Fetch profile error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        return rejectWithValue('Unauthorized: Please log in again');
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

const profileSlice = createSlice({
  name: 'siteInchargeProfile',
  initialState: {
    profile: null,
    recentAttendance: [],
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
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload.user || null;
        state.recentAttendance = action.payload.recentAttendance || [];
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = profileSlice.actions;
export default profileSlice.reducer;
