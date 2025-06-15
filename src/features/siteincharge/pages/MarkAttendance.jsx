import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { markAttendance, bulkMarkAttendance, fetchAttendance } from "../redux/attendanceSlice";
import { fetchEmployees } from "../redux/employeeSlice";
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
import { toast } from "sonner";
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

const MarkAttendance = ({ month, year, setMonth, setYear, locationId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { employees, loading: empLoading } = useSelector(
    (state) => state.siteInchargeEmployee
  );
  const { loading } = useSelector((state) => state.siteInchargeAttendance);
  const [selectedDate, setSelectedDate] = useState(new Date());
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
  const [isBulkMode, setIsBulkMode] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState("");

  useEffect(() => {
    if (!user || user.role !== "siteincharge") {
      navigate("/login");
      return;
    }
    if (!locationId) {
      toast.error("No location assigned. Please contact admin.", {
        duration: 10000,
      });
      return;
    }
    dispatch(fetchEmployees({ location: locationId, month, year }));
  }, [dispatch, user, navigate, locationId, month, year]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(employeeFilter.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(employeeFilter.toLowerCase())
    );
  }, [employees, employeeFilter]);

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
  if (!filteredEmployees.length) {
    toast.error("No employees available", { duration: 5000 });
    return;
  }
  if (!selectedDate) {
    toast.error("Please select a date", { duration: 5000 });
    return;
  }
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const selectedRecords = bulkSelectedEmployees.map((employeeId) => ({
    employeeId,
    date: dateStr,
    status: bulkEmployeeStatuses[employeeId] || "present",
    location: locationId,
  }));
  const remainingEmployees = filteredEmployees.filter(
    (emp) => !bulkSelectedEmployees.includes(emp._id.toString())
  );
  const remainingRecords = remainingEmployees.map((emp) => ({
    employeeId: emp._id.toString(),
    date: dateStr,
    status: "present",
    location: locationId,
  }));

  dispatch(fetchAttendance({ date: dateStr, location: locationId }))
    .unwrap()
    .then((existing) => {
      setBulkConfirmDialog({
        open: true,
        records: selectedRecords,
        remaining: remainingRecords,
        preview,
        overwrite: existing.length > 0 ? false : undefined,
        existingRecords: existing.length > 0 ? existing : [],
      });
    })
    .catch((err) => {
      console.error('Fetch attendance error:', err);
      toast.error("Failed to check existing attendance", { duration: 5000 });
      // Proceed with dialog even if fetch fails
      setBulkConfirmDialog({
        open: true,
        records: selectedRecords,
        remaining: remainingRecords,
        preview,
      });
    });
};

const confirmBulkSubmit = () => {
  const { records: selectedRecords = [], remaining: remainingRecords = [] } = bulkConfirmDialog;
  if (!Array.isArray(selectedRecords) || !Array.isArray(remainingRecords)) {
    console.error('Invalid records:', { selectedRecords, remainingRecords });
    toast.error('Invalid attendance data', { duration: 10000 });
    setBulkConfirmDialog({
      open: false,
      records: [],
      remaining: [],
      preview: false,
    });
    dispatch({ type: 'siteInchargeAttendance/reset' });
    return;
  }

  const allRecords = [...selectedRecords, ...remainingRecords];
  if (!allRecords.length) {
    toast.error('No attendance records to submit', { duration: 10000 });
    setBulkConfirmDialog({
      open: false,
      records: [],
      remaining: [],
      preview: false,
    });
    dispatch({ type: 'siteInchargeAttendance/reset' });
    return;
  }

  console.log('Dispatching bulkMarkAttendance with records:', allRecords); // Debug log
  dispatch(bulkMarkAttendance({ attendance: allRecords, overwrite: false }))
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
        {
          action: {
            label: "Undo",
            onClick: () => {
              dispatch(undoAttendance({ attendanceIds: response.attendanceIds || [] }))
                .unwrap()
                .then(() => {
                  toast.success("Attendance marking undone");
                })
                .catch((error) => {
                  toast.error("Failed to undo attendance marking");
                });
            },
          },
          duration: 10000,
        }
      );
      setBulkSelectedEmployees([]);
      setBulkEmployeeStatuses({});
      setEmployeeFilter("");
    })
    .catch((err) => {
      console.error('Bulk submit error:', err); // Line ~265
      const errorMessage = typeof err === 'string' ? err : err.message || 'Operation failed';
      if (errorMessage.toLowerCase().includes('already marked')) {
        setBulkConfirmDialog((prev) => ({
          ...prev,
          open: true,
          preview: false,
          overwrite: true,
          existingRecords: err.existingRecords || [],
        }));
      } else {
        toast.error(errorMessage, { duration: 10000 });
      }
    })
    .finally(() => {
      console.log('Finally block executed');
      setBulkConfirmDialog({
        open: false,
        records: [],
        remaining: [],
        preview: false,
      });
      dispatch({ type: 'siteInchargeAttendance/reset' });
    });
};

  const handleSubmit = (preview = false) => {
    if (!filteredEmployees.length) {
      toast.error("No employees available", { duration: 5000 });
      return;
    }
    if (!selectedDate) {
      toast.error("Please select a date", { duration: 5000 });
      return;
    }
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const attendanceRecords = filteredEmployees.map((emp) => ({
      employeeId: emp._id,
      date: dateStr,
      status: attendanceData[emp._id.toString()] || "present",
      location: locationId,
    }));
    setIndividualConfirmDialog({
      open: true,
      records: attendanceRecords,
      preview,
    });
  };

 const confirmIndividualSubmit = () => {
  const { records: attendanceRecords } = individualConfirmDialog;
  dispatch(markAttendance(attendanceRecords))
    .unwrap()
    .then((response) => {
      toast.success("Attendance marked successfully", {
        action: {
          label: "Undo",
          onClick: () => {
            dispatch(undoAttendance({ attendanceIds: response.attendanceIds || [] }))
              .unwrap()
              .then(() => {
                toast.success("Attendance marking undone");
              })
              .catch((err) => {
                toast.error("Failed to undo attendance marking");
              });
          },
        },
        duration: 10000,
      });
      setAttendanceData({});
      setEmployeeFilter("");
    })
    .catch((err) => {
      console.error('Individual submit error:', err);
      const errorMessage = typeof err === 'string' ? err : err.message || 'Operation failed';
      toast.error(errorMessage, { duration: 10000 });
    })
    .finally(() => {
      console.log('Individual finally block executed');
      setIndividualConfirmDialog({
        open: false,
        records: [],
        preview: false,
      });
      dispatch({ type: 'siteInchargeAttendance/reset' });
    });
};

  const handleDateSelect = (date) => {
    if (date > new Date()) {
      toast.error("Cannot select a future date", { duration: 5000 });
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
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
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
              <Select value={locationId || "none"} disabled>
                <SelectTrigger
                  id="location"
                  className="bg-body text-body border-complementary h-12 text-sm"
                >
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body text-sm">
                  <SelectItem value="none">No Location</SelectItem>
                  {user?.locations?.map((loc) => (
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
                    className="w-full sm:w-64 justify-start text-left font-semibold bg-transparent text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                    disabled={!locationId}
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label
                htmlFor="employeeFilter"
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
                    isBulkMode ? "bg-accent text-white" : "text-body"
                  } hover:bg-accent hover:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent`}
                  aria-label="Switch to bulk marking mode"
                >
                  <Users className="h-4 w-4" />
                  Bulk
                </Button>
                <Button
                  variant={!isBulkMode ? "default" : "ghost"}
                  onClick={() => setIsBulkMode(false)}
                  className={`flex items-center gap-2 text-sm ${
                    !isBulkMode ? "bg-accent text-white" : "text-body"
                  } hover:bg-accent hover:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent`}
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
                        <span className="text-sm text-muted-foreground underline cursor-help">
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
                    className="border-accent text-accent hover:bg-accent hover:text-white text-sm py-2 px-2 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent"
                    disabled={loading || empLoading || !locationId}
                    aria-label="Preview bulk attendance changes"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    onClick={() => handleBulkSubmit(false)}
                    className="bg-accent text-white hover:bg-accent-hover text-sm py-2 px-2 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent"
                    disabled={loading || empLoading || !locationId}
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
              {empLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : filteredEmployees.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto overflow-x-auto -webkit-overflow-scrolling-touch touch-action-pan-x border border-complementary rounded-md shadow-sm relative">
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
                            disabled={!locationId}
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
                              disabled={!locationId}
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
                                ) || !locationId
                              }
                            >
                              <SelectTrigger
                                className="w-full sm:w-32 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                                aria-label={`Select status for ${emp.name}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-body text-body text-sm">
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
                                  disabled={emp.paidLeaves.available < 1}
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
              {empLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : filteredEmployees.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto overflow-x-auto -webkit-overflow-scrolling-touch touch-action-pan-x border border-complementary rounded-md shadow-sm relative">
                  <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
                  <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-complementary to-transparent pointer-events-none" />
                  <Table className="border border-complementary min-w-[600px]">
                    <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
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
                          <TableCell className="text-body text-sm whitespace-nowrap">
                            {emp.name} ({emp.employeeId})
                          </TableCell>
                          <TableCell className="text-body whitespace-nowrap">
                            <Select
                              value={
                                attendanceData[emp._id.toString()] || "present"
                              }
                              onValueChange={(value) =>
                                handleAttendanceChange(
                                  emp._id.toString(),
                                  value
                                )
                              }
                              disabled={!locationId}
                            >
                              <SelectTrigger
                                className="w-full sm:w-48 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                                aria-label={`Select status for ${emp.name}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-body text-body text-sm">
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
                                  disabled={emp.paidLeaves.available < 1}
                                  className="text-sm"
                                >
                                  Paid Leave
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
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSubmit(true)}
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent hover:text-white text-sm py-2 px-2 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={
                    loading ||
                    empLoading ||
                    !filteredEmployees.length ||
                    !locationId
                  }
                  aria-label="Preview individual attendance changes"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button
                  onClick={() => handleSubmit(false)}
                  className="bg-accent text-white hover:bg-accent-hover text-sm py-2 px-2 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={
                    loading ||
                    empLoading ||
                    !filteredEmployees.length ||
                    !locationId
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
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-lg max-h-[80vh] w-full overflow-hidden flex flex-col rounded-lg animate-scale-in">
          <DialogHeader>
            <DialogTitle>
              {bulkConfirmDialog.overwrite
                ? "Overwrite Existing Attendance?"
                : bulkConfirmDialog.preview
                ? "Preview Bulk Attendance"
                : "Confirm Bulk Attendance"}
            </DialogTitle>
            <DialogDescription>
              {bulkConfirmDialog.overwrite
                ? `Attendance already exists for ${
                    bulkConfirmDialog.existingRecords.length
                  } employee(s) on ${format(selectedDate, "PPP")}. Overwrite?`
                : bulkConfirmDialog.preview
                ? `Review the attendance changes for ${bulkConfirmDialog.records.length} employee(s) and ${bulkConfirmDialog.remaining.length} to be marked as Present.`
                : `Mark attendance for ${bulkConfirmDialog.records.length} employee(s) and ${bulkConfirmDialog.remaining.length} as Present?`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-body">
                Selected Employees:
              </p>
              <div className="mt-2 max-h-40 overflow-y-auto border border-complementary rounded-md">
                <Table>
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
              <div className="mt-2 max-h-40 overflow-y-auto border border-complementary rounded-md">
                <Table>
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
              disabled={loading}
            >
              {bulkConfirmDialog.preview || bulkConfirmDialog.overwrite
                ? "Cancel"
                : "Close"}
            </Button>
            {!bulkConfirmDialog.preview && (
              <Button
                onClick={() => {
                  if (bulkConfirmDialog.overwrite) {
                    dispatch(
                      bulkMarkAttendance({
                        attendance: allRecords,
                        overwrite: true,
                      })
                    )
                      .unwrap()
                      .then(() => {
                        toast.success("Attendance overwritten successfully", {
                          duration: 10000,
                        });
                        setBulkSelectedEmployees([]);
                        setBulkEmployeeStatuses({});
                        setEmployeeFilter("");
                      })
                      .catch((err) => {
                        toast.error(err || "Failed to overwrite attendance", {
                          duration: 10000,
                        });
                      })
                      .finally(() => {
                        setBulkConfirmDialog({
                          open: false,
                          records: [],
                          remaining: [],
                          preview: false,
                        });
                      });
                  } else {
                    confirmBulkSubmit();
                  }
                }}
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
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-lg max-h-[80vh] w-full overflow-auto flex flex-col rounded-lg animate-scale-in">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
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
            <DialogDescription className="text-sm mt-2">
              {individualConfirmDialog.preview
                ? `Review the attendance changes for ${individualConfirmDialog.records.length} employee(s).`
                : `Are you sure you want to mark attendance for ${individualConfirmDialog.records.length} employee(s) with the selected statuses?`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="max-h-60 overflow-y-auto border border-complementary rounded-md">
              <Table>
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
          <DialogFooter className="shrink-0 px-6 py-4 border-t border-complementary">
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
              className="border-complementary text-body hover:bg-accent hover:text-white text-sm py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
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
                onClick={confirmIndividualSubmit}
                className="bg-accent text-white hover:bg-accent-hover text-sm py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={loading}
                aria-label="Confirm individual attendance marking"
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
    </div>
  );
};

export default MarkAttendance;
