import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../utils/api";
import { fetchLocations } from "./locationsSlice";

export const fetchEmployees = createAsyncThunk(
  "employees/fetchEmployees",
  async (
    { location, status, department, month, year, page = 1, limit = 10 },
    { rejectWithValue }
  ) => {
    try {
      const params = {};
      if (location && location !== "all") params.location = location;
      if (status && status !== "all") {
        params.status = status !== "deleted" ? status : undefined;
        params.isDeleted = status === "deleted" ? true : false;
      }
      if (department && department !== "all") params.department = department;
      if (month) params.month = month;
      if (year) params.year = year;
      if (page) params.page = page;
      if (limit) params.limit = limit;
      const response = await api.get("/admin/employees", { params });
      return response.data;
    } catch (error) {
      console.error("Fetch employees error:", error.response?.data || error.message);
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
      "Fetch monthly leaves error:", error.response?.data || error.message;
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
      // Handle both string and object inputs
      const employeeId = typeof arg === 'string' ? arg : arg.id;
      if (!employeeId) {
        console.error("No employee ID provided:", arg);
        throw new Error("No employee ID provided");
      }
      const id = String(employeeId); // Ensure string
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        console.error("Invalid employee ID format:", id);
        throw new Error("Invalid employee ID format");
      }
      console.log("Fetching employee with validated ID:", id);
      const response = await api.get(`/admin/employees/${id}`);
      return response.data;
    } catch (error) {
      console.error("Fetch employee by ID error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      return rejectWithValue(
        error.response?.data || { message: error.message || "Failed to fetch employee" }
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
      "Register employee error:", error.response?.data || error.message;
      return rejectWithValue(
        error.response?.data?.message || "Failed to register employee"
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
      "Update employee error:", error.response?.data || error.message;
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
      "Update employee advance error:", error.response?.data || error.message;
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
      "Deactivate employee error:", error.response?.data || error.message;
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
      "Transfer employee error:", error.response?.data || error.message;
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
      "Rejoin employee error:", error.response?.data || error.message;
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
      "Get employee history error:", error.response?.data || error.message;
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
  "employees/fetchEmployeeAttendance",
  async (
    { employeeId, month, year, page = 1, limit = 10 },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.get(
        `/admin/employees/${employeeId}/attendance`,
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
  "employees/fetchSettings",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/employees/settings");
      return response.data;
    } catch (error) {
      "Fetch settings error:", error.response?.data || error.message;
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

export const registerEmployeesFromExcel = createAsyncThunk(
  "employees/registerEmployeesFromExcel",
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
      const response = await api.post("/admin/employees/excel", formData, {
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
      console.error("Fetch departments error:", error.response?.data || error.message);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch departments"
      );
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  "employees/deleteEmployee",
  async (id, { rejectWithValue, dispatch }) => { // Add dispatch to thunk arguments
    try {
      console.log("Deleting employee with ID:", id);
      const response = await api.delete(`/admin/employees/${id}`);
      // Refresh locations to update employeeCount
      await dispatch(fetchLocations()).unwrap();
      return { id, message: response.data.message };
    } catch (error) {
      console.error("Delete employee error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Failed to delete employee");
    }
  }
);


export const restoreEmployee = createAsyncThunk(
  "employees/restoreEmployee",
  async (id, { rejectWithValue }) => {
    try {
      console.log("Restoring employee with ID:", id);
      const response = await api.put(`/admin/employees/${id}/restore`);
      return response.data;
    } catch (error) {
      console.error("Restore employee error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Failed to restore employee");
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
    },
  },
  reducers: {
    setEmployees: (state, action) => {
      const newEmployees = action.payload;
      const employeeMap = new Map(state.employees.map(emp => [emp._id, emp]));
      newEmployees.forEach(newEmp => {
        if (employeeMap.has(newEmp._id)) {
          const existingEmp = employeeMap.get(newEmp._id);
          // Merge monthlyLeaves
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
      state.advances = [];
      state.advancesPagination = {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 5,
      };
      state.monthlyLeaves = [];
    },
  },
  extraReducers: (builder) => {
    // Existing reducers for fetchEmployees
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
      // Fetch Monthly Leaves
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
      // Fetch Employee By ID
      .addCase(fetchEmployeeById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentEmployee = null;
      })
      .addCase(fetchEmployeeById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEmployee = action.payload;
        state.pagination = action.payload.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
        };
      })
      .addCase(fetchEmployeeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.currentEmployee = null;
        state.pagination = {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
        };
      })
      // Register Employee
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
        state.successType = "single"; // Set successType for single employee
        state.successMessage = "Employee registered successfully";
      })
       .addCase(registerEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.errorType = "single"; // Set errorType for single employee
        state.success = false;
      })
      // Update Employee
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
      // Update Employee Advance
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
        // Update advances state to reflect the latest advances
        state.advances = action.payload.advances || [];
      })
      .addCase(updateEmployeeAdvance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Deactivate Employee
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
      // Transfer Employee
      .addCase(transferEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.successMessage = null;
      })
    .addCase(transferEmployee.fulfilled, (state, action) => {
  state.loading = false;
  state.success = true;
  state.successMessage = null; // Avoid setting a generic message
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
      // Rejoin Employee
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
      // Get Employee History
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
      // Add Employee Documents
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
        state.pagination = action.payload.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
        };
      })
      .addCase(addEmployeeDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Fetch Employee Attendance
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
      // Fetch Employee Advances
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
      // Fetch Settings
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
        state.successType = "excel"; // Set successType for Excel import
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
        state.errorType = "excel"; // Set errorType for Excel
        state.success = false;
        console.log("registerEmployeesFromExcel rejected:", action.payload);
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
});
  },
});

export const { reset, setEmployees } = employeesSlice.actions;
export default employeesSlice.reducer;
