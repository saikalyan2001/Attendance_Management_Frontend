import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../utils/api";

export const fetchAttendance = createAsyncThunk(
  "siteInchargeAttendance/fetchAttendance",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const cleanedFilters = { ...filters, isDeleted: false };
      if (cleanedFilters.status === "all") {
        delete cleanedFilters.status;
      }
            const response = await api.get("/siteincharge/attendance", {
        params: cleanedFilters,
      });
      return response.data.attendance || []; // Ensure array is returned
    } catch (error) {
      (
        "Fetch attendance error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch attendance data"
      );
    }
  }
);

export const markAttendance = createAsyncThunk(
  "siteInchargeAttendance/markAttendance",
  async (records, { rejectWithValue }) => {
    try {
            if (!Array.isArray(records)) {
        throw new Error("Records must be an array");
      }
      const response = await api.post("/siteincharge/attendance", records);
      const attendance = Array.isArray(response.data.attendance)
        ? response.data.attendance
        : Array.isArray(response.data)
        ? response.data
        : [response.data];
      const attendanceIds = Array.isArray(response.data.attendanceIds)
        ? response.data.attendanceIds
        : attendance.map((rec) => rec._id);
      return { attendance, attendanceIds };
    } catch (error) {
      (
        "Mark attendance error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to mark attendance"
      );
    }
  }
);

export const bulkMarkAttendance = createAsyncThunk(
  "siteInchargeAttendance/bulkMarkAttendance",
  async ({ attendance, overwrite }, { rejectWithValue }) => {
    try {
      ("Sending bulk attendance payload:", {
        attendance,
        overwrite,
      });
      if (!Array.isArray(attendance)) {
        throw new Error("Attendance must be an array");
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await api.post(
        "/siteincharge/attendance/bulk",
        { attendance, overwrite },
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      const attendanceRecords = Array.isArray(response.data.attendance)
        ? response.data.attendance
        : [];
      const attendanceIds = Array.isArray(response.data.attendanceIds)
        ? response.data.attendanceIds
        : [];

      return {
        attendance: attendanceRecords,
        attendanceIds,
      };
    } catch (error) {
      (
        "Bulk mark attendance error:",
        error.response?.data || error.message
      );
      if (error.name === "AbortError") {
        return rejectWithValue("Request timed out");
      }
      return rejectWithValue({
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to mark bulk attendance",
        existingRecords: error.response?.data?.existingRecords || [],
        invalidRecords: error.response?.data?.invalidRecords || [],
      });
    }
  }
);

export const undoAttendance = createAsyncThunk(
  "siteInchargeAttendance/undoAttendance",
  async ({ attendanceIds }, { rejectWithValue }) => {
    try {
            if (!Array.isArray(attendanceIds)) {
        throw new Error("attendanceIds must be an array");
      }
      await api.delete("/siteincharge/attendance", { data: { attendanceIds } });
      return attendanceIds;
    } catch (error) {
      (
        "Undo attendance error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to undo attendance"
      );
    }
  }
);

export const fetchMonthlyAttendance = createAsyncThunk(
  "siteInchargeAttendance/fetchMonthlyAttendance",
  async ({ month, year, location }, { rejectWithValue }) => {
    try {
            const response = await api.get("/siteincharge/attendance/monthly", {
        params: { month, year, location, isDeleted: false },
      });
            return response.data.data || []; // Handle { data: [...] } structure
    } catch (error) {
      (
        "Fetch monthly attendance error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch monthly attendance"
      );
    }
  }
);

export const requestAttendanceEdit = createAsyncThunk(
  "siteInchargeAttendance/requestAttendanceEdit",
  async (
    { employeeId, location, date, currentStatus, newStatus, reason },
    { rejectWithValue }
  ) => {
    try {
      ("Requesting attendance edit:", {
        employeeId,
        location,
        date,
        currentStatus,
        newStatus,
        reason,
      });
      const response = await api.post("/siteincharge/attendance/request-edit", {
        employeeId,
        location,
        date,
        currentStatus,
        newStatus,
        reason,
      });
      return response.data;
    } catch (error) {
      (
        "Request attendance edit error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to request attendance edit"
      );
    }
  }
);

export const fetchAttendanceEditRequests = createAsyncThunk(
  "siteInchargeAttendance/fetchAttendanceEditRequests",
  async ({ location }, { rejectWithValue }) => {
    try {
            const response = await api.get("/siteincharge/attendance/requests", {
        params: { location, isDeleted: false },
      });
      return response.data.requests;
    } catch (error) {
      (
        "Fetch attendance edit requests error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch attendance edit requests"
      );
    }
  }
);

export const calculateSalaryImpact = createAsyncThunk(
  "siteInchargeAttendance/calculateSalaryImpact",
  async ({ month, year, location }, { rejectWithValue }) => {
    try {
            const response = await api.get(
        "/siteincharge/attendance/salary-calculation",
        {
          params: { month, year, location },
        }
      );
      return response.data.salaryCalculations || [];
    } catch (error) {
      (
        "Calculate salary impact error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to calculate salary impact"
      );
    }
  }
);

const attendanceSlice = createSlice({
  name: "siteInchargeAttendance",
  initialState: {
    attendance: [],
    monthlyAttendance: [],
    attendanceEditRequests: [],
    salaryCalculations: [], 
    loading: false,
    error: null,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
      state.loading = false;
    },
    resetMonthly: (state) => {
      state.monthlyAttendance = [];
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
        state.attendance = action.payload || [];
      })
      .addCase(fetchAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance.push(...action.payload.attendance);
      })
      .addCase(markAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(bulkMarkAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkMarkAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance = action.payload.attendance;
      })
      .addCase(bulkMarkAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(undoAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(undoAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance = state.attendance.filter(
          (record) => !action.payload.includes(record._id)
        );
      })
      .addCase(undoAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMonthlyAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.monthlyAttendance = action.payload || [];
      })
      .addCase(fetchMonthlyAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(requestAttendanceEdit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestAttendanceEdit.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(requestAttendanceEdit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAttendanceEditRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceEditRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceEditRequests = action.payload || [];
      })
      .addCase(fetchAttendanceEditRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(calculateSalaryImpact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(calculateSalaryImpact.fulfilled, (state, action) => {
        state.loading = false;
        state.salaryCalculations = action.payload || [];
      })
      .addCase(calculateSalaryImpact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset, resetMonthly } = attendanceSlice.actions;
export default attendanceSlice.reducer;
