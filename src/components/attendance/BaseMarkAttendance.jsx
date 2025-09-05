// src/components/attendance/BaseMarkAttendance.jsx
import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format, startOfMonth, formatISO, parse } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  CalendarIcon,
  Loader2,
  CheckCircle2,
  Users,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import toast from "react-hot-toast";
import { useRolePermissions } from "../../hooks/useRolePermissions";
import { useAttendanceActions } from "../../hooks/useAttendanceActions";

const BaseMarkAttendance = ({
  // Role-specific props
  role,
  locationId = null,

  // Shared state props
  month,
  year,
  location,
  setLocation,
  selectedDate,
  setSelectedDate,
  setMonth,
  setYear,

  // Role-specific redux selectors
  employeeSelector,
  attendanceSelector,
  locationSelector,

  // Role-specific actions
  actions,
}) => {
  const dispatch = useDispatch();
  const permissions = useRolePermissions(role);
  const attendanceActions = useAttendanceActions(role, actions);

  // Get data from role-specific selectors
  const employees = useSelector(employeeSelector);
  const attendance = useSelector(attendanceSelector);
  const locations = useSelector(locationSelector);

  // Shared state
  const getCurrentISTTime = () =>
    format(toZonedTime(new Date(), "Asia/Kolkata"), "HH:mm:ss");
  const [selectedTime, setSelectedTime] = useState(getCurrentISTTime());
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const displayMonth = useMemo(() => {
  return new Date(year, month - 1, 1); // month - 1 because Date months are 0-indexed
}, [month, year]);

  // Shared utility functions
  const getOCLeaves = (employee, month, year) => {
    const paidLeavesPerMonth = 2;
    const monthlyLeaves = Array.isArray(employee.monthlyLeaves)
      ? employee.monthlyLeaves
      : [];
    const monthlyLeave = monthlyLeaves.find(
      (ml) => ml.year === year && ml.month === month
    ) || {
      allocated: paidLeavesPerMonth,
      available: paidLeavesPerMonth,
      carriedForward: 0,
      taken: 0,
    };
    const openingLeaves =
      (monthlyLeave.allocated || paidLeavesPerMonth) +
      (monthlyLeave.carriedForward || 0);
    const closingLeaves = Math.max(
      monthlyLeave.available || paidLeavesPerMonth,
      0
    );
    return `${openingLeaves.toFixed(1)}/${closingLeaves.toFixed(1)}`;
  };

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
    return formatISO(istTime, { representation: "complete" });
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

  // Role-based data filtering
  const displayData = useMemo(() => {
    if (!selectedDate) {
      return {
        records: [],
        totalPages: 1,
        totalItems: 0,
        filteredEmployees: [],
      };
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const selectedMonth = parseInt(format(selectedDate, "M"));
    const selectedYear = parseInt(format(selectedDate, "yyyy"));

    const attendanceMap = new Map(
      Array.isArray(attendance?.data || attendance)
        ? (attendance?.data || attendance)
            .filter((record) => record.date && record.date.startsWith(dateStr))
            .map((record) => [record.employee?._id?.toString(), record])
        : []
    );

    // Apply role-based filtering
    const filteredEmployees = attendanceActions.filterEmployees(
      employees?.data || employees,
      {
        location,
        locationId,
        employeeFilter,
        locations,
      }
    );

    const totalItems = filteredEmployees.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedEmployees = filteredEmployees.slice(
      startIndex,
      startIndex + pageSize
    );

    return {
      records: paginatedEmployees.map((emp) => {
        const attendanceRecord = attendanceMap.get(emp._id?.toString());
        const monthlyLeave = Array.isArray(emp.monthlyLeaves)
          ? emp.monthlyLeaves.find(
              (leave) =>
                leave.month === selectedMonth && leave.year === selectedYear
            )
          : null;
        const ocLeaves = getOCLeaves(emp, selectedMonth, selectedYear);
        const leavesAvailable = monthlyLeave ? monthlyLeave.available || 0 : 0;

        return {
          employee: {
            _id: emp._id || null,
            name: emp.name || "Unknown",
            employeeId: emp.employeeId || "Unknown",
            monthlyLeaves: emp.monthlyLeaves || [],
            paidLeaves: emp.paidLeaves || {
              available: 0,
              used: 0,
              carriedForward: 0,
            },
          },
          status: attendanceRecord ? attendanceRecord.status : "present",
          date: attendanceRecord ? attendanceRecord.date : dateStr,
          ocLeaves,
          leavesAvailable,
        };
      }),
      totalPages,
      totalItems,
      filteredEmployees,
    };
  }, [
    employees,
    attendance,
    employeeFilter,
    selectedDate,
    location,
    locationId,
    currentPage,
    pageSize,
    locations,
    attendanceActions,
  ]);

  // Shared event handlers
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

  const handleBulkSubmit = async (preview = false) => {
    const validationResult = attendanceActions.validateSubmission({
      selectedDate,
      selectedTime,
      location,
      locationId,
      employees: displayData.filteredEmployees,
    });

    if (!validationResult.isValid) {
      toast.error(validationResult.message);
      return;
    }

    const timestamp = getISTTimestamp(selectedDate, selectedTime);
    const { selectedRecords, remainingRecords } =
      attendanceActions.prepareRecords({
        bulkSelectedEmployees,
        bulkEmployeeStatuses,
        filteredEmployees: displayData.filteredEmployees,
        timestamp,
        location,
        locationId,
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
  };

  const confirmBulkSubmit = async () => {
    try {
      const result = await attendanceActions.submitAttendance({
        records: bulkConfirmDialog.records,
        remaining: bulkConfirmDialog.remaining,
        overwrite: bulkConfirmDialog.overwrite || false,
      });

      toast.success(result.message, { duration: 5000 });

      // Reset state
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

      // Refresh data
      await attendanceActions.refreshData({
        location,
        locationId,
        month,
        year,
        selectedDate,
      });
    } catch (error) {
      toast.error(error.message || "Failed to mark attendance", {
        duration: 5000,
      });
    }
  };

  // Effects
  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedTime(getCurrentISTTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    attendanceActions.fetchInitialData({ location, locationId, month, year });
  }, [location, locationId, month, year]);

// Improved useEffect to set selectedDate intelligently
useEffect(() => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  
  // If we're viewing the current month/year, set to today
  if (month === currentMonth && year === currentYear) {
    setSelectedDate(today);
  } else {
    // For past/future months, set to first day of that month
    const firstDayOfMonth = new Date(year, month - 1, 1);
    
    // Only update if it's not a future date
    if (firstDayOfMonth <= today) {
      setSelectedDate(firstDayOfMonth);
    } else {
      setSelectedDate(null);
    }
  }
}, [month, year, setSelectedDate]);



  return (
    <div className="space-y-6 p-4 animate-fade-in">
      <Card className="bg-body text-body border border-complementary rounded-lg shadow-md">
        <CardHeader className="border-b border-complementary">
          <CardTitle className="text-2xl font-bold text-body">
            Mark Bulk Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Date/Location Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Month Selector */}
            <div className="space-y-2">
              <Label
                htmlFor="month"
                className="text-sm font-semibold text-body"
              >
                Month
              </Label>
              <Select
                value={month.toString()}
                onValueChange={(val) => setMonth(parseInt(val))}
              >
                <SelectTrigger className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md">
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

            {/* Year Selector */}
            <div className="space-y-2">
              <Label htmlFor="year" className="text-sm font-semibold text-body">
                Year
              </Label>
              <Select
                value={year.toString()}
                onValueChange={(val) => setYear(parseInt(val))}
              >
                <SelectTrigger className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md">
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

            {/* Location Selector */}
            <div className="space-y-2">
              <Label
                htmlFor="location"
                className="text-sm font-semibold text-body"
              >
                Location
              </Label>
              <Select
                value={
                  permissions.canChangeLocation
                    ? location || "all"
                    : locationId || "none"
                }
                onValueChange={
                  permissions.canChangeLocation ? setLocation : undefined
                }
                disabled={!permissions.canChangeLocation}
              >
                <SelectTrigger className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  {permissions.canSelectAllLocations && (
                    <SelectItem
                      value="all"
                      className="text-sm hover:bg-accent-light"
                    >
                      All Locations
                    </SelectItem>
                  )}
                  {locations?.map((loc) => (
                    <SelectItem
                      key={loc._id}
                      value={loc._id}
                      className="text-sm hover:bg-accent-light"
                    >
                      {loc.name}
                    </SelectItem>
                  ))}
                  {!permissions.canChangeLocation && (
                    <SelectItem
                      value="none"
                      className="text-sm hover:bg-accent-light"
                    >
                      No Location
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-semibold text-body">
                Select Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-semibold bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md truncate"
                    disabled={!permissions.canSelectDate(location, locationId)}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5 text-complementary flex-shrink-0" />
                    <span className="truncate">
                      {selectedDate
                        ? format(selectedDate, "PPP")
                        : "Pick a date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-body text-body">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                     month={displayMonth}
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

            {/* Time Display */}
            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm font-semibold text-body">
                Current Time
              </Label>
              <Input
                type="text"
                id="time"
                value={selectedTime}
                readOnly
                className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md cursor-default select-none"
                disabled={!permissions.canSelectDate(location, locationId)}
              />
            </div>
          </div>

          {/* Filter and Actions */}
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
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-complementary" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleBulkSubmit(true)}
                variant="outline"
                className="border-accent text-accent hover:bg-accent-light hover:text-body text-sm py-2 px-3 flex items-center gap-2"
                disabled={
                  !permissions.canSubmit(
                    location,
                    locationId,
                    selectedDate,
                    displayData.filteredEmployees
                  )
                }
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button
                onClick={() => handleBulkSubmit(false)}
                className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-3 flex items-center gap-2"
                disabled={
                  !permissions.canSubmit(
                    location,
                    locationId,
                    selectedDate,
                    displayData.filteredEmployees
                  )
                }
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Attendance
              </Button>
            </div>
          </div>

          {/* Employee Table */}
          {displayData.records.length > 0 ? (
            <div className="space-y-4">
              <div className="max-h-[400px] overflow-y-auto border border-complementary rounded-lg shadow-sm">
                <Table className="min-w-[600px]">
                  <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                    <TableRow>
                      <TableHead className="text-body text-sm w-12">
                        <Checkbox
                          checked={
                            displayData.records.length > 0 &&
                            displayData.records.every((record) =>
                              bulkSelectedEmployees.includes(
                                record.employee._id?.toString()
                              )
                            )
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const allIds = displayData.records
                                .map((r) => r.employee._id?.toString())
                                .filter(Boolean);
                              setBulkSelectedEmployees((prev) => [
                                ...new Set([...prev, ...allIds]),
                              ]);
                            } else {
                              const allIds = displayData.records
                                .map((r) => r.employee._id?.toString())
                                .filter(Boolean);
                              setBulkSelectedEmployees((prev) =>
                                prev.filter((id) => !allIds.includes(id))
                              );
                            }
                          }}
                          className="h-5 w-5 border-complementary"
                        />
                      </TableHead>
                      <TableHead className="text-body text-sm">
                        Employee Name
                      </TableHead>
                      <TableHead className="text-body text-sm">
                        Status
                      </TableHead>
                      <TableHead className="text-body text-sm">
                        O/C Leaves
                      </TableHead>
                      <TableHead className="text-body text-sm">
                        Leaves Available
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayData.records.map((record, index) => (
                      <TableRow
                        key={record.employee._id || `temp-${index}`}
                        className={`${
                          index % 2 === 0 ? "bg-body" : "bg-complementary-light"
                        } animate-slide-in-row`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={bulkSelectedEmployees.includes(
                              record.employee._id?.toString()
                            )}
                            onCheckedChange={() =>
                              handleBulkSelect(record.employee._id?.toString())
                            }
                            className="h-5 w-5 border-complementary"
                          />
                        </TableCell>
                        <TableCell className="text-body text-sm">
                          {record.employee.name} ({record.employee.employeeId})
                        </TableCell>
                        <TableCell>
                          <Select
                            value={
                              bulkSelectedEmployees.includes(
                                record.employee._id?.toString()
                              )
                                ? bulkEmployeeStatuses[
                                    record.employee._id?.toString()
                                  ] || "absent"
                                : record.status || "present"
                            }
                            onValueChange={(value) =>
                              handleBulkStatusChange(
                                record.employee._id?.toString(),
                                value
                              )
                            }
                            disabled={
                              !bulkSelectedEmployees.includes(
                                record.employee._id?.toString()
                              )
                            }
                          >
                            <SelectTrigger className="w-32 bg-body text-body border-complementary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-body text-body border-complementary">
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="half-day">Half-Day</SelectItem>
                              <SelectItem
                                value="leave"
                                disabled={record.leavesAvailable < 1}
                              >
                                Leave
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-body text-sm">
                          {record.ocLeaves}
                        </TableCell>
                        <TableCell className="text-body text-sm">
                          {record.leavesAvailable}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <p className="text-body text-sm text-center py-4">
              No employees found for the selected criteria.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
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
        <DialogContent className="bg-body text-body border-complementary max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {bulkConfirmDialog.preview
                ? "Preview Bulk Attendance"
                : "Confirm Bulk Attendance"}
            </DialogTitle>
            <DialogDescription>
              {bulkConfirmDialog.preview
                ? "Review the attendance records before submitting."
                : "Please confirm the attendance records to be submitted."}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ...bulkConfirmDialog.records,
                  ...bulkConfirmDialog.remaining,
                ].map((record, index) => {
                  const employee = (displayData.filteredEmployees || []).find(
                    (emp) => emp._id?.toString() === record.employeeId
                  );
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        {employee
                          ? `${employee.name} (${employee.employeeId})`
                          : "Unknown"}
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        {getStatusIcon(record.status)} {record.status}
                      </TableCell>
                      <TableCell>
                        {format(
                          toZonedTime(new Date(record.date), "Asia/Kolkata"),
                          "PPP hh:mm:ss a"
                        )}
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
                  overwrite: undefined,
                  existingRecords: [],
                  invalidRecords: [],
                })
              }
            >
              Cancel
            </Button>
            {!bulkConfirmDialog.preview && (
              <Button
                onClick={confirmBulkSubmit}
                className="bg-accent text-body"
              >
                Confirm
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BaseMarkAttendance;
