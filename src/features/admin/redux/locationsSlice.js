import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchLocations = createAsyncThunk(
  'adminLocations/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/locations');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch locations');
    }
  }
);

export const addLocation = createAsyncThunk(
  'adminLocations/addLocation',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axios.post('http://localhost:5000/api/admin/locations', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add location');
    }
  }
);

export const editLocation = createAsyncThunk(
  'adminLocations/editLocation',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/admin/locations/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to edit location');
    }
  }
);

export const deleteLocation = createAsyncThunk(
  'adminLocations/deleteLocation',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`http://localhost:5000/api/admin/locations/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete location');
    }
  }
);

const locationsSlice = createSlice({
  name: 'adminLocations',
  initialState: {
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
      })
      .addCase(addLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.locations.push(action.payload);
      })
      .addCase(editLocation.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.locations.findIndex((loc) => loc._id === action.payload._id);
        if (index !== -1) {
          state.locations[index] = action.payload;
        }
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = state.locations.filter((loc) => loc._id !== action.payload);
      })
      .addCase(addLocation.pending, (state) => {
        state.loading = true;
      })
      .addCase(editLocation.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteLocation.pending, (state) => {
        state.loading = true;
      })
      .addCase(addLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(editLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = locationsSlice.actions;
export default locationsSlice.reducer;