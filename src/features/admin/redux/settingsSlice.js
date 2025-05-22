import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../utils/api'; // Use authenticated Axios instance

export const fetchSettings = createAsyncThunk(
  'adminSettings/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/settings');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings');
    }
  }
);

export const updateSettings = createAsyncThunk(
  'adminSettings/updateSettings',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.put('/admin/settings', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update settings');
    }
  }
);

export const updateEmployeeLeaves = createAsyncThunk(
  'adminSettings/updateEmployeeLeaves',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/settings/update-leaves');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update employee leaves');
    }
  }
);

const settingsSlice = createSlice({
  name: 'adminSettings',
  initialState: {
    settings: null,
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
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateEmployeeLeaves.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEmployeeLeaves.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateEmployeeLeaves.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = settingsSlice.actions;
export default settingsSlice.reducer;
