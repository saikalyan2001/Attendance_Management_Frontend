import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../utils/api';

export const fetchLocations = createAsyncThunk(
  'adminLocations/fetchLocations',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const isAdmin = auth.user?.role === 'admin';
      const endpoint = isAdmin ? '/admin/locations' : '/auth/locations';
      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.message || 'Failed to fetch locations');
    }
  }
);

export const fetchPaginatedLocations = createAsyncThunk(
  'adminLocations/fetchPaginatedLocations',
  async (
    { search = '', page = 1, limit = 2, sortColumn = 'name', sortOrder = 'asc' } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await api.get('/admin/locations/paginated', {
        params: { search, page, limit, sortColumn, sortOrder },
      });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.message || 'Failed to fetch paginated locations');
    }
  }
);

export const addLocation = createAsyncThunk(
  'adminLocations/addLocation',
  async ({ name, address, city, state }, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/locations', { name, address, city, state });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.message || 'Failed to add location');
    }
  }
);

export const editLocation = createAsyncThunk(
  'adminLocations/editLocation',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/locations/${id}`, data);
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.message || 'Failed to edit location');
    }
  }
);

export const deleteLocation = createAsyncThunk(
  'adminLocations/deleteLocation',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/locations/${id}`);
      return id;
    } catch (error) {
      
      return rejectWithValue(error.message || 'Failed to delete location');
    }
  }
);

const locationsSlice = createSlice({
  name: 'adminLocations',
  initialState: {
    locations: [],
    paginatedLocations: [],
    totalPages: 1,
    currentPage: 1,
    loading: true, // ✅ FIXED: Start with loading true to show skeleton initially
    error: null,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
      state.loading = false;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    // ✅ ADDED: Manual loading control
    setLoading: (state, action) => {
      state.loading = action.payload;
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
      // ✅ ENHANCED: Better loading state management for CRUD operations
      .addCase(addLocation.pending, (state) => {
        // Don't set global loading for add operations
        state.error = null;
      })
      .addCase(addLocation.fulfilled, (state, action) => {
        state.locations.push(action.payload);
        // Only add to paginated if it fits current page/search criteria
        if (state.paginatedLocations.length < 2) {
          state.paginatedLocations.push(action.payload);
        }
      })
      .addCase(addLocation.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(editLocation.pending, (state) => {
        // Don't set global loading for edit operations
        state.error = null;
      })
      .addCase(editLocation.fulfilled, (state, action) => {
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
        state.error = action.payload;
      })
      .addCase(deleteLocation.pending, (state) => {
        // Don't set global loading for delete operations
        state.error = null;
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.locations = state.locations.filter((loc) => loc._id !== action.payload);
        state.paginatedLocations = state.paginatedLocations.filter((loc) => loc._id !== action.payload);
      })
      .addCase(deleteLocation.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { reset, setCurrentPage, setLoading } = locationsSlice.actions;
export default locationsSlice.reducer;
