import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../utils/api";

export const markAttendance = createAsyncThunk(
  "attendance/markAttendance",
  async ({ attendance, overwrite = false }, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/attendance", {
        attendance,
        overwrite,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to mark attendance" }
      );
    }
  }
);

export const bulkMarkAttendance = createAsyncThunk(
  "attendance/bulkMarkAttendance",
  async ({ attendance, overwrite = false }, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/attendance/bulk", {
        attendance,
        overwrite,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to mark attendance in bulk" }
      );
    }
  }
);

export const bulkMarkAttendanceWithRefresh = createAsyncThunk(
  "attendance/bulkMarkAttendanceWithRefresh",
  async ({ attendance, overwrite = false, refreshParams }, { dispatch, rejectWithValue }) => {
    try {
      
      
      const attendanceResult = await dispatch(bulkMarkAttendance({ 
        attendance, 
        overwrite 
      })).unwrap();
      
      
      
      dispatch(setEmployeeRefreshTrigger());
      
      return {
        ...attendanceResult,
        refreshTriggered: true,
        refreshParams,
        timestamp: Date.now()
      };
    } catch (error) {
      
      return rejectWithValue(error);
    }
  }
);

export const editAttendance = createAsyncThunk(
  "attendance/editAttendance",
  async ({ id, status, date }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/attendance/${id}`, { status, date });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to edit attendance"
      );
    }
  }
);

export const fetchAttendanceRequests = createAsyncThunk(
  "attendance/fetchAttendanceRequests",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/attendance/requests", {
        params: filters,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch attendance requests"
      );
    }
  }
);

export const handleAttendanceRequest = createAsyncThunk(
  "attendance/handleAttendanceRequest",
  async ({ id, status, date }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/attendance/requests/${id}`, {
        status,
        date,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to handle attendance request"
      );
    }
  }
);

export const requestAttendanceEdit = createAsyncThunk(
  "attendance/requestAttendanceEdit",
  async ({ attendanceId, requestedStatus, reason, date }, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/attendance/requests", {
        attendanceId,
        requestedStatus,
        reason,
        date,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to request attendance edit"
      );
    }
  }
);

export const exportAttendance = createAsyncThunk(
  "attendance/exportAttendance",
  async ({ month, year, location }, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/attendance/export", {
        params: { month, year, location },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `attendance_${month}_${year}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      return true;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to export attendance"
      );
    }
  }
);

export const undoMarkAttendance = createAsyncThunk(
  "attendance/undoMarkAttendance",
  async (attendanceIds, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/attendance/undo", {
        attendanceIds,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to undo attendance"
      );
    }
  }
);

export const fetchAttendance = createAsyncThunk(
  "attendance/fetchAttendance",
  async ({ month, year, location, date, status, page = 1, limit = 5 }, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/attendance", {
        params: { month, year, location, date, status, page, limit },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch attendance"
      );
    }
  }
);

// ✅ UPDATED: fetchMonthlyAttendance now paginates employees, not attendance records
export const fetchMonthlyAttendance = createAsyncThunk(
  "attendance/fetchMonthlyAttendance",
  async ({ month, year, location, page = 1, limit = 5 }, { rejectWithValue }) => {
    try {
      const params = { 
        month, 
        year, 
        page, 
        limit // ✅ This now limits EMPLOYEES, not attendance records
      };
      if (location && location !== "all") {
        params.location = location;
      }
      const response = await api.get("/admin/attendance", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch monthly attendance"
      );
    }
  }
);

export const fetchWorkingDayPolicy = createAsyncThunk(
  "attendance/fetchWorkingDayPolicy",
  async ({ locationId, date }, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/attendance/working-day-policy", {
        params: { locationId, date },
      });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch working day policy"
      );
    }
  }
);

export const overrideAttendance = createAsyncThunk(
  "attendance/overrideAttendance",
  async ({ id, status, reason }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/attendance/override/${id}`, { status, reason });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to override attendance");
    }
  }
);

// ✅ NEW: Employee refresh trigger action
export const refreshEmployeeData = createAsyncThunk(
  "attendance/refreshEmployeeData",
  async ({ location, month, year }, { dispatch, rejectWithValue }) => {
    try {
      
      return { success: true, location, month, year };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to refresh employee data");
    }
  }
);

const attendanceSlice = createSlice({
  name: "attendance",
  initialState: {
    attendance: [],
    pagination: null,
    monthlyAttendance: [], // ✅ NEW: Will store {employee, attendance[]} structure  
    monthlyPagination: null,
    attendanceRequests: [],
    requestsPagination: null,
    loading: false,
    error: null,
    lastAttendanceUpdate: null,
    employeeRefreshTrigger: 0, // ✅ ADD: Trigger for employee refresh
    workingDayPolicy: null,
    workingDayPolicyLoading: false,
    workingDayPolicyError: null,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
    },
    setAttendanceUpdated: (state) => {
      state.lastAttendanceUpdate = Date.now();
      state.employeeRefreshTrigger = Date.now();
    },
    // ✅ ADD: Manual trigger for employee refresh
    setEmployeeRefreshTrigger: (state) => {
      state.employeeRefreshTrigger = Date.now();
    },
    clearWorkingDayPolicy: (state) => {
      state.workingDayPolicy = null;
      state.workingDayPolicyError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(undoMarkAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(undoMarkAttendance.fulfilled, (state) => {
        state.loading = false;
        state.lastAttendanceUpdate = Date.now();
        state.employeeRefreshTrigger = Date.now();
      })
      .addCase(undoMarkAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance = action.payload.attendance || [];
        state.pagination = action.payload.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
        };
      })
      .addCase(fetchAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.attendance = [];
        state.pagination = {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
        };
      })
      // ✅ UPDATED: Handle new {employee, attendance[]} structure
      .addCase(fetchMonthlyAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyAttendance.fulfilled, (state, action) => {
        state.loading = false;
        // ✅ NEW: Store the {employee, attendance[]} structure directly
        state.monthlyAttendance = action.payload.attendance || [];
        state.monthlyPagination = action.payload.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
        };
      })
      .addCase(fetchMonthlyAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.monthlyAttendance = [];
        state.monthlyPagination = {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
        };
      })
      .addCase(fetchAttendanceRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceRequests = action.payload.attendanceRequests || [];
        state.requestsPagination = action.payload.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
        };
      })
      .addCase(fetchAttendanceRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.attendanceRequests = [];
        state.requestsPagination = {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 5,
        };
      })
      .addCase(markAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAttendance.fulfilled, (state) => {
        state.loading = false;
        state.lastAttendanceUpdate = Date.now();
        state.employeeRefreshTrigger = Date.now();
      })
      .addCase(markAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(bulkMarkAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkMarkAttendance.fulfilled, (state) => {
        state.loading = false;
        state.lastAttendanceUpdate = Date.now();
        state.employeeRefreshTrigger = Date.now();
      })
      .addCase(bulkMarkAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(bulkMarkAttendanceWithRefresh.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkMarkAttendanceWithRefresh.fulfilled, (state) => {
        state.loading = false;
        state.lastAttendanceUpdate = Date.now();
        state.employeeRefreshTrigger = Date.now();
      })
      .addCase(bulkMarkAttendanceWithRefresh.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(editAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editAttendance.fulfilled, (state) => {
        state.loading = false;
        state.lastAttendanceUpdate = Date.now();
        state.employeeRefreshTrigger = Date.now();
      })
      .addCase(editAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(handleAttendanceRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(handleAttendanceRequest.fulfilled, (state) => {
        state.loading = false;
        state.lastAttendanceUpdate = Date.now();
        state.employeeRefreshTrigger = Date.now();
      })
      .addCase(handleAttendanceRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(requestAttendanceEdit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestAttendanceEdit.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceRequests.push(action.payload);
      })
      .addCase(requestAttendanceEdit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(exportAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportAttendance.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchWorkingDayPolicy.pending, (state) => {
        state.workingDayPolicyLoading = true;
        state.workingDayPolicyError = null;
      })
      .addCase(fetchWorkingDayPolicy.fulfilled, (state, action) => {
        state.workingDayPolicyLoading = false;
        state.workingDayPolicy = action.payload;
      })
      .addCase(fetchWorkingDayPolicy.rejected, (state, action) => {
        state.workingDayPolicyLoading = false;
        state.workingDayPolicyError = action.payload;
        state.workingDayPolicy = null;
      })
      .addCase(overrideAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(overrideAttendance.fulfilled, (state) => {
        state.loading = false;
        state.lastAttendanceUpdate = Date.now();
        state.employeeRefreshTrigger = Date.now();
      })
      .addCase(overrideAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// ✅ UPDATED: Export all actions including the new ones
export const { 
  reset, 
  setAttendanceUpdated, 
  setEmployeeRefreshTrigger, 
  clearWorkingDayPolicy 
} = attendanceSlice.actions;

export default attendanceSlice.reducer;
