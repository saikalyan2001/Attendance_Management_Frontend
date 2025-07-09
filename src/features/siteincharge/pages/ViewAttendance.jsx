import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees } from "../redux/employeeSlice";
import { fetchAttendance, fetchMonthlyAttendance, reset } from "../redux/attendanceSlice";
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
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const ViewAttendance = ({ locationId }) => {
  const dispatch = useDispatch();
  const { employees, loading: empLoading } = useSelector(
    (state) => state.siteInchargeEmployee
  );
  const { attendance, monthlyAttendance, loading: attLoading, error } = useSelector(
    (state) => state.siteInchargeAttendance
  );

  const [filterDate, setFilterDate] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState(null);
  const [filterYear, setFilterYear] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ column: "date", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 5;

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

  useEffect(() => {
    if (!locationId) return;
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
      dispatch(
        fetchMonthlyAttendance({
          month: filterMonth,
          year: filterYear,
          location: locationId,
        })
      );
      const newDate = new Date(filterYear, filterMonth - 1, 1);
      if (newDate > new Date()) {
        setFilterDate(null); // Reset to show full month
      }
    } else {
      const filters = { location: locationId };
      if (filterDate) filters.date = format(filterDate, "yyyy-MM-dd");
      if (filterStatus && filterStatus !== "all") filters.status = filterStatus;
      dispatch(fetchAttendance(filters));
    }
  }, [dispatch, locationId, filterDate, filterStatus, filterMonth, filterYear]);

  const sortedAttendance = useMemo(() => {
    const data = filterMonth && filterYear ? monthlyAttendance : attendance;
    if (!data || !Array.isArray(data)) return [];

    return [...data].sort((a, b) => {
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
  }, [attendance, monthlyAttendance, filterMonth, filterYear, sortConfig]);

  const filteredAttendance = useMemo(() => {
    let filtered = sortedAttendance || [];
    if (filterStatus && filterStatus !== "all") {
      filtered = filtered.filter((record) => record.status === filterStatus);
    }
    if (filterDate && filterMonth && filterYear) {
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.date);
        const isMatch =
          recordDate.getMonth() + 1 === filterMonth &&
          recordDate.getFullYear() === filterYear &&
          format(recordDate, "yyyy-MM-dd") === format(filterDate, "yyyy-MM-dd");
        return isMatch;
      });
    } else if (filterDate) {
      filtered = filtered.filter((record) => {
        const isMatch = format(new Date(record.date), "yyyy-MM-dd") === format(filterDate, "yyyy-MM-dd");
        return isMatch;
      });
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (record) =>
          record.employee?.name?.toLowerCase().includes(searchQuery?.toLowerCase()) ||
          record.employee?.employeeId?.toLowerCase().includes(searchQuery?.toLowerCase())
      );
    }
    return filtered;
  }, [sortedAttendance, filterStatus, filterDate, filterMonth, filterYear, searchQuery]);

  // Debug attendance data
  useEffect(() => {
    filteredAttendance.forEach((att) => {
      console.log(
        `Attendance Record: Employee=${att.employee?._id}, Date=${att.date}, Normalized=${format(
          new Date(att.date),
          "yyyy-MM-dd"
        )}`
      );
    });
  }, [attendance, monthlyAttendance, filterDate, filterMonth, filterYear, filteredAttendance]);

  const paginatedAttendance = useMemo(() => {
    const startIndex = (currentPage - 1) * employeesPerPage;
    return filteredAttendance.slice(startIndex, startIndex + employeesPerPage);
  }, [filteredAttendance, currentPage]);

  const totalPages = Math.ceil(filteredAttendance.length / employeesPerPage);

  const statusTotals = useMemo(() => {
    return filteredAttendance.reduce(
      (totals, record) => ({
        ...totals,
        [record.status]: (totals[record.status] || 0) + 1,
      }),
      { present: 0, absent: 0, leave: 0, "half-day": 0 }
    );
  }, [filteredAttendance]);

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
    if (filterMonth && filterYear) {
      const dateMonth = date.getMonth() + 1;
      const dateYear = date.getFullYear();
      if (dateMonth !== filterMonth || dateYear !== filterYear) {
        toast.error(`Please select a date in ${months[filterMonth - 1].label} ${filterYear}`, { duration: 5000 });
        return;
      }
    }
    setFilterDate(date);
    setCurrentPage(1);
  };

  const handleMonthChange = (value) => {
    const parsedMonth = value ? parseInt(value) : null;
    setFilterMonth(parsedMonth);
    setCurrentPage(1);
    if (parsedMonth && filterYear) {
      const newDate = new Date(filterYear, parsedMonth - 1, 1);
      if (newDate > new Date()) {
        setFilterDate(null); // Reset to show full month
      } else if (filterDate) {
        // Reset filterDate if it doesn't match the new month
        const dateMonth = filterDate.getMonth() + 1;
        const dateYear = filterDate.getFullYear();
        if (dateMonth !== parsedMonth || dateYear !== filterYear) {
          setFilterDate(null);
        }
      }
    }
  };

  const handleYearChange = (value) => {
    const parsedYear = value ? parseInt(value) : null;
    setFilterYear(parsedYear);
    setCurrentPage(1);
    if (filterMonth && parsedYear) {
      const newDate = new Date(parsedYear, filterMonth - 1, 1);
      if (newDate > new Date()) {
        setFilterDate(null); // Reset to show full month
      } else if (filterDate) {
        // Reset filterDate if it doesn't match the new year
        const dateMonth = filterDate.getMonth() + 1;
        const dateYear = filterDate.getFullYear();
        if (dateMonth !== filterMonth || dateYear !== parsedYear) {
          setFilterDate(null);
        }
      }
    }
  };

  const handleMonthNavChange = (newMonth) => {
    const newMonthValue = newMonth.getMonth() + 1;
    const newYearValue = newMonth.getFullYear();
    setFilterMonth(newMonthValue);
    setFilterYear(newYearValue);
    setFilterDate(null);
    setCurrentPage(1);
  };

  const handleDownloadPDF = () => {
    if (!filteredAttendance.length) {
      toast.error("No attendance data available to export", { duration: 5000 });
      return;
    }
    const doc = new jsPDF();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.text("Attendance Records Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Location: ${locationId}`, 14, 30);
    if (filterMonth) doc.text(`Month: ${months.find(m => m.value === filterMonth)?.label || "N/A"}`, 14, 40);
    if (filterYear) doc.text(`Year: ${filterYear}`, 14, 50);
    if (filterDate) doc.text(`Date: ${format(filterDate, "PPP")}`, 14, 60);
    if (filterStatus !== "all") doc.text(`Status: ${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}`, 14, 70);
    doc.text(`Total Present: ${statusTotals.present}`, 14, 80);
    doc.text(`Total Absent: ${statusTotals.absent}`, 14, 90);
    doc.text(`Total Leave: ${statusTotals.leave}`, 14, 100);
    doc.text(`Total Half-Day: ${statusTotals["half-day"]}`, 14, 110);

    const body = filteredAttendance.map(record => [
      record.employee?.employeeId || "N/A",
      record.employee?.name || "Unknown",
      record.status.charAt(0).toUpperCase() + record.status.slice(1),
      isNaN(new Date(record.date)) ? "Invalid Date" : format(new Date(record.date), "PPP"),
    ]);

    autoTable(doc, {
      startY: 120,
      head: [["ID", "Name", "Status", "Date"]],
      body,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
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
      Status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
      Date: isNaN(new Date(record.date)) ? "Invalid Date" : format(new Date(record.date), "PPP"),
    }));

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
      { A: `Location: ${locationId}` },
      { A: `Month: ${filterMonth ? months.find((m) => m.value === filterMonth)?.label : "N/A"}` },
      { A: `Year: ${filterYear || "N/A"}` },
      ...(filterDate ? [{ A: `Date: ${format(filterDate, "PPP")}` }] : []),
      ...(filterStatus !== "all" ? [{ A: `Status: ${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}` }] : []),
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
      {(attLoading || empLoading) && (
        <div className="fixed inset-0 bg-overlay flex justify-center items-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}
      <Card className="bg-body text-body border border-complementary max-w-4xl mx-auto rounded-md shadow-md">
        <CardHeader className="border-b border-complementary">
          <CardTitle className="text-2xl font-bold text-body">Filter Attendance</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2 min-w-[160px] flex-1">
              <Label htmlFor="filterMonth" className="text-sm font-semibold text-body">
                Month
              </Label>
              <Select
                value={filterMonth?.toString() || ""}
                onValueChange={handleMonthChange}
                disabled={!locationId}
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
                value={filterYear?.toString() || ""}
                onValueChange={handleYearChange}
                disabled={!locationId}
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
                    disabled={!locationId}
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
                      className="w-full mb-2 border-accent text-accent hover:bg-accent-light text-sm py-2 px-4 rounded-md"
                      disabled={!filterDate}
                      aria-label="Show full month attendance"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Show Full Month
                    </Button>
                    <Calendar
                      key={`${filterYear}-${filterMonth}`}
                      mode="single"
                      selected={filterDate}
                      onSelect={handleDateSelect}
                      onMonthChange={handleMonthNavChange}
                      month={filterMonth && filterYear ? new Date(filterYear, filterMonth - 1) : undefined}
                      initialFocus
                      disabled={(date) =>
                        date > new Date() ||
                        (filterMonth && filterYear &&
                         (date.getMonth() + 1 !== filterMonth || date.getFullYear() !== filterYear))
                      }
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
                disabled={!locationId}
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
      <Card className="bg-body text-body border border-complementary rounded-md shadow-md">
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
              className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 h-10 rounded-md"
              disabled={attLoading || empLoading || !filteredAttendance.length || !locationId}
              aria-label="Download attendance records as PDF"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              onClick={handleDownloadExcel}
              className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 h-10 rounded-md"
              disabled={attLoading || empLoading || !filteredAttendance.length || !locationId}
              aria-label="Download attendance records as Excel"
            >
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-body text-sm mb-4">
            Showing attendance for {filterDate ? format(filterDate, "PPP") : `full month (${filterMonth ? months.find((m) => m.value === filterMonth)?.label : "N/A"} ${filterYear || "N/A"})`}
          </p>
          {attLoading || empLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : filteredAttendance.length > 0 ? (
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
                        className="flex items-center space-x-1 text-body hover:text-accent mx-auto"
                        aria-label={`Sort by employee name ${sortConfig.direction === "asc" && sortConfig.column === "name" ? "descending" : "ascending"}`}
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
                        className="flex items-center space-x-1 text-body hover:text-accent mx-auto"
                        aria-label={`Sort by date ${sortConfig.direction === "asc" && sortConfig.column === "date" ? "descending" : "ascending"}`}
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
                      className={`${index % 2 === 0 ? "bg-body" : "bg-complementary-light"} hover:bg-accent-light cursor-pointer animate-slide-in-row`}
                      style={{ animationDelay: `${index * 0.05}s` }}
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
                        {isNaN(new Date(record.date)) ? "Invalid Date" : format(new Date(record.date), "PPP")}
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
          ) : (
            <p className="text-body text-sm text-center py-4">No attendance records found</p>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
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
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewAttendance;