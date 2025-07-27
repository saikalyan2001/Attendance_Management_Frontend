import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  bulkMarkAttendance,
  fetchAttendance,
  calculateSalaryImpact,
  undoAttendance,
} from "../redux/attendanceSlice";
import { fetchEmployees, fetchAllEmployees, fetchSettings } from "../redux/employeeSlice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { format, parse, isBefore, startOfDay, startOfMonth } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  CalendarIcon,
  Loader2,
  CheckCircle2,
  Users,
  Search,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MarkAttendance = ({ month, year, setMonth, setYear, locationId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { employees, allEmployees, loading: empLoading, pagination } = useSelector(
    (state) => state.siteInchargeEmployee
  );
  const { loading, salaryCalculations } = useSelector(
    (state) => state.siteInchargeAttendance
  );
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = startOfDay(new Date());
    return new Date(year, month - 1, 1) > today
      ? today
      : new Date(year, month - 1, 1);
  });
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(selectedDate));
  const [selectedTime, setSelectedTime] = useState(
    format(new Date(), "HH:mm:ss")
  );
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
  const recordsPerPage = pagination.limit || 10;
  const { settings } = useSelector((state) => state.siteInchargeEmployee);


  const getISTTimestamp = (date, time) => {
    if (!date || !time) return null;
    const parsedTime = parse(time, "HH:mm:ss", new Date());
    if (isNaN(parsedTime.getTime())) return null;
    const [hours, minutes, seconds] = [
      parsedTime.getHours(),
      parsedTime.getMinutes(),
      parsedTime.getSeconds(),
    ];
    const dateTime = new Date(date);
    dateTime.setHours(hours, minutes, seconds, 0);
    const istTime = toZonedTime(dateTime, "Asia/Kolkata");
    return format(istTime, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", {
      timeZone: "Asia/Kolkata",
    });
  };

const getOCLeaves = (employee, month, year) => {
  const paidLeavesPerMonth = (settings?.paidLeavesPerYear || 24) / 12;
  const monthlyLeaves = Array.isArray(employee.monthlyLeaves) ? employee.monthlyLeaves : [];
  const monthlyLeave = monthlyLeaves.find((ml) => ml.year === year && ml.month === month) || {
    allocated: paidLeavesPerMonth,
    available: paidLeavesPerMonth, // Default to allocated if no entry exists
    carriedForward: 0,
    taken: 0,
  };
  const openingLeaves = (monthlyLeave.carriedForward || 0) + (monthlyLeave.allocated || paidLeavesPerMonth);
  const closingLeaves = Math.max(monthlyLeave.available || paidLeavesPerMonth, 0);
  return `${openingLeaves.toFixed(1)}/${closingLeaves.toFixed(1)}`;
};

  const existingAttendanceRecords = useMemo(() => {
    if (!selectedDate || !locationId) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return Array.isArray(salaryCalculations)
      ? salaryCalculations.filter(
          (record) =>
            record.date &&
            typeof record.date === "string" &&
            record.date.startsWith(dateStr)
        )
      : [];
  }, [salaryCalculations, selectedDate, locationId]);

 
  useEffect(() => {
    if (locationId && month && year) {
      setIsFilterLoading(true);
      // Sequentialize the fetch calls to avoid concurrent updates
      dispatch(fetchEmployees({ location: locationId, status: 'active', page: currentPage, cache: false }))
        .unwrap()
        .then(() => 
          dispatch(fetchAllEmployees({ location: locationId, status: 'active' }))
            .unwrap()
        )
        .catch((err) => {
          console.error("Failed to fetch employees or all employees:", err);
          toast.error("Failed to load employee data", {
            id: `fetch-employees-error-${Date.now()}`,
            duration: 5000,
            position: "top-center",
          });
        })
        .finally(() => setIsFilterLoading(false));
    }
  }, [dispatch, locationId, month, year, currentPage]);

  useEffect(() => {
    const newDate = new Date(year, month - 1, 1);
    const today = startOfDay(new Date());
    if (isBefore(today, newDate)) {
      setSelectedDate(today);
      setDisplayMonth(startOfMonth(today));
      toast.error("Selected month is in the future. Reverted to current date.", {
        id: `future-month-warning-${month}-${year}`,
        duration: 5000,
        position: "top-center",
      });
    } else {
      setSelectedDate(newDate);
      setDisplayMonth(startOfMonth(newDate));
    }
  }, [month, year]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedTime(format(new Date(), "HH:mm:ss"));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user || user.role !== "siteincharge") {
      toast.error("Unauthorized access. Please log in as a site incharge.", {
        id: "no-auth-error",
        duration: 5000,
        position: "top-center",
      });
      navigate("/login");
      return;
    }
    if (!locationId) {
      toast.error("No location assigned. Please contact admin.", {
        id: "no-location-error",
        duration: 5000,
        position: "top-center",
      });
      navigate("/siteincharge/dashboard");
      return;
    }
  }, [dispatch, user, navigate, locationId]);

  useEffect(() => {
  dispatch(fetchSettings());
}, [dispatch]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(employeeFilter.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(employeeFilter.toLowerCase())
    );
  }, [employees, employeeFilter]);

  const paginatedEmployees = useMemo(() => {
    return filteredEmployees;
  }, [filteredEmployees]);

  const totalPages = pagination.totalPages || 1;

  const getPageNumbers = () => {
    const maxPagesToShow = 5;
    const pages = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const tryFetchEmployees = async (maxRetries = 3) => {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        await dispatch(
          fetchEmployees({ location: locationId, status: 'active', page: currentPage, cache: false })
        ).unwrap();
        return true;
      } catch (error) {
        retries++;
        console.warn(
          `Failed to fetch employees, retrying (${retries}/${maxRetries}):`,
          error
        );
        if (retries === maxRetries) {
          console.error("Max retries reached for fetching employees");
          return false;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, retries))
        );
      }
    }
    return false;
  };

  const tryFetchAllEmployees = async (maxRetries = 3) => {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        await dispatch(
          fetchAllEmployees({ location: locationId, status: 'active' })
        ).unwrap();
        return true;
      } catch (error) {
        retries++;
        console.warn(
          `Failed to fetch all employees, retrying (${retries}/${maxRetries}):`,
          error
        );
        if (retries === maxRetries) {
          console.error("Max retries reached for fetching all employees");
          return false;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, retries))
        );
      }
    }
    return false;
  };

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
    setBulkEmployeeStatuses((prev) => ({
      ...prev,
      [employeeId]: status,
    }));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allEmployeeIds = paginatedEmployees.map((emp) => emp._id.toString());
      setBulkSelectedEmployees((prev) => {
        const newSelection = [...new Set([...prev, ...allEmployeeIds])];
        setBulkEmployeeStatuses((prevStatuses) => {
          const newStatuses = { ...prevStatuses };
          allEmployeeIds.forEach((id) => {
            if (!newStatuses[id]) newStatuses[id] = "absent";
          });
          return newStatuses;
        });
        return newSelection;
      });
    } else {
      setBulkSelectedEmployees((prev) =>
        prev.filter((id) => !paginatedEmployees.some((emp) => emp._id.toString() === id))
      );
      setBulkEmployeeStatuses((prev) => {
        const newStatuses = { ...prev };
        paginatedEmployees.forEach((emp) => {
          delete newStatuses[emp._id.toString()];
        });
        return newStatuses;
      });
    }
  };

  const handleBulkSubmit = async (preview = false) => {
    if (!allEmployees.length) {
      toast.error("No employees available", {
        id: "no-employees-error",
        duration: 5000,
        position: "top-center",
      });
      return;
    }
    if (!selectedDate) {
      toast.error("Please select a date", {
        id: "no-date-error",
        duration: 5000,
        position: "top-center",
      });
      return;
    }
    if (!selectedTime) {
      toast.error("Please select a valid time", {
        id: "no-time-error",
        duration: 5000,
        position: "top-center",
      });
      return;
    }

    const dateStr = getISTTimestamp(selectedDate, selectedTime);
    if (!dateStr) {
      toast.error("Invalid date or time selected", {
        id: "invalid-date-time-error",
        duration: 5000,
        position: "top-center",
      });
      return;
    }

    // Use allEmployees instead of filteredEmployees
    const selectedRecords = bulkSelectedEmployees.map((employeeId) => ({
      employeeId,
      date: dateStr,
      status: bulkEmployeeStatuses[employeeId] || "absent",
      location: locationId,
    }));
    const remainingEmployees = allEmployees.filter(
      (emp) => !bulkSelectedEmployees.includes(emp._id.toString())
    );
    const remainingRecords = remainingEmployees.map((emp) => ({
      employeeId: emp._id.toString(),
      date: dateStr,
      status: "present",
      location: locationId,
    }));

    dispatch(
      fetchAttendance({ date: dateStr, location: locationId, isDeleted: false })
    )
      .unwrap()
      .then((existing = []) => {
        setBulkConfirmDialog({
          open: true,
          records: selectedRecords,
          remaining: remainingRecords,
          preview,
          overwrite:
            Array.isArray(existing) && existing.length > 0 ? false : undefined,
          existingRecords:
            Array.isArray(existing) && existing.length > 0 ? existing : [],
          invalidRecords: [],
        });
      })
      .catch((err) => {
        console.error("Fetch attendance error:", err);
        toast.error(err?.message || "Failed to check existing attendance", {
          id: `fetch-attendance-error-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          duration: 5000,
          position: "top-center",
        });
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
    const uniqueId = `bulk-confirm-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    try {
      const { records, remaining, overwrite } = bulkConfirmDialog;
      const attendanceData = [...records, ...remaining];
      if (!attendanceData.length)
        throw new Error("No attendance records to submit");

      const validatedData = attendanceData.map((record) => {
        const employee = allEmployees.find(
          (emp) => emp._id.toString() === record.employeeId
        );
        if (!employee) throw new Error(`Employee not found: ${record.employeeId}`);
        if (!record.date || isNaN(new Date(record.date).getTime())) {
          throw new Error(
            `Invalid date for employee ${record.employeeId}: ${record.date}`
          );
        }
        return {
          employeeId: record.employeeId,
          date: format(toZonedTime(new Date(record.date), "Asia/Kolkata"), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
          status: record.status,
          location: record.location,
        };
      });

      const result = await dispatch(
        bulkMarkAttendance({
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
          action: {
            label: "Undo",
            onClick: () => {
              const undoUniqueId = `undo-${uniqueId}`;
              dispatch(
                undoAttendance({ attendanceIds: result.attendanceIds || [] })
              )
                .unwrap()
                .then(() =>
                  toast.success("Attendance marking undone", {
                    id: `undo-attendance-success-${undoUniqueId}`,
                    duration: 10000,
                    position: "top-center",
                  })
                )
                .catch(() =>
                  toast.error("Failed to undo attendance", {
                    id: `undo-attendance-error-${undoUniqueId}`,
                    duration: 5000,
                    position: "top-center",
                  })
                );
            },
          },
        }
      );

      // Force refresh employee data
      dispatch({ type: "siteInchargeEmployee/reset" });
      dispatch({ type: "siteInchargeAttendance/reset" });

      const fetchSuccess = await Promise.all([
        tryFetchEmployees(),
        tryFetchAllEmployees(),
      ]);
      if (!fetchSuccess.every(Boolean)) {
        console.error("Failed to fetch updated employee data after retries");
        toast.warning(
          "Attendance marked, but leave balances may not update in UI. Please refresh.",
          {
            id: `leave-balances-warning-${uniqueId}`,
            duration: 5000,
            position: "top-center",
          }
        );
      }

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

      const dateStr =
        validatedData[0]?.date || getISTTimestamp(selectedDate, selectedTime);
      dispatch(
        fetchAttendance({ date: dateStr, location: locationId, isDeleted: false })
      );
    } catch (error) {
      console.error("Bulk submit error:", error);
      let userFriendlyMessage = error.message || "Failed to mark attendance";
      if (error.message.includes("insufficient leaves")) {
        userFriendlyMessage = error.message;
      } else if (
        error.message.includes("already marked") ||
        error.message.includes("E11000 duplicate key")
      ) {
        userFriendlyMessage = `Attendance already marked for selected employees on ${format(
          selectedDate,
          "PPP"
        )}. Please use overwrite option or select a different date.`;
      }
      toast.error(userFriendlyMessage, {
        id: `bulk-attendance-error-${uniqueId}`,
        duration: 5000,
        position: "top-center",
      });
    }
  };

  const handleDateSelect = (date) => {
    if (date > new Date()) {
      toast.error("Cannot select a future date", {
        id: `future-date-error-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`,
        duration: 5000,
        position: "top-center",
      });
      return;
    }
    setSelectedDate(date);
    setDisplayMonth(startOfMonth(date));
    setCurrentPage(1);
    // Update month and year filters to match selected date
    const newMonth = date.getMonth() + 1;
    const newYear = date.getFullYear();
    if (newMonth !== month || newYear !== year) {
      setMonth(newMonth);
      setYear(newYear);
    }
  };

  const handleMonthChange = (newMonth) => {
    if (newMonth > new Date()) {
      toast.info("Cannot navigate to future months", {
        id: `future-month-nav-warning-${Date.now()}`,
        duration: 5000,
        position: "top-center",
      });
      return;
    }
    setDisplayMonth(startOfMonth(newMonth));
    // Update selectedDate to first valid date of new month
    const newDate = new Date(newMonth);
    const today = startOfDay(new Date());
    setSelectedDate(isBefore(today, newDate) ? today : newDate);
    setCurrentPage(1);
    // Update month and year filters
    const newMonthValue = newDate.getMonth() + 1;
    const newYearValue = newDate.getFullYear();
    if (newMonthValue !== month || newYearValue !== year) {
      setMonth(newMonthValue);
      setYear(newYearValue);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "present":
        return <CheckCircle2 className="h-4 w-4 text-green" />;
      case "absent":
        return <X className="h-4 w-4 text-error" />;
      case "leave":
        return <Users className="h-4 w-4 text-yellow" />;
      case "half-day":
        return <Users className="h-4 w-4 text-accent" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-4 animate-fade-in">
      {(loading || isFilterLoading) && (
        <div className="fixed inset-0 bg-overlay flex justify-center items-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}
      <Card className="bg-body text-body border border-complementary rounded-lg shadow-md">
        <CardHeader className="border-b border-complementary">
          <CardTitle className="text-2xl font-bold text-body">
            Mark Bulk Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {existingAttendanceRecords.length > 0 && (
            <Alert className="border-error bg-body text-error rounded-md p-3 animate-pulse">
              <AlertDescription>
                Attendance already marked for {existingAttendanceRecords.length}{" "}
                employee(s) on {format(selectedDate, "PPP")}. Please select a
                different date or use overwrite option.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="month"
                className="text-sm font-semibold text-body"
              >
                Month
              </Label>
              <Select
                value={month.toString()}
                onValueChange={(val) => {
                  setIsFilterLoading(true);
                  setMonth(parseInt(val));
                  setCurrentPage(1);
                }}
                disabled={isFilterLoading}
              >
                <SelectTrigger
                  id="month"
                  className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md"
                >
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  {Array.from({ length: 12 }, (_, i) => ({
                    value: i + 1,
                    label: format(new Date(2025, i, 1), "MMM"),
                  })).map((obj) => (
                    <SelectItem
                      key={obj.value}
                      value={obj.value.toString()}
                      className="text-sm hover:bg-accent-light"
                    >
                      {obj.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="year"
                className="text-sm font-semibold text-body"
              >
                Year
              </Label>
              <Select
                value={year.toString()}
                onValueChange={(val) => {
                  setIsFilterLoading(true);
                  setYear(parseInt(val));
                  setCurrentPage(1);
                }}
                disabled={isFilterLoading}
              >
                <SelectTrigger
                  id="year"
                  className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md"
                >
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  {[2024, 2025, 2026].map((y) => (
                    <SelectItem
                      key={y}
                      value={y.toString()}
                      className="text-sm hover:bg-accent-light"
                    >
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="location"
                className="text-sm font-semibold text-body"
              >
                Location
              </Label>
              <Select value={locationId || "none"} disabled>
                <SelectTrigger
                  id="location"
                  className="bg-body text-body border-complementary h-10 rounded-md"
                >
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  <SelectItem
                    value="none"
                    className="text-sm hover:bg-accent-light"
                  >
                    No Location
                  </SelectItem>
                  {user?.locations?.map((loc) => (
                    <SelectItem
                      key={loc._id}
                      value={loc._id}
                      className="text-sm hover:bg-accent-light"
                    >
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="date"
                className="text-sm font-semibold text-body"
              >
                Select Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-semibold bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md truncate"
                    disabled={!locationId || isFilterLoading}
                    aria-label="Select date for marking attendance"
                  >
                    <CalendarIcon className="mr-2 h-5 w-5 text-complementary flex-shrink-0" />
                    <span className="truncate">
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-body text-body">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    month={displayMonth}
                    onMonthChange={handleMonthChange}
                    initialFocus
                    disabled={(date) => date > new Date()}
                    className="border border-complementary rounded-md text-sm"
                    modifiers={{
                      selected: selectedDate,
                    }}
                    modifiersClassNames={{
                      selected:
                        "bg-accent text-body font-bold border-2 border-accent rounded-full",
                      today:
                        "bg-complementary-light text-body border border-complementary rounded-full",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="time"
                className="text-sm font-semibold text-body"
              >
                Current Time (IST)
              </Label>
              <Input
                id="time"
                value={selectedTime}
                readOnly
                className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md cursor-default select-none"
                disabled={!locationId || !selectedDate || isFilterLoading}
                aria-label="Current time in IST"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label
                htmlFor="employeeFilter"
                className="text-sm font-semibold text-body"
              >
                Filter Employees
              </Label>
              <div className="relative">
                <Input
                  id="employeeFilter"
                  placeholder="Search by name or employee ID..."
                  value={employeeFilter}
                  onChange={(e) => {
                    setEmployeeFilter(e.target.value);
                    setCurrentPage(1);
                    dispatch(fetchEmployees({ location: locationId, status: 'active', page: 1, cache: false }));
                  }}
                  className="w-full pl-10 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md"
                  disabled={isFilterLoading}
                  aria-label="Filter employees by name or id"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-complementary" />
              </div>
            </div>
            <div className="flex items-center gap-2 bg-complementary rounded-md p-1">
              <Button
                className="bg-accent text-body hover:bg-accent-hover rounded-md px-3 py-2 text-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={isFilterLoading}
                aria-label="Bulk marking mode"
              >
                <Users className="h-4 w-4" />
                Bulk Mode
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-body">
                  {bulkSelectedEmployees.length} employee
                  {bulkSelectedEmployees.length !== 1 ? "s" : ""} selected
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm text-complementary underline cursor-help">
                        Detail
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="bg-body text-body border-complementary text-sm max-w-xs">
                      <p>
                        Selected employees will be marked as Absent (or chosen
                        status) upon submission. Unselected employees will be
                        marked as Present.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => handleBulkSubmit(true)}
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent-light hover:text-body text-sm py-2 px-3 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={
                    loading ||
                    empLoading ||
                    isFilterLoading ||
                    !locationId ||
                    !selectedDate ||
                    !selectedTime
                  }
                  aria-label="Preview bulk attendance changes"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button
                  onClick={() => handleBulkSubmit(false)}
                  className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-3 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={
                    loading ||
                    empLoading ||
                    isFilterLoading ||
                    !locationId ||
                    !selectedDate ||
                    !selectedTime
                  }
                  aria-label="Mark attendance for selected employees"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Mark Attendance
                    </>
                  )}
                </Button>
              </div>
            </div>
            {empLoading || isFilterLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : paginatedEmployees.length > 0 ? (
              <div className="space-y-4">
                <div className="max-h-[400px] overflow-y-auto border border-complementary rounded-md shadow-sm relative">
                  <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
                  <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-complementary to-transparent pointer-events-none" />
                  <Table className="min-w-[600px]">
                    <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                      <TableRow>
                        <TableHead className="text-body text-sm w-12">
                          <Checkbox
                            checked={
                              paginatedEmployees.every((emp) =>
                                bulkSelectedEmployees.includes(emp._id.toString())
                              ) && paginatedEmployees.length > 0
                            }
                            onCheckedChange={handleSelectAll}
                            disabled={!locationId || isFilterLoading}
                            className="h-5 w-5 border-complementary"
                            aria-label="Select all employees on current page for bulk marking"
                          />
                        </TableHead>
                        <TableHead className="text-body text-sm">
                          Employee
                        </TableHead>
                        <TableHead className="text-body text-sm">
                          Status
                        </TableHead>
                        <TableHead className="text-body text-sm">
                          O/C Leaves
                        </TableHead>
                        <TableHead className="text-body text-sm">
                          Monthly Leaves Available
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEmployees.map((emp, index) => {
                        const monthlyLeaves = Array.isArray(emp.monthlyLeaves)
                          ? emp.monthlyLeaves.find(
                              (record) => record.month === month && record.year === year
                            )?.available || 0
                          : 0;
                        return (
                          <TableRow
                            key={emp._id}
                            className={`${
                              index % 2 === 0
                                ? "bg-body"
                                : "bg-complementary-light"
                            } animate-slide-in-row`}
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            <TableCell className="whitespace-nowrap">
                              <Checkbox
                                checked={bulkSelectedEmployees.includes(
                                  emp._id.toString()
                                )}
                                onCheckedChange={() =>
                                  handleBulkSelect(emp._id.toString())
                                }
                                disabled={!locationId || isFilterLoading}
                                className="h-5 w-5 border-complementary"
                                aria-label={`Select ${emp.name} for bulk marking`}
                              />
                            </TableCell>
                            <TableCell className="text-body text-sm whitespace-nowrap">
                              {emp.name} ({emp.employeeId})
                            </TableCell>
                            <TableCell className="text-body whitespace-nowrap">
                              <Select
                                value={
                                  bulkSelectedEmployees.includes(emp._id.toString())
                                    ? bulkEmployeeStatuses[emp._id.toString()] ||
                                      "absent"
                                    : "present"
                                }
                                onValueChange={(value) =>
                                  handleBulkStatusChange(emp._id.toString(), value)
                                }
                                disabled={
                                  !bulkSelectedEmployees.includes(
                                    emp._id.toString()
                                  ) ||
                                  !locationId ||
                                  isFilterLoading
                                }
                              >
                                <SelectTrigger
                                  className="w-full sm:w-32 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md"
                                  aria-label={`Select status for ${emp.name}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-body text-body border-complementary">
                                  <SelectItem
                                    value="present"
                                    className="text-sm hover:bg-accent-light"
                                  >
                                    Present
                                  </SelectItem>
                                  <SelectItem
                                    value="absent"
                                    className="text-sm hover:bg-accent-light"
                                  >
                                    Absent
                                  </SelectItem>
                                  <SelectItem
                                    value="half-day"
                                    className="text-sm hover:bg-accent-light"
                                  >
                                    Half Day
                                  </SelectItem>
                                  <SelectItem
                                    value="leave"
                                    disabled={monthlyLeaves < 1}
                                    className="text-sm hover:bg-accent-light"
                                  >
                                    Leave
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-body text-sm whitespace-nowrap">
                              {getOCLeaves(emp, month, year)}
                            </TableCell>
                            <TableCell className="text-body text-sm whitespace-nowrap">
                              {monthlyLeaves}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const prevPage = Math.max(currentPage - 1, 1);
                        setCurrentPage(prevPage);
                        dispatch(fetchEmployees({ location: locationId, status: 'active', page: prevPage, cache: false }));
                      }}
                      disabled={currentPage === 1}
                      className="border-complementary text-body hover:bg-complementary-light text-sm p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {getPageNumbers().map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        onClick={() => {
                          setCurrentPage(page);
                          dispatch(fetchEmployees({ location: locationId, status: 'active', page, cache: false }));
                        }}
                        className={`${
                          currentPage === page
                            ? "bg-accent text-body hover:bg-accent-hover"
                            : "border-complementary text-body hover:bg-complementary-light"
                        } text-sm w-10 h-10 rounded-md`}
                        aria-label={`Go to page ${page}`}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => {
                        const nextPage = Math.min(currentPage + 1, totalPages);
                        setCurrentPage(nextPage);
                        dispatch(fetchEmployees({ location: locationId, status: 'active', page: nextPage, cache: false }));
                      }}
                      disabled={currentPage === totalPages}
                      className="border-complementary text-body hover:bg-complementary-light text-sm p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-body text-sm text-center py-4">
                No employees found for this location. Please check the location or
                add employees.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={bulkConfirmDialog.open}
        onOpenChange={(open) =>
          !open &&
          setBulkConfirmDialog({
            open: false,
            records: [],
            remaining: [],
            preview: false,
            overwrite: undefined,
            existingRecords: [],
            invalidRecords: [],
          })
        }
      >
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-2xl animate-scale-in">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-body">
              {bulkConfirmDialog.overwrite
                ? "Overwrite Existing Attendance?"
                : bulkConfirmDialog.preview
                ? "Preview Bulk Attendance"
                : bulkConfirmDialog.invalidRecords.length > 0
                ? "Invalid Attendance Records"
                : "Confirm Bulk Attendance"}
            </DialogTitle>
            <DialogDescription className="text-body">
              {bulkConfirmDialog.overwrite
                ? `Attendance already exists for ${
                    bulkConfirmDialog.existingRecords.length
                  } employee(s) on ${format(selectedDate, "PPP")}. Overwrite?`
                : bulkConfirmDialog.preview
                ? `Review the attendance records before submitting.`
                : bulkConfirmDialog.invalidRecords.length > 0
                ? `The following records are invalid and cannot be submitted.`
                : `Please confirm the attendance records to be submitted.`}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {bulkConfirmDialog.invalidRecords.length > 0 ? (
              <div>
                <p className="text-sm font-semibold text-error">
                  Invalid Records:
                </p>
                <div className="mt-2 max-h-40 overflow-y-auto border border-error rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-body text-sm">
                          Employee ID
                        </TableHead>
                        <TableHead className="text-body text-sm">
                          Error
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkConfirmDialog.invalidRecords.map((record, index) => (
                        <TableRow
                          key={index}
                          className={`${
                            index % 2 === 0
                              ? "bg-body"
                              : "bg-complementary-light"
                          } animate-slide-in-row`}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <TableCell className="text-body text-sm">
                            {record.employeeId}
                          </TableCell>
                          <TableCell className="text-body text-sm">
                            {record.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm font-semibold text-body">
                    Selected Employees:
                  </p>
                  <div className="mt-2 max-h-40 overflow-y-auto border border-complementary rounded-md">
                    <Table>
                      <TableHeader className="sticky top-0 bg-complementary">
                        <TableRow>
                          <TableHead className="text-body text-sm">
                            Employee ID
                          </TableHead>
                          <TableHead className="text-body text-sm">
                            Name
                          </TableHead>
                          <TableHead className="text-body text-sm">
                            Status
                          </TableHead>
                          <TableHead className="text-body text-sm">
                            Timestamp
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkConfirmDialog.records.map((record, index) => {
                          const employee = allEmployees.find(
                            (emp) => emp._id.toString() === record.employeeId
                          );
                          return (
                            <TableRow
                              key={index}
                              className={`${
                                index % 2 === 0
                                  ? "bg-body"
                                  : "bg-complementary-light"
                              } animate-slide-in-row`}
                              style={{ animationDelay: `${index * 0.05}s` }}
                            >
                              <TableCell className="text-body text-sm">
                                {employee?.employeeId || "N/A"}
                              </TableCell>
                              <TableCell className="text-body text-sm">
                                {employee?.name || "Unknown"}
                              </TableCell>
                              <TableCell className="text-body text-sm">
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(record.status)}
                                  {record.status.charAt(0).toUpperCase() +
                                    record.status.slice(1)}
                                </span>
                              </TableCell>
                              <TableCell className="text-body text-sm">
                                {format(
                                  toZonedTime(
                                    new Date(record.date),
                                    "Asia/Kolkata"
                                  ),
                                  "PPP hh:mm:ss a"
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-body">
                    Remaining Employees (Marked as Present):
                  </p>
                  <div className="mt-2 max-h-40 overflow-y-auto border border-complementary rounded-md">
                    <Table>
                      <TableHeader className="sticky top-0 bg-complementary">
                        <TableRow>
                          <TableHead className="text-body text-sm">
                            Employee ID
                          </TableHead>
                          <TableHead className="text-body text-sm">
                            Name
                          </TableHead>
                          <TableHead className="text-body text-sm">
                            Status
                          </TableHead>
                          <TableHead className="text-body text-sm">
                            Timestamp
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkConfirmDialog.remaining.map((record, index) => {
                          const employee = allEmployees.find(
                            (emp) => emp._id.toString() === record.employeeId
                          );
                          return (
                            <TableRow
                              key={index}
                              className={`${
                                index % 2 === 0
                                  ? "bg-body"
                                  : "bg-complementary-light"
                              } animate-slide-in-row`}
                              style={{
                                animationDelay: `${
                                  (index + bulkConfirmDialog.records.length) * 0.05
                                }s`,
                              }}
                            >
                              <TableCell className="text-body text-sm">
                                {employee?.employeeId || "N/A"}
                              </TableCell>
                              <TableCell className="text-body text-sm">
                                {employee?.name || "Unknown"}
                              </TableCell>
                              <TableCell className="text-body text-sm">
                                <span className="flex items-center gap-1">
                                  {getStatusIcon("present")}
                                  Present
                                </span>
                              </TableCell>
                              <TableCell className="text-body text-sm">
                                {format(
                                  toZonedTime(
                                    new Date(record.date),
                                    "Asia/Kolkata"
                                  ),
                                  "PPP hh:mm:ss a"
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setBulkConfirmDialog({
                  open: false,
                  records: [],
                  remaining: [],
                  preview: false,
                  overwrite: undefined,
                  existingRecords: [],
                  invalidRecords: [],
                })
              }
              className="border-complementary text-body hover:bg-complementary-light text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={loading}
            >
              {bulkConfirmDialog.preview ||
              bulkConfirmDialog.overwrite ||
              bulkConfirmDialog.invalidRecords.length > 0
                ? "Cancel"
                : "Close"}
            </Button>
            {!bulkConfirmDialog.preview &&
              bulkConfirmDialog.invalidRecords.length === 0 && (
                <Button
                  onClick={confirmBulkSubmit}
                  className="bg-accent text-body hover:bg-accent-hover text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : bulkConfirmDialog.overwrite ? (
                    "Overwrite"
                  ) : (
                    "Confirm"
                  )}
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarkAttendance;
