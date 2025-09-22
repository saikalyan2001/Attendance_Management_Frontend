import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../utils/api";
import { fetchLocations } from "./locationsSlice";

export const fetchEmployees = createAsyncThunk(
  "employees/fetchEmployees",
  async (
    { location, status, department, search, month, year, page = 1, limit = 10, isDeleted }, // ✅ Add search and isDeleted
    { rejectWithValue }
  ) => {
    try {
      const params = {};
      if (location && location !== "all") params.location = location;
      
      // ✅ Handle status and isDeleted separately
      if (status && status !== "all" && status !== "deleted") {
        params.status = status;
      }
      
      // ✅ Handle isDeleted explicitly
      if (isDeleted !== undefined) {
        params.isDeleted = isDeleted;
      }
      
      if (department && department !== "all") params.department = department;
      if (search) params.search = search; // ✅ Add search parameter handling
      if (month) params.month = month;
      if (year) params.year = year;
      if (page) params.page = page;
      if (limit) params.limit = limit;
      
       // For debugging
      
      const response = await api.get("/admin/employees", { params });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch employees"
      );
    }
  }
);


export const fetchMonthlyLeaves = createAsyncThunk(
  "employees/fetchMonthlyLeaves",
  async ({ month, year, location, status }, { rejectWithValue }) => {
    try {
      const params = { month, year };
      if (location && location !== "all") params.location = location;
      if (status && status !== "all") params.status = status;
      const response = await api.get("/admin/employees/leaves", { params });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch monthly leaves"
      );
    }
  }
);

export const fetchEmployeeById = createAsyncThunk(
  "employees/fetchEmployeeById",
  async (arg, { rejectWithValue }) => {
    try {
      const employeeId = typeof arg === 'string' ? arg : arg.id;
      if (!employeeId) {
        
        throw new Error("No employee ID provided");
      }
      const id = String(employeeId);
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        
        throw new Error("Invalid employee ID format");
      }
      
      const response = await api.get(`/admin/employees/${id}`);
      return response.data;
    } catch (error) {
            return rejectWithValue(
        error.response?.data || { message: error.message || "Failed to fetch employee" }
      );
    }
  }
);

export const fetchEmployeeDocuments = createAsyncThunk(
  "employees/fetchEmployeeDocuments",
  async ({ id, page = 1, limit = 10, searchQuery = '' }, { rejectWithValue }) => {
    try {
      const params = { page, limit };
      if (searchQuery) params.searchQuery = searchQuery;
      const response = await api.get(`/admin/employees/${id}/documents`, { params });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch employee documents"
      );
    }
  }
);

export const registerEmployee = createAsyncThunk(
  "employees/registerEmployee",
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
      const response = await api.post("/admin/employees", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(
        error.response?.data || { 
          message: error.message || "Failed to register employee" 
        }
      );
    }
  }
);

export const updateEmployee = createAsyncThunk(
  "employees/updateEmployee",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/employees/${id}`, data);
      return response.data;
    } catch (error) {
      
      return rejectWithValue(
        error.response?.data?.message || "Failed to update employee"
      );
    }
  }
);

export const updateEmployeeAdvance = createAsyncThunk(
  "employees/updateEmployeeAdvance",
  async ({ id, advance, year, month }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/employees/${id}/advance`, {
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

export const deactivateEmployee = createAsyncThunk(
  "employees/deactivateEmployee",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/employees/${id}/deactivate`);
      return { id, message: response.data.message };
    } catch (error) {
      
      return rejectWithValue(
        error.response?.data?.message || "Failed to deactivate employee"
      );
    }
  }
);

export const transferEmployee = createAsyncThunk(
  "employees/transferEmployee",
  async ({ id, locationId, transferTimestamp }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/employees/${id}/transfer`, {
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
  "employees/rejoinEmployee",
  async ({ id, rejoinDate }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/employees/${id}/rejoin`, {
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
  "employees/getEmployeeHistory",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/employees/${id}/history`);
      return response.data;
    } catch (error) {
      
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch employee history"
      );
    }
  }
);

export const addEmployeeDocuments = createAsyncThunk(
  "employees/addEmployeeDocuments",
  async ({ id, documents, page, limit }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      documents.forEach((doc) => {
        if (doc.file instanceof File) {
          formData.append("documents", doc.file, doc.file.name);
        }
      });
      const response = await api.post(
        `/admin/employees/${id}/documents`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          params: { page, limit },
        }
      );
      return response.data;
    } catch (error) {
            return rejectWithValue(
        error.response?.data || { message: "Failed to add employee documents" }
      );
    }
  }
);

export const fetchEmployeeAttendance = createAsyncThunk(
  "employees/fetchEmployeeAttendance",
  async (
    { employeeId, month, year, page = 1, limit = 10, sortField = "date", sortOrder = "desc" },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.get(
        `/admin/employees/${employeeId}/attendance`,
        {
          params: { month, year, page, limit, sortField, sortOrder },
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
  "employees/fetchSettings",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/employees/settings");
      return response.data;
    } catch (error) {
      
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch settings"
      );
    }
  }
);

export const fetchEmployeeAdvances = createAsyncThunk(
  "employees/fetchEmployeeAdvances",
  async (
    { id, page, limit, sortField = "year", sortOrder = "desc" },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.get(`/admin/employees/${id}/advances`, {
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

export const registerEmployeesFromExcel = createAsyncThunk(
  "employees/registerEmployeesFromExcel",
  async ({ excelFile }, { rejectWithValue }) => {
    try {
      if (!(excelFile instanceof File)) {
        
        throw new Error("No valid Excel file provided");
      }
            const formData = new FormData();
      formData.append("excelFile", excelFile, excelFile.name);
      const response = await api.post("/admin/employees/excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
            return rejectWithValue(
        error.response?.data || { message: error.message || "Failed to register employees from Excel" }
      );
    }
  }
);

export const fetchDepartments = createAsyncThunk(
  "employees/fetchDepartments",
  async ({ location } = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (location && location !== "all") params.location = location;
      const response = await api.get("/admin/employees/departments", { params });
      return response.data.departments;
    } catch (error) {
      
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch departments"
      );
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  "employees/deleteEmployee",
  async (id, { rejectWithValue, dispatch }) => {
    try {
      
      const response = await api.delete(`/admin/employees/${id}`);
      await dispatch(fetchLocations()).unwrap();
      return { id, message: response.data.message };
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to delete employee");
    }
  }
);

export const restoreEmployee = createAsyncThunk(
  "employees/restoreEmployee",
  async (id, { rejectWithValue }) => {
    try {
      
      const response = await api.put(`/admin/employees/${id}/restore`);
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to restore employee");
    }
  }
);

// ✅ ADD: Force refresh action
export const forceRefreshEmployees = createAsyncThunk(
  "employees/forceRefreshEmployees",
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


// ✅ ADD: After your existing imports
export const fetchEmployeeSalary = createAsyncThunk(
  "employees/fetchEmployeeSalary",
  async ({ employeeId, year, month }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/employees/${employeeId}/salary/${year}/${month}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch salary data");
    }
  }
);

// ✅ ADD: Payroll summary action
export const fetchPayrollSummary = createAsyncThunk(
  "employees/fetchPayrollSummary", 
  async ({ year, month, location }, { rejectWithValue }) => {
    try {
      const params = { year, month };
      if (location && location !== 'all') params.location = location;
      
      const response = await api.get(`/admin/payroll/${year}/${month}`, { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch payroll data");
    }
  }
);



export const employeesSlice = createSlice({
  name: "employees",
  initialState: {
    employees: [],
    monthlyLeaves: [],
    currentEmployee: null,
    history: null,
    attendance: [],
    attendancePagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
    },
    documents: [],
    documentsPagination: {
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
    },
    attendanceUpdateTrigger: 0,
     salaryData: null,
  payrollSummary: null,
  salaryLoading: false,
  salaryError: null,
  },
  reducers: {
    setEmployees: (state, action) => {
      const newEmployees = action.payload;
      const employeeMap = new Map(state.employees.map(emp => [emp._id, emp]));
      newEmployees.forEach(newEmp => {
        if (employeeMap.has(newEmp._id)) {
          const existingEmp = employeeMap.get(newEmp._id);
          const mergedLeaves = [
            ...new Map(
              [...(existingEmp.monthlyLeaves || []), ...(newEmp.monthlyLeaves || [])].map(ml => [
                `${ml.year}-${ml.month}`,
                ml,
              ])
            ).values(),
          ];
          employeeMap.set(newEmp._id, { ...existingEmp, ...newEmp, monthlyLeaves: mergedLeaves });
        } else {
          employeeMap.set(newEmp._id, { ...newEmp });
        }
      });
      state.employees = Array.from(employeeMap.values());
      state.pagination.totalItems = state.employees.length;
      state.pagination.totalPages = Math.ceil(state.employees.length / state.pagination.itemsPerPage);
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
      state.documents = [];
      state.documentsPagination = {
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
      };
      state.monthlyLeaves = [];
    },
    // ✅ ADD: Clear success state
    clearSuccess: (state) => {
      state.success = false;
      state.successType = null;
      state.successMessage = null;
    },
    // ✅ ADD: Set last updated timestamp
    setLastUpdated: (state) => {
      state.lastUpdated = Date.now();
    },
    // ✅ ADD: Set attendance update trigger
    setAttendanceUpdateTrigger: (state) => {
      state.attendanceUpdateTrigger = Date.now();
    },
    // ✅ ADD: Update individual employee data
    updateEmployeeInList: (state, action) => {
      const updatedEmployee = action.payload;
      const index = state.employees.findIndex(emp => emp._id === updatedEmployee._id);
      if (index !== -1) {
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
    }
  },
  extraReducers: (builder) => {
    builder
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
        state.lastUpdated = Date.now();
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
      .addCase(fetchEmployeeById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEmployee = action.payload;
      })
      .addCase(fetchEmployeeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.currentEmployee = null;
      })
      .addCase(fetchEmployeeDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload.employee?.documents || [];
        state.documentsPagination = action.payload.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10,
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
          itemsPerPage: 10,
        };
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
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successMessage = "Employee updated successfully";
         state.lastUpdated = Date.now();
        const index = state.employees.findIndex(
          (emp) => emp._id === action.payload._id
        );
        if (index !== -1) state.employees[index] = action.payload;
        if (state.currentEmployee?._id === action.payload._id)
          state.currentEmployee = action.payload;
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
      })
      .addCase(updateEmployeeAdvance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      .addCase(deactivateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
      .addCase(deactivateEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.successMessage =
          action.payload.message || "Employee deactivated successfully";
        const index = state.employees.findIndex(
          (emp) => emp._id === action.payload.id
        );
        if (index !== -1) state.employees[index].status = "inactive";
        if (state.currentEmployee?._id === action.payload.id)
          state.currentEmployee = null;
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
        state.successMessage = "Employee rejoined successfully";
        const index = state.employees.findIndex(
          (emp) => emp._id === action.payload._id
        );
        if (index !== -1) state.employees[index] = action.payload;
        else state.employees.push(action.payload);
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
        state.successMessage = "Documents added successfully";
        const index = state.employees.findIndex(
          (emp) => emp._id === action.payload.employee._id
        );
        if (index !== -1) state.employees[index] = action.payload.employee;
        if (state.currentEmployee?._id === action.payload.employee._id) {
          state.currentEmployee = action.payload.employee;
        }
        state.documents = action.payload.documents || [];
        state.documentsPagination = action.payload.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10,
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
      .addCase(fetchEmployeeAdvances.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeeAdvances.fulfilled, (state, action) => {
        state.loading = false;
        state.advances = action.payload.advances || [];
        state.advancesPagination = action.payload.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
        };
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
          action.payload.message || "Employees registered successfully";
        if (action.payload.count) {
          state.pagination.totalItems += action.payload.count;
        }
        if (action.payload.employees && Array.isArray(action.payload.employees)) {
          state.employees = [...state.employees, ...action.payload.employees];
        }
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
        state.status = "loading";
        state.error = null;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.status = "succeeded";
        const deletedId = action.payload.id;
        state.employees = state.employees.map((employee) =>
          employee._id === deletedId ? { ...employee, isDeleted: true } : employee
        );
        if (state.currentEmployee?._id === deletedId) {
          state.currentEmployee = null;
        }
        state.error = null;
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
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
        state.successMessage = action.payload.message || "Employee restored successfully";
        const index = state.employees.findIndex(
          (emp) => emp._id === action.payload.employee._id
        );
        if (index !== -1) {
          state.employees[index] = action.payload.employee;
        } else {
          state.employees.push(action.payload.employee);
        }
        if (state.currentEmployee?._id === action.payload.employee._id) {
          state.currentEmployee = action.payload.employee;
        }
      })
      .addCase(restoreEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
       .addCase(forceRefreshEmployees.fulfilled, (state, action) => {
        state.employees = action.payload.employees || [];
        state.pagination = action.payload.pagination || state.pagination;
        state.lastUpdated = Date.now();
        
      })
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
  },
});

export const { reset, setEmployees, clearSuccess, setLastUpdated, setAttendanceUpdateTrigger, updateEmployeeInList } = employeesSlice.actions;
export default employeesSlice.reducer;