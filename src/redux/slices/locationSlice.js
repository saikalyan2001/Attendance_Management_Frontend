import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Temporary hardcoded locations
const fallbackLocations = [
  {
    _id: 'temp-location-a',
    name: 'Location A',
    address: '123 Street A',
  },
  {
    _id: 'temp-location-b',
    name: 'Location B',
    address: '456 Street B',
  },
];

export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/locations');
      return response.data.length > 0 ? response.data : fallbackLocations;
    } catch (error) {
      console.error('Fetch locations error:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch locations');
    }
  }
);

const locationSlice = createSlice({
  name: 'locations',
  initialState: {
    locations: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.locations = fallbackLocations; // Use fallback on error
      });
  },
});

export default locationSlice.reducer;