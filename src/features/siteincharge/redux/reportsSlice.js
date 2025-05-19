import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchReports = createAsyncThunk(
  'siteInchargeReports/fetchReports',
  async ({ month, location }, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/siteincharge/reports', {
        params: { month, location },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch reports');
    }
  }
);

const reportsSlice = createSlice({
  name: 'siteInchargeReports',
  initialState: {
    reports: [],
    locations: [],
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
      .addCase(fetchReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload.reports;
        state.locations = action.payload.locations;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = reportsSlice.actions;
export default reportsSlice.reducer;