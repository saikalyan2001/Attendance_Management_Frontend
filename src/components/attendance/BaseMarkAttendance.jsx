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

  // ✅ UPDATED: Working day and exception states
  const [workingDayInfo, setWorkingDayInfo] = useState(null);
  const [nonWorkingDayEmployees, setNonWorkingDayEmployees] = useState([]);
  const [showExceptionDialog, setShowExceptionDialog] = useState(false);
  const [exceptionEmployees, setExceptionEmployees] = useState([]);
  const [exceptionReasons, setExceptionReasons] = useState({});
  const [exceptionDescriptions, setExceptionDescriptions] = useState({});
  
  // ✅ IMPROVED: Better toast management
  const [lastToastInfo, setLastToastInfo] = useState({ date: null, policyId: null });
  const [isSubmitting, setIsSubmitting] = useState(false); // ✅ NEW: Loading state
  const [calendarOpen, setCalendarOpen] = useState(false);

  const displayMonth = useMemo(() => {
    return new Date(year, month - 1, 1); // month - 1 because Date months are 0-indexed
  }, [month, year]);

  // ✅ NEW: Helper function to format leave balance display
  const formatLeaveBalance = (actualBalance) => {
    const displayBalance = Math.max(0, actualBalance);
    const isAtLimit = actualBalance <= 0;
    
    return {
      display: displayBalance.toFixed(1),
      isAtLimit,
      message: isAtLimit ? "No paid leaves remaining" : "Paid leaves available",
      warningText: isAtLimit ? "Additional leave will be salary deducted" : null,
    };
  };

  // Shared utility functions
const getOCLeaves = (employee, month, year) => {
  const paidLeavesPerMonth = 2;
  const monthlyLeaves = Array.isArray(employee.monthlyLeaves)
    ? employee.monthlyLeaves
    : [];
  
  // ✅ CRITICAL: Find by EXACT year and month match
  const monthlyLeave = monthlyLeaves.find(
    (ml) => ml.year === year && ml.month === month
  );

  if (!monthlyLeave) {
    // If no record found, return default values
    return `${paidLeavesPerMonth.toFixed(1)}/${paidLeavesPerMonth.toFixed(1)} ○`;
  }

  // ✅ Only show carry forward if month is finalized
  const displayCarriedForward = monthlyLeave.isFinalized ? 
    (monthlyLeave.carriedForward || 0) : 0;

  const openingLeaves = (monthlyLeave.allocated || paidLeavesPerMonth) + displayCarriedForward;
  const closingLeaves = Math.max(monthlyLeave.available || paidLeavesPerMonth, 0);
  
  // ✅ Finalization status indicator
  const finalizationStatus = monthlyLeave.isFinalized ? "✓" : "○";
  
  return `${openingLeaves.toFixed(1)}/${closingLeaves.toFixed(1)} ${finalizationStatus}`;
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
      
      // ✅ NEW: Finalization-aware calculations
      const currentMonthAllocated = monthlyLeave ? (monthlyLeave.allocated || 2) : 2;
      const currentMonthTaken = monthlyLeave ? (monthlyLeave.taken || 0) : 0;
      const currentMonthAvailable = monthlyLeave ? (monthlyLeave.available || 0) : 0;
      
      // ✅ NEW: Only show carried forward if finalized
      const displayCarriedForward = (monthlyLeave?.isFinalized) ? 
        (monthlyLeave.carriedForward || 0) : 0;
      
      // ✅ UPDATED: Calculate O/C leaves with finalization logic
      const openingLeaves = currentMonthAllocated + displayCarriedForward;
      const closingLeaves = Math.max(currentMonthAvailable, 0);
      
      // ✅ NEW: Add finalization status
      const finalizationStatus = monthlyLeave?.isFinalized ? " ✓" : " ○";
      const ocLeaves = `${openingLeaves.toFixed(1)}/${closingLeaves.toFixed(1)}${finalizationStatus}`;
      
      const leavesAvailable = Math.max(0, Number(currentMonthAvailable.toFixed(1)));
    
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
        actualAvailable: currentMonthAvailable,
        // ✅ NEW: Include finalization data
        isFinalized: monthlyLeave?.isFinalized || false,
        finalizedAt: monthlyLeave?.finalizedAt || null,
        displayCarriedForward,
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


  // ✅ FIXED: Default status to absent when checkbox is ticked
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
          // ✅ FIXED: Default to absent instead of present
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
    
    // ✅ FIXED: Close the calendar popover
    setCalendarOpen(false);
  };

  // ✅ IMPROVED: Better UX for attendance submission
  // ✅ FIXED: Keep original toast styling in confirmBulkSubmit
  // ✅ FIXED: Better modal reset in confirmBulkSubmit
// ✅ UPDATED: In src/components/attendance/BaseMarkAttendance.jsx
const confirmBulkSubmit = async () => {
  if (isSubmitting) return;
  
  setIsSubmitting(true);
  const loadingToast = toast.loading("Marking attendance...", { duration: Infinity });

  try {
    const result = await attendanceActions.submitAttendance({
      records: bulkConfirmDialog.records,
      remaining: bulkConfirmDialog.remaining,
      overwrite: bulkConfirmDialog.overwrite || false,
    });

    toast.dismiss(loadingToast);
    toast.success(result.message, { duration: 5000 });

    // Reset state immediately and close modal
    setBulkSelectedEmployees([]);
    setBulkEmployeeStatuses({});
    setBulkConfirmDialog({
      open: false,
      records: [],
      remaining: [],
      preview: false,
      overwrite: undefined,
      existingRecords: [],
      invalidRecords: [],
    });

    // ✅ ENHANCED: Force comprehensive data refresh
    setTimeout(async () => {
      try {
        await attendanceActions.refreshData({
          location,
          locationId,
          month,
          year,
          selectedDate,
        });
      } catch (refreshError) {
        // ✅ Show user-friendly message but don't block UI
        toast.error('Attendance marked but data refresh failed. Please refresh the page.', {
          duration: 3000
        });
      }
    }, 2000); // ✅ Longer delay to ensure backend processing completes

  } catch (error) {
    toast.dismiss(loadingToast);
    const errorMessage = typeof error === 'string' ? error :
                        error?.message || 
                        "Failed to mark attendance";
    toast.error(errorMessage, { duration: 5000 });
    
    setBulkConfirmDialog(prev => ({
      ...prev,
      open: false
    }));
  } finally {
    setIsSubmitting(false);
  }
};


  // ✅ ENHANCED: Handle exception attendance with better validation
  const handleExceptionAttendance = () => {
    if (!workingDayInfo || workingDayInfo.isWorkingDay) {
      toast.error('This is already a working day');
      return;
    }

    if (bulkSelectedEmployees.length === 0) {
      toast.error('Please select employees for exception attendance');
      return;
    }

    const affectedEmployees = displayData.filteredEmployees.filter(emp => 
      bulkSelectedEmployees.includes(emp._id?.toString())
    );

    if (affectedEmployees.length === 0) {
      toast.error('No valid employees selected for exception attendance');
      return;
    }
    
    setExceptionEmployees(affectedEmployees);
    setShowExceptionDialog(true);
  };

  // ✅ ENHANCED: Bulk submit with improved exception handling
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

    // ✅ ENHANCED: Check if it's a non-working day and we have selected employees
    if (workingDayInfo && !workingDayInfo.isWorkingDay && bulkSelectedEmployees.length > 0) {
      const dayName = format(selectedDate, 'EEEE');
      const dateStr = format(selectedDate, 'MMMM do, yyyy');
      
      const message = `${dayName}, ${dateStr} is not a working day according to ${workingDayInfo.policy.policyName}. Would you like to mark as exception attendance?\n\nNote: Exception attendance will not count toward salary calculation.`;
      
      if (!confirm(message)) {
        return;
      }
      
      // Show exception dialog
      handleExceptionAttendance();
      return;
    }

    // Continue with normal flow for working days
    const timestamp = getISTTimestamp(selectedDate, selectedTime);
    const { selectedRecords, remainingRecords } = attendanceActions.prepareRecords({
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

  // ✅ ENHANCED: Submit exception attendance with proper validation
  const submitExceptionAttendance = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      const loadingToast = toast.loading("Marking exception attendance...", { duration: Infinity });

      // Validate all required fields
      const missingReasons = exceptionEmployees.filter(emp => !exceptionReasons[emp._id]);
      if (missingReasons.length > 0) {
        toast.dismiss(loadingToast);
        toast.error(`Please provide exception reasons for all employees`);
        return;
      }

      // Validate 'other' reason descriptions
      const missingDescriptions = exceptionEmployees.filter(emp => 
        exceptionReasons[emp._id] === 'other' && !exceptionDescriptions[emp._id]?.trim()
      );
      if (missingDescriptions.length > 0) {
        toast.dismiss(loadingToast);
        toast.error(`Please provide descriptions for employees with 'Other' reason`);
        return;
      }

      const timestamp = getISTTimestamp(selectedDate, selectedTime);
      
      const exceptionRecords = exceptionEmployees.map(emp => ({
        employeeId: emp._id,
        date: timestamp,
        status: bulkEmployeeStatuses[emp._id] || 'present',
        location: role === 'siteincharge' ? locationId : location,
        isException: true, // ✅ REQUIRED
        exceptionReason: exceptionReasons[emp._id], // ✅ REQUIRED
        exceptionDescription: exceptionReasons[emp._id] === 'other' 
          ? exceptionDescriptions[emp._id]?.trim()
          : `Exception attendance on ${format(selectedDate, 'PPP')} - ${workingDayInfo?.policy?.policyName}`
      }));

      const result = await dispatch(actions.bulkMarkAttendance({
        attendance: exceptionRecords,
        overwrite: false
      })).unwrap();

      toast.dismiss(loadingToast);
      toast.success(`Exception attendance marked for ${exceptionEmployees.length} employees`, { 
        duration: 5000
      });

      // Reset states
      setBulkSelectedEmployees([]);
      setBulkEmployeeStatuses({});
      setShowExceptionDialog(false);
      setExceptionEmployees([]);
      setExceptionReasons({});
      setExceptionDescriptions({});

      // Refresh data
      setTimeout(async () => {
        await attendanceActions.refreshData({
          location,
          locationId,
          month,
          year,
          selectedDate,
        });
      }, 1000);

    } catch (error) {
      toast.error(error.message || 'Failed to mark exception attendance', { 
        duration: 5000 
      });
      setShowExceptionDialog(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveLocation = useMemo(() => {
    return role === 'siteincharge' ? locationId : location;
  }, [role, locationId, location]);

  const formattedDate = useMemo(() => {
    return selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  }, [selectedDate]);

  // ✅ FIXED: Extract actions to prevent dependency issues
  const { fetchWorkingDayPolicy, clearWorkingDayPolicy } = actions || {};

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

  // ✅ FIXED: Working day policy check with debouncing
  useEffect(() => {
    // ✅ Early return with loading check INSIDE the effect
    if (attendance.workingDayPolicyLoading) {
      return;
    }
    
    const timeoutId = setTimeout(() => {
      if (!selectedDate || !effectiveLocation || effectiveLocation === 'select') {
        if (clearWorkingDayPolicy) {
          dispatch(clearWorkingDayPolicy());
        }
        setWorkingDayInfo(null);
        setNonWorkingDayEmployees([]);
        return;
      }
      
      if (fetchWorkingDayPolicy) {
        dispatch(fetchWorkingDayPolicy({
          locationId: effectiveLocation,
          date: `${formattedDate}T00:00:00+05:30`
        }));
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [effectiveLocation, formattedDate, fetchWorkingDayPolicy, clearWorkingDayPolicy, dispatch, selectedDate]); // ✅ Only stable dependencies

  // ✅ FIXED: Handle working day policy response without dependency issues
  useEffect(() => {
    const { workingDayPolicy, workingDayPolicyLoading, workingDayPolicyError } = attendance;
    
    if (workingDayPolicyLoading) {
      return;
    }
    
    if (workingDayPolicyError) {
      toast.error(`Failed to check working day policy: ${workingDayPolicyError}`);
      if (workingDayInfo !== null) {
        setWorkingDayInfo(null);
        setNonWorkingDayEmployees([]);
      }
      return;
    }
    
    if (workingDayPolicy) {
      // ✅ ONLY update if policy actually changed
      const policyChanged = !workingDayInfo || 
        workingDayInfo.policy?.policyName !== workingDayPolicy.policy?.policyName ||
        workingDayInfo.isWorkingDay !== workingDayPolicy.isWorkingDay;
      
      if (policyChanged) {
        setWorkingDayInfo(workingDayPolicy);

        // ✅ Show toast only for non-working days and prevent duplicates
        if (!workingDayPolicy.isWorkingDay && selectedDate) {
          const currentDateStr = format(selectedDate, 'yyyy-MM-dd');
          const currentPolicyId = workingDayPolicy.policy?.policyName;
          const toastKey = `${currentDateStr}-${currentPolicyId}`;
          
          if (lastToastInfo.date !== currentDateStr || lastToastInfo.policyId !== currentPolicyId) {
            setLastToastInfo({ date: currentDateStr, policyId: currentPolicyId });
            
            const dayName = format(selectedDate, 'EEEE');
            const dateStr = format(selectedDate, 'MMMM do, yyyy');
            
            toast((t) => (
              <div className="flex items-start gap-3 p-2">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-amber-800 mb-1">Non-Working Day</div>
                  <div className="text-sm text-amber-700 mb-2">
                    <strong>{dayName}, {dateStr}</strong> is excluded by <strong>{workingDayPolicy.policy.policyName}</strong>
                  </div>
                  <div className="text-xs text-amber-600 mb-2">
                    💡 Select employees and mark as exception if needed.
                  </div>
                  <button
                    className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                    onClick={() => toast.dismiss(t.id)}
                  >
                    Got it
                  </button>
                </div>
              </div>
            ), {
              id: toastKey,
              duration: 8000,
              position: 'top-right',
              style: {
                background: '#FEF3C7',
                border: '1px solid #F59E0B',
                borderLeft: '4px solid #F59E0B',
                borderRadius: '8px',
                padding: '12px',
                maxWidth: '400px',
              }
            });
          }
        }
      }
    }
  }, [
    attendance.workingDayPolicy,
    attendance.workingDayPolicyLoading,
    attendance.workingDayPolicyError,
    workingDayInfo?.policy?.policyName,
    workingDayInfo?.isWorkingDay,
    selectedDate,
    lastToastInfo.date,
    lastToastInfo.policyId
  ]); // ✅ Stable dependencies only

  // ✅ SEPARATE: Handle non-working day employees
  useEffect(() => {
    if (workingDayInfo && !workingDayInfo.isWorkingDay && bulkSelectedEmployees.length > 0) {
      const affected = displayData.filteredEmployees.filter(emp => 
        bulkSelectedEmployees.includes(emp._id?.toString())
      );
      
      // Only update if different
      if (JSON.stringify(affected.map(e => e._id)) !== JSON.stringify(nonWorkingDayEmployees.map(e => e._id))) {
        setNonWorkingDayEmployees(affected);
      }
    } else if (nonWorkingDayEmployees.length > 0) {
      setNonWorkingDayEmployees([]);
    }
  }, [workingDayInfo?.isWorkingDay, bulkSelectedEmployees.length, displayData.filteredEmployees.length]);

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

            {/* ✅ FIXED: Location Selector with proper non-empty value */}
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
                    ? location || "select"  // ✅ Use "select" instead of empty string
                    : locationId || "none"
                }
                onValueChange={(value) => {
                  if (permissions.canChangeLocation) {
                    // ✅ Convert "select" back to empty string for your logic
                    setLocation(value === "select" ? "" : value);
                  }
                }}
                disabled={!permissions.canChangeLocation}
              >
                <SelectTrigger className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 rounded-md">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  {/* ✅ FIXED: Use "select" value instead of empty string */}
                  {permissions.canChangeLocation && (
                    <SelectItem
                      value="select"
                      className="text-sm hover:bg-accent-light"
                    >
                      Select a location
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
                      No Location Available
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
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                  isSubmitting || !permissions.canSubmit(
                    location,
                    locationId,
                    selectedDate,
                    displayData.filteredEmployees
                  )
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Preview
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleBulkSubmit(false)}
                className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-3 flex items-center gap-2"
                disabled={
                  isSubmitting || !permissions.canSubmit(
                    location,
                    locationId,
                    selectedDate,
                    displayData.filteredEmployees
                  )
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Attendance
                  </>
                )}
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
            const newStatuses = {};
            allIds.forEach(id => {
              newStatuses[id] = 'absent';
            });
            setBulkEmployeeStatuses(prev => ({
              ...prev,
              ...newStatuses
            }));
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
    {/* ✅ UPDATED: Header with finalization legend */}
    <TableHead className="text-body text-sm">
      <div className="flex flex-col">
        <span>O/C Leaves</span>
        <span className="text-xs text-complementary">✓=Finalized ○=Pending</span>
      </div>
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
                                  ] || "absent" // ✅ FIXED: Default to absent
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
                                disabled={record.actualAvailable < 1} // ✅ Use actual value for business logic
                              >
                                Leave {record.actualAvailable < 1 && "(Insufficient)"}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-body text-sm">
                          {record.ocLeaves}
                        </TableCell>
                        {/* ✅ UPDATED: Enhanced leave balance display */}
                        <TableCell className="text-body text-sm">
                          <div className="flex items-center gap-2">
                            <span className={formatLeaveBalance(record.actualAvailable).statusColor}>
                              {formatLeaveBalance(record.actualAvailable).display}
                            </span>
                            {formatLeaveBalance(record.actualAvailable).isOverLimit && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="text-amber-500 text-xs">
                                      {formatLeaveBalance(record.actualAvailable).statusIcon}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-body border border-complementary rounded-md shadow-lg p-2 max-w-xs">
                                    <div className="space-y-1">
                                      <p className="font-semibold text-amber-600">Over Allocated Limit</p>
                                      <p className="text-sm">
                                        Exceeded by {formatLeaveBalance(record.actualAvailable).overLimitBy} days
                                      </p>
                                      <p className="text-xs text-complementary">
                                        This will be adjusted from next month's allocation
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ✅ ADD: Pagination Controls */}
              {displayData.totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                  {/* Left side - Items info */}
                  <div className="text-sm text-complementary">
                    Showing {Math.min((currentPage - 1) * pageSize + 1, displayData.totalItems)} to{" "}
                    {Math.min(currentPage * pageSize, displayData.totalItems)} of{" "}
                    {displayData.totalItems} employees
                  </div>

                  {/* Right side - Navigation controls */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="border-complementary text-body hover:bg-accent-light"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    {/* Page numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, displayData.totalPages) }, (_, i) => {
                        let pageNum;
                        if (displayData.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= displayData.totalPages - 2) {
                          pageNum = displayData.totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`min-w-[40px] ${
                              currentPage === pageNum
                                ? "bg-accent text-body"
                                : "border-complementary text-body hover:bg-accent-light"
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, displayData.totalPages))}
                      disabled={currentPage === displayData.totalPages}
                      className="border-complementary text-body hover:bg-accent-light"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
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

      {/* Confirmation Dialog */}
      <Dialog
        open={bulkConfirmDialog.open}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setBulkConfirmDialog({
              open: false,
              records: [],
              remaining: [],
              preview: false,
              overwrite: undefined,
              existingRecords: [],
              invalidRecords: [],
            });
          }
        }}
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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {!bulkConfirmDialog.preview && (
              <Button
                onClick={confirmBulkSubmit}
                className="bg-accent text-body"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ ENHANCED: Exception Attendance Dialog with proper validation */}
      <Dialog open={showExceptionDialog} onOpenChange={setShowExceptionDialog}>
        <DialogContent className="bg-body text-body border-complementary max-w-2xl">
          <DialogHeader>
            <DialogTitle>Exception Attendance - Non-Working Day</DialogTitle>
            <DialogDescription>
              <div className="space-y-2">
                <div><strong>Date:</strong> {selectedDate && format(selectedDate, 'PPP')}</div>
                <div><strong>Policy:</strong> {workingDayInfo?.policy.policyName}</div>
                <div className="text-amber-600 text-sm font-medium">
                  ⚠️ Exception attendance will not count toward salary calculation
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto space-y-3">
              {exceptionEmployees.map((emp) => (
                <div key={emp._id} className="border rounded p-3 space-y-2">
                  <div className="font-medium">{emp.name} ({emp.employeeId})</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Exception Reason *</Label>
                      <Select
                        value={exceptionReasons[emp._id] || 'management_approval'}
                        onValueChange={(value) => setExceptionReasons(prev => ({
                          ...prev,
                          [emp._id]: value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overtime">Overtime Work</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                          <SelectItem value="client_work">Client Work</SelectItem>
                          <SelectItem value="management_approval">Management Approval</SelectItem>
                          <SelectItem value="holiday_work">Holiday Work</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status *</Label>
                      <Select
                        value={bulkEmployeeStatuses[emp._id] || 'present'}
                        onValueChange={(value) => handleBulkStatusChange(emp._id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="half-day">Half-Day</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {exceptionReasons[emp._id] === 'other' && (
                    <div>
                      <Label>Description *</Label>
                      <Input
                        placeholder="Please provide reason for exception attendance"
                        value={exceptionDescriptions?.[emp._id] || ''}
                        onChange={(e) => setExceptionDescriptions(prev => ({
                          ...prev,
                          [emp._id]: e.target.value
                        }))}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowExceptionDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={submitExceptionAttendance} 
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={isSubmitting || exceptionEmployees.some(emp => 
                !exceptionReasons[emp._id] || 
                (exceptionReasons[emp._id] === 'other' && !exceptionDescriptions?.[emp._id]?.trim())
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Marking...
                </>
              ) : (
                'Mark Exception Attendance'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BaseMarkAttendance;
