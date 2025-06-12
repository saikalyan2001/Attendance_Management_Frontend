import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../utils/api';

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
    loadingFetch: false,
    loadingUpdate: false,
    loadingLeaves: false,
    error: null,
    successUpdate: false,
    successLeaves: false,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
      state.successUpdate = false;
      state.successLeaves = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loadingFetch = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loadingFetch = false;
        state.settings = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loadingFetch = false;
        state.error = action.payload;
      })
      .addCase(updateSettings.pending, (state) => {
        state.loadingUpdate = true;
        state.error = null;
        state.successUpdate = false;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.loadingUpdate = false;
        state.settings = action.payload;
        state.successUpdate = true;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.loadingUpdate = false;
        state.error = action.payload;
        state.successUpdate = false;
      })
      .addCase(updateEmployeeLeaves.pending, (state) => {
        state.loadingLeaves = true;
        state.error = null;
        state.successLeaves = false;
      })
      .addCase(updateEmployeeLeaves.fulfilled, (state, action) => {
        state.loadingLeaves = false;
        state.successLeaves = true;
      })
      .addCase(updateEmployeeLeaves.rejected, (state, action) => {
        state.loadingLeaves = false;
        state.error = action.payload;
        state.successLeaves = false;
      });
  },
});

export const { reset } = settingsSlice.actions;
export default settingsSlice.reducer;
