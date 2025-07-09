import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees } from "../redux/employeeSlice";
import { fetchAttendance, reset, editAttendance } from "../redux/attendanceSlice";
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
  TableFooter,
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
import { CalendarIcon, Loader2, Search, Download, ArrowUp, ArrowDown, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const ViewAttendance = () => {
  const dispatch = useDispatch();
  const { employees, loading: empLoading } = useSelector(
    (state) => state.adminEmployees
  );
  const { attendance, loading: attLoading, error } = useSelector(
    (state) => state.adminAttendance
  );
  const { locations, loading: locLoading } = useSelector(
    (state) => state.adminLocations
  );

  const [locationId, setLocationId] = useState("all");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterDate, setFilterDate] = useState(null);
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth());
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ column: "date", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [editDialog, setEditDialog] = useState({
    open: false,
    attendanceId: null,
    employeeName: "",
    date: null,
    currentStatus: "",
    newStatus: "",
  });
  const recordsPerPage = 5; // Fixed page size of 5

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString("default", { month: "long" }),
  }));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  // Handle error display
  useEffect(() => {
    if (error) {
      toast.error(error, { duration: 5000 });
      dispatch(reset());
    }
  }, [error, dispatch]);

  // Fetch data based on filters
  useEffect(() => {
    dispatch(fetchLocations());
    if (locationId === "all") return;
    dispatch(fetchEmployees({ location: locationId }));

    const currentYear = new Date().getFullYear();
    if (
      filterMonth &&
      filterYear &&
      filterMonth >= 1 &&
      filterMonth <= 12 &&
      filterYear >= 2000 &&
      filterYear <= currentYear
    ) {
      const filters = {
        month: filterMonth,
        year: filterYear,
        location: locationId,
      };
      if (filterDate) filters.date = format(filterDate, "yyyy-MM-dd");
      if (filterStatus !== "all") filters.status = filterStatus;
      dispatch(fetchAttendance(filters));
    }
  }, [dispatch, locationId, filterMonth, filterYear, filterDate, filterStatus]);

  // Sorting logic
  const sortedAttendance = useMemo(() => {
    if (!attendance || !Array.isArray(attendance)) return [];

    return [...attendance].sort((a, b) => {
      if (sortConfig.column === "name") {
        const nameA = a.employee?.name || "";
        const nameB = b.employee?.name || "";
        return sortConfig.direction === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      } else {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
      }
    });
  }, [attendance, sortConfig]);

  // Client-side search filtering
  const filteredAttendance = useMemo(() => {
    let filtered = sortedAttendance;
    if (searchQuery) {
      filtered = filtered.filter(
        (record) =>
          record.employee?.name?.toLowerCase().includes(searchQuery?.toLowerCase()) ||
          record.employee?.employeeId?.toLowerCase().includes(searchQuery?.toLowerCase())
      );
    }
    return filtered;
  }, [sortedAttendance, searchQuery]);

  // Pagination
  const paginatedAttendance = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    return filteredAttendance.slice(startIndex, startIndex + recordsPerPage);
  }, [filteredAttendance, currentPage]);

  const totalPages = Math.ceil(filteredAttendance.length / recordsPerPage);

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

  // Status totals
  const statusTotals = useMemo(() => {
    return filteredAttendance.reduce(
      (totals, record) => ({
        ...totals,
        [record.status]: (totals[record.status] || 0) + 1,
      }),
      { present: 0, absent: 0, leave: 0, "half-day": 0 }
    );
  }, [filteredAttendance]);

  // Days for Daily Totals
  const days = useMemo(() => {
    const startDate = startOfMonth(new Date(filterYear, filterMonth - 1));
    const endDate = endOfMonth(startDate);
    return eachDayOfInterval({ start: startDate, end: endDate })
      .filter(
        (day) =>
          !filterDate ||
          format(day, "yyyy-MM-dd") === format(filterDate, "yyyy-MM-dd")
      )
      .map((day) => ({
        date: day,
        formatted: format(day, "d"),
      }));
  }, [filterMonth, filterYear, filterDate]);

  const handleSort = (column) => {
    setSortConfig((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1);
  };

  const handleDateSelect = (date) => {
    if (date > new Date()) {
      toast.error("Cannot select a future date", { duration: 5000 });
      return;
    }
    setFilterDate(date);
    setCurrentPage(1);
  };

  const handleEditAttendance = (record) => {
    setEditDialog({
      open: true,
      attendanceId: record._id,
      employeeName: record.employee?.name || "Unknown",
      date: new Date(record.date),
      currentStatus: record.status,
      newStatus: "",
    });
  };

  const handleSubmitEdit = () => {
    if (!editDialog.newStatus) {
      toast.error("Please select a status", { duration: 5000 });
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
        toast.success("Attendance updated successfully", { duration: 5000 });
        setEditDialog({
          open: false,
          attendanceId: null,
          employeeName: "",
          date: null,
          currentStatus: "",
          newStatus: "",
        });
        dispatch(
          fetchAttendance({
            month: filterMonth,
            year: filterYear,
            location: locationId,
            date: filterDate && format(new Date(filterDate), "yyyy-MM-dd"),
            status: filterStatus !== "all" && filterStatus,
          })
        );
      })
      .catch((err) => toast.error(err || "Failed to update attendance", { duration: 5000 }));
  };

  const handleDownloadPDF = () => {
    if (!filteredAttendance.length) {
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
    doc.text("Attendance Records Report", 15, 15);
    doc.setFontSize(10);
    doc.text(`Location: ${locations.find((loc) => loc._id === locationId)?.name || "All"}`, 15, 22);
    doc.text(`Month: ${months.find((m) => m.value === filterMonth)?.label || "N/A"}`, 15, 29);
    doc.text(`Year: ${filterYear}`, 15, 36);
    if (filterDate) doc.text(`Date: ${format(filterDate, "PPP")}`, 15, 43);
    if (filterStatus !== "all") doc.text(`Status: ${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}`, 15, 50);
    doc.setFontSize(8);
    doc.text('Note: Status totals - P: Present, A: Absent, L: Leave, HD: Half-Day', 15, 57);
    doc.setFontSize(10);
    doc.text(`Total Present: ${statusTotals.present}`, 15, 64);
    doc.text(`Total Absent: ${statusTotals.absent}`, 15, 71);
    doc.text(`Total Leave: ${statusTotals.leave}`, 15, 78);
    doc.text(`Total Half-Day: ${statusTotals["half-day"]}`, 15, 85);

    const body = filteredAttendance.map((record) => [
      record.employee?.employeeId || "N/A",
      record.employee?.name || "Unknown",
      record.status.charAt(0).toUpperCase(),
      isNaN(new Date(record.date)) ? "Invalid Date" : format(new Date(record.date), "d"),
    ]);

    body.push([
      "",
      "Daily Totals",
      "",
      ...days.map((day) => {
        const records = filteredAttendance.filter(
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
    ]);

    autoTable(doc, {
      startY: 95,
      head: [["ID", "Name", "Status", "Date"]],
      body,
      theme: 'striped',
      pageBreak: 'auto',
      margin: { top: 95, left: 15, right: 15, bottom: 20 },
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 60, overflow: 'linebreak' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 50, halign: 'center' },
      },
      rowStyles: {
        [body.length - 1]: {
          fontStyle: 'bold',
          fillColor: [200, 200, 200],
          fontSize: 7,
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

    doc.save(`Attendance_Records_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF downloaded successfully", { duration: 5000 });
  };

  const handleDownloadExcel = () => {
    if (!filteredAttendance.length) {
      toast.error("No attendance data available to export", { duration: 5000 });
      return;
    }

    const data = filteredAttendance.map((record) => ({
      ID: record.employee?.employeeId || "N/A",
      Name: record.employee?.name || "Unknown",
      Status: record.status.charAt(0).toUpperCase(),
      Date: isNaN(new Date(record.date)) ? "Invalid Date" : format(new Date(record.date), "d"),
    }));

    data.push({
      ID: "",
      Name: "Daily Totals",
      Status: "",
      Date: days.reduce((acc, day) => {
        const records = filteredAttendance.filter(
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
    });

    const ws = XLSX.utils.json_to_sheet(data, {
      header: ["ID", "Name", "Status", "Date"],
    });

    ws['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
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
      { A: 'Attendance Records Report' },
      { A: `Location: ${locations.find((loc) => loc._id === locationId)?.name || "All"}` },
      { A: `Month: ${months.find((m) => m.value === filterMonth)?.label || "N/A"}` },
      { A: `Year: ${filterYear}` },
      ...(filterDate ? [{ A: `Date: ${format(filterDate, "PPP")}` }] : []),
      ...(filterStatus !== "all" ? [{ A: `Status: ${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}` }] : []),
      { A: 'Note: Daily Totals format is P:Present, A:Absent, L:Leave, HD:Half-Day' },
      { A: `Total Present: ${statusTotals.present}` },
      { A: `Total Absent: ${statusTotals.absent}` },
      { A: `Total Leave: ${statusTotals.leave}` },
      { A: `Total Half-Day: ${statusTotals["half-day"]}` },
      { A: '' },
    ], { skipHeader: true });
    XLSX.utils.book_append_sheet(wb, headerWs, 'Header');

    const filename = `Attendance_Records_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, filename, { bookType: 'xlsx', type: 'binary' });
    toast.success("Excel downloaded successfully", { duration: 5000 });
  };

  return (
    <div className="space-y-8 p-4 animate-fade-in">
      {attLoading && (
        <div className="fixed inset-0 bg-overlay flex justify-center items-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}
      <Card className="bg-body text-body border border-complementary max-w-4xl mx-auto rounded-lg shadow-md">
        <CardHeader className="border-b border-complementary">
          <CardTitle className="text-2xl font-bold text-body">Filter Attendance</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2 min-w-[160px] flex-1">
              <Label htmlFor="locationId" className="text-sm font-semibold text-body">
                Location
              </Label>
              <Select
                value={locationId}
                onValueChange={(value) => {
                  setLocationId(value);
                  setFilterDate(null);
                  setCurrentPage(1);
                }}
                disabled={locLoading}
              >
                <SelectTrigger
                  id="locationId"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                  aria-label="Select location to filter attendance records"
                >
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  <SelectItem value="all" className="text-sm hover:bg-accent-light">
                    All Locations
                  </SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc._id} value={loc._id} className="text-sm hover:bg-accent-light">
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[120px] flex-1">
              <Label htmlFor="filterMonth" className="text-sm font-semibold text-body">
                Month
              </Label>
              <Select
                value={filterMonth.toString()}
                onValueChange={(value) => {
                  const parsedMonth = parseInt(value);
                  setFilterMonth(parsedMonth);
                  setDisplayMonth(parsedMonth - 1);
                  setCurrentPage(1);
                  setFilterDate(null);
                }}
                disabled={locationId === "all"}
              >
                <SelectTrigger
                  id="filterMonth"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                  aria-label="Select month to filter attendance records"
                >
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()} className="text-sm hover:bg-accent-light">
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[100px] flex-1">
              <Label htmlFor="filterYear" className="text-sm font-semibold text-body">
                Year
              </Label>
              <Select
                value={filterYear.toString()}
                onValueChange={(value) => {
                  const parsedYear = parseInt(value);
                  setFilterYear(parsedYear);
                  setDisplayYear(parsedYear);
                  setCurrentPage(1);
                  setFilterDate(null);
                }}
                disabled={locationId === "all"}
              >
                <SelectTrigger
                  id="filterYear"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                  aria-label="Select year to filter attendance records"
                >
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()} className="text-sm hover:bg-accent-light">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[160px] flex-1">
              <Label htmlFor="filterDate" className="text-sm font-semibold text-body">
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-semibold bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm truncate"
                    disabled={locationId === "all" || locLoading}
                    aria-label="Select date to filter attendance records"
                  >
                    <CalendarIcon className="mr-2 h-5 w-5 text-complementary flex-shrink-0" />
                    <span className="truncate">
                      {filterDate ? format(filterDate, "PPP") : "Pick a date or view full month"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-body text-body">
                  <div className="p-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilterDate(null);
                        setCurrentPage(1);
                      }}
                      className="w-full mb-2 border-accent text-accent hover:bg-accent-light text-sm py-2 px-4"
                      disabled={!filterDate}
                      aria-label="Show full month attendance"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Show Full Month
                    </Button>
                    <Calendar
                      mode="single"
                      selected={filterDate}
                      onSelect={handleDateSelect}
                      month={new Date(displayYear, displayMonth)}
                      onMonthChange={(newMonth) => {
                        const newMonthValue = newMonth.getMonth() + 1;
                        const newYearValue = newMonth.getFullYear();
                        setDisplayMonth(newMonth.getMonth());
                        setDisplayYear(newYearValue);
                        setFilterMonth(newMonthValue);
                        setFilterYear(newYearValue);
                        setFilterDate(null);
                        setCurrentPage(1);
                      }}
                      initialFocus
                      disabled={(date) => date > new Date()}
                      className="border border-complementary rounded-md text-sm"
                      modifiers={{
                        selected: filterDate,
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
            <div className="space-y-2 min-w-[120px] flex-1">
              <Label htmlFor="filterStatus" className="text-sm font-semibold text-body">
                Status
              </Label>
              <Select
                value={filterStatus}
                onValueChange={(value) => {
                  setFilterStatus(value);
                  setCurrentPage(1);
                }}
                disabled={locationId === "all"}
              >
                <SelectTrigger
                  id="filterStatus"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                  aria-label="Select status to filter attendance records"
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  <SelectItem value="all" className="text-sm hover:bg-accent-light">
                    All Statuses
                  </SelectItem>
                  <SelectItem value="present" className="text-sm hover:bg-accent-light">
                    Present
                  </SelectItem>
                  <SelectItem value="absent" className="text-sm hover:bg-accent-light">
                    Absent
                  </SelectItem>
                  <SelectItem value="leave" className="text-sm hover:bg-accent-light">
                    Leave
                  </SelectItem>
                  <SelectItem value="half-day" className="text-sm hover:bg-accent-light">
                    Half Day
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-body text-body border border-complementary rounded-lg shadow-md">
        <CardHeader className="border-b border-complementary flex flex-row justify-between items-center">
          <CardTitle className="text-2xl font-bold text-body">Attendance Records</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Input
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-64 pl-10 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                aria-label="Search attendance records by employee name or ID"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-complementary" />
            </div>
            <Button
              onClick={handleDownloadPDF}
              className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 h-10 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={attLoading || empLoading || locLoading || !filteredAttendance.length || locationId === "all"}
              aria-label="Download attendance records as PDF"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              onClick={handleDownloadExcel}
              className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 h-10 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={attLoading || empLoading || locLoading || !filteredAttendance.length || locationId === "all"}
              aria-label="Download attendance records as Excel"
            >
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-body text-sm mb-4">
            Showing attendance for {filterDate ? format(filterDate, "PPP") : `full month (${months.find((m) => m.value === filterMonth)?.label} ${filterYear})`}
          </p>
          {attLoading || empLoading || locLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : locationId === "all" ? (
            <p className="text-body text-sm text-center py-4">Please select a specific location</p>
          ) : filteredAttendance.length > 0 ? (
            <div className="space-y-4">
              <div className="max-h-[400px] overflow-x-auto relative">
                <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-complementary to-transparent pointer-events-none" />
                <Table className="border border-complementary min-w-[600px]">
                  <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                    <TableRow>
                      <TableHead className="text-body text-sm text-center px-2">ID</TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("name")}
                          className="flex items-center space-x-1 text-body hover:bg-accent-light mx-auto"
                          aria-label={`Sort by employee name ${sortConfig.direction === "asc" ? "descending" : "ascending"}`}
                        >
                          Employee Name
                          {sortConfig.column === "name" && (
                            sortConfig.direction === "asc" ? (
                              <ArrowUp className="h-4 w-4" />
                            ) : (
                              <ArrowDown className="h-4 w-4" />
                            )
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">Status</TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("date")}
                          className="flex items-center space-x-1 text-body hover:bg-accent-light mx-auto"
                          aria-label={`Sort by date ${sortConfig.direction === "asc" ? "descending" : "ascending"}`}
                        >
                          Date
                          {sortConfig.column === "date" && (
                            sortConfig.direction === "asc" ? (
                              <ArrowUp className="h-4 w-4" />
                            ) : (
                              <ArrowDown className="h-4 w-4" />
                            )
                          )}
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAttendance.map((record, index) => (
                      <TableRow
                        key={record._id}
                        className={`${
                          index % 2 === 0 ? "bg-body" : "bg-complementary-light"
                        } hover:bg-accent-light cursor-pointer animate-slide-in-row`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        onClick={() => handleEditAttendance(record)}
                      >
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap">
                          {record.employee?.employeeId || "N/A"}
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap max-w-[200px] truncate">
                          {record.employee?.name || "Unknown"}
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{record.status.charAt(0).toUpperCase()}</span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-body text-body border-complementary text-sm">
                                {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap">
                          {isNaN(new Date(record.date)) ? "Invalid Date" : format(new Date(record.date), "d")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="bg-complementary sticky bottom-0">
                    <TableRow>
                      <TableCell colSpan={2} className="text-body text-sm font-semibold text-center px-2">
                        Totals
                      </TableCell>
                      <TableCell className="text-body text-sm text-center px-2">
                        Present: {statusTotals.present} <br />
                        Absent: {statusTotals.absent} <br />
                        Leave: {statusTotals.leave} <br />
                        Half-Day: {statusTotals["half-day"]}
                      </TableCell>
                      <TableCell className="text-body text-sm text-center px-2"></TableCell>
                    </TableRow>
                  </TableFooter>
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
                    className="border-complementary text-body hover:bg-complementary-light text-sm p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-body text-sm text-center py-4">No attendance records found</p>
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
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col rounded-lg animate-scale-in">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle className="text-xl font-bold text-body flex items-center gap-2">
              Edit Attendance
            </DialogTitle>
            <DialogDescription className="text-sm mt-2 text-body">
              Update attendance status for {editDialog.employeeName} on{" "}
              {editDialog.date ? format(editDialog.date, "PPP") : "N/A"}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentStatus" className="text-sm font-semibold text-body">
                Current Status
              </Label>
              <Input
                id="currentStatus"
                value={editDialog.currentStatus.charAt(0).toUpperCase() + editDialog.currentStatus.slice(1)}
                disabled
                className="bg-complementary-light text-body border-complementary h-10 text-sm cursor-not-allowed"
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
                disabled={locationId === "all" || attLoading}
                aria-label="Select new attendance status"
              >
                <SelectTrigger
                  id="newStatus"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                >
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  <SelectItem
                    value="present"
                    disabled={editDialog.currentStatus === "present"}
                    className="text-sm hover:bg-accent-light disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Present
                  </SelectItem>
                  <SelectItem
                    value="absent"
                    disabled={editDialog.currentStatus === "absent"}
                    className="text-sm hover:bg-accent-light disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Absent
                  </SelectItem>
                  <SelectItem
                    value="half-day"
                    disabled={editDialog.currentStatus === "half-day"}
                    className="text-sm hover:bg-accent-light disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Half Day
                  </SelectItem>
                  <SelectItem
                    value="leave"
                    disabled={editDialog.currentStatus === "leave"}
                    className="text-sm hover:bg-accent-light disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Paid Leave
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="shrink-0 px-6 py-4 border-t border-complementary flex justify-end gap-3">
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
              disabled={attLoading}
              aria-label="Cancel edit"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (window.confirm("Are you sure you want to update the attendance status?")) {
                  handleSubmitEdit();
                }
              }}
              className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={attLoading || !editDialog.newStatus}
              aria-label="Update attendance"
            >
              {attLoading ? (
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

export default ViewAttendance;