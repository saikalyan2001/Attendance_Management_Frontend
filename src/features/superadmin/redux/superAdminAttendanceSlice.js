import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../utils/api";

export const fetchAttendance = createAsyncThunk(
  "superAdminAttendance/fetchAttendance",
  async ({ month, year, location, date, status, page = 1, limit = 5 }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const params = { month, year, date, status, page, limit };
      
      // ✅ Enhanced location filtering for SuperAdmin
      if (location && location !== "all") {
        params.location = location;
      }
      // When location === "all", SuperAdmin fetches all attendance without location filter
      
      const response = await api.get("/superadmin/attendance", { params });
      
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to fetch attendance");
    }
  }
);

export const fetchMonthlyAttendance = createAsyncThunk(
  "superAdminAttendance/fetchMonthlyAttendance",
  async ({ month, year, location, page = 1, limit = 5 }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const params = { month, year, page, limit };
      if (location && location !== "all") {
        params.location = location;
      }
      const response = await api.get("/superadmin/attendance", { params });
      
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to fetch monthly attendance");
    }
  }
);

export const bulkMarkAttendance = createAsyncThunk(
  "superAdminAttendance/bulkMarkAttendance",
  async ({ attendance, overwrite = false }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      // ✅ Handle location filtering for attendance records
      const records = attendance.map((record) => {
        const processedRecord = { ...record };
        
        // For SuperAdmin: if location is "all" or undefined, don't include location in record
        if (record.location === "all" || !record.location) {
          delete processedRecord.location;
        }
        
        return processedRecord;
      });
      
      const response = await api.post("/superadmin/attendance/bulk", { 
        attendance: records, 
        overwrite 
      });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data || { message: "Failed to mark attendance in bulk" });
    }
  }
);

export const markAttendance = createAsyncThunk(
  "superAdminAttendance/markAttendance",
  async ({ attendance, overwrite = false }, { rejectWithValue }) => {
    try {
      const response = await api.post("/superadmin/attendance", { attendance, overwrite });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data || { message: "Failed to mark attendance" });
    }
  }
);

export const editAttendance = createAsyncThunk(
  "superAdminAttendance/editAttendance",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/superadmin/attendance/${id}`, { status });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to edit attendance");
    }
  }
);

export const fetchAttendanceRequests = createAsyncThunk(
  "superAdminAttendance/fetchAttendanceRequests",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/superadmin/attendance/requests", { params: filters });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to fetch attendance requests");
    }
  }
);

export const handleAttendanceRequest = createAsyncThunk(
  "superAdminAttendance/handleAttendanceRequest",
  async ({ id, status, date }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/superadmin/attendance/requests/${id}`, { status, date });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to handle attendance request");
    }
  }
);

export const requestAttendanceEdit = createAsyncThunk(
  "superAdminAttendance/requestAttendanceEdit",
  async ({ attendanceId, requestedStatus, reason }, { rejectWithValue }) => {
    try {
      const response = await api.post("/superadmin/attendance/requests", {
        attendanceId,
        requestedStatus,
        reason,
      });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to request attendance edit");
    }
  }
);

export const exportAttendance = createAsyncThunk(
  "superAdminAttendance/exportAttendance",
  async ({ month, year, location }, { rejectWithValue }) => {
    try {
      const params = { month, year };
      if (location && location !== "all") {
        params.location = location;
      }
      const response = await api.get("/superadmin/attendance/export", {
        params,
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
      
      return rejectWithValue(error.response?.data?.message || "Failed to export attendance");
    }
  }
);

export const undoMarkAttendance = createAsyncThunk(
  "superAdminAttendance/undoMarkAttendance",
  async (attendanceIds, { rejectWithValue }) => {
    try {
      const response = await api.post("/superadmin/attendance/undo", { attendanceIds });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to undo attendance");
    }
  }
);

// Optional: Superadmin-specific action to override attendance
export const overrideAttendance = createAsyncThunk(
  "superAdminAttendance/overrideAttendance",
  async ({ id, status, reason }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/superadmin/attendance/override/${id}`, { status, reason });
      return response.data;
    } catch (error) {
      
      return rejectWithValue(error.response?.data?.message || "Failed to override attendance");
    }
  }
);

const superAdminAttendanceSlice = createSlice({
  name: "superAdminAttendance",
  initialState: {
    attendance: [],
    pagination: null,
    monthlyAttendance: [],
    monthlyPagination: null,
    attendanceRequests: [],
    requestsPagination: null,
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
      .addCase(fetchMonthlyAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyAttendance.fulfilled, (state, action) => {
        state.loading = false;
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
      .addCase(bulkMarkAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkMarkAttendance.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(bulkMarkAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAttendance.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(markAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(editAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editAttendance.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(editAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
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
      .addCase(handleAttendanceRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(handleAttendanceRequest.fulfilled, (state) => {
        state.loading = false;
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
      .addCase(undoMarkAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(undoMarkAttendance.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(undoMarkAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(overrideAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(overrideAttendance.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(overrideAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = superAdminAttendanceSlice.actions;
export default superAdminAttendanceSlice.reducer;