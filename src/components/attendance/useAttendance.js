import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format, parse, startOfDay, startOfMonth, isBefore, formatISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const useAttendance = ({
  role,
  locationId,
  month,
  year,
  setMonth,
  setYear,
  attendanceSlice,
  employeeSlice,
  settingsSlice,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { employees, allEmployees, loading: empLoading, pagination } = useSelector((state) => state[employeeSlice]);
  const { loading, attendance: salaryCalculations, locations, locationsLoading } = useSelector((state) => state[attendanceSlice]);
  const { settings } = useSelector((state) => state[settingsSlice] || {});

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = startOfDay(new Date());
    const selected = new Date(year, month - 1, 1);
    return selected > today ? today : selected;
  });
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(selectedDate));
  const [selectedTime, setSelectedTime] = useState(format(new Date(), "HH:mm:ss"));
  const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState([]);
  const [bulkEmployeeStatuses, setBulkEmployeeStatuses] = useState({});
  const [bulkConfirmDialog, setBulkConfirmDialog] = useState({
    open: false,
    records: [],
    remaining: [],
    preview: false,
    overwrite: undefined,
    existingRecords: [],
    invalidRecords: [],
  });
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = pagination?.limit || 5;

  const getISTTimestamp = (date, time) => {
    if (!date || !time) return null;
    const parsedTime = parse(time, "HH:mm:ss", new Date());
    if (isNaN(parsedTime.getTime())) return null;
    const [hours, minutes, seconds] = [parsedTime.getHours(), parsedTime.getMinutes(), parsedTime.getSeconds()];
    const dateTime = new Date(date);
    dateTime.setHours(hours, minutes, seconds, 0);
    const istTime = toZonedTime(dateTime, "Asia/Kolkata");
    return formatISO(istTime, { representation: "complete" });
  };

  const getOCLeaves = (employee, month, year) => {
    const paidLeavesPerMonth = (settings?.paidLeavesPerYear || 24) / 12;
    const monthlyLeaves = Array.isArray(employee.monthlyLeaves) ? employee.monthlyLeaves : [];
    const monthlyLeave = monthlyLeaves.find((ml) => ml.year === year && ml.month === month) || {
      allocated: paidLeavesPerMonth,
      available: paidLeavesPerMonth,
      carriedForward: 0,
      taken: 0,
    };
    const openingLeaves = (monthlyLeave.carriedForward || 0) + (monthlyLeave.allocated || paidLeavesPerMonth);
    const closingLeaves = Math.max(monthlyLeave.available || paidLeavesPerMonth, 0);
    return `${openingLeaves.toFixed(1)}/${closingLeaves.toFixed(1)}`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedTime(format(new Date(), "HH:mm:ss"));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user || user.role !== role) {
      toast.error(`Unauthorized access. Please log in as a ${role}.`, { duration: 5000 });
      navigate("/login");
      return;
    }
    if (role === "siteincharge" && !locationId) {
      toast.error("No location assigned. Please contact admin.", { duration: 5000 });
      navigate("/siteincharge/dashboard");
      return;
    }
    if (role !== "siteincharge") {
      dispatch(attendanceSlice.actions.fetchLocations());
    }
    if (role === "siteincharge") {
      dispatch(settingsSlice.actions.fetchSettings());
    }
  }, [dispatch, user, navigate, role, locationId]);

  useEffect(() => {
    const fetchEmployeesData = async () => {
      if (!locationId || locationId === "all") return;
      setIsFilterLoading(true);
      try {
        let allEmployees = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const result = await dispatch(
            employeeSlice.actions.fetchEmployees({
              location: locationId,
              month,
              year,
              page,
              limit: recordsPerPage,
              status: role === "siteincharge" ? "active" : undefined,
              cache: false,
            })
          ).unwrap();
          allEmployees = [...allEmployees, ...result.employees];
          hasMore = page < result.pagination.totalPages;
          page += 1;
        }

        if (role === "siteincharge") {
          await dispatch(
            employeeSlice.actions.fetchAllEmployees({ location: locationId, status: "active" })
          ).unwrap();
        }

        const employeeMap = new Map();
        allEmployees.forEach((emp) => {
          if (employeeMap.has(emp._id)) {
            const existing = employeeMap.get(emp._id);
            const mergedLeaves = [
              ...new Map(
                [...(existing.monthlyLeaves || []), ...(emp.monthlyLeaves || [])].map((ml) => [
                  `${ml.year}-${ml.month}`,
                  ml,
                ])
              ).values(),
            ];
            employeeMap.set(emp._id, { ...existing, ...emp, monthlyLeaves: mergedLeaves });
          } else {
            employeeMap.set(emp._id, { ...emp });
          }
        });
        dispatch(employeeSlice.actions.setEmployees(Array.from(employeeMap.values())));
      } catch (error) {
        toast.error("Failed to fetch employees.", { duration: 5000 });
      } finally {
        setIsFilterLoading(false);
      }
    };

    if (locationId && month && year) {
      fetchEmployeesData();
    }
  }, [dispatch, locationId, month, year, role, recordsPerPage]);

  useEffect(() => {
    if (!selectedDate || !locationId || locationId === "all") return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    dispatch(
      attendanceSlice.actions.fetchAttendance({
        date: dateStr,
        location: locationId,
        month,
        year,
        page: currentPage,
        limit: recordsPerPage,
        isDeleted: false,
      })
    ).catch((err) => {
      toast.error(err?.message || "Failed to fetch attendance data", { duration: 5000 });
    });
  }, [dispatch, selectedDate, locationId, month, year, currentPage, recordsPerPage]);

  const filteredEmployees = useMemo(() => {
    const sourceEmployees = role === "siteincharge" ? allEmployees : employees;
    return sourceEmployees.filter((emp) => {
      const matchesLocation = role === "siteincharge" || role === "super_admin" || emp.location?._id?.toString() === locationId;
      const matchesFilter = employeeFilter
        ? emp.name?.toLowerCase().includes(employeeFilter.toLowerCase()) ||
          emp.employeeId?.toLowerCase().includes(employeeFilter.toLowerCase())
        : true;
      return matchesLocation && matchesFilter;
    });
  }, [employees, allEmployees, employeeFilter, locationId, role]);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    return filteredEmployees.slice(startIndex, startIndex + recordsPerPage);
  }, [filteredEmployees, currentPage, recordsPerPage]);

  const existingAttendanceRecords = useMemo(() => {
    if (!selectedDate || !locationId || locationId === "all") return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return Array.isArray(salaryCalculations)
      ? salaryCalculations.filter((record) => record.date?.startsWith(dateStr))
      : [];
  }, [salaryCalculations, selectedDate, locationId]);

  const monthlyLeavesAvailable = useMemo(() => {
    if (!selectedDate || !locationId || locationId === "all") return {};
    const selectedMonth = parseInt(format(selectedDate, "M"));
    const selectedYear = parseInt(format(selectedDate, "yyyy"));
    const availableLeaves = {};
    const sourceEmployees = role === "siteincharge" ? allEmployees : employees;
    sourceEmployees.forEach((emp) => {
      const monthlyLeave = Array.isArray(emp.monthlyLeaves)
        ? emp.monthlyLeaves.find((leave) => leave.month === selectedMonth && leave.year === selectedYear)
        : null;
      availableLeaves[emp._id?.toString()] = monthlyLeave ? monthlyLeave.available || 0 : 0;
    });
    return availableLeaves;
  }, [employees, allEmployees, selectedDate, locationId, role]);

  const handleBulkSelect = (employeeId) => {
    setBulkSelectedEmployees((prev) => {
      const newSelection = prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId];
      setBulkEmployeeStatuses((prevStatuses) => {
        const newStatuses = { ...prevStatuses };
        if (!newSelection.includes(employeeId)) {
          delete newStatuses[employeeId];
        } else {
          newStatuses[employeeId] = "absent";
        }
        return newStatuses;
      });
      return newSelection;
    });
  };

  const handleBulkStatusChange = (employeeId, status) => {
    setBulkEmployeeStatuses((prev) => ({ ...prev, [employeeId]: status }));
  };

  const handleSelectAll = (checked) => {
    const allEmployeeIds = paginatedEmployees.map((emp) => emp._id.toString());
    setBulkSelectedEmployees((prev) => {
      const newSelection = checked ? [...new Set([...prev, ...allEmployeeIds])] : prev.filter((id) => !allEmployeeIds.includes(id));
      setBulkEmployeeStatuses((prevStatuses) => {
        const newStatuses = { ...prevStatuses };
        allEmployeeIds.forEach((id) => {
          if (checked) {
            newStatuses[id] = "absent";
          } else {
            delete newStatuses[id];
          }
        });
        return newStatuses;
      });
      return newSelection;
    });
  };

  const handleBulkSubmit = async (preview = false) => {
    if (!locationId || locationId === "all") {
      toast.error("Please select a specific location.", { duration: 5000 });
      return;
    }
    if (!selectedDate) {
      toast.error("Please select a valid date.", { duration: 5000 });
      return;
    }
    if (!selectedTime) {
      toast.error("Please select a valid time.", { duration: 5000 });
      return;
    }
    if (!filteredEmployees.length) {
      toast.error("No employees found for this location or filter.", { duration: 5000 });
      return;
    }

    const dateStr = getISTTimestamp(selectedDate, selectedTime);
    if (!dateStr) {
      toast.error("Invalid date or time selected.", { duration: 5000 });
      return;
    }

    const selectedRecords = bulkSelectedEmployees.map((employeeId) => ({
      employeeId,
      date: dateStr,
      status: bulkEmployeeStatuses[employeeId] || "absent",
      location: locationId,
    }));
    const remainingEmployees = filteredEmployees.filter((emp) => !bulkSelectedEmployees.includes(emp._id.toString()));
    const remainingRecords = remainingEmployees.map((emp) => ({
      employeeId: emp._id.toString(),
      date: dateStr,
      status: "present",
      location: locationId,
    }));

    if (!selectedRecords.length && !remainingRecords.length) {
      toast.error("No employees available to mark attendance.", { duration: 5000 });
      return;
    }

    dispatch(
      attendanceSlice.actions.fetchAttendance({ date: dateStr, location: locationId, isDeleted: false })
    )
      .unwrap()
      .then((existing = []) => {
        setBulkConfirmDialog({
          open: true,
          records: selectedRecords,
          remaining: remainingRecords,
          preview,
          overwrite: existing.length > 0 ? false : undefined,
          existingRecords: existing,
          invalidRecords: [],
        });
      })
      .catch((err) => {
        toast.error(err?.message || "Failed to check existing attendance", { duration: 5000 });
        setBulkConfirmDialog({
          open: true,
          records: selectedRecords,
          remaining: remainingRecords,
          preview,
          overwrite: undefined,
          existingRecords: [],
          invalidRecords: [],
        });
      });
  };

  const confirmBulkSubmit = async () => {
    const uniqueId = `bulk-confirm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    try {
      const { records, remaining, overwrite } = bulkConfirmDialog;
      const attendanceData = [...records, ...remaining];
      if (!attendanceData.length) {
        throw new Error("No attendance records to submit");
      }

      const validatedData = attendanceData.map((record) => {
        const employee = (role === "siteincharge" ? allEmployees : employees).find(
          (emp) => emp._id.toString() === record.employeeId
        );
        if (!employee) throw new Error(`Employee not found: ${record.employeeId}`);
        if (!record.date || isNaN(new Date(record.date).getTime())) {
          throw new Error(`Invalid date for employee ${record.employeeId}: ${record.date}`);
        }
        return {
          employeeId: record.employeeId,
          date: record.date,
          status: record.status,
          location: record.location,
        };
      });

      const result = await dispatch(
        attendanceSlice.actions.bulkMarkAttendance({
          attendance: validatedData,
          overwrite: overwrite || false,
        })
      ).unwrap();

      const statusCounts = validatedData.reduce(
        (acc, record) => ({
          ...acc,
          [record.status]: (acc[record.status] || 0) + 1,
        }),
        {}
      );
      const statusMessage = Object.entries(statusCounts)
        .map(([status, count]) => `${count} as ${status}`)
        .join(", ");

      toast.success(
        records.length > 0
          ? `Marked ${records.length} employee(s): ${statusMessage}, and ${remaining.length} as Present`
          : `Marked all ${remaining.length} employee(s) as Present`,
        {
          id: `bulk-attendance-success-${uniqueId}`,
          duration: 10000,
          position: "top-center",
          action: role === "siteincharge" && {
            label: "Undo",
            onClick: () => {
              const undoUniqueId = `undo-${uniqueId}`;
              dispatch(attendanceSlice.actions.undoAttendance({ attendanceIds: result.attendanceIds || [] }))
                .unwrap()
                .then(() => toast.success("Attendance marking undone", { id: `undo-attendance-success-${undoUniqueId}`, duration: 10000 }))
                .catch(() => toast.error("Failed to undo attendance", { id: `undo-attendance-error-${undoUniqueId}`, duration: 5000 }));
            },
          },
        }
      );

      setBulkSelectedEmployees([]);
      setBulkEmployeeStatuses({});
      setEmployeeFilter("");
      setCurrentPage(1);
      setBulkConfirmDialog({
        open: false,
        records: [],
        remaining: [],
        preview: false,
        overwrite: undefined,
        existingRecords: [],
        invalidRecords: [],
      });

      const dateStr = validatedData[0]?.date || getISTTimestamp(selectedDate, selectedTime);
      dispatch(
        attendanceSlice.actions.fetchAttendance({ date: dateStr, location: locationId, isDeleted: false })
      );
    } catch (error) {
      let userFriendlyMessage = error.message || "Failed to mark attendance";
      if (error.message.includes("insufficient leaves")) {
        userFriendlyMessage = error.message;
      } else if (error.message.includes("already marked") || error.message.includes("E11000 duplicate key")) {
        userFriendlyMessage = `Attendance already marked for selected employees on ${format(selectedDate, "PPP")}.`;
      }
      toast.error(userFriendlyMessage, { id: `bulk-attendance-error-${uniqueId}`, duration: 5000 });
    }
  };

  const handleDateSelect = (date) => {
    if (date > new Date()) {
      toast.error("Cannot select a future date", { duration: 5000 });
      return;
    }
    setSelectedDate(date);
    setDisplayMonth(startOfMonth(date));
    setCurrentPage(1);
    const newMonth = date.getMonth() + 1;
    const newYear = date.getFullYear();
    if (newMonth !== month || newYear !== year) {
      setMonth(newMonth);
      setYear(newYear);
    }
  };

  const handleMonthChange = (newMonth) => {
    const newDate = new Date(year, parseInt(newMonth) - 1, 1);
    const today = startOfDay(new Date());
    if (isBefore(today, newDate)) {
      toast.error("Cannot select a future month", { duration: 5000 });
      return;
    }
    setMonth(parseInt(newMonth));
    setSelectedDate(newDate);
    setDisplayMonth(startOfMonth(newDate));
    setCurrentPage(1);
  };

  return {
    user,
    employees: role === "siteincharge" ? allEmployees : employees,
    filteredEmployees,
    paginatedEmployees,
    empLoading,
    isFilterLoading,
    locations,
    locationsLoading,
    salaryCalculations,
    loading,
    pagination,
    selectedDate,
    setSelectedDate,
    displayMonth,
    setDisplayMonth,
    selectedTime,
    bulkSelectedEmployees,
    setBulkSelectedEmployees,
    bulkEmployeeStatuses,
    setBulkEmployeeStatuses,
    bulkConfirmDialog,
    setBulkConfirmDialog,
    employeeFilter,
    setEmployeeFilter,
    currentPage,
    setCurrentPage,
    recordsPerPage,
    monthlyLeavesAvailable,
    getOCLeaves,
    getISTTimestamp,
    handleBulkSelect,
    handleBulkStatusChange,
    handleSelectAll,
    handleBulkSubmit,
    confirmBulkSubmit,
    handleDateSelect,
    handleMonthChange,
    existingAttendanceRecords,
  };
};

export default useAttendance;