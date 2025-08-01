import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAttendance, editAttendance } from "../redux/attendanceSlice";
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
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSunday,
} from "date-fns";
import {
  CalendarIcon,
  Loader2,
  Search,
  ArrowUpDown,
  Download,
  RotateCcw,
  CheckCircle2,
  X,
  Users,
  User,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MonthlyAttendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { employees, loading: empLoading } = useSelector(
    (state) => state.adminEmployees
  );
  const { attendance, loading } = useSelector(
    (state) => state.adminAttendance
  );
  const { locations, loading: locationsLoading } = useSelector(
    (state) => state.adminLocations
  );

  const [locationFilter, setLocationFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [editDialog, setEditDialog] = useState({
    open: false,
    attendanceId: null,
    employeeName: "",
    date: null,
    currentStatus: "",
    newStatus: "",
  });
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [monthlySearch, setMonthlySearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState(null);
  const employeesPerPage = 10;

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    dispatch(fetchLocations());
    if (locationFilter && locationFilter !== "all") {
      dispatch(fetchEmployees({ location: locationFilter }));
      dispatch(
        fetchAttendance({
          month: monthFilter,
          year: yearFilter,
          location: locationFilter,
        })
      );
    }
  }, [dispatch, user, navigate, locationFilter, monthFilter, yearFilter]);

  const handleEditAttendance = (attendanceId, employeeName, date, currentStatus) => {
    setEditDialog({
      open: true,
      attendanceId,
      employeeName,
      date,
      currentStatus,
      newStatus: "",
    });
  };

  const handleMonthChange = (value) => {
    setMonthFilter(parseInt(value));
    setCurrentPage(1);
  };

  const handleYearChange = (value) => {
    setYearFilter(parseInt(value));
    setCurrentPage(1);
  };

  const handleLocationChange = (value) => {
    setLocationFilter(value);
    setCurrentPage(1);
  };

  const handleMarkSort = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString("default", { month: "long" }),
  }));
  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  const startDate = startOfMonth(new Date(yearFilter, monthFilter - 1));
  const endDate = endOfMonth(startDate);
  const days = eachDayOfInterval({ start: startDate, end: endDate })
    .filter(
      (day) =>
        !dateFilter ||
        format(day, "yyyy-MM-dd") === format(dateFilter, "yyyy-MM-dd")
    )
    .map((day) => ({
      date: day,
      dayName: format(day, "EEE"),
      formatted: format(day, "MMM d"),
      isSunday: isSunday(day),
    }));

  const sortedEmployees = useMemo(() => {
    return [...employees]
      .filter(
        (emp) =>
          emp.name.toLowerCase().includes(monthlySearch.toLowerCase()) ||
          emp.employeeId.toLowerCase().includes(monthlySearch.toLowerCase())
      )
      .sort((a, b) => {
        const aValue = a[sortField].toLowerCase();
        const bValue = b[sortField].toLowerCase();
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      });
  }, [employees, sortField, sortOrder, monthlySearch]);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * employeesPerPage;
    return sortedEmployees.slice(startIndex, startIndex + employeesPerPage);
  }, [sortedEmployees, currentPage]);

  const totalPages = Math.ceil(sortedEmployees.length / employeesPerPage);

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

  const getLocationName = () => {
    if (locationFilter === "all") return "All Locations";
    const loc = locations.find((l) => l._id === locationFilter);
    return loc?.name || "Unknown";
  };

  return (
    <div className="space-y-8">
      {(loading || locationsLoading || empLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}
      <Card className="bg-body text-body border border-complementary rounded-md shadow-sm">
        <CardHeader className="border-b border-complementary">
          <CardTitle className="text-2xl font-bold">Monthly Attendance</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Label
                htmlFor="locationFilter"
                className="block text-sm font-medium text-body"
              >
                Location
              </Label>
              <Select
                value={locationFilter}
                onValueChange={handleLocationChange}
                disabled={locationsLoading}
              >
                <SelectTrigger
                  id="locationFilter"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                  aria-label="Select location for monthly attendance"
                >
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body">
                  <SelectItem value="all" className="text-sm">
                    All Locations
                  </SelectItem>
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
            <div className="flex-1 min-w-[200px]">
              <Label
                htmlFor="monthlySearch"
                className="block text-sm font-medium text-body"
              >
                Search Employees
              </Label>
              <div className="relative">
                <Input
                  id="monthlySearch"
                  placeholder="Search by name or ID..."
                  value={monthlySearch}
                  onChange={(e) => setMonthlySearch(e.target.value)}
                  className="pl-10 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                  aria-label="Search employees in monthly attendance"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-complementary" />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label
                htmlFor="dateFilter"
                className="block text-sm font-medium text-body"
              >
                Filter by Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                    disabled={locationFilter === "all" || locationsLoading}
                    aria-label="Select date to filter monthly attendance"
                  >
                    <CalendarIcon className="mr-2 h-5 w-5 text-complementary" />
                    {dateFilter ? format(dateFilter, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-body text-body">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={(date) => {
                      if (date > new Date()) {
                        toast.error("Cannot select a future date", {
                          duration: 5000,
                        });
                        return;
                      }
                      setDateFilter(date);
                      setCurrentPage(1);
                    }}
                    initialFocus
                    disabled={(date) => date > new Date() || date < startDate || date > endDate}
                    className="border border-complementary rounded-md"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-[100px]">
              <Label className="block text-sm font-medium text-body"> </Label>
              <Button
                variant="outline"
                onClick={() => setDateFilter(null)}
                className="w-full border-accent text-accent hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={!dateFilter || locationFilter === "all" || locationsLoading}
                aria-label="Reset date filter"
              >
                <RotateCcw className="h-5 w-5" />
                Reset Date
              </Button>
            </div>
            <div className="flex-1 min-w-[100px]">
              <Label className="block text-sm font-medium text-body"> </Label>
              <Button
                onClick={() => {
                  if (!attendance || !attendance.length) {
                    toast.error("No attendance data available to export", { duration: 5000 });
                    return;
                  }
                  const doc = new jsPDF();
                  doc.text("Monthly Attendance Report", 14, 20);
                  doc.text(
                    `Month: ${months.find((m) => m.value === monthFilter).label} ${yearFilter}`,
                    14,
                    30
                  );
                  doc.text(`Location: ${getLocationName()}`, 14, 40);

                  const monthlyTotals = {
                    present: 0,
                    absent: 0,
                    leave: 0,
                    "half-day": 0,
                  };

                  const body = sortedEmployees.map((emp) => {
                    const counts = {
                      present: 0,
                      absent: 0,
                      leave: 0,
                      "half-day": 0,
                    };
                    const statuses = days.map((day) => {
                      const record = attendance.find(
                        (att) =>
                          att.employee?._id?.toString() === emp._id.toString() &&
                          format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
                      );
                      if (record) {
                        counts[record.status]++;
                        monthlyTotals[record.status]++;
                        return record.status.charAt(0).toUpperCase();
                      }
                      return "-";
                    });
                    return [
                      emp.employeeId,
                      emp.name,
                      ...statuses,
                      counts.present,
                      counts.absent,
                      counts.leave,
                      counts["half-day"],
                    ];
                  });

                  body.push([
                    "",
                    "Daily Totals",
                    ...days.map((day) => {
                      const records = attendance.filter(
                        (att) =>
                          format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
                      );
                      const totals = {
                        present: records.filter((r) => r.status === "present").length,
                        absent: records.filter((r) => r.status === "absent").length,
                        leave: records.filter((r) => r.status === "leave").length,
                        "half-day": records.filter((r) => r.status === "half-day").length,
                      };
                      return `P:${totals.present}, A:${totals.absent}, L:${totals.leave}, HD:${totals["half-day"]}`;
                    }),
                    monthlyTotals.present,
                    monthlyTotals.absent,
                    monthlyTotals.leave,
                    monthlyTotals["half-day"],
                  ]);

                  autoTable(doc, {
                    startY: 50,
                    head: [["ID", "Employee", ...days.map((day) => day.formatted), "Present", "Absent", "Leave", "Half-Day"]],
                    body,
                    theme: "striped",
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [59, 130, 246] },
                  });

                  doc.save(`Attendance_${months.find((m) => m.value === monthFilter).label}_${yearFilter}.pdf`);
                  toast.success("PDF downloaded successfully", { duration: 5000 });
                }}
                className="w-full border-accent text-accent hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={loading || empLoading || locationsLoading || !sortedEmployees.length || locationFilter === "all" || !attendance?.length}
                aria-label="Download monthly attendance as PDF"
              >
                <Download className="h-5 w-5" />
                Download PDF
              </Button>
            </div>
            <div className="flex-1 min-w-[120px]">
              <Label
                htmlFor="monthFilter"
                className="block text-sm font-medium text-body"
              >
                Month
              </Label>
              <Select
                value={monthFilter.toString()}
                onValueChange={handleMonthChange}
                disabled={locationFilter === "all" || locationsLoading}
              >
                <SelectTrigger
                  id="monthFilter"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                  aria-label="Select month for monthly attendance"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-body text-body">
                  {months.map((month) => (
                    <SelectItem
                      key={month.value}
                      value={month.value.toString()}
                      className="text-sm"
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[100px]">
              <Label
                htmlFor="yearFilter"
                className="block text-sm font-medium text-body"
              >
                Year
              </Label>
              <Select
                value={yearFilter.toString()}
                onValueChange={handleYearChange}
                disabled={locationFilter === "all" || locationsLoading}
              >
                <SelectTrigger
                  id="yearFilter"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                  aria-label="Select year for monthly attendance"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-body text-body">
                  {years.map((year) => (
                    <SelectItem
                      key={year}
                      value={year.toString()}
                      className="text-sm"
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {loading || empLoading || locationsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : locationFilter === "all" ? (
            <p className="text-body text-sm">Please select a specific location</p>
          ) : paginatedEmployees.length > 0 ? (
            <div className="space-y-4">
              <div className="max-h-[400px] overflow-x-auto relative">
                <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-complementary to-transparent pointer-events-none" />
                <Table className="border border-complementary">
                  <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                    <TableRow>
                      <TableHead className="text-body text-sm">ID</TableHead>
                      <TableHead className="text-body text-sm">
                        <Button
                          variant="ghost"
                          onClick={handleMarkSort}
                          className="flex items-center space-x-1"
                        >
                          Employee
                          <ArrowUpDown className="h-5 w-5" />
                        </Button>
                      </TableHead>
                      {days.map((day) => (
                        <TableHead key={day.formatted} className="text-body text-sm">
                          {day.dayName}
                          <br />
                          {day.formatted}
                        </TableHead>
                      ))}
                      <TableHead className="text-body text-sm">Present</TableHead>
                      <TableHead className="text-body text-sm">Absent</TableHead>
                      <TableHead className="text-body text-sm">Leave</TableHead>
                      <TableHead className="text-body text-sm">Half-Day</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEmployees.map((emp, index) => {
                      const counts = {
                        present: 0,
                        absent: 0,
                        leave: 0,
                        "half-day": 0,
                      };
                      return (
                        <TableRow
                          key={emp._id}
                          className={index % 2 === 0 ? "bg-body" : "bg-complementary"}
                        >
                          <TableCell className="text-body text-sm">{emp.employeeId}</TableCell>
                          <TableCell className="text-body text-sm">{emp.name}</TableCell>
                          {days.map((day) => {
                            const record = attendance.find(
                              (att) =>
                                att.employee?._id?.toString() === emp._id.toString() &&
                                format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
                            );
                            if (record) {
                              counts[record.status]++;
                            }
                            return (
                              <TableCell
                                key={day.formatted}
                                className={`text-body text-sm ${record ? "cursor-pointer" : ""}`}
                                onClick={() =>
                                  record &&
                                  handleEditAttendance(
                                    record._id,
                                    emp.name,
                                    day.date,
                                    record.status
                                  )
                                }
                              >
                                {record ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="flex items-center gap-1">
                                          {getStatusIcon(record.status)}
                                          {record.status.charAt(0).toUpperCase()}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-body text-body border-complementary">
                                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-body text-sm">{counts.present}</TableCell>
                          <TableCell className="text-body text-sm">{counts.absent}</TableCell>
                          <TableCell className="text-body text-sm">{counts.leave}</TableCell>
                          <TableCell className="text-body text-sm">{counts["half-day"]}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-accent font-semibold border-t-2 border-complementary">
                      <TableCell className="text-complementary text-sm"></TableCell>
                      <TableCell className="text-complementary text-sm">Daily Totals</TableCell>
                      {days.map((day) => {
                        const records = attendance.filter(
                          (att) =>
                            format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
                        );
                        const totals = {
                          present: records.filter((r) => r.status === "present").length,
                          absent: records.filter((r) => r.status === "absent").length,
                          leave: records.filter((r) => r.status === "leave").length,
                          "half-day": records.filter((r) => r.status === "half-day").length,
                        };
                        return (
                          <TableCell
                            key={day.formatted}
                            className="text-complementary text-sm"
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="underline decoration-dotted cursor-help">
                                    {totals.present + totals.absent + totals.leave + totals["half-day"]}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="bg-body text-body border-complementary p-2">
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <span>Present:</span>
                                    <span>{totals.present}</span>
                                    <span>Absent:</span>
                                    <span>{totals.absent}</span>
                                    <span>Leave:</span>
                                    <span>{totals.leave}</span>
                                    <span>Half-Day:</span>
                                    <span>{totals["half-day"]}</span>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-complementary text-sm">
                        {paginatedEmployees.reduce((sum, emp) => {
                          const counts = {
                            present: 0,
                            absent: 0,
                            leave: 0,
                            "half-day": 0,
                          };
                          days.forEach((day) => {
                            const record = attendance.find(
                              (att) =>
                                att.employee?._id?.toString() === emp._id.toString() &&
                                format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
                            );
                            if (record) {
                              counts[record.status]++;
                            }
                          });
                          return sum + counts.present;
                        }, 0)}
                      </TableCell>
                      <TableCell className="text-complementary text-sm">
                        {paginatedEmployees.reduce((sum, emp) => {
                          const counts = {
                            present: 0,
                            absent: 0,
                            leave: 0,
                            "half-day": 0,
                          };
                          days.forEach((day) => {
                            const record = attendance.find(
                              (att) =>
                                att.employee?._id?.toString() === emp._id.toString() &&
                                format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
                            );
                            if (record) {
                              counts[record.status]++;
                            }
                          });
                          return sum + counts.absent;
                        }, 0)}
                      </TableCell>
                      <TableCell className="text-complementary text-sm">
                        {paginatedEmployees.reduce((sum, emp) => {
                          const counts = {
                            present: 0,
                            absent: 0,
                            leave: 0,
                            "half-day": 0,
                          };
                          days.forEach((day) => {
                            const record = attendance.find(
                              (att) =>
                                att.employee?._id?.toString() === emp._id.toString() &&
                                format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
                            );
                            if (record) {
                              counts[record.status]++;
                            }
                          });
                          return sum + counts.leave;
                        }, 0)}
                      </TableCell>
                      <TableCell className="text-complementary text-sm">
                        {paginatedEmployees.reduce((sum, emp) => {
                          const counts = {
                            present: 0,
                            absent: 0,
                            leave: 0,
                            "half-day": 0,
                          };
                          days.forEach((day) => {
                            const record = attendance.find(
                              (att) =>
                                att.employee?._id?.toString() === emp._id.toString() &&
                                format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
                            );
                            if (record) {
                              counts[record.status]++;
                            }
                          });
                          return sum + counts["half-day"];
                        }, 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center">
                <Button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="bg-accent text-complementary hover:bg-accent-hover text-sm py-2 px-4"
                  aria-label="Previous page"
                >
                  Previous
                </Button>
                <span className="text-sm text-body">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="bg-accent text-complementary hover:bg-accent-hover text-sm py-2 px-4"
                  aria-label="Next page"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-body text-sm">No employees found</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Attendance Dialog */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) =>
          !open &&
          setEditDialog({
            open: false,
            attendanceId: null,
            employeeName: "",
            date: null,
            currentStatus: "",
            newStatus: "",
          })
        }
      >
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col rounded-lg animate-scale-in">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              Edit Attendance
            </DialogTitle>
            <DialogDescription className="text-sm mt-2">
              Update attendance status for {editDialog.employeeName} on{" "}
              {editDialog.date ? format(editDialog.date, "PPP") : "N/A"}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentStatus" className="text-sm font-medium text-body">
                Current Status
              </Label>
              <Input
                id="currentStatus"
                value={editDialog.currentStatus.charAt(0).toUpperCase() + editDialog.currentStatus.slice(1)}
                disabled
                className="bg-complementary text-body border-complementary h-12 text-sm"
                aria-label="Current attendance status"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newStatus" className="text-sm font-medium text-body">
                New Status
              </Label>
              <Select
                onValueChange={(value) =>
                  setEditDialog((prev) => ({ ...prev, newStatus: value }))
                }
                value={editDialog.newStatus}
                disabled={locationFilter === "all" || locationsLoading}
                aria-label="Select new attendance status"
              >
                <SelectTrigger
                  id="newStatus"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                >
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body">
                  <SelectItem
                    value="present"
                    disabled={editDialog.currentStatus === "present"}
                    className="text-sm"
                  >
                    Present
                  </SelectItem>
                  <SelectItem
                    value="absent"
                    disabled={editDialog.currentStatus === "absent"}
                    className="text-sm"
                  >
                    Absent
                  </SelectItem>
                  <SelectItem
                    value="half-day"
                    disabled={editDialog.currentStatus === "half-day"}
                    className="text-sm"
                  >
                    Half Day
                  </SelectItem>
                  <SelectItem
                    value="leave"
                    disabled={editDialog.currentStatus === "leave"}
                    className="text-sm"
                  >
                    Paid Leave
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="shrink-0 px-6 py-4 border-t border-complementary flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setEditDialog({
                  open: false,
                  attendanceId: null,
                  employeeName: "",
                  date: null,
                  currentStatus: "",
                  newStatus: "",
                })
              }
              className="border-complementary text-body hover:bg-complementary text-sm py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={loading}
              aria-label="Cancel edit"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!editDialog.attendanceId || !editDialog.newStatus) {
                  toast.error("All fields are required", { duration: 5000 });
                  return;
                }
                if (editDialog.newStatus === editDialog.currentStatus) {
                  toast.error("New status cannot be the same as current status", { duration: 5000 });
                  return;
                }
                dispatch(
                  editAttendance({
                    id: editDialog.attendanceId,
                    status: editDialog.newStatus,
                  })
                )
                  .unwrap()
                  .then(() => {
                    toast.success("Attendance updated successfully", {
                      duration: 10000,
                    });
                    setEditDialog({
                      open: false,
                      attendanceId: null,
                      employeeName: "",
                      date: null,
                      currentStatus: "",
                      newStatus: "",
                    });
                    // Refresh attendance data
                    dispatch(
                      fetchAttendance({
                        month: monthFilter,
                        year: yearFilter,
                        location: locationFilter,
                      })
                    );
                  })
                  .catch((err) => {
                    toast.error(err || "Failed to update attendance", {
                      duration: 10000,
                    });
                  });
              }}
              className="bg-accent text-complementary hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={loading || !editDialog.newStatus}
              aria-label="Update attendance"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MonthlyAttendance;