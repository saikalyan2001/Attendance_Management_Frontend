import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../utils/api";

export const fetchAttendanceReport = createAsyncThunk(
  "superAdminReports/fetchAttendanceReport",
  async ({ startDate, endDate, location, page, limit }, { rejectWithValue }) => {
    try {
      const response = await api.get("/superadmin/reports/attendance", {
        params: { startDate, endDate, location, page, limit },
      });
      return response.data;
    } catch (error) {
            return rejectWithValue(
        error.response?.data?.message || "Failed to fetch attendance report"
      );
    }
  }
);

export const fetchLeaveReport = createAsyncThunk(
  "superAdminReports/fetchLeaveReport",
  async ({ location, month, year, page, limit }, { rejectWithValue }) => {
    try {
      const response = await api.get("/superadmin/reports/leaves", {
        params: { location, month, year, page, limit },
      });
      return response.data;
    } catch (error) {
            return rejectWithValue(
        error.response?.data?.message || "Failed to fetch leave report"
      );
    }
  }
);

export const fetchSalaryReport = createAsyncThunk(
  "superAdminReports/fetchSalaryReport",
  async ({ startDate, endDate, location, page, limit }, { rejectWithValue }) => {
    try {
      const response = await api.get("/superadmin/reports/salary", {
        params: { startDate, endDate, location, page, limit },
      });
      return response.data;
    } catch (error) {
            return rejectWithValue(
        error.response?.data?.message || "Failed to fetch salary report"
      );
    }
  }
);

const superAdminReportsSlice = createSlice({
  name: "superAdminReports",
  initialState: {
    attendanceReport: null,
    leaveReport: null,
    salaryReport: null,
    loading: false,
    error: null,
  },
  reducers: {
    reset: (state) => {
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendanceReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceReport.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceReport = action.payload;
      })
      .addCase(fetchAttendanceReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchLeaveReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeaveReport.fulfilled, (state, action) => {
        state.loading = false;
        state.leaveReport = action.payload;
      })
      .addCase(fetchLeaveReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSalaryReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSalaryReport.fulfilled, (state, action) => {
        state.loading = false;
        state.salaryReport = action.payload;
      })
      .addCase(fetchSalaryReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = superAdminReportsSlice.actions;
export default superAdminReportsSlice.reducer;