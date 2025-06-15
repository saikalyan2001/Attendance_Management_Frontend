// src/features/admin/attendance/MarkAttendance.jsx
import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  markAttendance,
  bulkMarkAttendance,
  undoMarkAttendance,
  fetchAttendance,
} from "../redux/attendanceSlice";
import { fetchEmployees } from "../redux/employeeSlice";
import { fetchLocations } from "../redux/locationsSlice";
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
import { format } from "date-fns";
import {
  CalendarIcon,
  Loader2,
  CheckCircle2,
  Users,
  User,
  Search,
  X,
  Eye,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MarkAttendance = ({
  month,
  year,
  location,
  setLocation,
  selectedDate,
  setSelectedDate,
  setMonth,
  setYear,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { employees, loading: empLoading } = useSelector(
    (state) => state.adminEmployees
  );
  const { locations, loading: locationsLoading } = useSelector(
    (state) => state.adminLocations
  );
  const { loading, attendance } = useSelector((state) => state.adminAttendance);

  const [attendanceData, setAttendanceData] = useState({});
  const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState([]);
  const [bulkEmployeeStatuses, setBulkEmployeeStatuses] = useState({});
  const [bulkConfirmDialog, setBulkConfirmDialog] = useState({
    open: false,
    records: [],
    remaining: [],
    preview: false,
  });
  const [individualConfirmDialog, setIndividualConfirmDialog] = useState({
    open: false,
    records: [],
    preview: false,
  });
  const [overwriteConfirmDialog, setOverwriteConfirmDialog] = useState({
    open: false,
    records: [],
    mode: null,
    preview: false,
  });
  const [isBulkMode, setIsBulkMode] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [lastAttendanceIds, setLastAttendanceIds] = useState([]);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!user || user.role !== "admin") {
      toast.error("Unauthorized access. Please log in as an admin.", {
        duration: 5000,
        style: { background: "#FEE2E2", color: "#991B1B" }, // Error styling
      });
      navigate("/login");
      return;
    }
    dispatch(fetchLocations());
    if (location && location !== "all") {
      dispatch(fetchEmployees({ location }));
    }
  }, [dispatch, user, navigate, location]);

useEffect(() => {
  if (!selectedDate || !location || location === 'all') return;

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  dispatch(fetchAttendance({
    date: dateStr,
    location,
  })).then((result) => {
    if (fetchAttendance.rejected.match(result)) {
      console.error('fetchAttendance error in MarkAttendance:', {
        error: result.error,
        payload: result.payload,
        params: { date: dateStr, location },
      });
      toast.error(result.payload?.message || 'Failed to fetch attendance data', {
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => dispatch(fetchAttendance({
            date: dateStr,
            location,
          })),
        },
      });
      // Reset attendance state on error
      dispatch({ type: 'attendance/reset' });
    }
  });
}, [dispatch, selectedDate, location]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(employeeFilter.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(employeeFilter.toLowerCase())
    );
  }, [employees, employeeFilter]);

 const existingAttendanceRecords = useMemo(() => {
  if (!selectedDate || !location || location === "all") return [];
  if (!Array.isArray(attendance)) {
    console.warn('attendance is not an array:', attendance);
    return [];
  }
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  return attendance.filter(
    (record) => format(new Date(record.date), "yyyy-MM-dd") === dateStr
  );
}, [attendance, selectedDate, location]);

  const handleAttendanceChange = (employeeId, status) => {
    setAttendanceData((prev) => ({
      ...prev,
      [employeeId]: status,
    }));
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
      const allEmployeeIds = filteredEmployees.map((emp) => emp._id.toString());
      setBulkSelectedEmployees(allEmployeeIds);
      setBulkEmployeeStatuses(
        allEmployeeIds.reduce((acc, id) => {
          acc[id] = "present";
          return acc;
        }, {})
      );
    } else {
      setBulkSelectedEmployees([]);
      setBulkEmployeeStatuses({});
    }
  };

  const handleBulkSubmit = (preview = false) => {
    if (!location || location === "all") {
      toast.error("Please select a specific location.", {
        duration: 5000,
        style: { background: "#FEE2E2", color: "#991B1B" },
      });
      return;
    }
    if (!filteredEmployees.length) {
      toast.error("No employees found for this location or filter.", {
        duration: 5000,
        style: { background: "#FEE2E2", color: "#991B1B" },
      });
      return;
    }
    if (!selectedDate) {
      toast.error("Please select a valid date.", {
        duration: 5000,
        style: { background: "#FEE2E2", color: "#991B1B" },
      });
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const selectedRecords = bulkSelectedEmployees.map((employeeId) => ({
      employeeId,
      date: dateStr,
      status: bulkEmployeeStatuses[employeeId] || "present",
      location,
    }));
    const remainingEmployees = filteredEmployees.filter(
      (emp) => !bulkSelectedEmployees.includes(emp._id.toString())
    );
    const remainingRecords = remainingEmployees.map((emp) => ({
      employeeId: emp._id,
      date: dateStr,
      status: "present",
      location,
    }));

    if (!selectedRecords.length && !remainingRecords.length) {
      toast.error("No employees selected or available to mark attendance.", {
        duration: 5000,
        style: { background: "#FEE2E2", color: "#991B1B" },
      });
      return;
    }

    if (existingAttendanceRecords.length > 0) {
      toast.error(
        `Attendance already marked for ${
          existingAttendanceRecords.length
        } employee(s) on ${format(selectedDate, "PPP")}.`,
        {
          duration: 5000,
          style: { background: "#FEE2E2", color: "#991B1B" },
        }
      );
      setOverwriteConfirmDialog({
        open: true,
        records: [...selectedRecords, ...remainingRecords],
        mode: "bulk",
        preview,
      });
    } else {
      setBulkConfirmDialog({
        open: true,
        records: selectedRecords,
        remaining: remainingRecords,
        preview,
      });
    }
  };

 const confirmBulkSubmit = (overwrite = false) => {
  const { records: selectedRecords, remaining: remainingRecords } = bulkConfirmDialog;
  const allRecords = [...selectedRecords, ...remainingRecords];

  console.log('Bulk attendance payload:', JSON.stringify({ attendance: allRecords, overwrite }, null, 2));

  if (!allRecords.length) {
    toast.error("No valid attendance records to submit.", {
      duration: 5000,
      style: { background: "#FEE2E2", color: "#991B1B" },
    });
    setBulkConfirmDialog({
      open: false,
      records: [],
      remaining: [],
      preview: false,
    });
    return;
  }

    dispatch(bulkMarkAttendance({ attendance: allRecords, overwrite }))
      .unwrap()
      .then((response) => {
        setLastAttendanceIds(response.attendanceIds || []);
        const statusCounts = selectedRecords.reduce(
          (acc, record) => ({
            ...acc,
            [record.status]: (acc[record.status] || 0) + 1,
          }),
          {}
        );
        const statusMessage = Object.entries(statusCounts)
          .map(([status, count]) => `${count} as ${status}`)
          .join(", ");
        toast.custom(
          (t) => (
            <div className="bg-green text-body p-4 rounded-md shadow-md flex items-center justify-between max-w-md">
              <span>
                {selectedRecords.length > 0
                  ? `Marked ${selectedRecords.length} employee(s): ${statusMessage}, and ${remainingRecords.length} as Present`
                  : `Marked all ${remainingRecords.length} employee(s) as Present`}
              </span>
              <button
                onClick={() => {
                  dispatch(undoMarkAttendance(lastAttendanceIds))
                    .unwrap()
                    .then(() => {
                      toast.success("Attendance marking undone successfully.", {
                        duration: 5000,
                        style: { background: "#D1FAE5", color: "#065F46" },
                      });
                      setLastAttendanceIds([]);
                      toast.dismiss(t.id);
                    })
                    .catch((err) => {
                      toast.error(
                        err?.message || "Failed to undo attendance marking.",
                        {
                          duration: 5000,
                          style: { background: "#FEE2E2", color: "#991B1B" },
                        }
                      );
                    });
                }}
                className="ml-4 bg-body text-green px-3 py-1 rounded-md hover:bg-complementary-light focus:outline-none focus:ring-2 focus:ring-green"
              >
                Undo
              </button>
            </div>
          ),
          { duration: 5000 }
        );
        setBulkSelectedEmployees([]);
        setBulkEmployeeStatuses({});
        setEmployeeFilter("");
        setAttendanceData({}); // Reset attendance data
        setBulkConfirmDialog({
          open: false,
          records: [],
          remaining: [],
          preview: false,
        });
      })
      .catch((err) => {
        if (err?.existingRecords) {
          toast.error(
            `Attendance already marked for ${
              err.existingRecords.length
            } employee(s) on ${format(selectedDate, "PPP")}.`,
            {
              duration: 5000,
              style: { background: "#FEE2E2", color: "#991B1B" },
            }
          );
          setOverwriteConfirmDialog({
            open: true,
            records: allRecords,
            mode: "bulk",
            preview: bulkConfirmDialog.preview,
          });
        } else {
          const errorMessage = err?.message || "Failed to mark attendance.";
          let userFriendlyMessage =
            "An error occurred while marking attendance.";
          if (
            errorMessage ===
            "Attendance array is required and must not be empty"
          ) {
            userFriendlyMessage =
              "No valid attendance records to submit. Please select employees or check the filter.";
          } else if (
            errorMessage.includes("already marked") ||
            errorMessage.includes("E11000 duplicate key")
          ) {
            userFriendlyMessage = `Attendance already marked for some employees on ${format(
              selectedDate,
              "PPP"
            )}. Would you like to overwrite?`;
            setOverwriteConfirmDialog({
              open: true,
              records: allRecords,
              mode: "bulk",
              preview: bulkConfirmDialog.preview,
            });
          } else if (errorMessage.includes("insufficient paid leaves")) {
            userFriendlyMessage = errorMessage;
          }
          toast.error(userFriendlyMessage, {
            duration: 5000,
            style: { background: "#FEE2E2", color: "#991B1B" },
          });
        }
      })
      .finally(() => {
        setBulkConfirmDialog({
          open: false,
          records: [],
          remaining: [],
          preview: false,
        });
      });
  };

  const handleSubmit = (preview = false) => {
    if (!location || location === "all") {
      toast.error("Please select a specific location.", {
        duration: 5000,
        style: { background: "#FEE2E2", color: "#991B1B" },
      });
      return;
    }
    if (!filteredEmployees.length) {
      toast.error("No employees found for this location or filter.", {
        duration: 5000,
        style: { background: "#FEE2E2", color: "#991B1B" },
      });
      return;
    }
    if (!selectedDate) {
      toast.error("Please select a valid date.", {
        duration: 5000,
        style: { background: "#FEE2E2", color: "#991B1B" },
      });
      return;
    }
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const attendanceRecords = filteredEmployees.map((emp) => ({
      employeeId: emp._id.toString(),
      date: dateStr,
      status: attendanceData[emp._id.toString()] || "present",
      location,
    }));

    if (!attendanceRecords.length) {
      toast.error("No valid attendance records found to mark attendance.", {
        duration: 5000,
        style: { background: "#FEE2E2", color: "#991B1B" },
      });
      return;
    }

    if (existingAttendanceRecords.length > 0) {
      toast.error(
        `Attendance already marked for ${
          existingAttendanceRecords.length
        } employee(s) on ${format(selectedDate, "PPP")}.`,
        {
          duration: 5000,
          style: { background: "#FEE2E2", color: "#991B1B" },
        }
      );
      setOverwriteConfirmDialog({
        open: true,
        records: attendanceRecords,
        mode: "individual",
        preview,
      });
    } else {
      setIndividualConfirmDialog({
        open: true,
        records: attendanceRecords,
        preview,
      });
    }
  };

  const confirmIndividualSubmit = (overwrite = false) => {
    const { records: attendanceRecords } = individualConfirmDialog;

    if (!attendanceRecords?.length) {
      toast.error("No valid attendance records to submit.", {
        duration: 5000,
        style: { background: "#FEE2E2", color: "#991B1B" },
      });
      setIndividualConfirmDialog({
        open: false,
        records: [],
        preview: false,
      });
      return;
    }

    dispatch(markAttendance({ attendance: attendanceRecords, overwrite }))
      .unwrap()
      .then((response) => {
        setLastAttendanceIds(response.attendanceIds || []);
        toast.custom(
          (t) => (
            <div className="bg-green text-body p-4 rounded-md shadow-md flex items-center justify-between max-w-md">
              <span>
                Attendance marked successfully for {attendanceRecords.length}{" "}
                employee(s).
              </span>
              <button
                onClick={() => {
                  dispatch(undoMarkAttendance(lastAttendanceIds))
                    .unwrap()
                    .then(() => {
                      toast.success("Attendance marking undone successfully.", {
                        duration: 5000,
                        style: { background: "#D1FAE5", color: "#065F46" },
                      });
                      setLastAttendanceIds([]);
                      toast.dismiss(t.id);
                    })
                    .catch((err) => {
                      toast.error(
                        err?.message || "Failed to undo attendance marking.",
                        {
                          duration: 5000,
                          style: { background: "#FEE2E2", color: "#991B1B" },
                        }
                      );
                    });
                }}
                className="ml-4 bg-body text-green px-3 py-1 rounded-md hover:bg-complementary-light focus:outline-none focus:ring-2 focus:ring-green"
              >
                Undo
              </button>
            </div>
          ),
          { duration: 5000 }
        );
        setAttendanceData({});
        setEmployeeFilter("");
      })
      .catch((err) => {
        if (err?.existingRecords) {
          toast.error(
            `Attendance already marked for ${
              err.existingRecords.length
            } employee(s) on ${format(selectedDate, "PPP")}.`,
            {
              duration: 5000,
              style: { background: "#FEE2E2", color: "#991B1B" },
            }
          );
          setOverwriteConfirmDialog({
            open: true,
            records: attendanceRecords,
            mode: "individual",
            preview: individualConfirmDialog.preview,
          });
        } else {
          const errorMessage = err?.message || "Failed to mark attendance.";
          let userFriendlyMessage =
            "An error occurred while marking attendance.";
          if (
            errorMessage ===
            "Attendance array is required and must not be empty"
          ) {
            userFriendlyMessage =
              "No valid attendance records to submit. Please select employees or check status.";
          } else if (errorMessage.includes("already marked")) {
            userFriendlyMessage = `Attendance already marked for some employees on ${format(
              selectedDate,
              "PPP"
            )}.`;
          }
          toast.error(userFriendlyMessage, {
            duration: 5000,
            style: { background: "#FEE2E2", color: "#991B1B" },
          });
        }
      })
      .finally(() => {
        setIndividualConfirmDialog({
          open: false,
          records: [],
          preview: false,
        });
      });
  };

  const handleDateSelect = (date) => {
    if (date > new Date()) {
      toast.error("Cannot select a future date.", {
        duration: 5000,
        style: { background: "#FEE2E2", color: "#991B1B" },
      });
      return;
    }
    setSelectedDate(date);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "present":
        return <CheckCircle2 className="h-4 w-4 text-accent" />;
      case "absent":
        return <X className="h-4 w-4 text-error" />;
      case "leave":
        return <User className="h-4 w-4 text-error" />;
      case "half-day":
        return <Users className="h-4 w-4 text-error" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {loading && (
        <div className="fixed inset-0 bg-overlay flex justify-center items-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}
      <Card className="bg-body text-body border border-complementary rounded-lg shadow-sm">
        <CardHeader className="border-b border-complementary">
          <CardTitle className="text-2xl font-bold">Mark Attendance</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-wrap gap-4 gap-y-6">
            <div className="space-y-2 min-w-[180px] flex-1">
              <Label
                htmlFor="month"
                className="block text-sm font-semibold text-body"
              >
                Month
              </Label>
              <Select
                value={month.toString()}
                onValueChange={(val) => setMonth(parseInt(val))}
              >
                <SelectTrigger
                  id="month"
                  className="bg-transparent text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                >
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body text-sm">
                  {Array.from({ length: 12 }, (_, i) => ({
                    value: i + 1,
                    label: format(new Date(2025, i, 1), "MMM"),
                  })).map((obj) => (
                    <SelectItem
                      key={obj.value}
                      value={obj.value.toString()}
                      className="text-sm"
                    >
                      {obj.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[120px]">
              <Label
                htmlFor="year"
                className="block text-sm font-semibold text-body"
              >
                Year
              </Label>
              <Select
                value={year.toString()}
                onValueChange={(val) => setYear(parseInt(val))}
              >
                <SelectTrigger
                  id="year"
                  className="bg-transparent text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                >
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body text-sm">
                  {[2024, 2025, 2026].map((y) => (
                    <SelectItem
                      key={y}
                      value={y.toString()}
                      className="text-sm"
                    >
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[200px] flex-1">
              <Label
                htmlFor="location"
                className="block text-sm font-semibold text-body"
              >
                Location
              </Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger
                  id="location"
                  className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                >
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body text-sm">
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem
                      key={loc._id}
                      value={loc._id}
                      className="text-sm"
                    >
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[200px] flex-1">
              <Label
                htmlFor="date"
                className="block text-sm font-semibold text-body"
              >
                Select Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-64 text-left font-semibold bg-transparent text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                    disabled={location === "all" || locationsLoading}
                    aria-label="Select date for marking attendance"
                  >
                    <CalendarIcon className="mr-2 h-5 w-5 text-complementary" />
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-body text-body">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    disabled={(date) => date > new Date()}
                    className="border border-complementary rounded-md text-sm"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {existingAttendanceRecords.length > 0 && (
            <div className="mb-6 border border-error bg-body text-error w-full max-w-full rounded p-2">
              <AlertDescription>
                Attendance records already exist for{" "}
                {existingAttendanceRecords.length} employee(s) on{" "}
                {format(selectedDate, "PPP")}. Would you like to overwrite these
                records? Proceeding will overwrite these records.
              </AlertDescription>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="employeeFilter"
                id="employeeFilter"
                className="block text-sm font-semibold text-body"
              >
                Filter Employees
              </Label>
              <div className="relative">
                <Input
                  id="employeeFilter"
                  placeholder="Search by name or employee ID..."
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="w-full sm:w-64 pl-10 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                  aria-label="Filter employees by name or id"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-complementary" />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Label className="text-sm font-semibold text-body">Mode:</Label>
              <div className="flex items-center space-x-2 bg-complementary rounded-md p-1">
                <Button
                  variant={isBulkMode ? "default" : "ghost"}
                  onClick={() => setIsBulkMode(true)}
                  className={`flex items-center gap-2 text-sm ${
                    isBulkMode ? "bg-accent text-body" : "text-body"
                  } hover:bg-accent hover:text-body rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent`}
                  aria-label="Switch to bulk marking mode"
                >
                  <Users className="h-4 w-4" />
                  Bulk
                </Button>
                <Button
                  variant={!isBulkMode ? "default" : "ghost"}
                  onClick={() => setIsBulkMode(false)}
                  className={`flex items-center gap-2 text-sm ${
                    !isBulkMode ? "bg-accent text-body" : "text-body"
                  } hover:bg-accent hover:text-body rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent`}
                  aria-label="Switch to individual marking mode"
                >
                  <User className="h-4 w-4" />
                  Individual
                </Button>
              </div>
            </div>
          </div>
          {isBulkMode ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                      <TooltipContent className="bg-body text-body border-complementary text-sm">
                        <p>
                          Employees not selected will be marked as Present upon
                          submission. If no employees are selected, all will be
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
                    className="border-accent text-accent hover:bg-accent hover:text-body text-sm py-2 px-2 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent"
                    disabled={
                      loading ||
                      empLoading ||
                      locationsLoading ||
                      location === "all"
                    }
                    aria-label="Preview bulk attendance changes"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    onClick={() => handleBulkSubmit(false)}
                    className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-2 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent"
                    disabled={
                      loading ||
                      empLoading ||
                      locationsLoading ||
                      location === "all"
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
              {empLoading || locationsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : filteredEmployees.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto overflow-x-auto border border-complementary rounded-md shadow-sm relative">
                  <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
                  <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-complementary to-transparent pointer-events-none" />
                  <Table className="border border-complementary min-w-[600px]">
                    <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                      <TableRow>
                        <TableHead className="text-body text-sm">
                          <Checkbox
                            checked={
                              bulkSelectedEmployees.length ===
                              filteredEmployees.length
                            }
                            onCheckedChange={handleSelectAll}
                            disabled={location === "all" || locationsLoading}
                            className="h-5 w-5 border-complementary"
                            aria-label="Select all employees for bulk marking"
                          />
                        </TableHead>
                        <TableHead className="text-body text-sm">
                          Employee
                        </TableHead>
                        <TableHead className="text-body text-sm">
                          Status
                        </TableHead>
                        <TableHead className="text-body text-sm">
                          Available Leaves
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((emp, index) => (
                        <TableRow
                          key={emp._id}
                          className={
                            index % 2 === 0 ? "bg-body" : "bg-complementary"
                          }
                        >
                          <TableCell className="whitespace-nowrap">
                            <Checkbox
                              checked={bulkSelectedEmployees.includes(
                                emp._id.toString()
                              )}
                              onCheckedChange={() =>
                                handleBulkSelect(emp._id.toString())
                              }
                              disabled={location === "all" || locationsLoading}
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
                                bulkEmployeeStatuses[emp._id.toString()] ||
                                "present"
                              }
                              onValueChange={(value) =>
                                handleBulkStatusChange(
                                  emp._id.toString(),
                                  value
                                )
                              }
                              disabled={
                                !bulkSelectedEmployees.includes(
                                  emp._id.toString()
                                ) ||
                                location === "all" ||
                                locationsLoading
                              }
                            >
                              <SelectTrigger
                                className="w-full sm:w-32 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                                aria-label={`Select status for ${emp.name}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-body text-sm">
                                <SelectItem value="present" className="text-sm">
                                  Present
                                </SelectItem>
                                <SelectItem value="absent" className="text-sm">
                                  Absent
                                </SelectItem>
                                <SelectItem
                                  value="half-day"
                                  className="text-sm"
                                >
                                  Half Day
                                </SelectItem>
                                <SelectItem
                                  value="leave"
                                  disabled={emp.paidLeaves.available_leaves < 1}
                                  className="text-sm"
                                >
                                  Leave
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-body text-sm whitespace-nowrap">
                            {Math.max(0, emp.paidLeaves.available)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-body text-sm">No employees found</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {empLoading || locationsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : filteredEmployees.length > 0 ? (
                <div className="max-h-[500px] overflow-auto">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-complementary to-transparent pointer-events-none" />
                    <Table className="border border-complementary min-w-[600px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-body text-sm">
                            Employee
                          </TableHead>
                          <TableHead className="text-body text-sm">
                            Status
                          </TableHead>
                          <TableHead className="text-body text-sm">
                            Available Leaves
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((emp, index) => (
                          <TableRow
                            key={emp._id}
                            className={
                              index % 2 === 0 ? "bg-body" : "bg-complementary"
                            }
                          >
                            <TableCell className="text-sm whitespace-nowrap text-body">
                              {emp.name} ({emp.employeeId})
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              <Select
                                value={
                                  attendanceData[emp._id.toString()] ||
                                  "present"
                                }
                                onValueChange={(value) =>
                                  handleAttendanceChange(
                                    emp._id.toString(),
                                    value
                                  )
                                }
                                disabled={location === "all" || loading}
                              >
                                <SelectTrigger
                                  className="w-full sm:w-48 bg-body text-body border-complementary-light hover:border-accent hover:bg-body focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                                  aria-label={`Select status for ${emp.name}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-body text-body">
                                  <SelectItem
                                    value="present"
                                    className="text-sm"
                                  >
                                    Present
                                  </SelectItem>
                                  <SelectItem
                                    value="absent"
                                    className="text-sm"
                                  >
                                    Absent
                                  </SelectItem>
                                  <SelectItem
                                    value="half-day"
                                    className="text-sm"
                                  >
                                    Half Day
                                  </SelectItem>
                                  <SelectItem
                                    value="leave"
                                    disabled={
                                      emp.paidLeaves.available_leaves < 1
                                    }
                                    className="text-sm"
                                  >
                                    Paid Leave
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-body text-sm whitespace-nowrap">
                              {Math.max(0, emp.paidLeaves.available_leaves)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSubmit(true)}
                      variant="outline"
                      className="border-accent text-accent hover:bg-accent hover:text-body text-sm py-2 px-2 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent"
                      disabled={
                        loading ||
                        empLoading ||
                        locationsLoading ||
                        !filteredEmployees.length ||
                        location === "all"
                      }
                      aria-label="Preview individual attendance changes"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      onClick={() => handleSubmit(false)}
                      className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      disabled={
                        loading ||
                        empLoading ||
                        locationsLoading ||
                        !filteredEmployees.length ||
                        location === "all"
                      }
                      aria-label="Mark attendance for all employees individually"
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
              ) : (
                <p className="text-body text-sm">No employees found.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Mark Confirmation Dialog */}
      <Dialog
        open={bulkConfirmDialog.open}
        onOpenChange={(open) =>
          !open &&
          setBulkConfirmDialog({
            open: false,
            records: [],
            remaining: [],
            preview: false,
          })
        }
      >
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-lg w-full max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-body flex items-center gap-2">
              {bulkConfirmDialog.preview ? (
                <>
                  <Eye className="h-5 w-5 text-accent" />
                  Preview Bulk Attendance
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  Confirm Bulk Attendance
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-body text-sm">
              {bulkConfirmDialog.preview
                ? bulkConfirmDialog.records.length
                  ? `Review the attendance changes for ${bulkConfirmDialog.records.length} employee(s) and ${bulkConfirmDialog.remaining.length} to be marked as Present.`
                  : `Review the attendance: all ${bulkConfirmDialog.remaining.length} employee(s) will be marked as Present.`
                : bulkConfirmDialog.records.length
                ? `Are you sure you want to mark attendance for ${bulkConfirmDialog.records.length} employee(s) with the selected statuses and ${bulkConfirmDialog.remaining.length} as Present?`
                : `Are you sure you want to mark all ${bulkConfirmDialog.remaining.length} employee(s) as Present?`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-body">
                Selected Employees:
              </p>
              <div className="mt-2 max-h-40 overflow-y-auto border border-complementary">
                <Table className="border-none">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-body text-sm">
                        Employee ID
                      </TableHead>
                      <TableHead className="text-body text-sm">Name</TableHead>
                      <TableHead className="text-body text-sm">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkConfirmDialog.records.map((record, index) => {
                      const employee = employees.find(
                        (emp) => emp._id.toString() === record.employeeId
                      );
                      return (
                        <TableRow key={index}>
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
              <div className="mt-2 max-h-40 overflow-y-auto border border-complementary">
                <Table className="border-none">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-body text-sm">
                        Employee ID
                      </TableHead>
                      <TableHead className="text-body text-sm">Name</TableHead>
                      <TableHead className="text-body text-sm">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkConfirmDialog.remaining.map((record, index) => {
                      const employee = employees.find(
                        (emp) => emp._id.toString() === record.employeeId
                      );
                      return (
                        <TableRow key={index}>
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
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setBulkConfirmDialog({
                  open: false,
                  records: [],
                  remaining: [],
                  preview: false,
                })
              }
              className="border-complementary text-body hover:bg-accent hover:text-body text-sm"
              disabled={loading}
            >
              {bulkConfirmDialog.preview ? "Close" : "Cancel"}
            </Button>
            {!bulkConfirmDialog.preview && (
              <Button
                type="button"
                onClick={() => confirmBulkSubmit(false)}
                className="bg-accent text-body hover:bg-accent-hover text-sm"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Confirm"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual Mark Confirmation Dialog */}
      <Dialog
        open={individualConfirmDialog.open}
        onOpenChange={(open) =>
          !open &&
          setIndividualConfirmDialog({
            open: false,
            records: [],
            preview: false,
          })
        }
      >
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-lg w-full max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-body flex items-center gap-2">
              {individualConfirmDialog.preview ? (
                <>
                  <Eye className="h-5 w-5 text-accent" />
                  Preview Individual Attendance
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  Confirm Individual Attendance
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm text-body">
              {individualConfirmDialog.preview
                ? `Review the attendance changes for ${individualConfirmDialog.records.length} employee(s).`
                : `Are you sure you want to mark attendance for ${individualConfirmDialog.records.length} employee(s) with the selected statuses?`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            <Table className="border-none">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-body text-sm">
                    Employee ID
                  </TableHead>
                  <TableHead className="text-body text-sm">Name</TableHead>
                  <TableHead className="text-body text-sm">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {individualConfirmDialog.records.map((record, index) => {
                  const employee = employees.find(
                    (emp) => emp._id.toString() === record.employeeId
                  );
                  return (
                    <TableRow key={index}>
                      <TableCell className="text-body text-sm">
                        {employee?.employeeId || "N/A"}
                      </TableCell>
                      <TableCell className="text-body text-sm">
                        {employee?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-body text-sm">
                        <span className="flex items-center">
                          {getStatusIcon(record.status)}
                          {record.status.charAt(0).toUpperCase() +
                            record.status.slice(1)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setIndividualConfirmDialog({
                  open: false,
                  records: [],
                  preview: false,
                })
              }
              className="border-complementary text-body sm:text-sm"
              disabled={loading}
              aria-label={
                individualConfirmDialog.preview
                  ? "Close preview"
                  : "Cancel attendance marking"
              }
            >
              {individualConfirmDialog.preview ? "Close" : "Cancel"}
            </Button>
            {!individualConfirmDialog.preview && (
              <Button
                type="button"
                onClick={() => confirmIndividualSubmit(false)}
                className="bg-accent text-body hover:bg-accent-hover text-sm"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Confirm"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overwrite Confirmation Dialog */}
      <Dialog
        open={overwriteConfirmDialog.open}
        onOpenChange={(open) =>
          !open &&
          setOverwriteConfirmDialog({
            open: false,
            records: [],
            mode: null,
            preview: false,
          })
        }
      >
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-lg w-full max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-body flex items-center gap-2">
              <X className="h-5 w-5 text-accent" />
              Attendance Already Marked
            </DialogTitle>
            <DialogDescription className="text-sm text-body">
              Attendance records already exist for{" "}
              {existingAttendanceRecords.length} employee(s) on{" "}
              {format(selectedDate, "PPP")}. Would you like to overwrite these
              records?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            <Table className="border-none">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-body text-sm">
                    Employee ID
                  </TableHead>
                  <TableHead className="text-body text-sm">Name</TableHead>
                  <TableHead className="text-body text-sm">
                    Current Status
                  </TableHead>
                  <TableHead className="text-body text-sm">
                    New Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {existingAttendanceRecords.map((record, index) => {
                  const employee = employees.find(
                    (emp) =>
                      emp._id.toString() === record.employee._id.toString()
                  );
                  const newRecord = overwriteConfirmDialog.records.find(
                    (r) => r.employeeId === record.employee._id.toString()
                  );
                  return (
                    <TableRow key={index}>
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
                        <span className="flex items-center gap-1">
                          {getStatusIcon(newRecord?.status || "present")}
                          {(newRecord?.status || "present")
                            .charAt(0)
                            .toUpperCase() +
                            (newRecord?.status || "present").slice(1)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setOverwriteConfirmDialog({
                  open: false,
                  records: [],
                  mode: null,
                  preview: false,
                })
              }
              className="border-complementary text-body hover:bg-accent hover:text-body text-sm"
              disabled={loading}
            >
              Cancel
            </Button>
            {!overwriteConfirmDialog.preview && (
              <Button
                type="button"
                onClick={() => {
                  if (overwriteConfirmDialog.mode === "bulk") {
                    confirmBulkSubmit(true);
                  } else {
                    confirmIndividualSubmit(true);
                  }
                }}
                className="bg-accent text-body hover:bg-accent-hover text-sm"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Overwrite"
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
