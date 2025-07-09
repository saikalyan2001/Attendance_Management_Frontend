import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { bulkMarkAttendance, fetchAttendance } from "../redux/attendanceSlice";
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
import { format, startOfMonth, formatISO, parse } from "date-fns";
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
import toast from "react-hot-toast";

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

  const getCurrentISTTime = () => format(toZonedTime(new Date(), "Asia/Kolkata"), "HH:mm:ss");
  const [selectedTime, setSelectedTime] = useState(getCurrentISTTime());
  const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState([]);
  const [bulkEmployeeStatuses, setBulkEmployeeStatuses] = useState({});
  const [bulkConfirmDialog, setBulkConfirmDialog] = useState({
    open: false,
    records: [],
    remaining: [],
    preview: false,
  });
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5; // Fixed page size since "Rows per page" is removed

  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedTime(getCurrentISTTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      toast.error("Unauthorized access. Please log in as an admin.", {
        duration: 5000,
      });
      navigate("/login");
      return;
    }
    dispatch(fetchLocations());
    if (location && location !== "all") {
      dispatch(fetchEmployees({ location, month, year }));
    }
  }, [dispatch, user, navigate, location, month, year]);

  useEffect(() => {
    if (!selectedDate || !location || location === "all") return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    dispatch(
      fetchAttendance({
        date: dateStr,
        location,
      })
    ).then((result) => {
      if (fetchAttendance.rejected.match(result)) {
        toast.error(
          result.payload?.message || "Failed to fetch attendance data",
          {
            duration: 5000,
            action: {
              label: "Retry",
              onClick: () =>
                dispatch(
                  fetchAttendance({
                    date: dateStr,
                    location,
                  })
                ),
            },
          }
        );
        dispatch({ type: "attendance/reset" });
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

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(startIndex, startIndex + pageSize);
  }, [filteredEmployees, currentPage]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);

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

  const existingAttendanceRecords = useMemo(() => {
    if (!selectedDate || !location || location === "all") return [];
    if (!Array.isArray(attendance)) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return attendance.filter(
      (record) => record.date.startsWith(dateStr)
    );
  }, [attendance, selectedDate, location]);

  const monthlyLeavesAvailable = useMemo(() => {
    if (!selectedDate || !location || location === "all") return {};
    const availableLeaves = {};
    employees.forEach((emp) => {
      const monthlyRecord = Array.isArray(emp.monthlyLeaves)
        ? emp.monthlyLeaves.find(
            (record) => record.month === month && record.year === year
          )
        : null;
      availableLeaves[emp._id.toString()] = monthlyRecord?.available || 0;
    });
    return availableLeaves;
  }, [employees, month, year, location]);

  const getOCLeaves = (employee) => {
    const monthlyRecord = Array.isArray(employee.monthlyLeaves)
      ? employee.monthlyLeaves.find(
          (record) => record.month === month && record.year === year
        )
      : null;
    const opening = monthlyRecord
      ? (monthlyRecord.allocated || 0) + (monthlyRecord.carriedForward || 0)
      : 0;
    const closing = monthlyRecord ? monthlyRecord.available || 0 : 0;
    return `${opening.toFixed(1)}/${closing.toFixed(1)}`;
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
      setBulkSelectedEmployees((prev) => [
        ...new Set([...prev, ...allEmployeeIds]),
      ]);
      setBulkEmployeeStatuses((prevStatuses) => {
        const newStatuses = { ...prevStatuses };
        allEmployeeIds.forEach((id) => {
          newStatuses[id] = "absent";
        });
        return newStatuses;
      });
    } else {
      const allEmployeeIds = paginatedEmployees.map((emp) => emp._id.toString());
      setBulkSelectedEmployees((prev) =>
        prev.filter((id) => !allEmployeeIds.includes(id))
      );
      setBulkEmployeeStatuses((prevStatuses) => {
        const newStatuses = { ...prevStatuses };
        allEmployeeIds.forEach((id) => {
          delete newStatuses[id];
        });
        return newStatuses;
      });
    }
  };

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

  const handleBulkSubmit = (preview = false) => {
    if (!location || location === "all") {
      toast.error("Please select a specific location.");
      return;
    }
    if (!filteredEmployees.length) {
      toast.error("No employees found for this location or filter.");
      return;
    }
    if (!selectedDate) {
      toast.error("Please select a valid date.");
      return;
    }
    if (!selectedTime) {
      toast.error("Please select a valid time.");
      return;
    }

    const timestamp = getISTTimestamp(selectedDate, selectedTime);
    if (!timestamp) {
      toast.error("Invalid date or time selected.");
      return;
    }

    const selectedRecords = bulkSelectedEmployees.map((employeeId) => ({
      employeeId,
      date: timestamp,
      status: bulkEmployeeStatuses[employeeId] || "absent",
      location,
    }));
    const remainingEmployees = filteredEmployees.filter(
      (emp) => !bulkSelectedEmployees.includes(emp._id.toString())
    );
    const remainingRecords = remainingEmployees.map((emp) => ({
      employeeId: emp._id,
      date: timestamp,
      status: "present",
      location,
    }));

    if (!selectedRecords.length && !remainingRecords.length) {
      toast.error("No employees selected or available to mark attendance.");
      return;
    }

    if (existingAttendanceRecords.length > 0) {
      toast.error(
        `Attendance already marked for selected employees on ${format(
          selectedDate,
          "PPP"
        )}. Please review existing records or select a different date.`,
        { duration: 5000 }
      );
      return;
    }

    setBulkConfirmDialog({
      open: true,
      records: selectedRecords,
      remaining: remainingRecords,
      preview,
    });
  };

  const confirmBulkSubmit = () => {
    const { records: selectedRecords, remaining: remainingRecords } =
      bulkConfirmDialog;
    const allRecords = [...selectedRecords, ...remainingRecords];

    if (!allRecords.length) {
      toast.error("No valid attendance records to submit.");
      setBulkConfirmDialog({
        open: false,
        records: [],
        remaining: [],
        preview: false,
      });
      return;
    }

    dispatch(bulkMarkAttendance({ attendance: allRecords }))
      .unwrap()
      .then((response) => {
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
        toast.success(
          selectedRecords.length > 0
            ? `Marked ${selectedRecords.length} employee(s): ${statusMessage}, and ${remainingRecords.length} as Present`
            : `Marked all ${remainingRecords.length} employee(s) as Present`,
          { duration: 5000 }
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
        });
        dispatch(fetchEmployees({ location, month, year }));
      })
      .catch((err) => {
        const errorMessage = err?.message || "Failed to mark attendance.";
        let userFriendlyMessage =
          "An error occurred while marking attendance.";
        if (
          errorMessage === "Attendance array is required and must not be empty"
        ) {
          userFriendlyMessage =
            "No valid attendance records to submit. Please select employees or check the filter.";
        } else if (
          errorMessage.includes("already marked") ||
          errorMessage.includes("E11000 duplicate key")
        ) {
          userFriendlyMessage = `Attendance already marked for selected employees on ${format(
            selectedDate,
            "PPP"
          )}. Please review existing records or select a different date.`;
        } else if (errorMessage.includes("insufficient leaves")) {
          userFriendlyMessage = errorMessage;
        }
        toast.error(userFriendlyMessage, { duration: 5000 });
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

  const handleDateSelect = (date) => {
    if (date > new Date()) {
      toast.error("Cannot select a future date.");
      return;
    }
    setSelectedDate(date);
    const newMonth = date.getMonth() + 1;
    const newYear = date.getFullYear();
    setMonth(newMonth);
    setYear(newYear);
    setCurrentPage(1);
  };

  const handleMonthChange = (newMonth) => {
    const parsedMonth = parseInt(newMonth);
    setMonth(parsedMonth);
    const newDate = new Date(year, parsedMonth - 1, 1);
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    } else {
      setSelectedDate(null);
    }
    setCurrentPage(1);
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
      {loading && (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="month"
                className="text-sm font-semibold text-body"
              >
                Month
              </Label>
              <Select value={month.toString()} onValueChange={handleMonthChange}>
                <SelectTrigger
                  id="month"
                  className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md"
                >
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  {Array.from({ length: 12 }, (_, i) => ({
                    value: i + 1,
                    label: format(new Date(year, i, 1), "MMM"),
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
                  const newYear = parseInt(val);
                  setYear(newYear);
                  if (selectedDate) {
                    const newDate = startOfMonth(
                      new Date(newYear, month - 1, 1)
                    );
                    if (newDate <= new Date()) {
                      setSelectedDate(newDate);
                    } else {
                      setSelectedDate(null);
                    }
                  }
                  setCurrentPage(1);
                }}
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
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger
                  id="location"
                  className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md"
                >
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  <SelectItem value="all" className="text-sm hover:bg-accent-light">
                    All Locations
                  </SelectItem>
                  {locations.map((loc) => (
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
                    disabled={location === "all" || locationsLoading}
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
                    initialFocus
                    disabled={(date) => date > new Date()}
                    className="border border-complementary rounded-md text-sm"
                    modifiers={{
                      selected: selectedDate,
                    }}
                    modifiersClassNames={{
                      selected: "bg-accent text-body font-bold border-2 border-accent rounded-full",
                      today: "bg-complementary-light text-body border border-complementary rounded-full",
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
                Current Time
              </Label>
              <Input
                type="text"
                id="time"
                value={selectedTime}
                readOnly
                className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md cursor-default select-none"
                disabled={location === "all" || locationsLoading || !selectedDate}
                aria-label="Current time for marking attendance"
              />
            </div>
          </div>
          {existingAttendanceRecords.length > 0 && (
            <Alert className="border-error bg-body text-error rounded-lg p-3 animate-pulse">
              <AlertDescription>
                Attendance already marked for {existingAttendanceRecords.length} employee(s) on {format(selectedDate, "PPP")}. Please select a different date or review existing records.
              </AlertDescription>
            </Alert>
          )}
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
                  }}
                  className="w-full pl-10 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md"
                  aria-label="Filter employees by name or id"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-complementary" />
              </div>
            </div>
            <div className="flex items-center gap-2 bg-complementary rounded-md p-1">
              <Button
                className="bg-accent text-body hover:bg-accent-hover rounded-md px-3 py-2 text-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
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
                        Employees not selected will be marked as Present upon submission. If no employees are selected, all will be marked as Present.
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
                    locationsLoading ||
                    location === "all" ||
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
                    locationsLoading ||
                    location === "all" ||
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
            {empLoading || locationsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : filteredEmployees.length > 0 ? (
              <div className="space-y-4">
                <div className="max-h-[400px] overflow-y-auto border border-complementary rounded-lg shadow-sm relative">
                  <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
                  <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-complementary to-transparent pointer-events-none" />
                  <Table className="min-w-[600px]">
                    <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                      <TableRow>
                        <TableHead className="text-body text-sm w-12">
                          <Checkbox
                            checked={
                              bulkSelectedEmployees.length >= paginatedEmployees.length &&
                              paginatedEmployees.every((emp) =>
                                bulkSelectedEmployees.includes(emp._id.toString())
                              )
                            }
                            onCheckedChange={handleSelectAll}
                            disabled={location === "all" || locationsLoading}
                            className="h-5 w-5 border-complementary"
                            aria-label="Select all employees on current page for bulk marking"
                          />
                        </TableHead>
                        <TableHead className="text-body text-sm">Employee Name</TableHead>
                        <TableHead className="text-body text-sm">Status</TableHead>
                        <TableHead className="text-body text-sm">O/C Leaves</TableHead>
                        <TableHead className="text-body text-sm">Leaves Available</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEmployees.map((emp, index) => (
                        <TableRow
                          key={emp._id}
                          className={`${
                            index % 2 === 0 ? "bg-body" : "bg-complementary-light"
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
                                bulkSelectedEmployees.includes(emp._id.toString())
                                  ? bulkEmployeeStatuses[emp._id.toString()] || "absent"
                                  : "present"
                              }
                              onValueChange={(value) =>
                                handleBulkStatusChange(emp._id.toString(), value)
                              }
                              disabled={
                                !bulkSelectedEmployees.includes(emp._id.toString()) ||
                                location === "all" ||
                                locationsLoading
                              }
                            >
                              <SelectTrigger
                                className="w-full sm:w-32 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md"
                                aria-label={`Select status for ${emp.name}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-body text-body border-complementary">
                                <SelectItem value="present" className="text-sm hover:bg-accent-light">
                                  Present
                                </SelectItem>
                                <SelectItem value="absent" className="text-sm hover:bg-accent-light">
                                  Absent
                                </SelectItem>
                                <SelectItem value="half-day" className="text-sm hover:bg-accent-light">
                                  Half-Day
                                </SelectItem>
                                <SelectItem
                                  value="leave"
                                  disabled={
                                    monthlyLeavesAvailable[emp._id.toString()] < 1
                                  }
                                  className="text-sm hover:bg-accent-light"
                                >
                                  Leave
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-body text-sm whitespace-nowrap">
                            {getOCLeaves(emp)}
                          </TableCell>
                          <TableCell className="text-body text-sm whitespace-nowrap">
                            {monthlyLeavesAvailable[emp._id.toString()] || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="border-complementary text-body hover:bg-complementary-light text-sm p-2"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {getPageNumbers().map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        onClick={() => setCurrentPage(page)}
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
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="border-complementary text-body hover:bg-complementary-light text-sm p-2"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-body text-sm text-center py-4">
                No employees found for this location. Please check the location or add employees.
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
          })
        }
      >
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-2xl animate-scale-in">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-body">
              {bulkConfirmDialog.preview
                ? "Preview Bulk Attendance"
                : "Confirm Bulk Attendance"}
            </DialogTitle>
            <DialogDescription className="text-body">
              {bulkConfirmDialog.preview
                ? "Review the attendance records before submitting."
                : "Please confirm the attendance records to be submitted."}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table className="border border-complementary">
              <TableHeader className="sticky top-0 bg-complementary">
                <TableRow>
                  <TableHead className="text-body text-sm">Employee</TableHead>
                  <TableHead className="text-body text-sm">Status</TableHead>
                  <TableHead className="text-body text-sm">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bulkConfirmDialog.records.map((record, index) => {
                  const employee = employees.find(
                    (emp) => emp._id.toString() === record.employeeId
                  );
                  return (
                    <TableRow
                      key={record.employeeId}
                      className={`${
                        index % 2 === 0 ? "bg-body" : "bg-complementary-light"
                      } animate-slide-in-row`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <TableCell className="text-body text-sm">
                        {employee
                          ? `${employee.name} (${employee.employeeId})`
                          : "Unknown"}
                      </TableCell>
                      <TableCell className="text-body text-sm capitalize flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        {record.status}
                      </TableCell>
                      <TableCell className="text-body text-sm">
                        {format(toZonedTime(new Date(record.date), "Asia/Kolkata"), "PPP hh:mm:ss a")}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {bulkConfirmDialog.remaining.map((record, index) => {
                  const employee = employees.find(
                    (emp) => emp._id.toString() === record.employeeId
                  );
                  return (
                    <TableRow
                      key={record.employeeId}
                      className={`${
                        index % 2 === 0 ? "bg-body" : "bg-complementary-light"
                      } animate-slide-in-row`}
                      style={{ animationDelay: `${(index + bulkConfirmDialog.records.length) * 0.05}s` }}
                    >
                      <TableCell className="text-body text-sm">
                        {employee
                          ? `${employee.name} (${employee.employeeId})`
                          : "Unknown"}
                      </TableCell>
                      <TableCell className="text-body text-sm capitalize flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        {record.status}
                      </TableCell>
                      <TableCell className="text-body text-sm">
                        {format(toZonedTime(new Date(record.date), "Asia/Kolkata"), "PPP hh:mm:ss a")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
                })
              }
              className="border-complementary text-body hover:bg-complementary-light text-sm"
            >
              Cancel
            </Button>
            {!bulkConfirmDialog.preview && (
              <Button
                onClick={() => confirmBulkSubmit()}
                className="bg-accent text-body hover:bg-accent-hover text-sm"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
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