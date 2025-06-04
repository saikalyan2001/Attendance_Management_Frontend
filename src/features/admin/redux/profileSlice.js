import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../utils/api';

export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/profile');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'profile/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.put('/admin/profile', profileData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
    }
  }
);

export const updatePassword = createAsyncThunk(
  'profile/updatePassword',
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await api.put('/admin/profile/password', { currentPassword, newPassword });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update password');
    }
  }
);

export const uploadProfilePicture = createAsyncThunk(
  'profile/uploadProfilePicture',
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      const response = await api.post('/admin/profile/picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload profile picture');
    }
  }
);

export const deleteProfilePicture = createAsyncThunk(
  'profile/deleteProfilePicture',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.delete('/admin/profile/picture');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete profile picture');
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    profile: null,
    loading: false,
    loadingProfile: false,
    loadingPassword: false,
    loadingPicture: false,
    error: null,
    success: false,
    successProfile: false,
    successPassword: false,
    successPicture: false,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
      state.success = false;
      state.successProfile = false;
      state.successPassword = false;
      state.successPicture = false;
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
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateProfile.pending, (state) => {
        state.loadingProfile = true;
        state.error = null;
        state.successProfile = false;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loadingProfile = false;
        state.profile = action.payload;
        state.successProfile = true;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loadingProfile = false;
        state.error = action.payload;
        state.successProfile = false;
      })
      .addCase(updatePassword.pending, (state) => {
        state.loadingPassword = true;
        state.error = null;
        state.successPassword = false;
      })
      .addCase(updatePassword.fulfilled, (state, action) => {
        state.loadingPassword = false;
        state.successPassword = true;
      })
      .addCase(updatePassword.rejected, (state, action) => {
        state.loadingPassword = false;
        state.error = action.payload;
        state.successPassword = false;
      })
      .addCase(uploadProfilePicture.pending, (state) => {
        state.loadingPicture = true;
        state.error = null;
        state.successPicture = false;
      })
      .addCase(uploadProfilePicture.fulfilled, (state, action) => {
        state.loadingPicture = false;
        state.profile = action.payload;
        state.successPicture = true;
      })
      .addCase(uploadProfilePicture.rejected, (state, action) => {
        state.loadingPicture = false;
        state.error = action.payload;
        state.successPicture = false;
      })
      .addCase(deleteProfilePicture.pending, (state) => {
        state.loadingPicture = true;
        state.error = null;
        state.successPicture = false;
      })
      .addCase(deleteProfilePicture.fulfilled, (state, action) => {
        state.loadingPicture = false;
        state.profile = action.payload;
        state.successPicture = true;
      })
      .addCase(deleteProfilePicture.rejected, (state, action) => {
        state.loadingPicture = false;
        state.error = action.payload;
        state.successPicture = false;
      });
  },
});

export const { reset } = profileSlice.actions;
export default profileSlice.reducer;