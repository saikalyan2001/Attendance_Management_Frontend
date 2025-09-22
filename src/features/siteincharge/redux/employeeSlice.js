import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../utils/api';

export const fetchEmployees = createAsyncThunk(
  "siteInchargeEmployee/fetchEmployees",
  async ({ location, status, department, search, page = 1, limit = 10, isDeleted, cache = true }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.auth.token;

      const query = new URLSearchParams();
      if (location && location !== "all") query.set("location", location);
      
      // ✅ Handle status and isDeleted separately (like other slices)
      if (status && status !== "all" && status !== "deleted") {
        query.set("status", status);
      }
      
      // ✅ Handle isDeleted explicitly
      if (isDeleted !== undefined) {
        query.set("isDeleted", isDeleted.toString());
      }
      
      if (department && department !== "all") query.set("department", department);
      if (search) query.set("search", search); // ✅ Add search parameter
      query.set("page", page);
      query.set("limit", limit); // ✅ Add limit parameter

       // For debugging

      const response = await api.get(`/siteincharge/employees?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to fetch employees");
    }
  }
);


export const fetchAllEmployees = createAsyncThunk(
  "siteInchargeEmployee/fetchAllEmployees",
  async ({ location, status, department, search }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.auth.token;

      const query = new URLSearchParams();
      if (location && location !== "all") query.set("location", location);
      
      // ✅ Handle status and isDeleted separately
      if (status && status !== "all" && status !== "deleted") {
        query.set("status", status);
      }
      
      // ✅ Handle isDeleted explicitly
      if (status === "deleted") {
        query.set("isDeleted", "true");
      } else if (status && status !== "all") {
        query.set("isDeleted", "false");
      }
      
      if (department && department !== "all") query.set("department", department);
      if (search) query.set("search", search);
      query.set("limit", 1000);

       // For debugging

      const response = await api.get(`/siteincharge/employees?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data.employees || [];
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to fetch all employees");
    }
  }
);


export const fetchLocations = createAsyncThunk(
  'siteInchargeEmployee/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/siteincharge/locations');
      return response.data.locations;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch locations');
    }
  }
);

export const fetchAllLocations = createAsyncThunk(
  'siteInchargeEmployee/fetchAllLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/locations');
      const locations = response.data || [];
      const invalidLocations = locations.filter(loc => !loc._id || !/^[0-9a-fA-F]{24}$/.test(loc._id));
      if (invalidLocations.length > 0) {
        
      }
      return locations;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch all locations');
    }
  }
);

export const fetchSettings = createAsyncThunk(
  'siteInchargeEmployee/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/siteincharge/settings');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings');
    }
  }
);

export const registerEmployee = createAsyncThunk(
  'siteInchargeEmployee/registerEmployee',
  async ({ employeeData, documents }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Object.keys(employeeData).forEach(key => {
        if (key === 'bankDetails') {
          formData.append(key, JSON.stringify(employeeData[key]));
        } else {
          formData.append(key, employeeData[key]);
        }
      });
      documents.forEach((file) => {
        formData.append('documents', file);
      });

      const response = await api.post('/siteincharge/employees/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { 
          message: error.message || "Failed to register employee" 
        });
    }
  }
);

export const getEmployee = createAsyncThunk(
  'siteInchargeEmployee/getEmployee',
  async ({ id, month, year, documentsPage = 1, documentsLimit = 10, advancesPage = 1, advancesLimit = 5 }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      if (month) query.set('month', month);
      if (year) query.set('year', year);
      query.set('documentsPage', documentsPage);
      query.set('documentsLimit', documentsLimit);
      query.set('advancesPage', advancesPage);
      query.set('advancesLimit', advancesLimit);

      const response = await api.get(`/siteincharge/employees/${id}?${query.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return response.data.employee;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employee');
    }
  }
);

export const editEmployee = createAsyncThunk(
  'siteInchargeEmployee/editEmployee',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/siteincharge/employees/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to edit employee');
    }
  }
);

export const transferEmployee = createAsyncThunk(
  'siteInchargeEmployee/transferEmployee',
  async ({ id, location }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/siteincharge/employees/${id}/transfer`, { location });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || 'Failed to transfer employee');
    }
  }
);

export const uploadDocument = createAsyncThunk(
  'siteInchargeEmployee/addEmployeeDocuments',
  async ({ id, documents }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      documents.forEach((doc) => {
        formData.append('documents', doc.file);
      });

      const response = await api.post(`/siteincharge/employees/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add employee documents');
    }
  }
);

export const fetchEmployeeAttendance = createAsyncThunk(
  'siteInchargeEmployee/fetchEmployeeAttendance',
  async ({ employeeId, month, year, page = 1, limit = 10, sortField = 'date', sortOrder = 'desc' }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      query.set('month', month);
      query.set('year', year);
      query.set('page', page);
      query.set('limit', limit);
      query.set('sortField', sortField);
      query.set('sortOrder', sortOrder);

      const response = await api.get(`/siteincharge/employees/${employeeId}/attendance?${query.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      

      return {
        attendance: response.data.attendance || [],
        pagination: response.data.pagination || { total: 0, page: 1, limit, totalPages: 1 },
      };
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employee attendance');
    }
  }
);

export const deactivateEmployee = createAsyncThunk(
  'siteInchargeEmployee/deactivateEmployee',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.put(`/siteincharge/employees/${id}/deactivate`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to deactivate employee');
    }
  }
);

export const rejoinEmployee = createAsyncThunk(
  'siteInchargeEmployee/rejoinEmployee',
  async ({ id, rejoinDate }, { rejectWithValue }) => {
    try {
      const formattedRejoinDate = new Date(rejoinDate).toISOString();
      const response = await api.put(`/siteincharge/employees/${id}/rejoin`, { rejoinDate: formattedRejoinDate });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to rejoin employee';
      return rejectWithValue(errorMessage);
    }
  }
);

export const getEmployeeHistory = createAsyncThunk(
  'siteInchargeEmployee/getEmployeeHistory',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/siteincharge/employees/${id}/history`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employee history');
    }
  }
);

export const updateEmployeeAdvance = createAsyncThunk(
  'siteInchargeEmployee/updateEmployeeAdvance',
  async ({ id, advance, month, year }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/siteincharge/employees/${id}/advance`, { advance, month, year });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || 'Failed to update employee advance');
    }
  }
);

export const importEmployees = createAsyncThunk(
  'siteInchargeEmployee/importEmployees',
  async ({ excelFile }, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const token = state.auth.token;

      if (!(excelFile instanceof File)) {
        
        throw new Error('No valid Excel file provided');
      }
            
      const formData = new FormData();
      formData.append('excelFile', excelFile);
      
      const response = await api.post('/siteincharge/employees/importEmployees', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
      });
      return response.data;
    } catch (error) {
            return rejectWithValue(
        error.response?.data || { message: error.message || 'Failed to import employees from Excel' }
      );
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  'siteInchargeEmployee/deleteEmployee',
  async (id, { rejectWithValue }) => {
    try {
      
      const response = await api.delete(`/siteincharge/employees/${id}/delete`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return { id, message: response.data.message };
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to delete employee");
    }
  }
);

export const restoreEmployee = createAsyncThunk(
  'siteInchargeEmployee/restoreEmployee',
  async (id, { rejectWithValue }) => {
    try {
      
      const response = await api.put(`/siteincharge/employees/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to restore employee");
    }
  }
);

// ✅ ADD: After your existing imports at the top
export const fetchEmployeeSalary = createAsyncThunk(
  'siteInchargeEmployee/fetchEmployeeSalary',
  async ({ employeeId, year, month }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/siteincharge/employees/${employeeId}/salary/${year}/${month}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch salary data");
    }
  }
);

// ✅ ADD: Payroll summary action
export const fetchPayrollSummary = createAsyncThunk(
  'siteInchargeEmployee/fetchPayrollSummary', 
  async ({ year, month, location }, { rejectWithValue }) => {
    try {
      const params = { year, month };
      if (location && location !== 'all') params.location = location;
      
      const response = await api.get(`/siteincharge/payroll/${year}/${month}`, { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch payroll data");
    }
  }
);

// ✅ ADD: Force refresh action (like admin/superadmin)
export const forceRefreshEmployees = createAsyncThunk(
  'siteInchargeEmployee/forceRefreshEmployees',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      
      const result = await dispatch(fetchEmployees({
        ...params,
        _cacheBuster: Date.now() // Force fresh data
      })).unwrap();
      return result;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);


const employeeSlice = createSlice({
  name: 'siteInchargeEmployee',
  initialState: {
    employees: [],
    allEmployees: [],
    employee: null,
    history: null,
    attendance: [],
    attendancePagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    locations: [],
    allLocations: [],
    settings: null,
     salaryData: null,
  payrollSummary: null,
  salaryLoading: false,
  salaryError: null,
    loading: false,
    error: null,
    errorType: null, 
    success: false,
    successType: null,
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
    lastUpdated: null,
  attendanceUpdateTrigger: 0,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
      state.success = false;
      state.successType = null;
      state.employee = null;
      state.history = null;
      state.attendance = [];
      state.attendancePagination = { total: 0, page: 1, limit: 10, totalPages: 1 };
    },
    // ✅ NEW: Clear success state
  clearSuccess: (state) => {
    state.success = false;
    state.successType = null;
  },
  
  // ✅ NEW: Set last updated timestamp
  setLastUpdated: (state) => {
    state.lastUpdated = Date.now();
  },
  
  // ✅ NEW: Set attendance update trigger
  setAttendanceUpdateTrigger: (state) => {
    state.attendanceUpdateTrigger = Date.now();
  },
  
  // ✅ NEW: Update individual employee data
  updateEmployeeInList: (state, action) => {
    const updatedEmployee = action.payload;
    const index = state.employees.findIndex(emp => emp._id === updatedEmployee._id);
    const allIndex = state.allEmployees.findIndex(emp => emp._id === updatedEmployee._id);

    if (index !== -1) {
      state.employees[index] = {
        ...state.employees[index],
        ...updatedEmployee,
        paidLeaves: updatedEmployee.paidLeaves,
        monthlyLeaves: updatedEmployee.monthlyLeaves
      };
    }
    if (allIndex !== -1) {
      state.allEmployees[allIndex] = {
        ...state.allEmployees[allIndex],
        ...updatedEmployee
      };
    }
    if (state.employee?._id === updatedEmployee._id) {
      state.employee = {
        ...state.employee,
        ...updatedEmployee
      };
    }
},

    
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => { 
        state.loading = false; 
        state.employees = (action.payload.employees || []).filter(emp => emp && typeof emp === 'object' && emp._id); 
        state.pagination = action.payload.pagination || {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 1,
        };
        
      })
      .addCase(fetchEmployees.rejected, (state, action) => { 
        state.loading = false; 
        state.error = action.payload; 
        
      })
      .addCase(fetchAllEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllEmployees.fulfilled, (state, action) => { 
        state.loading = false; 
        state.allEmployees = (action.payload || []).filter(emp => emp && typeof emp === 'object' && emp._id); 
        
      })
      .addCase(fetchAllEmployees.rejected, (state, action) => { 
        state.loading = false; 
        state.error = action.payload; 
        
      })
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = (action.payload || []).filter(loc => loc && typeof loc === 'object' && loc._id);
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAllLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.allLocations = (action.payload || []).filter(loc => loc && typeof loc === 'object' && loc._id);
      })
      .addCase(fetchAllLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
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
      .addCase(registerEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorType = null; 
        state.success = false;
        state.successType = null;
      })
      .addCase(registerEmployee.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload && typeof action.payload === 'object' && action.payload._id) {
          state.employees.push(action.payload);
          state.allEmployees.push(action.payload);
        }
        state.success = true;
        state.successType = 'single';
      })
      .addCase(registerEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.errorType = "single"; 
        state.success = false;
        state.successType = null;
      })
      .addCase(getEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.employee = action.payload;
      })
      .addCase(getEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(editEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(editEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.employees.findIndex((emp) => emp && emp._id === action.payload._id);
        const allIndex = state.allEmployees.findIndex((emp) => emp && emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        if (allIndex !== -1) state.allEmployees[allIndex] = action.payload;
        if (state.employee && state.employee._id === action.payload._id) state.employee = action.payload;
      })
      .addCase(editEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(transferEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(transferEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.employees.findIndex((emp) => emp && emp._id === action.payload._id);
        const allIndex = state.allEmployees.findIndex((emp) => emp && emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        if (allIndex !== -1) state.allEmployees[allIndex] = action.payload;
        if (state.employee && state.employee._id === action.payload._id) state.employee = action.payload;
      })
      .addCase(transferEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(uploadDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.employees.findIndex((emp) => emp && emp._id === action.payload._id);
        const allIndex = state.allEmployees.findIndex((emp) => emp && emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        if (allIndex !== -1) state.allEmployees[allIndex] = action.payload;
        if (state.employee && state.employee._id === action.payload._id) state.employee = action.payload;
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(fetchEmployeeAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance = action.payload.attendance || [];
        state.attendancePagination = action.payload.pagination;
        
      })
      .addCase(fetchEmployeeAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.attendance = [];
        state.attendancePagination = { total: 0, page: 1, limit: 10, totalPages: 1 };
        
      })
      .addCase(deactivateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(deactivateEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.employees.findIndex((emp) => emp && emp._id === action.payload._id);
        const allIndex = state.allEmployees.findIndex((emp) => emp && emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        if (allIndex !== -1) state.allEmployees[allIndex] = action.payload;
        if (state.employee && state.employee._id === action.payload._id) state.employee = action.payload;
      })
      .addCase(deactivateEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(rejoinEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(rejoinEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.employees.findIndex((emp) => emp && emp._id === action.payload._id);
        const allIndex = state.allEmployees.findIndex((emp) => emp && emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        else state.employees.push(action.payload);
        if (allIndex !== -1) state.allEmployees[allIndex] = action.payload;
        else state.allEmployees.push(action.payload);
        if (state.employee && state.employee._id === action.payload._id) state.employee = action.payload;
      })
      .addCase(rejoinEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(getEmployeeHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployeeHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload;
      })
      .addCase(getEmployeeHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateEmployeeAdvance.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateEmployeeAdvance.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.employees.findIndex((emp) => emp && emp._id === action.payload._id);
        const allIndex = state.allEmployees.findIndex((emp) => emp && emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
        if (allIndex !== -1) state.allEmployees[allIndex] = action.payload;
        if (state.employee && state.employee._id === action.payload._id) state.employee = action.payload;
      })
      .addCase(updateEmployeeAdvance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(importEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorType = null;
        state.success = false;
        state.successType = null;
      })
      .addCase(importEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successType = 'excel';
        const newEmployees = (action.payload.employees || []).filter(
          (emp) => emp && typeof emp === 'object' && emp._id
        );
        state.employees = [...state.employees, ...newEmployees];
        state.allEmployees = [...state.allEmployees, ...newEmployees];
        state.pagination.total += newEmployees.length;
              })
      .addCase(importEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.errorType = "excel";
        state.success = false;
        state.successType = null;
        
      })
      .addCase(deleteEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const deletedId = action.payload.id;
        state.employees = state.employees.map((employee) =>
          employee._id === deletedId ? { ...employee, isDeleted: true } : employee
        );
        state.allEmployees = state.allEmployees.map((employee) =>
          employee._id === deletedId ? { ...employee, isDeleted: true } : employee
        );
        if (state.employee && state.employee._id === deletedId) {
          state.employee = null;
        }
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(restoreEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(restoreEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.employees.findIndex(
          (emp) => emp && emp._id === action.payload.employee._id
        );
        const allIndex = state.allEmployees.findIndex(
          (emp) => emp && emp._id === action.payload.employee._id
        );
        if (index !== -1) {
          state.employees[index] = action.payload.employee;
        } else {
          state.employees.push(action.payload.employee);
        }
        if (allIndex !== -1) {
          state.allEmployees[allIndex] = action.payload.employee;
        } else {
          state.allEmployees.push(action.payload.employee);
        }
        if (state.employee && state.employee._id === action.payload.employee._id) {
          state.employee = action.payload.employee;
        }
      })
      .addCase(restoreEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      // ✅ ADD: At the end of your extraReducers, before the closing
.addCase(fetchEmployeeSalary.pending, (state) => {
  state.salaryLoading = true;
  state.salaryError = null;
})
.addCase(fetchEmployeeSalary.fulfilled, (state, action) => {
  state.salaryLoading = false;
  state.salaryData = action.payload;
})
.addCase(fetchEmployeeSalary.rejected, (state, action) => {
  state.salaryLoading = false;
  state.salaryError = action.payload;
})
.addCase(fetchPayrollSummary.pending, (state) => {
  state.salaryLoading = true;
  state.salaryError = null;
})
.addCase(fetchPayrollSummary.fulfilled, (state, action) => {
  state.salaryLoading = false;
  state.payrollSummary = action.payload;
})
.addCase(fetchPayrollSummary.rejected, (state, action) => {
  state.salaryLoading = false;
  state.salaryError = action.payload;
})
.addCase(forceRefreshEmployees.fulfilled, (state, action) => {
  state.employees = action.payload.employees || [];
  state.pagination = action.payload.pagination || state.pagination;
  state.lastUpdated = Date.now();
  
})
  },
});

export const { reset, clearSuccess, setLastUpdated, setAttendanceUpdateTrigger, updateEmployeeInList } = employeeSlice.actions;
export default employeeSlice.reducer;