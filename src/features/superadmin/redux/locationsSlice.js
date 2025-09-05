import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../utils/api';

export const fetchLocations = createAsyncThunk(
  'superAdminLocations/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/superadmin/locations');
      return response.data;
    } catch (error) {
      console.error('Fetch locations error:', error);
      // Use error.message directly since the interceptor transforms it
      return rejectWithValue(error.message || 'Failed to fetch locations');
    }
  }
);

export const fetchPaginatedLocations = createAsyncThunk(
  'superAdminLocations/fetchPaginatedLocations',
  async (
    { search = '', page = 1, limit = 2, sortColumn = 'name', sortOrder = 'asc' } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await api.get('/superadmin/locations/paginated', {
        params: { search, page, limit, sortColumn, sortOrder },
      });
      return response.data;
    } catch (error) {
      console.error('Fetch paginated locations error:', error);
      // Use error.message directly since the interceptor transforms it
      return rejectWithValue(error.message || 'Failed to fetch paginated locations');
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
      console.error('Add location error:', error);
      // Use error.message directly since the interceptor transforms it
      return rejectWithValue(error.message || 'Failed to add location');
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
      console.error('Edit location error:', error);
      // Use error.message directly since the interceptor transforms it
      return rejectWithValue(error.message || 'Failed to edit location');
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
      console.error('Delete location error:', error);
      // Use error.message directly since the interceptor transforms it
      return rejectWithValue(error.message || 'Failed to delete location');
    }
  }
);

const initialState = {
  locations: [],
  paginatedLocations: [],
  totalPages: 1,
  currentPage: 1,
  loading: true,
  error: null,
};

const superAdminLocationsSlice = createSlice({
  name: 'superAdminLocations',
  initialState,
  reducers: {
    reset: (state) => {
      state.error = null;
      state.loading = false;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
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
      .addCase(fetchPaginatedLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaginatedLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.paginatedLocations = action.payload.locations || [];
        state.totalPages = action.payload.totalPages || 1;
        state.currentPage = action.payload.currentPage || 1;
      })
      .addCase(fetchPaginatedLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.paginatedLocations = [];
      })
      .addCase(addLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.locations.push(action.payload);
        state.paginatedLocations.push(action.payload);
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
        const paginatedIndex = state.paginatedLocations.findIndex((loc) => loc._id === action.payload._id);
        if (paginatedIndex !== -1) {
          state.paginatedLocations[paginatedIndex] = action.payload;
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
        state.paginatedLocations = state.paginatedLocations.filter((loc) => loc._id !== action.payload);
      })
      .addCase(deleteLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset, setLoading, setCurrentPage } = superAdminLocationsSlice.actions;
export default superAdminLocationsSlice.reducer;
