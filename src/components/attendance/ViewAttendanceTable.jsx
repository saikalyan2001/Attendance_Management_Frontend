import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
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
import { 
  CalendarIcon, 
  Loader2, 
  Search, 
  Download, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const ViewAttendanceTable = ({
  // Role configuration
  userRole, // 'super_admin', 'admin', 'siteincharge'
  
  // Redux configuration
  reduxConfig: {
    attendanceSelector,
    employeesSelector,
    locationsSelector,
    fetchAttendanceAction,
    fetchMonthlyAttendanceAction,
    fetchEmployeesAction,
    fetchLocationsAction,
    editAttendanceAction,
    resetAction,
  },
  
  // User and permissions
  user,
  canEditAttendance = true,
  
  // Location configuration
  showLocationFilter = true,
  requireLocationSelection = false,
  userLocationId = null,
  
  // Navigation
  navigate,
}) => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const attendanceState = useSelector(attendanceSelector);
  const employeesState = useSelector(employeesSelector);
  const locationsState = useSelector(locationsSelector || (() => ({ locations: [], loading: false })));
  
  // Extract data based on user role
  const {
    attendance: rawAttendance,
    monthlyAttendance,
    pagination,
    loading: attLoading,
    error: attendanceError
  } = attendanceState;
  
  const {
    employees,
    loading: empLoading
  } = employeesState || {};
  
  const {
    locations,
    loading: locLoading
  } = locationsState || {};

  // Local state
  const [locationId, setLocationId] = useState(showLocationFilter ? "all" : userLocationId || "");
  const [filterMonth, setFilterMonth] = useState(userRole === 'siteincharge' ? null : new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(userRole === 'siteincharge' ? null : new Date().getFullYear());
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
  
  const recordsPerPage = 5;

  // Constants
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString("default", { month: "long" }),
  }));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  // Handle error display
  useEffect(() => {
    if (attendanceError && resetAction) {
      toast.error(attendanceError, { duration: 5000 });
      dispatch(resetAction());
    }
  }, [attendanceError, dispatch, resetAction]);

  // Data fetching
  useEffect(() => {
    if (!user) return;

    // Fetch locations for roles that need them
    if (showLocationFilter && fetchLocationsAction) {
      dispatch(fetchLocationsAction());
    }

    // Fetch employees
    if (fetchEmployeesAction) {
      const empParams = userRole === 'siteincharge' 
        ? { location: userLocationId }
        : { location: locationId };
      
      if (userRole !== 'siteincharge' && locationId === "all") return;
      
      dispatch(fetchEmployeesAction(empParams));
    }

    // Fetch attendance data
    const currentYear = new Date().getFullYear();
    const effectiveLocationId = userRole === 'siteincharge' ? userLocationId : locationId;
    
    if (userRole === 'siteincharge') {
      // SiteIncharge: different logic for daily vs monthly
      if (filterDate && fetchAttendanceAction) {
        const filters = { 
          location: effectiveLocationId, 
          page: currentPage, 
          limit: recordsPerPage,
          date: format(filterDate, "yyyy-MM-dd'T'00:00:00+05:30")
        };
        if (filterStatus && filterStatus !== "all") filters.status = filterStatus;
        dispatch(fetchAttendanceAction(filters));
      } else if (
        filterMonth &&
        filterYear &&
        filterMonth >= 1 &&
        filterMonth <= 12 &&
        filterYear >= 2000 &&
        filterYear <= currentYear &&
        fetchMonthlyAttendanceAction
      ) {
        dispatch(fetchMonthlyAttendanceAction({
          month: filterMonth,
          year: filterYear,
          location: effectiveLocationId,
          page: currentPage,
          limit: recordsPerPage,
        }));
      }
    } else {
      // SuperAdmin/Admin: standard logic
      if (
        filterMonth &&
        filterYear &&
        filterMonth >= 1 &&
        filterMonth <= 12 &&
        filterYear >= 2000 &&
        filterYear <= currentYear &&
        fetchAttendanceAction
      ) {
        const filters = {
          month: filterMonth,
          year: filterYear,
          location: effectiveLocationId,
          page: currentPage,
          limit: recordsPerPage,
        };
        if (filterDate) filters.date = format(filterDate, "yyyy-MM-dd");
        if (filterStatus !== "all") filters.status = filterStatus;
        dispatch(fetchAttendanceAction(filters));
      }
    }
  }, [
    dispatch, 
    user, 
    userRole, 
    locationId, 
    userLocationId,
    filterMonth, 
    filterYear, 
    filterDate, 
    filterStatus, 
    currentPage,
    fetchAttendanceAction,
    fetchMonthlyAttendanceAction,
    fetchEmployeesAction,
    fetchLocationsAction
  ]);

  // Normalize attendance data based on role
// ✅ FIXED: Update the normalizedAttendance useMemo
const normalizedAttendance = useMemo(() => {
  if (userRole === 'siteincharge') {
    let data = [];
    if (filterDate) {
      // Daily attendance: flat array of records
      data = Array.isArray(rawAttendance) ? [...rawAttendance] : [];
    } else {
      // Monthly attendance: flatten nested structure
      data = Array.isArray(monthlyAttendance)
        ? monthlyAttendance.flatMap(item =>
            Array.isArray(item.attendance)
              ? item.attendance.map(record => ({
                  ...record, // ✅ Preserve all fields including status
                  employee: item.employee,
                }))
              : []
          )
        : [];
    }
    return data;
  } else {
    // ✅ UPDATED: SuperAdmin/Admin - handle the new {employee, attendance[]} structure
    if (Array.isArray(rawAttendance) && rawAttendance.length > 0) {
      // Check if it's the new structure
      if (rawAttendance[0].employee && rawAttendance[0].attendance) {
        // NEW structure: flatten the {employee, attendance[]} format
        return rawAttendance.flatMap(item =>
          Array.isArray(item.attendance)
            ? item.attendance.map(record => ({
                ...record, // ✅ This preserves the status field
                employee: item.employee, // ✅ Attach employee info
              }))
            : []
        );
      } else {
        // OLD structure: already flat
        return [...rawAttendance];
      }
    }
    return [];
  }
}, [rawAttendance, monthlyAttendance, filterDate, userRole]);


  // Sort and filter attendance data
  const sortedAttendance = useMemo(() => {
    return normalizedAttendance.sort((a, b) => {
      if (!a || !b) return 0;
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
  }, [normalizedAttendance, sortConfig]);

 // ✅ FIXED: Update the filteredAttendance useMemo
// ✅ FIXED: Update the filteredAttendance useMemo
const filteredAttendance = useMemo(() => {
  let filtered = sortedAttendance || [];
  
  if (filterStatus && filterStatus !== "all") {
    filtered = filtered.filter(record => record?.status === filterStatus);
  }
  
  // ✅ FIXED: Apply date filtering to ALL roles, not just siteincharge
  if (filterDate) {
    filtered = filtered.filter(record => {
      if (!record?.date) return false;
      
      try {
        const recordDate = new Date(record.date);
        
        // Check if recordDate is valid
        if (isNaN(recordDate.getTime())) {
          
          return false;
        }
        
        // Compare dates by removing time components
        const filterDateOnly = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
        const recordDateOnly = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
        
        return filterDateOnly.getTime() === recordDateOnly.getTime();
      } catch (error) {
        
        return false;
      }
    });
  }
  
  // Keep the existing siteincharge-specific month/year filtering
  if (userRole === 'siteincharge' && !filterDate && filterMonth && filterYear) {
    filtered = filtered.filter(record => {
      if (!record?.date) return false;
      
      try {
        const recordDate = new Date(record.date);
        
        if (isNaN(recordDate.getTime())) {
          
          return false;
        }
        
        return (
          recordDate.getMonth() + 1 === filterMonth &&
          recordDate.getFullYear() === filterYear
        );
      } catch (error) {
        
        return false;
      }
    });
  }
  
  if (searchQuery) {
    filtered = filtered.filter(
      record =>
        record?.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record?.employee?.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  return filtered;
}, [sortedAttendance, filterStatus, filterDate, filterMonth, filterYear, searchQuery, userRole]);


  // Status totals
  const statusTotals = useMemo(() => {
    return filteredAttendance.reduce(
      (totals, record) => {
        if (record?.status) {
          totals[record.status] = (totals[record.status] || 0) + 1;
        }
        return totals;
      },
      { present: 0, absent: 0, leave: 0, "half-day": 0 }
    );
  }, [filteredAttendance]);

  // Pagination
  const totalPages = pagination?.totalPages || 1;
  const paginatedAttendance = filteredAttendance; // Backend handles pagination

  // Event handlers
  const handleDateSelect = (date) => {
    if (date > new Date()) {
      toast.error("Cannot select a future date", { duration: 5000 });
      return;
    }
    setFilterDate(date);
    if (userRole === 'siteincharge') {
      setFilterMonth(date.getMonth() + 1);
      setFilterYear(date.getFullYear());
    }
    setCurrentPage(1);
  };

  const handleMonthChange = (value) => {
    const parsedMonth = value ? parseInt(value) : null;
    setFilterMonth(parsedMonth);
    setDisplayMonth(parsedMonth ? parsedMonth - 1 : new Date().getMonth());
    setCurrentPage(1);
    if (userRole === 'siteincharge') {
      setFilterDate(null);
    }
  };

  const handleYearChange = (value) => {
    const parsedYear = value ? parseInt(value) : null;
    setFilterYear(parsedYear);
    setDisplayYear(parsedYear || new Date().getFullYear());
    setCurrentPage(1);
    if (userRole === 'siteincharge') {
      setFilterDate(null);
    }
  };

  const handleLocationChange = (value) => {
    setLocationId(value);
    setFilterDate(null);
    setCurrentPage(1);
  };

  const handleSort = (column) => {
    setSortConfig((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1);
  };

  const handleEditAttendance = (record) => {
    if (!canEditAttendance) return;
    
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
      editAttendanceAction({
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
        
        // Refresh data
        const effectiveLocationId = userRole === 'siteincharge' ? userLocationId : locationId;
        const filters = {
          month: filterMonth,
          year: filterYear,
          location: effectiveLocationId,
          page: currentPage,
          limit: recordsPerPage,
        };
        if (filterDate) filters.date = format(filterDate, "yyyy-MM-dd");
        if (filterStatus !== "all") filters.status = filterStatus;
        dispatch(fetchAttendanceAction(filters));
      })
      .catch((err) => toast.error(err || "Failed to update attendance", { duration: 5000 }));
  };

  // Export functions
  const getReportTitle = () => {
    switch (userRole) {
      case 'super_admin':
        return "Superadmin Attendance Records Report";
      case 'admin':
        return "Attendance Records Report";
      case 'siteincharge':
        return "Attendance Records Report";
      default:
        return "Attendance Records Report";
    }
  };

  const getLocationName = () => {
    if (userRole === 'siteincharge') {
      return user?.locations?.[0]?.name || userLocationId || "Unknown";
    }
    if (locationId === "all") return "All Locations";
    const loc = locations?.find((l) => l._id === locationId);
    return loc?.name || "Unknown";
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
    doc.text(getReportTitle(), 15, 15);
    doc.setFontSize(10);
    doc.text(`Location: ${getLocationName()}`, 15, 22);
    doc.text(`Month: ${filterMonth ? months.find((m) => m.value === filterMonth)?.label : "N/A"}`, 15, 29);
    doc.text(`Year: ${filterYear || "N/A"}`, 15, 36);
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
      record.status ? record.status.charAt(0).toUpperCase() : "N/A",
      isNaN(new Date(record.date)) ? "Invalid Date" : format(new Date(record.date), userRole === 'siteincharge' ? "PPP" : "d"),
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
    });

    const filename = `${getReportTitle().replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
    doc.save(filename);
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
      Status: record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : "N/A",
      Date: isNaN(new Date(record.date)) ? "Invalid Date" : format(new Date(record.date), userRole === 'siteincharge' ? "PPP" : "d"),
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
      { A: getReportTitle() },
      { A: `Location: ${getLocationName()}` },
      { A: `Month: ${filterMonth ? months.find((m) => m.value === filterMonth)?.label : "N/A"}` },
      { A: `Year: ${filterYear || "N/A"}` },
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

    const filename = `${getReportTitle().replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, filename, { bookType: 'xlsx', type: 'binary' });
    toast.success("Excel downloaded successfully", { duration: 5000 });
  };

  // Pagination helpers
  const getPageNumbers = () => {
    if (!pagination) return [];
    const maxPagesToShow = 5;
    const pages = [];
    const currentPageNum = pagination.currentPage || currentPage;
    let startPage = Math.max(1, currentPageNum - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Loading states
  const isLoading = attLoading || empLoading || locLoading;
  const shouldShowLocationWarning = requireLocationSelection && locationId === "all";
  const shouldShowNoLocationWarning = userRole === 'siteincharge' && !userLocationId;

  return (
    <div className="space-y-8 p-4 animate-fade-in">
      {isLoading && (
        <div className="fixed inset-0 bg-overlay flex justify-center items-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}
      
      {/* Filter Card */}
      <Card className="bg-body text-body border border-complementary max-w-4xl mx-auto rounded-lg shadow-md">
        <CardHeader className="border-b border-complementary">
          <CardTitle className="text-2xl font-bold text-body">Filter Attendance</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Location Filter - Only for SuperAdmin/Admin */}
            {showLocationFilter && (
              <div className="space-y-2 min-w-[160px] flex-1">
                <Label htmlFor="locationId" className="text-sm font-semibold text-body">
                  Location
                </Label>
                <Select
                  value={locationId}
                  onValueChange={handleLocationChange}
                  disabled={locLoading}
                >
                  <SelectTrigger
                    id="locationId"
                    className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                  >
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="bg-body text-body border-complementary">
                    {!requireLocationSelection && (
                      <SelectItem value="all" className="text-sm hover:bg-accent-light">
                        All Locations
                      </SelectItem>
                    )}
                    {locations?.map((loc) => (
                      <SelectItem key={loc._id} value={loc._id} className="text-sm hover:bg-accent-light">
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Month Filter */}
            <div className="space-y-2 min-w-[120px] flex-1">
              <Label htmlFor="filterMonth" className="text-sm font-semibold text-body">
                Month
              </Label>
              <Select
                value={filterMonth?.toString() || ""}
                onValueChange={handleMonthChange}
                disabled={shouldShowLocationWarning || shouldShowNoLocationWarning}
              >
                <SelectTrigger
                  id="filterMonth"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
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

            {/* Year Filter */}
            <div className="space-y-2 min-w-[100px] flex-1">
              <Label htmlFor="filterYear" className="text-sm font-semibold text-body">
                Year
              </Label>
              <Select
                value={filterYear?.toString() || ""}
                onValueChange={handleYearChange}
                disabled={shouldShowLocationWarning || shouldShowNoLocationWarning}
              >
                <SelectTrigger
                  id="filterYear"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
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

            {/* Date Filter */}
            <div className="space-y-2 min-w-[160px] flex-1">
              <Label htmlFor="filterDate" className="text-sm font-semibold text-body">
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-semibold bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm truncate"
                    disabled={shouldShowLocationWarning || shouldShowNoLocationWarning}
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
    if (userRole !== 'siteincharge') {
      setFilterMonth(newMonthValue);
      setFilterYear(newYearValue);
    }
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

            {/* Status Filter */}
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
                disabled={shouldShowLocationWarning || shouldShowNoLocationWarning}
              >
                <SelectTrigger
                  id="filterStatus"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
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

      {/* Records Card */}
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
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-complementary" />
            </div>
            <Button
              onClick={handleDownloadPDF}
              className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 h-10 rounded-md"
              disabled={isLoading || !filteredAttendance.length || shouldShowLocationWarning}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              onClick={handleDownloadExcel}
              className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 h-10 rounded-md"
              disabled={isLoading || !filteredAttendance.length || shouldShowLocationWarning}
            >
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-body text-sm mb-4">
            Showing attendance for {filterDate ? format(filterDate, "PPP") : `full month (${filterMonth ? months.find((m) => m.value === filterMonth)?.label : "N/A"} ${filterYear || "N/A"})`} ({filteredAttendance.length} records)
          </p>
          
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : shouldShowLocationWarning ? (
            <p className="text-body text-sm text-center py-4">Please select a specific location</p>
          ) : shouldShowNoLocationWarning ? (
            <p className="text-body text-sm text-center py-4">No location assigned. Please contact admin.</p>
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
                        {userRole === 'siteincharge' ? (
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("name")}
                            className="flex items-center space-x-1 text-body hover:text-accent mx-auto"
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
                        ) : (
                          "Employee Name"
                        )}
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">Status</TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        {userRole === 'siteincharge' ? (
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("date")}
                            className="flex items-center space-x-1 text-body hover:text-accent mx-auto"
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
                        ) : (
                          "Date"
                        )}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAttendance.map((record, index) => (
                      <TableRow
                        key={record._id}
                        className={`${
                          index % 2 === 0 ? "bg-body" : "bg-complementary-light"
                        } ${canEditAttendance ? "hover:bg-accent-light cursor-pointer" : "hover:bg-accent-light"} animate-slide-in-row`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        onClick={() => canEditAttendance && handleEditAttendance(record)}
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
                                <span>{record.status ? record.status.charAt(0).toUpperCase() : "N/A"}</span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-body text-body border-complementary text-sm">
                                {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : "No Status"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap">
                          {isNaN(new Date(record.date)) ? "Invalid Date" : format(new Date(record.date), userRole === 'siteincharge' ? "PPP" : "d")}
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
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={(pagination?.currentPage || currentPage) === 1}
                    className="border-complementary text-body hover:bg-complementary-light text-sm p-2 rounded-md"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {getPageNumbers().map((page) => (
                    <Button
                      key={page}
                      variant={(pagination?.currentPage || currentPage) === page ? "default" : "outline"}
                      onClick={() => setCurrentPage(page)}
                      className={`${
                        (pagination?.currentPage || currentPage) === page
                          ? "bg-accent text-body hover:bg-accent-hover"
                          : "border-complementary text-body hover:bg-complementary-light"
                      } text-sm w-10 h-10 rounded-md`}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={(pagination?.currentPage || currentPage) === totalPages}
                    className="border-complementary text-body hover:bg-complementary-light text-sm p-2 rounded-md"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-body text-sm text-center py-4">
              {userRole === 'siteincharge' 
                ? (filterDate
                    ? `No attendance records found for ${format(filterDate, "PPP")}. Records may exist for other dates.`
                    : "No attendance records found. Please select a date or month/year.")
                : "No attendance records found"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog - Only for roles that can edit */}
      {canEditAttendance && (
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
                  value={editDialog.currentStatus ? editDialog.currentStatus.charAt(0).toUpperCase() + editDialog.currentStatus.slice(1) : ""}
                  disabled
                  className="bg-complementary-light text-body border-complementary h-10 text-sm cursor-not-allowed"
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
                  disabled={attLoading}
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
                className="border-complementary text-body hover:bg-complementary-light text-sm py-2 px-4 rounded-md"
                disabled={attLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (window.confirm("Are you sure you want to update the attendance status?")) {
                    handleSubmitEdit();
                  }
                }}
                className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 rounded-md"
                disabled={attLoading || !editDialog.newStatus}
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
      )}
    </div>
  );
};

export default ViewAttendanceTable;
