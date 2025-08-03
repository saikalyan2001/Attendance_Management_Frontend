// src/features/superadmin/redux/locationsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../utils/api';

export const fetchLocations = createAsyncThunk(
  'superAdminLocations/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/superadmin/locations');
      return response.data;
    } catch (error) {
      console.error('Fetch locations error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch locations');
    }
  }
);

export const addLocation = createAsyncThunk(
  'superAdminLocations/addLocation',
  async ({ name, address, city, state }, { rejectWithValue }) => {
    try {
      const response = await api.post('/superadmin/locations', { name, address, city, state });
      return response.data;
    } catch (error) {
      console.error('Add location error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to add location');
    }
  }
);

export const editLocation = createAsyncThunk(
  'superAdminLocations/editLocation',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/superadmin/locations/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Edit location error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to edit location');
    }
  }
);

export const deleteLocation = createAsyncThunk(
  'superAdminLocations/deleteLocation',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/superadmin/locations/${id}`);
      return id;
    } catch (error) {
      console.error('Delete location error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to delete location');
    }
  }
);

const superAdminLocationsSlice = createSlice({
  name: 'superAdminLocations',
  initialState: {
    locations: [],
    loading: false,
    error: null,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload || [];
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.locations.push(action.payload);
      })
      .addCase(addLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(editLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editLocation.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.locations.findIndex((loc) => loc._id === action.payload._id);
        if (index !== -1) {
          state.locations[index] = action.payload;
        }
      })
      .addCase(editLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = state.locations.filter((loc) => loc._id !== action.payload);
      })
      .addCase(deleteLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = superAdminLocationsSlice.actions;
export default superAdminLocationsSlice.reducer;