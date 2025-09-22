// File: src/features/superadmin/redux/superadminEmployeeSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../utils/api";
import { fetchLocations } from "../redux/locationsSlice";

export const fetchEmployees = createAsyncThunk(
  "superadminEmployees/fetchEmployees",
  async (
    { location, status, department, search, month, year, page = 1, limit = 10, isDeleted },
    { rejectWithValue }
  ) => {
    try {
      const params = {};
      if (location && location !== "all") params.location = location;
      
      if (status && status !== "all" && status !== "deleted") {
        params.status = status;
      }
      
      if (isDeleted !== undefined) {
        params.isDeleted = isDeleted;
      }
      
      if (department && department !== "all") params.department = department;
      if (search) params.search = search;
      if (month) params.month = month;
      if (year) params.year = year;
      if (page) params.page = page;
      if (limit) params.limit = limit;
      
      const response = await api.get("/superadmin/employees", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch employees"
      );
    }
  }
);

export const fetchEmployeeById = createAsyncThunk(
  "superadminEmployees/fetchEmployeeById",
  async (arg, { rejectWithValue }) => {
    try {
      const employeeId = typeof arg === "string" ? arg : arg.id;
      if (!employeeId) {
        throw new Error("No employee ID provided");
      }
      const id = String(employeeId);
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new Error("Invalid employee ID format");
      }
      
      // ✅ ENHANCED: Add cache busting for fresh employee data
      const params = { _cacheBuster: Date.now() };
      const response = await api.get(`/superadmin/employees/${id}`, { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || {
          message: error.message || "Failed to fetch employee",
        }
      );
    }
  }
);

export const updateEmployeeAdvance = createAsyncThunk(
  "superadminEmployees/updateEmployeeAdvance",
  async ({ id, advance, year, month }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/superadmin/employees/${id}/advance`, {
        advance,
        year,
        month,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update employee advance"
      );
    }
  }
);

export const fetchEmployeeAdvances = createAsyncThunk(
  "superadminEmployees/fetchEmployeeAdvances",
  async (
    { id, page, limit, sortField = "year", sortOrder = "desc" },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.get(`/superadmin/employees/${id}/advances`, {
        params: { page, limit, sortField, sortOrder },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch employee advances"
      );
    }
  }
);

export const fetchMonthlyLeaves = createAsyncThunk(
  "superadminEmployees/fetchMonthlyLeaves",
  async ({ month, year, location, status }, { rejectWithValue }) => {
    try {
      const params = { month, year };
      if (location && location !== "all") params.location = location;
      if (status && status !== "all") params.status = status;
      const response = await api.get("/superadmin/employees/leaves", {
        params,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch monthly leaves"
      );
    }
  }
);

export const registerEmployee = createAsyncThunk(
  "superadminEmployees/registerEmployee",
  async ({ employeeData, documents }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Object.entries(employeeData).forEach(([key, value]) => {
        if (key === "paidLeaves" || key === "bankDetails") {
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined) {
          formData.append(key, value);
        }
      });
      documents.forEach((doc) => {
        if (doc.file instanceof File) {
          formData.append("documents", doc.file, doc.file.name);
        }
      });
      const response = await api.post("/superadmin/employees", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to register employee" 
      );
    }
  }
);

// ✅ ENHANCED: Update employee with proper leave calculation handling
export const updateEmployee = createAsyncThunk(
  "superadminEmployees/updateEmployee",
  async ({ id, data }, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.put(`/superadmin/employees/${id}`, data);
      
      // ✅ ENHANCED: Force refresh employee data after update to get latest leave calculations
      
      await dispatch(fetchEmployeeById(id));
      
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update employee"
      );
    }
  }
);

export const deactivateEmployee = createAsyncThunk(
  "superadminEmployees/deactivateEmployee",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.put(`/superadmin/employees/${id}/deactivate`);
      return { id, message: response.data.message };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to deactivate employee"
      );
    }
  }
);

export const transferEmployee = createAsyncThunk(
  "superadminEmployees/transferEmployee",
  async ({ id, locationId, transferTimestamp }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/superadmin/employees/${id}/transfer`, {
        location: locationId,
        transferTimestamp,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to transfer employee"
      );
    }
  }
);

export const rejoinEmployee = createAsyncThunk(
  "superadminEmployees/rejoinEmployee",
  async ({ id, rejoinDate }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/superadmin/employees/${id}/rejoin`, {
        rejoinDate,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to rejoin employee"
      );
    }
  }
);

export const getEmployeeHistory = createAsyncThunk(
  "superadminEmployees/getEmployeeHistory",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/superadmin/employees/${id}/history`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch employee history"
      );
    }
  }
);

export const addEmployeeDocuments = createAsyncThunk(
  "superadminEmployees/addEmployeeDocuments",
  async ({ id, documents, page, limit }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      documents.forEach((doc) => {
        if (doc.file instanceof File) {
          formData.append("documents", doc.file, doc.file.name);
        }
      });
      const response = await api.post(
        `/superadmin/employees/${id}/documents`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          params: { page, limit },
        }
      );
      return {
        documents: response.data.employee.documents || [],
        pagination: response.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
        },
        employee: response.data.employee,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to add employee documents" }
      );
    }
  }
);

export const fetchEmployeeAttendance = createAsyncThunk(
  "superadminEmployees/fetchEmployeeAttendance",
  async (
    { employeeId, month, year, page = 1, limit = 10 },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.get(
        `/superadmin/employees/${employeeId}/attendance`,
        {
          params: { month, year, page, limit },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch employee attendance"
      );
    }
  }
);

export const fetchSettings = createAsyncThunk(
  "superadminEmployees/fetchSettings",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/superadmin/employees/settings");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch settings"
      );
    }
  }
);

export const registerEmployeesFromExcel = createAsyncThunk(
  "superadminEmployees/registerEmployeesFromExcel",
  async ({ excelFile }, { rejectWithValue }) => {
    try {
      if (!(excelFile instanceof File)) {
        throw new Error("No valid Excel file provided");
      }
      const formData = new FormData();
      formData.append("excelFile", excelFile, excelFile.name);
      const response = await api.post("/superadmin/employees/excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || {
          message: error.message || "Failed to register employees from Excel",
        }
      );
    }
  }
);

export const fetchDepartments = createAsyncThunk(
  "superadminEmployees/fetchDepartments",
  async ({ location } = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (location && location !== "all") params.location = location;
      const response = await api.get("/superadmin/employees/departments", {
        params,
      });
      return response.data.departments;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch departments"
      );
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  "superadminEmployees/deleteEmployee",
  async (id, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.delete(`/superadmin/employees/${id}`);
      await dispatch(fetchLocations()).unwrap();
      return { id, message: response.data.message };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete employee"
      );
    }
  }
);

export const restoreEmployee = createAsyncThunk(
  "superadminEmployees/restoreEmployee",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.put(`/superadmin/employees/${id}/restore`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to restore employee"
      );
    }
  }
);

export const fetchEmployeeDocuments = createAsyncThunk(
  "superadminEmployees/fetchEmployeeDocuments",
  async ({ id, page, limit, searchQuery = "" }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/superadmin/employees/${id}/documents`, {
        params: { page, limit, searchQuery },
      });
      return {
        documents: response.data.employee.documents || [],
        pagination: response.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
        },
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch employee documents"
      );
    }
  }
);

// ✅ ENHANCED: Force refresh with cache busting
export const forceRefreshEmployees = createAsyncThunk(
  "superadminEmployees/forceRefreshEmployees",
  async (params, { dispatch, rejectWithValue }) => {
    try {
      
      const result = await dispatch(fetchEmployees({
        ...params,
        page: 1,          
        limit: 1000,    
        _cacheBuster: Date.now()
      })).unwrap();
      return result;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const superadminEmployeeSlice = createSlice({
  name: "superadminEmployees",
  initialState: {
    finalizationStatus: {}, 
    employees: [],
    monthlyLeaves: [],
    currentEmployee: null,
    history: null,
    documents: [],
    documentsPagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 5,
    },
    attendance: [],
    attendancePagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
    },
    advances: [],
    settings: null,
    departments: [],
    loading: false,
    error: null,
    errorType: null,
    success: false,
    successType: null,
    successMessage: null,
    lastUpdated: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
    },
    advancesPagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 5,
      sortField: "year",
      sortOrder: "desc",
    },
    attendanceUpdateTrigger: 0,
  },
  reducers: {
    setEmployees: (state, action) => {
      const newEmployees = action.payload;
      const employeeMap = new Map(state.employees.map((emp) => [emp._id, emp]));
      newEmployees.forEach((newEmp) => {
        if (employeeMap.has(newEmp._id)) {
          const existingEmp = employeeMap.get(newEmp._id);
          const mergedLeaves = [
            ...new Map(
              [
                ...(existingEmp.monthlyLeaves || []),
                ...(newEmp.monthlyLeaves || []),
              ].map((ml) => [`${ml.year}-${ml.month}`, ml])
            ).values(),
          ];
          employeeMap.set(newEmp._id, {
            ...existingEmp,
            ...newEmp,
            monthlyLeaves: mergedLeaves,
          });
        } else {
          employeeMap.set(newEmp._id, { ...newEmp });
        }
      });
      state.employees = Array.from(employeeMap.values());
      state.pagination.totalItems = state.employees.length;
      state.pagination.totalPages = Math.ceil(
        state.employees.length / state.pagination.itemsPerPage
      );
    },
    reset: (state) => {
      state.error = null;
      state.errorType = null;
      state.loading = false;
      state.success = false;
      state.successType = null;
      state.successMessage = null;
      state.currentEmployee = null;
      state.history = null;
      state.attendance = [];
      state.attendancePagination = {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
      };
      state.advances = [];
      state.advancesPagination = {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 5,
        sortField: "year",
        sortOrder: "desc",
      };
      state.monthlyLeaves = [];
    },
    clearSuccess: (state) => {
      state.success = false;
      state.successType = null;
      state.successMessage = null;
    },
    setLastUpdated: (state) => {
      state.lastUpdated = Date.now();
    },
    setAttendanceUpdateTrigger: (state) => {
      state.attendanceUpdateTrigger = Date.now();
    },
    // ✅ ENHANCED: Update individual employee with proper leave data merging
    updateEmployeeInList: (state, action) => {
      const updatedEmployee = action.payload;
      const index = state.employees.findIndex(emp => emp._id === updatedEmployee._id);
      if (index !== -1) {
        ('🔄 Updating employee in list with fresh data:', {
          employeeId: updatedEmployee.employeeId,
          oldUsed: state.employees[index].paidLeaves?.used,
          newUsed: updatedEmployee.paidLeaves?.used,
          oldAvailable: state.employees[index].paidLeaves?.available,
          newAvailable: updatedEmployee.paidLeaves?.available
        });
        
        state.employees[index] = {
          ...state.employees[index],
          ...updatedEmployee,
          paidLeaves: updatedEmployee.paidLeaves,
          monthlyLeaves: updatedEmployee.monthlyLeaves
        };
      }
      if (state.currentEmployee?._id === updatedEmployee._id) {
        
        state.currentEmployee = {
          ...state.currentEmployee,
          ...updatedEmployee
        };
      }
    },
     updateFinalizationStatus: (state, action) => {
      const { employeeId, year, month, isFinalized, finalizedAt } = action.payload;
      const key = `${employeeId}-${year}-${month}`;
      state.finalizationStatus[key] = { isFinalized, finalizedAt };
      
      // Update employee in list if it exists
      const employeeIndex = state.employees.findIndex(emp => emp._id === employeeId);
      if (employeeIndex !== -1) {
        const monthlyLeaveIndex = state.employees[employeeIndex].monthlyLeaves?.findIndex(
          ml => ml.year === year && ml.month === month
        );
        if (monthlyLeaveIndex !== -1) {
          state.employees[employeeIndex].monthlyLeaves[monthlyLeaveIndex].isFinalized = isFinalized;
          state.employees[employeeIndex].monthlyLeaves[monthlyLeaveIndex].finalizedAt = finalizedAt;
        }
      }
      
      // Update current employee if it matches
      if (state.currentEmployee?._id === employeeId) {
        const currentMonthlyLeaveIndex = state.currentEmployee.monthlyLeaves?.findIndex(
          ml => ml.year === year && ml.month === month
        );
        if (currentMonthlyLeaveIndex !== -1) {
          state.currentEmployee.monthlyLeaves[currentMonthlyLeaveIndex].isFinalized = isFinalized;
          state.currentEmployee.monthlyLeaves[currentMonthlyLeaveIndex].finalizedAt = finalizedAt;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
.addCase(forceRefreshEmployees.fulfilled, (state, action) => {

  
  state.employees = action.payload.employees || [];
  state.pagination = action.payload.pagination || state.pagination;
  state.lastUpdated = Date.now();
  
  // ✅ Log sample employee data for debugging
  if (action.payload.employees?.length > 0) {
    const sampleEmployee = action.payload.employees[0];
   
  }
})

      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload.employees || [];
        state.pagination = action.payload.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10,
        };
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.employees = [];
        state.pagination = {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10,
        };
      })
      .addCase(fetchMonthlyLeaves.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyLeaves.fulfilled, (state, action) => {
        state.loading = false;
        state.monthlyLeaves = action.payload || [];
      })
      .addCase(fetchMonthlyLeaves.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.monthlyLeaves = [];
      })
      .addCase(fetchEmployeeById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentEmployee = null;
      })
      // ✅ ENHANCED: Handle fetchEmployeeById with proper logging
      .addCase(fetchEmployeeById.fulfilled, (state, action) => {
        ('✅ fetchEmployeeById.fulfilled - Fresh employee data received:', {
          employeeId: action.payload.employeeId,
          available: action.payload.paidLeaves?.available,
          used: action.payload.paidLeaves?.used,
          monthlyLeavesCount: action.payload.monthlyLeaves?.length || 0
        });
        
        state.loading = false;
        state.currentEmployee = { ...action.payload };
        
        // ✅ Also update the employee in the list if it exists
        const index = state.employees.findIndex(emp => emp._id === action.payload._id);
        if (index !== -1) {
          
          state.employees[index] = { ...action.payload };
        }
      })
      .addCase(fetchEmployeeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.currentEmployee = null;
      })
      .addCase(registerEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(registerEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.employees.push(action.payload);
        state.success = true;
        state.successType = "single";
        state.successMessage = "Employee registered successfully";
      })
      .addCase(registerEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.errorType = "single";
        state.success = false;
      })
      .addCase(updateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      // ✅ ENHANCED: Handle updateEmployee.fulfilled with proper data flow
      .addCase(updateEmployee.fulfilled, (state, action) => {
        ('✅ updateEmployee.fulfilled - Employee updated:', {
          employeeId: action.payload.employeeId,
          available: action.payload.paidLeaves?.available,
          used: action.payload.paidLeaves?.used
        });
        
        state.loading = false;
        state.success = true;
        state.successMessage = "Employee updated successfully";
        state.lastUpdated = Date.now();
        
        // ✅ Update employee in list
        const index = state.employees.findIndex(
          (emp) => emp._id === action.payload._id
        );
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
        
        // ✅ Update currentEmployee if it's the same
        if (state.currentEmployee?._id === action.payload._id) {
          state.currentEmployee = action.payload;
        }
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(updateEmployeeAdvance.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(updateEmployeeAdvance.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successMessage = "Employee advance updated successfully";
        const index = state.employees.findIndex(
          (emp) => emp._id === action.payload._id
        );
        if (index !== -1) state.employees[index] = action.payload;
        if (state.currentEmployee?._id === action.payload._id)
          state.currentEmployee = action.payload;
        state.advances = action.payload.advances || [];
        const newPagination = {
          ...state.advancesPagination,
          totalItems: action.payload.advances?.length || 0,
          totalPages: Math.ceil(
            (action.payload.advances?.length || 0) / state.advancesPagination.itemsPerPage
          ),
        };
        if (
          state.advancesPagination.totalItems !== newPagination.totalItems ||
          state.advancesPagination.totalPages !== newPagination.totalPages
        ) {
          state.advancesPagination = newPagination;
        }
      })
      .addCase(updateEmployeeAdvance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(deactivateEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(transferEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(transferEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successMessage = null;
        const index = state.employees.findIndex(
          (emp) => emp._id === action.payload._id
        );
        if (index !== -1) state.employees[index] = action.payload;
        if (state.currentEmployee?._id === action.payload._id)
          state.currentEmployee = action.payload;
      })
      .addCase(transferEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(rejoinEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(rejoinEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successMessage =
          action.payload.message || "Employee rejoined successfully";
        const index = state.employees.findIndex(
          (emp) => emp._id === action.payload._id
        );
        if (index !== -1) state.employees[index] = action.payload;
        if (state.currentEmployee?._id === action.payload._id)
          state.currentEmployee = action.payload;
      })
      .addCase(rejoinEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(getEmployeeHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.history = null;
      })
      .addCase(getEmployeeHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload;
      })
      .addCase(getEmployeeHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.history = null;
      })
      .addCase(addEmployeeDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(addEmployeeDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successMessage =
          action.payload.message || "Documents added successfully";
        const employee = action.payload.employee || action.payload;
        const index = state.employees.findIndex(
          (emp) => emp._id === employee._id
        );
        if (index !== -1) state.employees[index] = employee;
        if (state.currentEmployee?._id === employee._id) {
          state.currentEmployee = employee;
        }
        state.documents = employee.documents || [];
        state.documentsPagination = action.payload.pagination || {
          currentPage: 1,
          totalPages: Math.ceil(
            (employee.documents?.length || 0) / state.documentsPagination.itemsPerPage
          ),
          totalItems: employee.documents?.length || 0,
          itemsPerPage: state.documentsPagination.itemsPerPage || 5,
        };
      })
      .addCase(addEmployeeDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(fetchEmployeeAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.attendance = [];
      })
      .addCase(fetchEmployeeAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance = action.payload.attendance || [];
        state.attendancePagination = action.payload.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10,
        };
      })
      .addCase(fetchEmployeeAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.attendance = [];
        state.attendancePagination = {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10,
        };
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
        state.settings = null;
      })
      .addCase(fetchEmployeeAdvances.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.advances = [];
      })
      .addCase(fetchEmployeeAdvances.fulfilled, (state, action) => {
        state.loading = false;
        state.advances = action.payload.advances || [];
        if (
          state.advancesPagination.currentPage !== action.payload.pagination.currentPage ||
          state.advancesPagination.itemsPerPage !== action.payload.pagination.itemsPerPage ||
          state.advancesPagination.sortField !== action.payload.pagination.sortField ||
          state.advancesPagination.sortOrder !== action.payload.pagination.sortOrder ||
          state.advancesPagination.totalItems !== action.payload.pagination.totalItems ||
          state.advancesPagination.totalPages !== action.payload.pagination.totalPages
        ) {
          state.advancesPagination = action.payload.pagination;
        }
      })
      .addCase(fetchEmployeeAdvances.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.advances = [];
        state.advancesPagination = {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
          sortField: "year",
          sortOrder: "desc",
        };
      })
      .addCase(registerEmployeesFromExcel.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(registerEmployeesFromExcel.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successType = "excel";
        state.successMessage =
          action.payload.message ||
          "Employees registered successfully from Excel";
        state.employees = [
          ...state.employees,
          ...(action.payload.employees || []),
        ];
        state.pagination.totalItems = state.employees.length;
        state.pagination.totalPages = Math.ceil(
          state.employees.length / state.pagination.itemsPerPage
        );
      })
      .addCase(registerEmployeesFromExcel.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.errorType = "excel";
        state.success = false;
      })
      .addCase(fetchDepartments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.loading = false;
        state.departments = action.payload || [];
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.departments = [];
      })
      .addCase(deleteEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successMessage =
          action.payload.message || "Employee deleted successfully";
        state.employees = state.employees.map((emp) =>
          emp._id === action.payload.id ? { ...emp, isDeleted: true } : emp
        );
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
        state.successMessage = null;
      })
      .addCase(restoreEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successMessage =
          action.payload.message || "Employee restored successfully";
        const index = state.employees.findIndex(
          (emp) => emp._id === action.payload._id
        );
        if (index !== -1) state.employees[index] = action.payload;
      })
      .addCase(restoreEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(fetchEmployeeDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.documents = [];
      })
      .addCase(fetchEmployeeDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload.documents || [];
        state.documentsPagination = action.payload.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
        };
      })
      .addCase(fetchEmployeeDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.documents = [];
        state.documentsPagination = {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
        };
      });
  },
});

export const { 
  setEmployees, 
  reset, 
  clearSuccess, 
  setLastUpdated, 
  setAttendanceUpdateTrigger, 
  updateEmployeeInList,
  updateFinalizationStatus 
} = superadminEmployeeSlice.actions;

export default superadminEmployeeSlice.reducer;
