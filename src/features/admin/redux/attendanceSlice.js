// src/features/admin/redux/attendanceSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../utils/api";

export const fetchAttendance = createAsyncThunk(
  "attendance/fetchAttendance",
  async ({ month, year, location, date, status }, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/attendance", {
        params: { month, year, location, date, status },
      });
      return response.data;
    } catch (error) {
      console.error(
        "Fetch attendance error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch attendance"
      );
    }
  }
);

export const fetchMonthlyAttendance = createAsyncThunk(
  "attendance/fetchMonthlyAttendance",
  async ({ month, year, location }, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/attendance/monthly", {
        params: { month, year, location },
      });
      return response.data;
    } catch (error) {
      console.error(
        "Fetch monthly attendance error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch monthly attendance"
      );
    }
  }
);

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
      console.error(
        "Mark attendance error:",
        error.response?.data || error.message
      );
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
      console.error(
        "Bulk mark attendance error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || { message: "Failed to mark attendance in bulk" }
      );
    }
  }
);


export const editAttendance = createAsyncThunk(
  "attendance/editAttendance",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/attendance/${id}`, { status });
      return response.data;
    } catch (error) {
      console.error(
        "Edit attendance error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to edit attendance"
      );
    }
  }
);

export const fetchAttendanceRequests = createAsyncThunk(
  "attendance/fetchAttendanceRequests",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/attendance/requests");
      return response.data;
    } catch (error) {
      console.error(
        "Fetch attendance requests error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch attendance requests"
      );
    }
  }
);

export const handleAttendanceRequest = createAsyncThunk(
  "attendance/handleAttendanceRequest",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/attendance/requests/${id}`, {
        status,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Handle attendance request error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to handle attendance request"
      );
    }
  }
);

export const requestAttendanceEdit = createAsyncThunk(
  "attendance/requestAttendanceEdit",
  async ({ attendanceId, requestedStatus, reason }, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/attendance/requests", {
        attendanceId,
        requestedStatus,
        reason,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Request attendance edit error:",
        error.response?.data || error.message
      );
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
      console.error(
        "Export attendance error:",
        error.response?.data || error.message
      );
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
      console.error(
        "Undo attendance error:",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to undo attendance"
      );
    }
  }
);

const attendanceSlice = createSlice({
  name: "attendance",
  initialState: {
    attendance: [],
    monthlyAttendance: [],
    attendanceRequests: [],
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
      .addCase(fetchAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance = action.payload;
      })
      .addCase(fetchAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMonthlyAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.monthlyAttendance = action.payload;
      })
      .addCase(fetchMonthlyAttendance.rejected, (state, action) => {
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
        state.attendanceRequests = action.payload;
      })
      .addCase(fetchAttendanceRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
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
      });
  },
});

export const { reset } = attendanceSlice.actions;
export default attendanceSlice.reducer;