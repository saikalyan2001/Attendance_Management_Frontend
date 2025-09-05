// File: src/features/superadmin/redux/superadminEmployeeSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../utils/api";
import { fetchLocations } from "../redux/locationsSlice";

export const fetchEmployees = createAsyncThunk(
  "superadminEmployees/fetchEmployees",
  async (
    { location, status, department, search, month, year, page = 1, limit = 10, isDeleted }, // ✅ Add isDeleted
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
      if (search) params.search = search;
      if (month) params.month = month;
      if (year) params.year = year;
      if (page) params.page = page;
      if (limit) params.limit = limit;
      
      const response = await api.get("/superadmin/employees", { params });
      return response.data;
    } catch (error) {
      console.error(
        "Fetch employees error:",
        error.response?.data || error.message
      );
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
        console.error("No employee ID provided:", arg);
        throw new Error("No employee ID provided");
      }
      const id = String(employeeId);
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        console.error("Invalid employee ID format:", id);
        throw new Error("Invalid employee ID format");
      }
      console.log("Fetching employee with validated ID:", id);
      const response = await api.get(`/superadmin/employees/${id}`);
      return response.data;
    } catch (error) {
      console.error("Fetch employee by ID error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
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
      console.error(
        "Update employee advance error:",
        error.response?.data || error.message
      );
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
      console.error(
        "Fetch employee advances error:",
        error.response?.data || error.message
      );
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
      console.error(
        "Fetch monthly leaves error:",
        error.response?.data || error.message
      );
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
      console.error(
        "Register employee error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || error.message || "Failed to register employee" 
      );
    }
  }
);

export const updateEmployee = createAsyncThunk(
  "superadminEmployees/updateEmployee",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/superadmin/employees/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(
        "Update employee error:",
        error.response?.data || error.message
      );
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
      console.error(
        "Deactivate employee error:",
        error.response?.data || error.message
      );
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
      console.error(
        "Transfer employee error:",
        error.response?.data || error.message
      );
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
      console.error(
        "Rejoin employee error:",
        error.response?.data || error.message
      );
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
      console.error(
        "Get employee history error:",
        error.response?.data || error.message
      );
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
        employee: response.data.employee, // Include employee for state updates
      };
    } catch (error) {
      console.error(
        "Add employee documents error:",
        error.response?.data || error.message
      );
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
      console.error(
        "Fetch employee attendance error:",
        error.response?.data || error.message
      );
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
      console.error(
        "Fetch settings error:",
        error.response?.data || error.message
      );
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
        console.error("Invalid excelFile:", excelFile);
        throw new Error("No valid Excel file provided");
      }
      console.log("Sending Excel file:", {
        name: excelFile.name,
        type: excelFile.type,
        size: excelFile.size,
        lastModified: excelFile.lastModified,
      });
      const formData = new FormData();
      formData.append("excelFile", excelFile, excelFile.name);
      const response = await api.post("/superadmin/employees/excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      console.error("Register employees from Excel error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
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
      console.error(
        "Fetch departments error:",
        error.response?.data || error.message
      );
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
      console.log("Deleting employee with ID:", id);
      const response = await api.delete(`/superadmin/employees/${id}`);
      await dispatch(fetchLocations()).unwrap();
      return { id, message: response.data.message };
    } catch (error) {
      console.error(
        "Delete employee error:",
        error.response?.data || error.message
      );
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
      console.log("Restoring employee with ID:", id);
      const response = await api.put(`/superadmin/employees/${id}/restore`);
      return response.data;
    } catch (error) {
      console.error(
        "Restore employee error:",
        error.response?.data || error.message
      );
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
      // Adjust the response to match the expected structure
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
      console.error(
        "Fetch employee documents error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch employee documents"
      );
    }
  }
);

export const superadminEmployeeSlice = createSlice({
  name: "superadminEmployees",
  initialState: {
    employees: [],
    monthlyLeaves: [],
    currentEmployee: null,
    history: null,
    documents: [], // Add documents array to store paginated documents
    documentsPagination: {
      // Add documents-specific pagination state
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
        const newPagination = {
          ...state.advancesPagination,
          totalItems: action.payload.advances?.length || 0,
          totalPages: Math.ceil(
            (action.payload.advances?.length || 0) / state.advancesPagination.itemsPerPage
          ),
        };
        // Only update advancesPagination if values have changed
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
        state.success = false; // File: src/features/superadmin/redux/superadminEmployeeSlice.js (continued)
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
        // Update documents and pagination
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
        // Only update advancesPagination if values have changed
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
      })
  },
});

export const { setEmployees, reset } = superadminEmployeeSlice.actions;
export default superadminEmployeeSlice.reducer;
