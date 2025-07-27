import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMonthlyAttendance, editAttendance } from "../redux/attendanceSlice";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const MonthlyAttendance = ({ month, year, location, setLocation, setMonth, setYear }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { employees, loading: empLoading } = useSelector(
    (state) => state.adminEmployees
  );
  const { monthlyAttendance, monthlyPagination, loading, error } = useSelector(
    (state) => state.adminAttendance
  );
  const { locations, loading: locationsLoading } = useSelector(
    (state) => state.adminLocations
  );

  const [locationFilter, setLocationFilter] = useState(location || "all");
  const [monthFilter, setMonthFilter] = useState(month || new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(year || new Date().getFullYear());
  const [displayMonth, setDisplayMonth] = useState(month || new Date().getMonth() + 1);
  const [displayYear, setDisplayYear] = useState(year || new Date().getFullYear());
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
  const [attendancePage, setAttendancePage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState(null);
  const attendancePerPage = 5;

  // Debug logging to trace monthlyPagination
  useEffect(() => {
    console.log("monthlyPagination:", monthlyPagination);
  }, [monthlyPagination]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      toast.error("Unauthorized access. Please log in as an admin.", {
        duration: 5000,
      });
      navigate("/login");
      return;
    }
    dispatch(fetchLocations());
    if (locationFilter && locationFilter !== "all") {
      dispatch(fetchEmployees({ location: locationFilter }));
      dispatch(
        fetchMonthlyAttendance({
          month: monthFilter,
          year: yearFilter,
          location: locationFilter,
          page: attendancePage,
          limit: attendancePerPage,
        })
      );
    }
  }, [dispatch, user, navigate, locationFilter, monthFilter, yearFilter, attendancePage]);

  useEffect(() => {
    setLocation(locationFilter);
    setMonth(monthFilter);
    setYear(yearFilter);
  }, [locationFilter, monthFilter, yearFilter, setLocation, setMonth, setYear]);

  useEffect(() => {
    if (error) {
      toast.error(error, { duration: 5000 });
      dispatch({ type: "adminAttendance/reset" });
    }
  }, [error, dispatch]);

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
    const parsedMonth = parseInt(value);
    setMonthFilter(parsedMonth);
    setDisplayMonth(parsedMonth);
    setAttendancePage(1);
    setDateFilter(null);
  };

  const handleYearChange = (value) => {
    const parsedYear = parseInt(value);
    setYearFilter(parsedYear);
    setDisplayYear(parsedYear);
    setAttendancePage(1);
    setDateFilter(null);
  };

  const handleLocationChange = (value) => {
    setLocationFilter(value);
    setAttendancePage(1);
    setDateFilter(null);
  };

  const handleSort = () => {
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
  const displayStartDate = startOfMonth(new Date(displayYear, displayMonth - 1));
  const displayEndDate = endOfMonth(displayStartDate);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate })
      .filter(
        (day) =>
          !dateFilter ||
          format(day, "yyyy-MM-dd") === format(dateFilter, "yyyy-MM-dd")
      )
      .map((day) => ({
        date: day,
        dayName: format(day, "EEE"),
        formatted: format(day, "d"),
        isSunday: isSunday(day),
      }));
  }, [startDate, endDate, dateFilter]);

  // Get unique employees from monthlyAttendance
  const attendanceEmployees = useMemo(() => {
    const employeeMap = new Map();
    monthlyAttendance.forEach((att) => {
      if (att.employee && att.employee._id) {
        employeeMap.set(att.employee._id.toString(), att.employee);
      }
    });
    return Array.from(employeeMap.values())
      .filter(
        (emp) =>
          !monthlySearch ||
          emp.name?.toLowerCase().includes(monthlySearch.toLowerCase()) ||
          emp.employeeId?.toLowerCase().includes(monthlySearch.toLowerCase())
      )
      .sort((a, b) => {
        const aValue = a[sortField]?.toLowerCase() || "";
        const bValue = b[sortField]?.toLowerCase() || "";
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      });
  }, [monthlyAttendance, sortField, sortOrder, monthlySearch]);

  const getAttendancePageNumbers = () => {
    const maxPagesToShow = 5;
    const pages = [];
    const totalPages = monthlyPagination?.totalPages || 1;
    let startPage = Math.max(1, attendancePage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "present":
        return <CheckCircle2 className="h-4 w-4 text-green" />;
      case "absent":
        return <X className="h-4 w-4 text-error" />;
      case "leave":
        return <User className="h-4 w-4 text-yellow" />;
      case "half-day":
        return <Users className="h-4 w-4 text-accent" />;
      default:
        return null;
    }
  };

  const getLocationName = () => {
    if (locationFilter === "all") return "All Locations";
    const loc = locations.find((l) => l._id === locationFilter);
    return loc?.name || "Unknown";
  };

  const handleDownloadExcel = () => {
    if (!monthlyAttendance || !monthlyAttendance.length) {
      toast.error("No attendance data available to export. Please select a location and ensure data is loaded.", { duration: 5000 });
      return;
    }
    setIsExporting(true);
    const monthlyTotals = {
      present: 0,
      absent: 0,
      leave: 0,
      "half-day": 0,
    };

    const data = attendanceEmployees.map((emp) => {
      const counts = {
        present: 0,
        absent: 0,
        leave: 0,
        "half-day": 0,
      };
      const statuses = days.map((day) => {
        const record = monthlyAttendance.find(
          (att) =>
            att.employee?._id?.toString() === emp._id?.toString() &&
            format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
        );
        if (record) {
          counts[record.status]++;
          monthlyTotals[record.status]++;
          return record.status.charAt(0).toUpperCase();
        }
        return "-";
      });
      return {
        ID: emp.employeeId || "N/A",
        Employee: emp.name || "Unknown",
        ...days.reduce((acc, day, index) => {
          acc[day.formatted] = statuses[index];
          return acc;
        }, {}),
        Present: counts.present,
        Absent: counts.absent,
        Leave: counts.leave,
        "HD": counts["half-day"],
      };
    });

    data.push({
      ID: "",
      Employee: "Daily Totals",
      ...days.reduce((acc, day) => {
        const records = monthlyAttendance.filter(
          (att) =>
            format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
        );
        const totals = {
          present: records.filter((r) => r.status === "present").length,
          absent: records.filter((r) => r.status === "absent").length,
          leave: records.filter((r) => r.status === "leave").length,
          "half-day": records.filter((r) => r.status === "half-day").length,
        };
        acc[day.formatted] = `P:${totals.present},A:${totals.absent},L:${totals.leave},HD:${totals["half-day"]}`;
        return acc;
      }, {}),
      Present: monthlyTotals.present,
      Absent: monthlyTotals.absent,
      Leave: monthlyTotals.leave,
      "HD": monthlyTotals["half-day"],
    });

    const ws = XLSX.utils.json_to_sheet(data, {
      header: ["ID", "Employee", ...days.map((day) => day.formatted), "Present", "Absent", "Leave", "HD"],
    });

    ws['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      ...days.map(() => ({ wch: 10 })),
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
      if (cell) {
        cell.s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "3B82F6" } },
          color: { rgb: "FFFFFF" },
          alignment: { horizontal: "center" },
        };
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Attendance");

    const headerWs = XLSX.utils.json_to_sheet([
      { A: "Monthly Attendance Report" },
      { A: `Month: ${months.find((m) => m.value === monthFilter).label} ${yearFilter}` },
      { A: `Location: ${getLocationName()}` },
      { A: "Note: Daily Totals format is P:Present, A:Absent, L:Leave, HD:Half-Day" },
      { A: "" },
    ], { skipHeader: true });
    XLSX.utils.book_append_sheet(wb, headerWs, "Header");

    XLSX.writeFile(wb, `Attendance_${months.find((m) => m.value === monthFilter).label}_${yearFilter}.xlsx`, {
      bookType: "xlsx",
      type: "binary",
    });
    toast.success("Excel downloaded successfully", { duration: 5000 });
    setIsExporting(false);
  };

  const handleDownloadPDF = () => {
    if (!monthlyAttendance || !monthlyAttendance.length) {
      toast.error("No attendance data available to export. Please select a location and ensure data is loaded.", { duration: 5000 });
      return;
    }
    setIsExporting(true);
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    doc.setFont("helvetica", "normal");

    doc.setFontSize(14);
    doc.text("Monthly Attendance Report", 15, 15);
    doc.setFontSize(10);
    doc.text(
      `Month: ${months.find((m) => m.value === monthFilter).label} ${yearFilter}`,
      15,
      22
    );
    doc.text(`Location: ${getLocationName()}`, 15, 29);

    doc.setFontSize(8);
    doc.text(
      "Note: Daily Totals format is P:Present, A:Absent, L:Leave, HD:Half-Day",
      15,
      34
    );

    const monthlyTotals = {
      present: 0,
      absent: 0,
      leave: 0,
      "half-day": 0,
    };

    const body = attendanceEmployees.map((emp) => {
      const counts = {
        present: 0,
        absent: 0,
        leave: 0,
        "half-day": 0,
      };
      const statuses = days.map((day) => {
        const record = monthlyAttendance.find(
          (att) =>
            att.employee?._id?.toString() === emp._id?.toString() &&
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
        emp.employeeId || "N/A",
        emp.name || "Unknown",
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
        const records = monthlyAttendance.filter(
          (att) =>
            format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
        );
        const totals = {
          present: records.filter((r) => r.status === "present").length,
          absent: records.filter((r) => r.status === "absent").length,
          leave: records.filter((r) => r.status === "leave").length,
          "half-day": records.filter((r) => r.status === "half-day").length,
        };
        return `P:${totals.present},A:${totals.absent},L:${totals.leave},HD:${totals["half-day"]}`;
      }),
      monthlyTotals.present,
      monthlyTotals.absent,
      monthlyTotals.leave,
      monthlyTotals["half-day"],
    ]);

    const totalWidth = 180;
    const fixedColumnsWidth = 12 + 25 + 8 * 4;
    const daysWidth = days.length > 0 ? (totalWidth - fixedColumnsWidth) / days.length : 4;

    autoTable(doc, {
      startY: 40,
      head: [["ID", "Employee", ...days.map((day) => day.formatted), "Present", "Absent", "Leave", "HD"]],
      body,
      theme: "striped",
      pageBreak: "auto",
      margin: { top: 40, left: 15, right: 15, bottom: 20 },
      styles: {
        font: "helvetica",
        fontSize: 5,
        cellPadding: 1,
        overflow: "linebreak",
        minCellHeight: 5,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontSize: 5,
        fontStyle: "bold",
        font: "helvetica",
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 25, overflow: "linebreak" },
        ...days.reduce((acc, _, index) => {
          acc[index + 2] = { cellWidth: Math.max(4, daysWidth), halign: "center", textRotation: 45 };
          return acc;
        }, {}),
        [days.length + 2]: { cellWidth: 8, halign: "center" },
        [days.length + 3]: { cellWidth: 8, halign: "center" },
        [days.length + 4]: { cellWidth: 8, halign: "center" },
        [days.length + 5]: { cellWidth: 8, halign: "center" },
      },
      rowStyles: {
        [body.length - 1]: {
          fontStyle: "bold",
          fillColor: [200, 200, 200],
          fontSize: 4.5,
          halign: "center",
        },
      },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setFont("helvetica");
        doc.text(
          `Page ${doc.internal.getNumberOfPages()}`,
          doc.internal.pageSize.width - 20,
          doc.internal.pageSize.height - 10,
          { align: "right" }
        );
      },
    });

    doc.save(`Attendance_${months.find((m) => m.value === monthFilter).label}_${yearFilter}.pdf`);
    toast.success("PDF downloaded successfully", { duration: 5000 });
    setIsExporting(false);
  };

  return (
    <div className="space-y-6 p-4 animate-fade-in">
      {(loading || locationsLoading || empLoading) && (
        <div className="fixed inset-0 bg-overlay bg-opacity-50 flex justify-center items-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}
      <Card className="bg-body text-body border border-complementary rounded-lg shadow-md">
        <CardHeader className="border-b border-complementary">
          <CardTitle className="text-2xl font-bold text-body">
            Monthly Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="locationFilter"
                className="text-sm font-semibold text-body"
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
                  className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md text-sm"
                  aria-label="Select location for monthly attendance"
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
                htmlFor="monthlySearch"
                className="text-sm font-semibold text-body"
              >
                Search Employees
              </Label>
              <div className="relative">
                <Input
                  id="monthlySearch"
                  placeholder="Search by name or ID..."
                  value={monthlySearch}
                  onChange={(e) => {
                    setMonthlySearch(e.target.value);
                  }}
                  className="pl-10 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md text-sm"
                  aria-label="Search employees in monthly attendance"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-complementary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="dateFilter"
                className="text-sm font-semibold text-body"
              >
                Filter by Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-semibold bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md truncate text-sm"
                    disabled={locationFilter === "all" || locationsLoading}
                    aria-label="Select date to filter monthly attendance"
                  >
                    <CalendarIcon className="mr-2 h-5 w-5 text-complementary flex-shrink-0" />
                    <span className="truncate">
                      {dateFilter ? format(dateFilter, "PPP") : "Pick a date or view full month"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-body text-body">
                  <div className="p-4 space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDateFilter(null);
                        setAttendancePage(1);
                      }}
                      className="w-full border-accent text-accent hover:bg-accent-light hover:text-body text-sm py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                      aria-label="Show full month attendance"
                    >
                      Clear Date Filter
                    </Button>
                    <Calendar
                      mode="single"
                      selected={dateFilter}
                      month={new Date(displayYear, displayMonth - 1)}
                      onSelect={(date) => {
                        if (date > new Date()) {
                          toast.error("Cannot select a future date", {
                            duration: 5000,
                          });
                          return;
                        }
                        setDateFilter(date);
                        setMonthFilter(date.getMonth() + 1);
                        setYearFilter(date.getFullYear());
                        setDisplayMonth(date.getMonth() + 1);
                        setDisplayYear(date.getFullYear());
                        setAttendancePage(1);
                      }}
                      onMonthChange={(newMonth) => {
                        setDisplayMonth(newMonth.getMonth() + 1);
                        setDisplayYear(newMonth.getFullYear());
                      }}
                      initialFocus
                      disabled={(date) => date > new Date()}
                      className="border border-complementary rounded-md text-sm"
                      modifiers={{
                        selected: dateFilter,
                      }}
                      modifiersClassNames={{
                        selected: "bg-accent text-body font-bold border-2 border-accent rounded-full",
                        today: "bg-complementary-light text-body border border-complementary rounded-full",
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="monthFilter"
                className="text-sm font-semibold text-body"
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
                  className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md text-sm"
                  aria-label="Select month for monthly attendance"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  {months.map((month) => (
                    <SelectItem
                      key={month.value}
                      value={month.value.toString()}
                      className="text-sm hover:bg-accent-light"
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="yearFilter"
                className="text-sm font-semibold text-body"
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
                  className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md text-sm"
                  aria-label="Select year for monthly attendance"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  {years.map((year) => (
                    <SelectItem
                      key={year}
                      value={year.toString()}
                      className="text-sm hover:bg-accent-light"
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-body"> </Label>
              <Button
                onClick={() => setDateFilter(null)}
                className="w-full bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 h-10 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={!dateFilter || locationFilter === "all" || locationsLoading}
                aria-label="Reset date filter to show full month"
              >
                <RotateCcw className="h-5 w-5" />
                Show Full Month
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-body"> </Label>
              <Button
                onClick={handleDownloadExcel}
                className="w-full bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 h-10 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={isExporting || loading || empLoading || locationsLoading || !attendanceEmployees.length || locationFilter === "all" || !monthlyAttendance?.length}
                aria-label="Download monthly attendance as Excel"
              >
                {isExporting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                Download Excel
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-body"> </Label>
              <Button
                onClick={handleDownloadPDF}
                className="w-full bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 h-10 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={isExporting || loading || empLoading || locationsLoading || !attendanceEmployees.length || locationFilter === "all" || !monthlyAttendance?.length}
                aria-label="Download monthly attendance as PDF"
              >
                {isExporting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                Download PDF
              </Button>
            </div>
          </div>
          {loading || empLoading || locationsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : locationFilter === "all" ? (
            <p className="text-body text-sm text-center py-4">
              Please select a specific location to view attendance records.
            </p>
          ) : attendanceEmployees.length > 0 ? (
            <div className="space-y-4">
              <div className="max-h-[400px] overflow-x-auto overflow-y-auto border border-complementary rounded-lg shadow-sm relative">
                <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-complementary to-transparent pointer-events-none" />
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                    <TableRow>
                      <TableHead className="text-body text-sm w-[100px] text-center px-2">
                        ID
                      </TableHead>
                      <TableHead className="text-body text-sm w-[200px] text-center px-2">
                        <Button
                          variant="ghost"
                          onClick={handleSort}
                          className="flex items-center justify-center space-x-1 p-0 text-body font-semibold hover:bg-accent-light w-full h-full"
                          aria-label={`Sort employees by name ${sortOrder === "asc" ? "descending" : "ascending"}`}
                        >
                          Employee
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TableHead>
                      {days.map((day) => (
                        <TableHead
                          key={day.formatted}
                          className={`text-body text-sm w-[60px] text-center px-2 ${day.isSunday ? "bg-error-light" : ""}`}
                        >
                          {day.dayName}
                          <br />
                          {format(day.date, "MMM d")}
                        </TableHead>
                      ))}
                      <TableHead className="text-body text-sm w-[80px] text-center px-2">
                        Present
                      </TableHead>
                      <TableHead className="text-body text-sm w-[80px] text-center px-2">
                        Absent
                      </TableHead>
                      <TableHead className="text-body text-sm w-[80px] text-center px-2">
                        Leave
                      </TableHead>
                      <TableHead className="text-body text-sm w-[80px] text-center px-2">
                        HD
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceEmployees.map((emp, index) => {
                      const counts = {
                        present: 0,
                        absent: 0,
                        leave: 0,
                        "half-day": 0,
                      };
                      return (
                        <TableRow
                          key={emp._id}
                          className={`${
                            index % 2 === 0 ? "bg-body" : "bg-complementary-light"
                          } animate-slide-in-row`}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <TableCell className="text-body text-sm w-[100px] text-center px-2 whitespace-nowrap">
                            {emp.employeeId || "N/A"}
                          </TableCell>
                          <TableCell className="text-body text-sm w-[200px] text-center px-2 max-w-[200px] truncate">
                            {emp.name || "Unknown"}
                          </TableCell>
                          {days.map((day) => {
                            const record = monthlyAttendance.find(
                              (att) =>
                                att.employee?._id?.toString() === emp._id?.toString() &&
                                format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
                            );
                            if (record) {
                              counts[record.status]++;
                            }
                            return (
                              <TableCell
                                key={day.formatted}
                                className={`text-body text-sm w-[60px] text-center px-2 ${record ? "cursor-pointer hover:bg-accent-light" : ""} ${
                                  day.isSunday ? "bg-error-light" : ""
                                }`}
                                onClick={() =>
                                  record &&
                                  handleEditAttendance(
                                    record._id,
                                    emp.name || "Unknown",
                                    day.date,
                                    record.status
                                  )
                                }
                              >
                                {record ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="flex items-center justify-center gap-1">
                                          {getStatusIcon(record.status)}
                                          {record.status.charAt(0).toUpperCase()}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-body text-body border-complementary text-sm">
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
                          <TableCell className="text-body text-sm w-[80px] text-center px-2">
                            {counts.present}
                          </TableCell>
                          <TableCell className="text-body text-sm w-[80px] text-center px-2">
                            {counts.absent}
                          </TableCell>
                          <TableCell className="text-body text-sm w-[80px] text-center px-2">
                            {counts.leave}
                          </TableCell>
                          <TableCell className="text-body text-sm w-[80px] text-center px-2">
                            {counts["half-day"]}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-accent font-semibold border-t-2 border-complementary">
                      <TableCell className="text-body text-sm w-[100px] text-center px-2"></TableCell>
                      <TableCell className="text-body text-sm w-[200px] text-center px-2 font-semibold">
                        Daily Totals
                      </TableCell>
                      {days.map((day) => {
                        const records = monthlyAttendance.filter(
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
                            className={`text-body text-sm w-[60px] text-center px-2 ${day.isSunday ? "bg-error-light" : ""}`}
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="underline decoration-dotted cursor-help">
                                    {totals.present + totals.absent + totals.leave + totals["half-day"]}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="bg-body text-body border-complementary p-2 text-sm">
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
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
                      <TableCell className="text-body text-sm w-[80px] text-center px-2">
                        {monthlyAttendance.reduce((sum, att) => (att.status === "present" ? sum + 1 : sum), 0)}
                      </TableCell>
                      <TableCell className="text-body text-sm w-[80px] text-center px-2">
                        {monthlyAttendance.reduce((sum, att) => (att.status === "absent" ? sum + 1 : sum), 0)}
                      </TableCell>
                      <TableCell className="text-body text-sm w-[80px] text-center px-2">
                        {monthlyAttendance.reduce((sum, att) => (att.status === "leave" ? sum + 1 : sum), 0)}
                      </TableCell>
                      <TableCell className="text-body text-sm w-[80px] text-center px-2">
                        {monthlyAttendance.reduce((sum, att) => (att.status === "half-day" ? sum + 1 : sum), 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {monthlyPagination && monthlyPagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setAttendancePage((prev) => Math.max(prev - 1, 1))}
                    disabled={attendancePage === 1}
                    className="border-complementary text-body hover:bg-complementary-light text-sm p-2"
                    aria-label="Previous attendance page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {getAttendancePageNumbers().map((page) => (
                    <Button
                      key={page}
                      variant={attendancePage === page ? "default" : "outline"}
                      onClick={() => setAttendancePage(page)}
                      className={`${
                        attendancePage === page
                          ? "bg-accent text-body hover:bg-accent-hover"
                          : "border-complementary text-body hover:bg-complementary-light"
                      } text-sm w-10 h-10 rounded-md`}
                      aria-label={`Go to attendance page ${page}`}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setAttendancePage((prev) => Math.min(prev + 1, monthlyPagination.totalPages))}
                    disabled={attendancePage === monthlyPagination.totalPages}
                    className="border-complementary text-body hover:bg-complementary-light text-sm p-2"
                    aria-label="Next attendance page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-body text-sm text-center py-4">
              No employees found for the selected location or search criteria.
            </p>
          )}
        </CardContent>
      </Card>

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
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-lg rounded-lg animate-scale-in">
          <DialogHeader className="border-b border-complementary pb-4">
            <DialogTitle className="text-xl font-bold text-body flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              Edit Attendance
            </DialogTitle>
            <DialogDescription className="text-sm text-body">
              Update attendance for {editDialog.employeeName} on{" "}
              {editDialog.date ? format(editDialog.date, "PPP") : "N/A"}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentStatus" className="text-sm font-semibold text-body">
                Current Status
              </Label>
              <Input
                id="currentStatus"
                value={editDialog.currentStatus ? editDialog.currentStatus.charAt(0).toUpperCase() + editDialog.currentStatus.slice(1) : ""}
                disabled
                className="bg-complementary-light text-body border-complementary h-10 rounded-md text-sm cursor-not-allowed"
                aria-label="Current attendance status"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newStatus" className="text-sm font-semibold text-body">
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
                  className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md text-sm"
                >
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  <SelectItem
                    value="present"
                    disabled={editDialog.currentStatus === "present"}
                    className="text-sm hover:bg-accent-light"
                  >
                    Present
                  </SelectItem>
                  <SelectItem
                    value="absent"
                    disabled={editDialog.currentStatus === "absent"}
                    className="text-sm hover:bg-accent-light"
                  >
                    Absent
                  </SelectItem>
                  <SelectItem
                    value="half-day"
                    disabled={editDialog.currentStatus === "half-day"}
                    className="text-sm hover:bg-accent-light"
                  >
                    Half Day
                  </SelectItem>
                  <SelectItem
                    value="leave"
                    disabled={editDialog.currentStatus === "leave"}
                    className="text-sm hover:bg-accent-light"
                  >
                    Paid Leave
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-t border-complementary pt-4 flex justify-end gap-3">
            <Button
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
              className="border-complementary text-body hover:bg-complementary-light text-sm py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={loading}
              aria-label="Cancel edit"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editDialog.attendanceId || !editDialog.newStatus) {
                  toast.error("Please select a new status to update.", { duration: 5000 });
                  return;
                }
                if (editDialog.newStatus === editDialog.currentStatus) {
                  toast.error("New status must be different from the current status.", { duration: 5000 });
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
                    toast.success(
                      `Attendance updated to ${editDialog.newStatus} for ${editDialog.employeeName} on ${format(editDialog.date, "PPP")}.`,
                      { duration: 5000 }
                    );
                    setEditDialog({
                      open: false,
                      attendanceId: null,
                      employeeName: "",
                      date: null,
                      currentStatus: "",
                      newStatus: "",
                    });
                    dispatch(
                      fetchMonthlyAttendance({
                        month: monthFilter,
                        year: yearFilter,
                        location: locationFilter,
                        page: attendancePage,
                        limit: attendancePerPage,
                      })
                    );
                  })
                  .catch((err) => {
                    const errorMessage = err?.message || "Failed to update attendance.";
                    toast.error(errorMessage, { duration: 5000 });
                  });
              }}
              className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
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