import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password, role }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email, password, role });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      return user;
    } catch (error) {
      console.log('Login error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || 'Login failed';
      console.log('Backend error message:', errorMessage);
      if (
        errorMessage &&
        (errorMessage.includes('Role does not match') ||
          errorMessage.includes('Invalid role') ||
          (errorMessage.includes('Invalid email or role') && email && password))
      ) {
        return rejectWithValue('Invalid role or Invalid email');
      }
      if (
        errorMessage &&
        (errorMessage.includes('User not found') ||
          errorMessage.includes('Invalid email') ||
          errorMessage.includes('Invalid password') ||
          errorMessage.includes('Invalid credentials') ||
          errorMessage.includes('Invalid email or role'))
      ) {
        return rejectWithValue('Invalid email or password');
      }
      return rejectWithValue(errorMessage);
    }
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async ({ email, password, name, phone, role, locations }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/signup', { email, password, name, phone, role, locations });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      return user;
    } catch (error) {
      console.log('Signup error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Signup failed');
    }
  }
);

export const createUserBySuperAdmin = createAsyncThunk(
  'auth/createUserBySuperAdmin',
  async ({ email, password, name, phone, role, locations }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/signup', { email, password, name, phone, role, locations });
      return response.data.user; // Return only user data, no token storage
    } catch (error) {
      console.log('createUserBySuperAdmin error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to create user');
    }
  }
);

export const createSiteIncharge = createAsyncThunk(
  'auth/createSiteIncharge',
  async ({ email, password, name, phone, locations }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/signup', {
        email,
        password,
        name,
        phone,
        role: 'siteincharge',
        locations,
      });
      return response.data.user;
    } catch (error) {
      console.log('createSiteIncharge error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to create site incharge');
    }
  }
);

export const createSuperAdmin = createAsyncThunk(
  'auth/createSuperAdmin',
  async ({ email, password, name, phone, locations }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/create-superadmin', {
        email,
        password,
        name,
        phone,
        role: 'super_admin',
        locations,
      });
      return response.data.user;
    } catch (error) {
      console.log('createSuperAdmin error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Failed to create super admin');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      return null;
    } catch (error) {
      console.log('Logout error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || 'Logout failed');
    }
  }
);

export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('FetchMe error:', error.response?.data || error.message);
      localStorage.removeItem('token');
      return rejectWithValue(null);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: false,
    isLoading: true,
    error: null,
    locations: [],
  },
  reducers: {
    resetError: (state) => {
      state.error = null;
    },
    setLoading: (state) => {
      state.isLoading = true;
    },
    resetForm: (state) => {
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createUserBySuperAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUserBySuperAdmin.fulfilled, (state) => {
        state.loading = false;
        state.isLoading = false;
      })
      .addCase(createUserBySuperAdmin.rejected, (state, action) => {
        state.loading = false;
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createSiteIncharge.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSiteIncharge.fulfilled, (state) => {
        state.loading = false;
        state.isLoading = false;
      })
      .addCase(createSiteIncharge.rejected, (state, action) => {
        state.loading = false;
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createSuperAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSuperAdmin.fulfilled, (state) => {
        state.loading = false;
        state.isLoading = false;
      })
      .addCase(createSuperAdmin.rejected, (state, action) => {
        state.loading = false;
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(logout.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.isLoading = false;
        state.user = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.loading = false;
        state.isLoading = false;
        state.user = null;
        state.error = action.payload;
      });
  },
});

export const { resetError, setLoading, resetForm } = authSlice.actions;
export default authSlice.reducer;