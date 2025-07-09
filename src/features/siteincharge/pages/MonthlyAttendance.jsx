import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMonthlyAttendance,
  requestAttendanceEdit,
} from "../redux/attendanceSlice";
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
  startOfDay,
  isBefore,
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

const MonthlyAttendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { employees, loading: empLoading } = useSelector(
    (state) => state.siteInchargeEmployee
  );
  const { monthlyAttendance, loading, error } = useSelector(
    (state) => state.siteInchargeAttendance
  );

  const locationId = user?.locations?.[0]?._id;

  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth());
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear());
  const [requestDialog, setRequestDialog] = useState({
    open: false,
    employeeId: null,
    employeeName: "",
    date: null,
    currentStatus: "",
    location: null,
    newStatus: "",
    reason: "",
  });
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [monthlySearch, setMonthlySearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState(null);
  const employeesPerPage = 5;

  // Calculate start and end dates for the selected month/year
  const startDate = startOfMonth(new Date(yearFilter, monthFilter - 1));
  const endDate = endOfMonth(startDate);

  // Synchronize dateFilter and displayMonth/displayYear with monthFilter and yearFilter
  useEffect(() => {
    const today = startOfDay(new Date());
    const newDate = startOfDay(new Date(yearFilter, monthFilter - 1, 1));
    if (isBefore(today, newDate)) {
      setDateFilter(null); // Reset to show full month
    }
    setDisplayMonth(monthFilter - 1);
    setDisplayYear(yearFilter);
  }, [monthFilter, yearFilter]);

  // Debug Redux state
  useEffect(() => {
    monthlyAttendance.forEach((att) => {
      console.log(
        `Attendance Record: Employee=${att.employee?._id}, Date=${att.date}, Normalized=${format(
          new Date(att.date),
          "yyyy-MM-dd"
        )}`
      );
    });
  }, [employees, monthlyAttendance, error]);

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
    dispatch(fetchEmployees({ location: locationId }));
    dispatch(
      fetchMonthlyAttendance({
        month: monthFilter,
        year: yearFilter,
        location: locationId,
        isDeleted: false,
      })
    ).then((result) => {
      if (result.error) {
        toast.error(`Failed to fetch attendance: ${result.error.message}`, {
          duration: 10000,
        });
      }
    });
  }, [dispatch, user, navigate, locationId, monthFilter, yearFilter]);

  const handleRequestEdit = (
    employeeId,
    employeeName,
    date,
    currentStatus,
    location
  ) => {
    setRequestDialog({
      open: true,
      employeeId,
      employeeName,
      date,
      currentStatus,
      location,
      newStatus: "",
      reason: "",
    });
  };

  const handleMonthChange = (value) => {
    const parsedMonth = parseInt(value);
    setMonthFilter(parsedMonth);
    setDisplayMonth(parsedMonth - 1);
    setCurrentPage(1);
    const newDate = new Date(yearFilter, parsedMonth - 1, 1);
    if (newDate > new Date()) {
      setDateFilter(null); // Reset to show full month
    }
  };

  const handleYearChange = (value) => {
    const parsedYear = parseInt(value);
    setYearFilter(parsedYear);
    setDisplayYear(parsedYear);
    setCurrentPage(1);
    const newDate = new Date(parsedYear, monthFilter - 1, 1);
    if (newDate > new Date()) {
      setDateFilter(null); // Reset to show full month
    }
  };

  const handleMarkSort = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    setCurrentPage(1);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString("default", { month: "long" }),
  }));
  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  // Days for UI table (respects dateFilter)
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
        formatted: format(day, "MMM d"),
        isSunday: isSunday(day),
      }));
  }, [startDate, endDate, dateFilter]);

  // Days for PDF and Excel (all days in month)
  const pdfDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate }).map((day) => ({
      date: day,
      dayName: format(day, "EEE"),
      formatted: format(day, "MMM d"),
      isSunday: isSunday(day),
    }));
  }, [startDate, endDate]);

  const sortedEmployees = useMemo(() => {
    const result = [...employees]
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
    return result;
  }, [employees, sortField, sortOrder, monthlySearch]);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * employeesPerPage;
    return sortedEmployees.slice(startIndex, startIndex + employeesPerPage);
  }, [sortedEmployees, currentPage]);

  const monthlyTotals = useMemo(() => {
    return monthlyAttendance.reduce(
      (totals, record) => ({
        ...totals,
        [record.status]: (totals[record.status] || 0) + 1,
      }),
      { present: 0, absent: 0, leave: 0, "half-day": 0 }
    );
  }, [monthlyAttendance]);

  const totalPages = Math.ceil(sortedEmployees.length / employeesPerPage);

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

  const handleDownloadPDF = () => {
    if (!sortedEmployees.length) {
      toast.error("No attendance data available to export", { duration: 5000 });
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.text("Monthly Attendance Report", 15, 15);
    doc.setFontSize(10);
    doc.text(
      `Month: ${months.find((m) => m.value === monthFilter).label} ${yearFilter}`,
      15,
      22
    );
    doc.text(`Location: ${user?.locations?.[0]?.name || "Unknown"}`, 15, 29);
    if (dateFilter) doc.text(`Date: ${format(dateFilter, "PPP")}`, 15, 36);
    doc.setFontSize(8);
    doc.text('Note: Status - P: Present, A: Absent, L: Leave, HD: Half-Day', 15, 43);
    doc.setFontSize(10);
    doc.text(`Total Present: ${monthlyTotals.present}`, 15, 50);
    doc.text(`Total Absent: ${monthlyTotals.absent}`, 15, 57);
    doc.text(`Total Leave: ${monthlyTotals.leave}`, 15, 64);
    doc.text(`Total Half-Day: ${monthlyTotals["half-day"]}`, 15, 71);

    const body = sortedEmployees.map((emp) => {
      const counts = {
        present: 0,
        absent: 0,
        leave: 0,
        "half-day": 0,
      };
      const statuses = pdfDays.map((day) => {
        const record = monthlyAttendance.find(
          (att) =>
            att.employee?._id?.toString() === emp._id.toString() &&
            format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
        );
        if (record) {
          counts[record.status]++;
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
      ...pdfDays.map((day) => {
        const records = monthlyAttendance.filter(
          (att) => format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
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
    const fixedColumnsWidth = 12 + 25 + 15 * 4;
    const daysWidth = pdfDays.length > 0 ? (totalWidth - fixedColumnsWidth) / pdfDays.length : 4;

    autoTable(doc, {
      startY: 81,
      head: [["ID", "Employee", ...pdfDays.map((day) => day.formatted), "Present", "Absent", "Leave", "HD"]],
      body,
      theme: 'striped',
      pageBreak: 'auto',
      margin: { top: 81, left: 15, right: 15, bottom: 20 },
      styles: {
        font: 'helvetica',
        fontSize: 5,
        cellPadding: 1,
        overflow: 'linebreak',
        minCellHeight: 5,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontSize: 5,
        fontStyle: 'bold',
        font: 'helvetica',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 25, halign: 'left' },
        ...pdfDays.reduce((acc, _, index) => {
          acc[index + 2] = { cellWidth: Math.max(4, daysWidth), halign: 'center' };
          return acc;
        }, {}),
        [pdfDays.length + 2]: { cellWidth: 15, halign: 'center' },
        [pdfDays.length + 3]: { cellWidth: 15, halign: 'center' },
        [pdfDays.length + 4]: { cellWidth: 15, halign: 'center' },
        [pdfDays.length + 5]: { cellWidth: 15, halign: 'center' },
      },
      rowStyles: {
        [body.length - 1]: {
          fontStyle: 'bold',
          fillColor: [200, 200, 200],
          fontSize: 4.5,
          halign: 'center',
        },
      },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setFont('helvetica');
        doc.text(
          `Page ${doc.internal.getNumberOfPages()}`,
          doc.internal.pageSize.width - 20,
          doc.internal.pageSize.height - 10,
          { align: 'right' }
        );
      },
    });

    doc.save(`Attendance_${months.find((m) => m.value === monthFilter).label}_${yearFilter}.pdf`);
    toast.success("PDF downloaded successfully", { duration: 5000 });
  };

  const handleDownloadExcel = () => {
    if (!sortedEmployees.length) {
      toast.error("No attendance data available to export", { duration: 5000 });
      return;
    }

    const data = sortedEmployees.map((emp) => {
      const counts = {
        present: 0,
        absent: 0,
        leave: 0,
        "half-day": 0,
      };
      const row = {
        ID: emp.employeeId,
        Employee: emp.name,
      };
      pdfDays.forEach((day) => {
        const record = monthlyAttendance.find(
          (att) =>
            att.employee?._id?.toString() === emp._id.toString() &&
            format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
        );
        row[day.formatted] = record ? record.status.charAt(0).toUpperCase() : "-";
        if (record) {
          counts[record.status]++;
        }
      });
      return {
        ...row,
        Present: counts.present,
        Absent: counts.absent,
        Leave: counts.leave,
        "HD": counts["half-day"],
      };
    });

    data.push({
      ID: "",
      Employee: "Daily Totals",
      ...pdfDays.reduce((acc, day) => {
        const records = monthlyAttendance.filter(
          (att) => format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
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
      header: ["ID", "Employee", ...pdfDays.map((day) => day.formatted), "Present", "Absent", "Leave", "HD"],
    });

    ws['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      ...pdfDays.map(() => ({ wch: 10 })),
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
          fill: { fgColor: { rgb: '3B82F6' } },
          color: { rgb: 'FFFFFF' },
          alignment: { horizontal: 'center' },
        };
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Records');

    const headerWs = XLSX.utils.json_to_sheet([
      { A: 'Monthly Attendance Report' },
      { A: `Month: ${months.find((m) => m.value === monthFilter).label} ${yearFilter}` },
      { A: `Location: ${user?.locations?.[0]?.name || "Unknown"}` },
      ...(dateFilter ? [{ A: `Date: ${format(dateFilter, "PPP")}` }] : []),
      { A: 'Note: Status - P:Present, A:Absent, L:Leave, HD:Half-Day' },
      { A: `Total Present: ${monthlyTotals.present}` },
      { A: `Total Absent: ${monthlyTotals.absent}` },
      { A: `Total Leave: ${monthlyTotals.leave}` },
      { A: `Total Half-Day: ${monthlyTotals["half-day"]}` },
      { A: '' },
    ], { skipHeader: true });
    XLSX.utils.book_append_sheet(wb, headerWs, 'Header');

    const filename = `Attendance_${months.find((m) => m.value === monthFilter).label}_${yearFilter}.xlsx`;
    XLSX.writeFile(wb, filename, { bookType: 'xlsx', type: 'binary' });
    toast.success("Excel downloaded successfully", { duration: 5000 });
  };

  return (
    <div className="space-y-6 p-4 animate-fade-in">
      {(loading || empLoading) && (
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
          {error && (
            <p className="text-error text-sm">
              Error: {error}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    setCurrentPage(1);
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
                    disabled={!locationId}
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
                        setCurrentPage(1);
                        setDisplayMonth(monthFilter - 1);
                        setDisplayYear(yearFilter);
                      }}
                      className="w-full border-accent text-accent hover:bg-accent-light hover:text-body text-sm py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                      aria-label="Clear date filter and show full month"
                    >
                      Clear Date Filter
                    </Button>
                    <Calendar
                      key={`${displayYear}-${displayMonth}`}
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
                        setMonthFilter(date.getMonth() + 1);
                        setYearFilter(date.getFullYear());
                        setDisplayMonth(date.getMonth());
                        setDisplayYear(date.getFullYear());
                        setCurrentPage(1);
                      }}
                      onMonthChange={(newMonth) => {
                        setDisplayMonth(newMonth.getMonth());
                        setDisplayYear(newMonth.getFullYear());
                      }}
                      month={new Date(displayYear, displayMonth)}
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
                disabled={!locationId}
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
                disabled={!locationId}
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
                onClick={() => {
                  setDateFilter(null);
                  setCurrentPage(1);
                  setDisplayMonth(monthFilter - 1);
                  setDisplayYear(yearFilter);
                }}
                className="w-full bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 h-10 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={!dateFilter || !locationId}
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
                disabled={loading || empLoading || !locationId || !sortedEmployees.length}
                aria-label="Download monthly attendance as Excel"
              >
                {loading ? (
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
                disabled={loading || empLoading || !locationId || !sortedEmployees.length}
                aria-label="Download monthly attendance as PDF"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                Download PDF
              </Button>
            </div>
          </div>
          {loading || empLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : paginatedEmployees.length > 0 ? (
            monthlyAttendance.length > 0 ? (
              <div className="space-y-4">
                <div className="max-h-[400px] overflow-x-auto overflow-y-auto border border-complementary rounded-md shadow-sm relative">
                  <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
                  <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-complementary to-transparent pointer-events-none" />
                  <Table className="min-w-full table-fixed">
                    <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                      <TableRow>
                        <TableHead className="text-body text-sm w-[100px] text-center px-2">
                          ID
                        </TableHead>
                        <TableHead className="text-body text-sm w-[200px] text-center px-2">
                          <Button
                            variant="ghost"
                            onClick={handleMarkSort}
                            className="inline-flex items-center justify-center space-x-1 p-0 text-body font-semibold hover:bg-accent-light w-full h-full"
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
                            className={`${
                              index % 2 === 0 ? "bg-body" : "bg-complementary-light"
                            } animate-slide-in-row`}
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            <TableCell className="text-body text-sm w-[100px] text-center px-2 whitespace-nowrap">
                              {emp.employeeId}
                            </TableCell>
                            <TableCell className="text-body text-sm w-[200px] text-center px-2 max-w-[200px] truncate">
                              {emp.name}
                            </TableCell>
                            {days.map((day) => {
                              const record = monthlyAttendance.find(
                                (att) => {
                                  const attDate = format(new Date(att.date), "yyyy-MM-dd");
                                  const dayDate = format(day.date, "yyyy-MM-dd");
                                  const isMatch =
                                    att.employee?._id?.toString() === emp._id.toString() &&
                                    attDate === dayDate;
                                  console.log(
                                    `Comparing: Employee=${emp._id}, AttDate=${att.date} (${attDate}), DayDate=${dayDate}, Match=${isMatch}`
                                  );
                                  return isMatch;
                                }
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
                                    handleRequestEdit(
                                      emp._id,
                                      emp.name,
                                      day.date,
                                      record.status,
                                      locationId
                                    )
                                  }
                                >
                                  {record ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex items-center justify-center gap-1 w-full">
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
                            (att) => format(new Date(att.date), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")
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
                          {monthlyTotals.present}
                        </TableCell>
                        <TableCell className="text-body text-sm w-[80px] text-center px-2">
                          {monthlyTotals.absent}
                        </TableCell>
                        <TableCell className="text-body text-sm w-[80px] text-center px-2">
                          {monthlyTotals.leave}
                        </TableCell>
                        <TableCell className="text-body text-sm w-[80px] text-center px-2">
                          {monthlyTotals["half-day"]}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="border-complementary text-body hover:bg-complementary-light text-sm p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {getPageNumbers().map((page, index) => (
                      <Button
                        key={index}
                        variant={currentPage === page ? "default" : "outline"}
                        onClick={() => setCurrentPage(page)}
                        className={`${
                          currentPage === page
                            ? "bg-accent text-body hover:bg-accent-hover"
                            : "border-complementary text-body hover:bg-complementary-light"
                        } text-sm w-10 h-10 rounded-md focus:outline-none focus:ring-2 focus:ring-accent`}
                        aria-label={`Go to page ${page}`}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
                No attendance records found for the selected month and year.
              </p>
            )
          ) : (
            <p className="text-body text-sm text-center py-4">
              No employees found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Request Edit Dialog */}
      <Dialog
        open={requestDialog.open}
        onOpenChange={(open) =>
          !open &&
          setRequestDialog({
            open: false,
            employeeId: null,
            employeeName: "",
            date: null,
            currentStatus: "",
            location: null,
            newStatus: "",
            reason: "",
          })
        }
      >
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-lg rounded-md animate-scale-in">
          <DialogHeader className="border-b border-complementary pb-4">
            <DialogTitle className="text-xl font-bold text-body flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              Request Attendance Edit
            </DialogTitle>
            <DialogDescription className="text-sm text-body">
              Request a change to the attendance status for {requestDialog.employeeName} on{" "}
              {requestDialog.date ? format(requestDialog.date, "PPP") : "N/A"}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentStatus" className="text-sm font-semibold text-body">
                Current Status
              </Label>
              <Input
                id="currentStatus"
                value={requestDialog.currentStatus.charAt(0).toUpperCase() + requestDialog.currentStatus.slice(1)}
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
                  setRequestDialog((prev) => ({ ...prev, newStatus: value }))
                }
                value={requestDialog.newStatus}
                disabled={!locationId}
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
                    disabled={requestDialog.currentStatus === "present"}
                    className="text-sm hover:bg-accent-light"
                  >
                    Present
                  </SelectItem>
                  <SelectItem
                    value="absent"
                    disabled={requestDialog.currentStatus === "absent"}
                    className="text-sm hover:bg-accent-light"
                  >
                    Absent
                  </SelectItem>
                  <SelectItem
                    value="half-day"
                    disabled={requestDialog.currentStatus === "half-day"}
                    className="text-sm hover:bg-accent-light"
                  >
                    Half Day
                  </SelectItem>
                  <SelectItem
                    value="leave"
                    disabled={requestDialog.currentStatus === "leave"}
                    className="text-sm hover:bg-accent-light"
                  >
                    Paid Leave
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-semibold text-body">
                Reason for Change
              </Label>
              <Input
                id="reason"
                value={requestDialog.reason}
                onChange={(e) =>
                  setRequestDialog((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Enter reason for edit request"
                className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md text-sm"
                aria-label="Reason for attendance edit request"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-complementary pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setRequestDialog({
                  open: false,
                  employeeId: null,
                  employeeName: "",
                  date: null,
                  currentStatus: "",
                  location: null,
                  newStatus: "",
                  reason: "",
                })
              }
              className="border-complementary text-body hover:bg-complementary-light text-sm py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={loading}
              aria-label="Cancel edit request"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!requestDialog.newStatus || !requestDialog.reason) {
                  toast.error("Please select a new status and provide a reason", {
                    duration: 5000,
                  });
                  return;
                }
                const dateStr = format(startOfDay(requestDialog.date), "yyyy-MM-dd'T'00:00:00+05:30");
                dispatch(
                  requestAttendanceEdit({
                    employeeId: requestDialog.employeeId,
                    date: dateStr,
                    currentStatus: requestDialog.currentStatus,
                    newStatus: requestDialog.newStatus,
                    reason: requestDialog.reason,
                    location: requestDialog.location,
                  })
                )
                  .unwrap()
                  .then(() => {
                    toast.success("Edit request submitted successfully", {
                      duration: 10000,
                    });
                    setRequestDialog({
                      open: false,
                      employeeId: null,
                      employeeName: "",
                      date: null,
                      currentStatus: "",
                      location: null,
                      newStatus: "",
                      reason: "",
                    });
                  })
                  .catch((err) => {
                    toast.error(err || "Failed to submit edit request", {
                      duration: 10000,
                    });
                  });
              }}
              className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={loading || !requestDialog.newStatus || !requestDialog.reason}
              aria-label="Submit attendance edit request"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MonthlyAttendance;