import { useState, useEffect, useMemo } from "react";
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
import { toast } from "sonner";
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSunday,
  startOfDay,
  isValid,
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

const MonthlyAttendanceTable = ({
  // Role configuration
  userRole, // 'super_admin', 'admin', 'siteincharge'
  
  // Redux configuration
  reduxConfig: {
    attendanceSelector,
    employeesSelector,
    locationsSelector,
    fetchAttendanceAction,
    fetchEmployeesAction,
    fetchLocationsAction,
    editAttendanceAction,
    requestEditAction,
  },
  
  // User and permissions
  user,
  canEditDirectly = true,
  
  // Location configuration
  showLocationFilter = true,
  requireLocationSelection = false,
  userLocationId = null,
  
  // Filter props (controlled by parent)
  month,
  year,
  location,
  setLocation,
  setMonth,
  setYear,
  
  // Navigation
  navigate,
}) => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const attendanceState = useSelector(attendanceSelector);
  const employeesState = useSelector(employeesSelector);
  const locationsState = useSelector(locationsSelector);
  
  // Extract data based on user role
  const {
    attendanceData,
    pagination,
    loading: attendanceLoading,
    error: attendanceError
  } = attendanceState;
  
  const {
    employees: employeesData,
    loading: employeesLoading
  } = employeesState || {};
  
  const {
    locations: locationsData,
    loading: locationsLoading
  } = locationsState || {};
  
  // Local state
  const [locationFilter, setLocationFilter] = useState(location || (showLocationFilter ? "all" : userLocationId || ""));
  const [monthFilter, setMonthFilter] = useState(month || new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(year || new Date().getFullYear());
  const [displayMonth, setDisplayMonth] = useState((month || new Date().getMonth() + 1) - 1);
  const [displayYear, setDisplayYear] = useState(year || new Date().getFullYear());
  
  const [editDialog, setEditDialog] = useState({
    open: false,
    attendanceId: null,
    employeeId: null,
    employeeName: "",
    date: null,
    currentStatus: "",
    newStatus: "",
    reason: "",
  });
  
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [monthlySearch, setMonthlySearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState(null);
  
  const itemsPerPage = 5;

  // ✅ NEW: Helper function to validate and parse dates
  const isValidDate = (date) => {
    if (!date) return false;
    const parsed = new Date(date);
    return isValid(parsed);
  };

  const safeFormatDate = (date, formatStr = "yyyy-MM-dd") => {
    if (!isValidDate(date)) return null;
    try {
      return format(new Date(date), formatStr);
    } catch (error) {
      
      return null;
    }
  };

  // Authorization check
  useEffect(() => {
    if (!user || user.role !== userRole) {
      const roleMessages = {
        super_admin: "superadmin",
        admin: "admin",
        siteincharge: "site incharge"
      };
      toast.error(`Unauthorized access. Please log in as a ${roleMessages[userRole]}.`, {
        duration: 5000,
      });
      navigate("/login");
      return;
    }
    
    if (userRole === 'siteincharge' && !userLocationId) {
      toast.error("No location assigned. Please contact admin.", {
        duration: 10000,
      });
      return;
    }
  }, [user, userRole, userLocationId, navigate]);

  // Data fetching
  useEffect(() => {
    if (!user || user.role !== userRole) return;

    if (showLocationFilter && fetchLocationsAction) {
      dispatch(fetchLocationsAction());
    }
    
    if (fetchEmployeesAction) {
      const empParams = userRole === 'siteincharge' 
        ? { location: userLocationId }
        : { location: locationFilter };
      dispatch(fetchEmployeesAction(empParams));
    }
    
    if (fetchAttendanceAction) {
      const attendanceParams = {
        month: monthFilter,
        year: yearFilter,
        location: userRole === 'siteincharge' ? userLocationId : locationFilter,
        page: currentPage,
        limit: itemsPerPage,
      };
      
      if (userRole === 'siteincharge') {
        attendanceParams.isDeleted = false;
      }
      
      // Only fetch if location is selected for roles that require it
      if (requireLocationSelection && locationFilter === "all") {
        return;
      }
      
      dispatch(fetchAttendanceAction(attendanceParams));
    }
  }, [dispatch, user, userRole, locationFilter, monthFilter, yearFilter, currentPage, userLocationId]);

  // Update parent state
  useEffect(() => {
    setLocation?.(locationFilter);
    setMonth?.(monthFilter);
    setYear?.(yearFilter);
  }, [locationFilter, monthFilter, yearFilter, setLocation, setMonth, setYear]);

  // Handle errors
  useEffect(() => {
    if (attendanceError) {
      toast.error(attendanceError, { duration: 5000 });
      // Reset error based on role
      const resetAction = userRole === 'super_admin' ? "superAdminAttendance/reset" :
                         userRole === 'admin' ? "adminAttendance/reset" :
                         "siteInchargeAttendance/reset";
      dispatch({ type: resetAction });
    }
  }, [attendanceError, dispatch, userRole]);

  // Date calculations
  const startDate = startOfMonth(new Date(yearFilter, monthFilter - 1));
  const endDate = endOfMonth(startDate);

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
        formatted: userRole === 'siteincharge' ? format(day, "MMM d") : format(day, "d"),
        isSunday: isSunday(day),
      }));
  }, [startDate, endDate, dateFilter, userRole]);

  // Extract employees based on data structure
  const extractedEmployees = useMemo(() => {
    if (!attendanceData || !Array.isArray(attendanceData)) return [];
    
    if (userRole === 'siteincharge') {
      // SiteIncharge: nested structure [{employee: {...}, attendance: [...]}]
      return attendanceData.map(item => item.employee).filter(Boolean);
    } else {
      // ✅ UPDATED: SuperAdmin/Admin now uses {employee, attendance[]} structure
      // Check if it's the new structure or old flat structure for backward compatibility
      if (attendanceData.length > 0 && attendanceData[0].employee && attendanceData[0].attendance) {
        // NEW structure: each item has {employee, attendance[]}
        return attendanceData.map(item => item.employee).filter(Boolean);
      } else {
        // OLD flat structure: extract unique employees (fallback)
        const employeeMap = new Map();
        attendanceData.forEach((att) => {
          if (att.employee && att.employee._id) {
            employeeMap.set(att.employee._id.toString(), att.employee);
          }
        });
        return Array.from(employeeMap.values());
      }
    }
  }, [attendanceData, userRole]);

  const filteredEmployees = useMemo(() => {
    return extractedEmployees
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
  }, [extractedEmployees, sortField, sortOrder, monthlySearch]);

  // ✅ FIXED: Find attendance record with date validation
  const findAttendanceRecord = (employee, day) => {
    if (userRole === 'siteincharge') {
      const employeeData = attendanceData.find(item => 
        item.employee._id.toString() === employee._id.toString()
      );
      
      if (employeeData && employeeData.attendance) {
        return employeeData.attendance.find((att) => {
          if (!isValidDate(att.date)) return false;
          const attDateStr = safeFormatDate(att.date);
          const dayDateStr = safeFormatDate(day.date);
          return attDateStr && dayDateStr && attDateStr === dayDateStr;
        });
      }
    } else {
      // ✅ UPDATED: Handle both new and old data structures with date validation
      if (attendanceData.length > 0 && attendanceData[0].employee && attendanceData[0].attendance) {
        // NEW structure: find employee's data and search their attendance
        const employeeData = attendanceData.find(item => 
          item.employee._id.toString() === employee._id.toString()
        );
        
        if (employeeData && employeeData.attendance) {
          return employeeData.attendance.find((att) => {
            if (!isValidDate(att.date)) return false;
            const attDateStr = safeFormatDate(att.date);
            const dayDateStr = safeFormatDate(day.date);
            return attDateStr && dayDateStr && attDateStr === dayDateStr;
          });
        }
      } else {
        // OLD flat structure (fallback)
        return attendanceData.find((att) => {
          if (!att.employee || att.employee._id.toString() !== employee._id.toString()) return false;
          if (!isValidDate(att.date)) return false;
          const attDateStr = safeFormatDate(att.date);
          const dayDateStr = safeFormatDate(day.date);
          return attDateStr && dayDateStr && attDateStr === dayDateStr;
        });
      }
    }
    return null;
  };

  // Calculate monthly totals
  const monthlyTotals = useMemo(() => {
    const totals = { present: 0, absent: 0, leave: 0, "half-day": 0 };
    
    if (userRole === 'siteincharge') {
      attendanceData.forEach(item => {
        item.attendance?.forEach(record => {
          if (record.status) {
            totals[record.status] = (totals[record.status] || 0) + 1;
          }
        });
      });
    } else {
      // ✅ UPDATED: Handle both new and old data structures
      if (attendanceData.length > 0 && attendanceData[0].employee && attendanceData[0].attendance) {
        // NEW structure: each item has {employee, attendance[]}
        attendanceData.forEach(item => {
          item.attendance?.forEach(record => {
            if (record.status) {
              totals[record.status] = (totals[record.status] || 0) + 1;
            }
          });
        });
      } else {
        // OLD flat structure (fallback)
        attendanceData.forEach(att => {
          if (att.status) {
            totals[att.status] = (totals[att.status] || 0) + 1;
          }
        });
      }
    }
    
    return totals;
  }, [attendanceData, userRole]);

  // Event handlers
  const handleMonthChange = (value) => {
    const parsedMonth = parseInt(value);
    setMonthFilter(parsedMonth);
    setDisplayMonth(parsedMonth - 1);
    setCurrentPage(1);
    setDateFilter(null);
  };

  const handleYearChange = (value) => {
    const parsedYear = parseInt(value);
    setYearFilter(parsedYear);
    setDisplayYear(parsedYear);
    setCurrentPage(1);
    setDateFilter(null);
  };

  const handleLocationChange = (value) => {
    setLocationFilter(value);
    setCurrentPage(1);
    setDateFilter(null);
  };

  const handleSort = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const handleEditAction = (attendanceId, employeeId, employeeName, date, currentStatus) => {
    if (canEditDirectly) {
      setEditDialog({
        open: true,
        attendanceId,
        employeeId,
        employeeName,
        date,
        currentStatus,
        newStatus: "",
        reason: "",
      });
    } else {
      // Request edit for SiteIncharge
      setEditDialog({
        open: true,
        attendanceId: null,
        employeeId,
        employeeName,
        date,
        currentStatus,
        newStatus: "",
        reason: "",
      });
    }
  };

  const getStatusIcon = (status) => {
    const iconProps = "h-4 w-4";
    const colorClass = userRole === 'siteincharge' ? {
      present: "text-accent",
      absent: "text-error", 
      leave: "text-error",
      "half-day": "text-error"
    } : {
      present: "text-green",
      absent: "text-error",
      leave: "text-yellow", 
      "half-day": "text-accent"
    };

    switch (status) {
      case "present":
        return <CheckCircle2 className={`${iconProps} ${colorClass.present}`} />;
      case "absent":
        return <X className={`${iconProps} ${colorClass.absent}`} />;
      case "leave":
        return <User className={`${iconProps} ${colorClass.leave}`} />;
      case "half-day":
        return <Users className={`${iconProps} ${colorClass["half-day"]}`} />;
      default:
        return null;
    }
  };

  const getLocationName = () => {
    if (userRole === 'siteincharge') {
      return user?.locations?.[0]?.name || "Unknown";
    }
    if (locationFilter === "all") return "All Locations";
    const loc = locationsData?.find((l) => l._id === locationFilter);
    return loc?.name || "Unknown";
  };

  // Pagination helpers
  const totalPages = pagination?.totalPages || 1;
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

  // Constants
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString("default", { month: "long" }),
  }));
  
  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  // ✅ FIXED: Export functions with date validation
  const handleDownloadExcel = () => {
    if (!attendanceData || !attendanceData.length) {
      toast.error("No attendance data available to export.", { duration: 5000 });
      return;
    }
    setIsExporting(true);

    const data = filteredEmployees.map((emp) => {
      const counts = { present: 0, absent: 0, leave: 0, "half-day": 0 };
      const statuses = days.map((day) => {
        const record = findAttendanceRecord(emp, day);
        if (record) {
          counts[record.status]++;
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

    // ✅ FIXED: Add daily totals row with date validation
    data.push({
      ID: "",
      Employee: "Daily Totals",
      ...days.reduce((acc, day) => {
        let records = [];
        if (userRole === 'siteincharge') {
          records = attendanceData.flatMap(item =>
            (item.attendance || []).filter(att => {
              if (!isValidDate(att.date)) return false;
              const attDateStr = safeFormatDate(att.date);
              const dayDateStr = safeFormatDate(day.date);
              return attDateStr && dayDateStr && attDateStr === dayDateStr;
            })
          );
        } else {
          // Handle both new and old structures
          if (attendanceData.length > 0 && attendanceData[0].employee && attendanceData[0].attendance) {
            records = attendanceData.flatMap(item =>
              (item.attendance || []).filter(att => {
                if (!isValidDate(att.date)) return false;
                const attDateStr = safeFormatDate(att.date);
                const dayDateStr = safeFormatDate(day.date);
                return attDateStr && dayDateStr && attDateStr === dayDateStr;
              })
            );
          } else {
            records = attendanceData.filter(att => {
              if (!isValidDate(att.date)) return false;
              const attDateStr = safeFormatDate(att.date);
              const dayDateStr = safeFormatDate(day.date);
              return attDateStr && dayDateStr && attDateStr === dayDateStr;
            });
          }
        }
        
        const totals = {
          present: records.filter(r => r.status === "present").length,
          absent: records.filter(r => r.status === "absent").length,
          leave: records.filter(r => r.status === "leave").length,
          "half-day": records.filter(r => r.status === "half-day").length,
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

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 30 },
      ...days.map(() => ({ wch: 10 })),
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    ];

    // Style header row
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

    // Add header sheet
    const headerWs = XLSX.utils.json_to_sheet([
      { A: "Monthly Attendance Report" },
      { A: `Month: ${months.find((m) => m.value === monthFilter).label} ${yearFilter}` },
      { A: `Location: ${getLocationName()}` },
      { A: "Note: Daily Totals format is P:Present, A:Absent, L:Leave, HD:Half-Day" },
      { A: "" },
    ], { skipHeader: true });
    XLSX.utils.book_append_sheet(wb, headerWs, "Header");

    XLSX.writeFile(wb, `Attendance_${months.find((m) => m.value === monthFilter).label}_${yearFilter}.xlsx`);
    toast.success("Excel downloaded successfully", { duration: 5000 });
    setIsExporting(false);
  };

  // ✅ FIXED: PDF export with date validation
  const handleDownloadPDF = () => {
    if (!attendanceData || !attendanceData.length) {
      toast.error("No attendance data available to export.", { duration: 5000 });
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
    doc.text(`Month: ${months.find((m) => m.value === monthFilter).label} ${yearFilter}`, 15, 22);
    doc.text(`Location: ${getLocationName()}`, 15, 29);
    doc.setFontSize(8);
    doc.text("Note: Daily Totals format is P:Present, A:Absent, L:Leave, HD:Half-Day", 15, 34);

    const body = filteredEmployees.map((emp) => {
      const counts = { present: 0, absent: 0, leave: 0, "half-day": 0 };
      const statuses = days.map((day) => {
        const record = findAttendanceRecord(emp, day);
        if (record) {
          counts[record.status]++;
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

    // ✅ FIXED: Add daily totals row with date validation
    body.push([
      "",
      "Daily Totals",
      ...days.map((day) => {
        let records = [];
        if (userRole === 'siteincharge') {
          records = attendanceData.flatMap(item =>
            (item.attendance || []).filter(att => {
              if (!isValidDate(att.date)) return false;
              const attDateStr = safeFormatDate(att.date);
              const dayDateStr = safeFormatDate(day.date);
              return attDateStr && dayDateStr && attDateStr === dayDateStr;
            })
          );
        } else {
          // Handle both new and old structures
          if (attendanceData.length > 0 && attendanceData[0].employee && attendanceData[0].attendance) {
            records = attendanceData.flatMap(item =>
              (item.attendance || []).filter(att => {
                if (!isValidDate(att.date)) return false;
                const attDateStr = safeFormatDate(att.date);
                const dayDateStr = safeFormatDate(day.date);
                return attDateStr && dayDateStr && attDateStr === dayDateStr;
              })
            );
          } else {
            records = attendanceData.filter(att => {
              if (!isValidDate(att.date)) return false;
              const attDateStr = safeFormatDate(att.date);
              const dayDateStr = safeFormatDate(day.date);
              return attDateStr && dayDateStr && attDateStr === dayDateStr;
            });
          }
        }
        
        const totals = {
          present: records.filter(r => r.status === "present").length,
          absent: records.filter(r => r.status === "absent").length,
          leave: records.filter(r => r.status === "leave").length,
          "half-day": records.filter(r => r.status === "half-day").length,
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
          acc[index + 2] = { cellWidth: Math.max(4, daysWidth), halign: "center" };
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

  // Loading states
  const isLoading = attendanceLoading || employeesLoading || locationsLoading;

  return (
    <div className="space-y-6 p-4 animate-fade-in">
      {isLoading && (
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
          {attendanceError && (
            <p className="text-error text-sm">
              Error: {attendanceError}
            </p>
          )}
          
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Location Filter */}
            {showLocationFilter && (
              <div className="space-y-2">
                <Label htmlFor="locationFilter" className="text-sm font-semibold text-body">
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
                  >
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="bg-body text-body border-complementary">
                    {!requireLocationSelection && (
                      <SelectItem value="all" className="text-sm hover:bg-accent-light">
                        All Locations
                      </SelectItem>
                    )}
                    {locationsData?.map((loc) => (
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
            )}

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="monthlySearch" className="text-sm font-semibold text-body">
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
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-complementary" />
              </div>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="dateFilter" className="text-sm font-semibold text-body">
                Filter by Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-semibold bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md truncate text-sm"
                    disabled={requireLocationSelection && locationFilter === "all"}
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
                      className="w-full border-accent text-accent hover:bg-accent-light hover:text-body text-sm py-2 px-4 rounded-md"
                    >
                      Clear Date Filter
                    </Button>
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

            {/* Month Filter */}
            <div className="space-y-2">
              <Label htmlFor="monthFilter" className="text-sm font-semibold text-body">
                Month
              </Label>
              <Select
                value={monthFilter.toString()}
                onValueChange={handleMonthChange}
                disabled={requireLocationSelection && locationFilter === "all"}
              >
                <SelectTrigger
                  id="monthFilter"
                  className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md text-sm"
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

            {/* Year Filter */}
            <div className="space-y-2">
              <Label htmlFor="yearFilter" className="text-sm font-semibold text-body">
                Year
              </Label>
              <Select
                value={yearFilter.toString()}
                onValueChange={handleYearChange}
                disabled={requireLocationSelection && locationFilter === "all"}
              >
                <SelectTrigger
                  id="yearFilter"
                  className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md text-sm"
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

            {/* Show Full Month Button */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-body"> </Label>
              <Button
                onClick={() => {
                  setDateFilter(null);
                  setCurrentPage(1);
                  setDisplayMonth(monthFilter - 1);
                  setDisplayYear(yearFilter);
                }}
                className="w-full bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 h-10 rounded-md"
                disabled={!dateFilter || (requireLocationSelection && locationFilter === "all")}
              >
                <RotateCcw className="h-5 w-5" />
                Show Full Month
              </Button>
            </div>

            {/* Download Excel Button */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-body"> </Label>
              <Button
                onClick={handleDownloadExcel}
                className="w-full bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 h-10 rounded-md"
                disabled={isExporting || isLoading || !filteredEmployees.length || (requireLocationSelection && locationFilter === "all")}
              >
                {isExporting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                Download Excel
              </Button>
            </div>

            {/* Download PDF Button */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-body"> </Label>
              <Button
                onClick={handleDownloadPDF}
                className="w-full bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 h-10 rounded-md"
                disabled={isExporting || isLoading || !filteredEmployees.length || (requireLocationSelection && locationFilter === "all")}
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

          {/* Table Content */}
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : requireLocationSelection && locationFilter === "all" ? (
            <p className="text-body text-sm text-center py-4">
              Please select a specific location to view attendance records.
            </p>
          ) : filteredEmployees.length > 0 ? (
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
                          {userRole === 'siteincharge' ? format(day.date, "MMM d") : format(day.date, "MMM d")}
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
                    {filteredEmployees.map((emp, index) => {
                      const counts = { present: 0, absent: 0, leave: 0, "half-day": 0 };
                      
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
                            const record = findAttendanceRecord(emp, day);
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
                                  handleEditAction(
                                    record._id,
                                    emp._id,
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
                    
                    {/* ✅ FIXED: Daily Totals Row with date validation */}
                    <TableRow className="bg-accent font-semibold border-t-2 border-complementary">
                      <TableCell className="text-body text-sm w-[100px] text-center px-2"></TableCell>
                      <TableCell className="text-body text-sm w-[200px] text-center px-2 font-semibold">
                        Daily Totals
                      </TableCell>
                      {days.map((day) => {
                        let records = [];
                        if (userRole === 'siteincharge') {
                          records = attendanceData.flatMap((item) =>
                            (item.attendance || []).filter((att) => {
                              if (!isValidDate(att.date)) return false;
                              const attDateStr = safeFormatDate(att.date);
                              const dayDateStr = safeFormatDate(day.date);
                              return attDateStr && dayDateStr && attDateStr === dayDateStr;
                            })
                          );
                        } else {
                          // Handle both new and old structures
                          if (attendanceData.length > 0 && attendanceData[0].employee && attendanceData[0].attendance) {
                            records = attendanceData.flatMap((item) =>
                              (item.attendance || []).filter((att) => {
                                if (!isValidDate(att.date)) return false;
                                const attDateStr = safeFormatDate(att.date);
                                const dayDateStr = safeFormatDate(day.date);
                                return attDateStr && dayDateStr && attDateStr === dayDateStr;
                              })
                            );
                          } else {
                            records = attendanceData.filter((att) => {
                              if (!isValidDate(att.date)) return false;
                              const attDateStr = safeFormatDate(att.date);
                              const dayDateStr = safeFormatDate(day.date);
                              return attDateStr && dayDateStr && attDateStr === dayDateStr;
                            });
                          }
                        }
                        
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="border-complementary text-body hover:bg-complementary-light text-sm p-2"
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
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="border-complementary text-body hover:bg-complementary-light text-sm p-2"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-body text-sm text-center py-4">
              No employees found for the selected criteria.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit/Request Dialog */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) =>
          !open &&
          setEditDialog({
            open: false,
            attendanceId: null,
            employeeId: null,
            employeeName: "",
            date: null,
            currentStatus: "",
            newStatus: "",
            reason: "",
          })
        }
      >
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-lg rounded-lg animate-scale-in">
          <DialogHeader className="border-b border-complementary pb-4">
            <DialogTitle className="text-xl font-bold text-body flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              {canEditDirectly ? "Edit Attendance" : "Request Attendance Edit"}
            </DialogTitle>
            <DialogDescription className="text-sm text-body">
              {canEditDirectly ? "Update" : "Request a change to the"} attendance for {editDialog.employeeName} on{" "}
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
                disabled={requireLocationSelection && locationFilter === "all"}
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

            {/* Reason field for request mode */}
            {!canEditDirectly && (
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-semibold text-body">
                  Reason for Change
                </Label>
                <Input
                  id="reason"
                  value={editDialog.reason}
                  onChange={(e) =>
                    setEditDialog((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Enter reason for edit request"
                  className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md text-sm"
                />
              </div>
            )}
          </div>
          
          <DialogFooter className="border-t border-complementary pt-4 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() =>
                setEditDialog({
                  open: false,
                  attendanceId: null,
                  employeeId: null,
                  employeeName: "",
                  date: null,
                  currentStatus: "",
                  newStatus: "",
                  reason: "",
                })
              }
              className="border-complementary text-body hover:bg-complementary-light text-sm py-2 px-4 rounded-md"
              disabled={attendanceLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editDialog.newStatus) {
                  toast.error("Please select a new status to update.", { duration: 5000 });
                  return;
                }
                if (editDialog.newStatus === editDialog.currentStatus) {
                  toast.error("New status must be different from the current status.", { duration: 5000 });
                  return;
                }
                if (!canEditDirectly && !editDialog.reason) {
                  toast.error("Please provide a reason for the change.", { duration: 5000 });
                  return;
                }

                const actionToDispatch = canEditDirectly ? editAttendanceAction : requestEditAction;
                let params;

                if (canEditDirectly) {
                  params = {
                    id: editDialog.attendanceId,
                    status: editDialog.newStatus,
                  };
                } else {
                  params = {
                    employeeId: editDialog.employeeId,
                    date: format(startOfDay(editDialog.date), "yyyy-MM-dd'T'00:00:00+05:30"),
                    currentStatus: editDialog.currentStatus,
                    newStatus: editDialog.newStatus,
                    reason: editDialog.reason,
                    location: userLocationId,
                  };
                }

                dispatch(actionToDispatch(params))
                  .unwrap()
                  .then(() => {
                    const message = canEditDirectly 
                      ? `Attendance updated to ${editDialog.newStatus} for ${editDialog.employeeName} on ${format(editDialog.date, "PPP")}.`
                      : "Edit request submitted successfully";
                    toast.success(message, { duration: 5000 });
                    
                    setEditDialog({
                      open: false,
                      attendanceId: null,
                      employeeId: null,
                      employeeName: "",
                      date: null,
                      currentStatus: "",
                      newStatus: "",
                      reason: "",
                    });
                    
                    // Refresh data
                    if (fetchAttendanceAction) {
                      const attendanceParams = {
                        month: monthFilter,
                        year: yearFilter,
                        location: userRole === 'siteincharge' ? userLocationId : locationFilter,
                        page: currentPage,
                        limit: itemsPerPage,
                      };
                      
                      if (userRole === 'siteincharge') {
                        attendanceParams.isDeleted = false;
                      }
                      
                      dispatch(fetchAttendanceAction(attendanceParams));
                    }
                  })
                  .catch((err) => {
                    const errorMessage = err?.message || err || "Failed to process request.";
                    toast.error(errorMessage, { duration: 5000 });
                  });
              }}
              className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 rounded-md"
              disabled={attendanceLoading || !editDialog.newStatus || (!canEditDirectly && !editDialog.reason)}
            >
              {attendanceLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                canEditDirectly ? "Update" : "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MonthlyAttendanceTable;
