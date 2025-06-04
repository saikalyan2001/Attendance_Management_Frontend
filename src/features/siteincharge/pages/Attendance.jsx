import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  markAttendance,
  fetchMonthlyAttendance,
  bulkMarkAttendance,
  requestAttendanceEdit,
  fetchAttendance,
  fetchAttendanceEditRequests,
  reset,
} from "../redux/attendanceSlice";
import { fetchEmployees } from "../redux/employeeSlice";
import Layout from "../../../components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  CalendarIcon,
  Loader2,
  AlertCircle,
  X,
  ArrowUpDown,
  CheckCircle2,
  RotateCcw,
  Users,
  User,
  Search,
  Eye,
  Edit,
  Clock,
  Download,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSunday,
} from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Validation schema for "Request Edit" form
const requestEditSchema = (currentStatus) =>
  z.object({
    requestedStatus: z
      .enum(["present", "absent", "leave", "half-day"], {
        required_error: "Please select a status",
      })
      .refine((value) => value !== currentStatus, {
        message: `Requested status must be different from the current status (${currentStatus})`,
      })
      .optional()
      .or(z.literal("")),
    reason: z
      .string()
      .min(5, "Reason must be at least 5 characters")
      .max(500, "Reason must be 500 characters or less"),
  });

const parseServerError = (error) => {
  if (!error) return { message: "An unknown error occurred", fields: {} };
  if (typeof error === "string") return { message: error, fields: {} };
  const message = error.message || "Operation failed";
  const fields =
    error.errors?.reduce((acc, err) => {
      acc[err.field] = err.message;
      return acc;
    }, {}) || {};
  return { message, fields };
};

const Attendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { employees, loading: empLoading } = useSelector(
    (state) => state.siteInchargeEmployee
  );
  const {
    monthlyAttendance,
    attendance,
    attendanceEditRequests,
    loading,
    error,
  } = useSelector((state) => state.siteInchargeAttendance);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [attendanceData, setAttendanceData] = useState({});
  const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState([]);
  const [bulkEmployeeStatuses, setBulkEmployeeStatuses] = useState({});
  const [requestDialog, setRequestDialog] = useState({
    open: false,
    employeeId: null,
    employeeName: "",
    date: null,
    currentStatus: "",
    location: null,
  });
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
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
  const [monthlySearch, setMonthlySearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState(null);
  const employeesPerPage = 10;

  // State for View Attendance

const [filterDate, setFilterDate] = useState(null);
const [filterStatus, setFilterStatus] = useState("all");
const [filterMonth, setFilterMonth] = useState(null);
const [filterYear, setFilterYear] = useState(null);
const [searchQuery, setSearchQuery] = useState("");
const [viewSort, setViewSort] = useState("asc"); 
const [sortConfig, setSortConfig] = useState({ column: "date", direction: "desc" });

  // Persist active tab
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("attendanceActiveTab") || "mark";
  });

  const [serverError, setServerError] = useState(null);

  const locationId = user?.locations?.[0]?._id;


  const requestForm = useForm({
    resolver: zodResolver(requestEditSchema(requestDialog.currentStatus)),
    defaultValues: {
      requestedStatus: "",
      reason: "",
    },
  });
  

  useEffect(() => {
    if (!user || user.role !== "siteincharge") {
      navigate("/login");
      return;
    }
    if (!user?.locations?.length) {
      setServerError({
        message: "No location assigned. Please contact an admin.",
        fields: {},
      });
      toast.error("No location assigned. Please contact an admin.", {
        duration: 10000,
      });
      return;
    }
  }, [user, navigate]);

useEffect(() => {
  if (!locationId) return;

  // Fetch employees
  dispatch(fetchEmployees({ location: locationId }));

  // Fetch data for Mark Attendance tab
  if (activeTab === "mark") {
    dispatch(
      fetchMonthlyAttendance({
        month: monthFilter,
        year: yearFilter,
        location: locationId,
      })
    );
  }

  // Fetch data for View Attendance tab
  if (activeTab === "view") {
    const filters = { location: locationId };
    if (filterDate) filters.date = format(filterDate, "yyyy-MM-dd");
    if (filterStatus && filterStatus !== "all") filters.status = filterStatus;

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
    } else {
      dispatch(fetchAttendance(filters));
    }
  }

  // Fetch attendance edit requests for Requests tab
  if (activeTab === "requests") {
    dispatch(fetchAttendanceEditRequests({ location: locationId }));
  }
}, [dispatch, locationId, activeTab, monthFilter, yearFilter, filterDate, filterStatus, filterMonth, filterYear]);

  // Polling for attendance edit requests every 30 seconds
  useEffect(() => {
    if (!locationId || activeTab !== "requests") return;
    const interval = setInterval(() => {
      dispatch(fetchAttendanceEditRequests({ location: locationId }))
        .unwrap()
        .then((newRequests) => {
          // Check for status changes and show toast notifications
          const prevRequests = attendanceEditRequests || [];
          newRequests.forEach((newReq) => {
            const prevReq = prevRequests.find((req) => req._id === newReq._id);
            if (prevReq && prevReq.status !== newReq.status) {
              toast.info(
                `Attendance edit request for ${
                  newReq.employee.name
                } on ${format(new Date(newReq.date), "PPP")} has been ${
                  newReq.status
                }`,
                {
                  duration: 5000,
                }
              );
            }
          });
        })
        .catch((err) => {
          console.error("Polling error:", err);
        });
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [dispatch, locationId, activeTab, attendanceEditRequests]);

  useEffect(() => {
    if (error) {
      const parsedError = parseServerError(error);
      setServerError(parsedError);
      toast.error(parsedError.message, {
        action: {
          label: "Dismiss",
          onClick: () => {
            dispatch(reset());
            setServerError(null);
          },
        },
        duration: 10000,
      });
    }
  }, [error, dispatch]);

  useEffect(() => {
    localStorage.setItem("attendanceActiveTab", activeTab);
  }, [activeTab]);

  // Reset form validation when currentStatus changes
  useEffect(() => {
    requestForm.reset({
      requestedStatus: "",
      reason: "",
    });
    requestForm.clearErrors();
  }, [requestDialog.currentStatus, requestForm]);

  // Mark Attendance Handlers
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
      const allEmployeeIds = filteredEmployees.map((emp) => emp._id);
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
    setServerError(null);
    if (!filteredEmployees.length) {
      setServerError({ message: "No employees available", fields: {} });
      toast.error("No employees available", { duration: 5000 });
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
      employeeId: emp._id,
      date: dateStr,
      status: "present",
      location: locationId,
    }));
    setBulkConfirmDialog({
      open: true,
      records: selectedRecords,
      remaining: remainingRecords,
      preview,
    });
  };

  const confirmBulkSubmit = () => {
    const { records: selectedRecords, remaining: remainingRecords } =
      bulkConfirmDialog;
    const allRecords = [...selectedRecords, ...remainingRecords];

    dispatch(bulkMarkAttendance(allRecords))
      .unwrap()
      .then(() => {
        const statusCounts = selectedRecords.reduce((acc, record) => {
          acc[record.status] = (acc[record.status] || 0) + 1;
          return acc;
        }, {});
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
                dispatch(bulkMarkAttendance([]))
                  .unwrap()
                  .then(() => {
                    toast.success("Attendance marking undone");
                    dispatch(
                      fetchMonthlyAttendance({
                        month: monthFilter,
                        year: yearFilter,
                        location: locationId,
                      })
                    );
                  })
                  .catch((err) => {
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
        const selectedMonth = selectedDate.getMonth() + 1;
        const selectedYear = selectedDate.getFullYear();
        setMonthFilter(selectedMonth);
        setYearFilter(selectedYear);
        dispatch(
          fetchMonthlyAttendance({
            month: selectedMonth,
            year: selectedYear,
            location: locationId,
          })
        );
      })
      .catch((err) => {
        const parsedError = parseServerError(err);
        setServerError(parsedError);
        toast.error(parsedError.message, { duration: 10000 });
      })
      .finally(() => {
        setBulkConfirmDialog({
          open: false,
          records: [],
          remaining: [],
          preview: false,
        });
      });
  };

  const handleSubmit = (preview = false) => {
    setServerError(null);
    if (!filteredEmployees.length) {
      setServerError({ message: "No employees available", fields: {} });
      toast.error("No employees available", { duration: 5000 });
      return;
    }
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const attendanceRecords = filteredEmployees.map((emp) => ({
      employeeId: emp._id,
      date: dateStr,
      status: attendanceData[emp._id] || "present",
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
      .then(() => {
        toast.success("Attendance marked successfully", {
          action: {
            label: "Undo",
            onClick: () => {
              dispatch(markAttendance([]))
                .unwrap()
                .then(() => {
                  toast.success("Attendance marking undone");
                  dispatch(
                    fetchMonthlyAttendance({
                      month: monthFilter,
                      year: yearFilter,
                      location: locationId,
                    })
                  );
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
        const selectedMonth = selectedDate.getMonth() + 1;
        const selectedYear = selectedDate.getFullYear();
        setMonthFilter(selectedMonth);
        setYearFilter(selectedYear);
        dispatch(
          fetchMonthlyAttendance({
            month: selectedMonth,
            year: selectedYear,
            location: locationId,
          })
        );
      })
      .catch((err) => {
        const parsedError = parseServerError(err);
        setServerError(parsedError);
        toast.error(parsedError.message, { duration: 10000 });
      })
      .finally(() => {
        setIndividualConfirmDialog({
          open: false,
          records: [],
          preview: false,
        });
      });
  };

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
    });
    requestForm.reset({
      requestedStatus: "",
      reason: "",
    });
  };

  const submitRequestEdit = async (data) => {
    try {
      await requestForm.trigger();
      const errors = Object.entries(requestForm.formState.errors).map(
        ([field, error]) => ({
          field,
          message: error.message || "Invalid input",
        })
      );
      if (errors.length > 0) {
        setServerError({
          message: "Please fix the form errors before submitting",
          fields: errors,
        });
        toast.error("Please fix the form errors before submitting", {
          duration: 5000,
        });
        return;
      }

      await dispatch(
        requestAttendanceEdit({
          employeeId: requestDialog.employeeId,
          location: locationId,
          date: format(requestDialog.date, "yyyy-MM-dd"),
          requestedStatus: data.requestedStatus,
          reason: data.reason,
        })
      ).unwrap();
      toast.success("Edit request submitted successfully", { duration: 5000 });
      setRequestDialog({
        open: false,
        employeeId: null,
        employeeName: "",
        date: null,
        currentStatus: "",
        location: null,
      });
      setServerError(null);
      // Refresh the requests list
      dispatch(fetchAttendanceEditRequests({ location: locationId }));
    } catch (err) {
      const parsedError = parseServerError(err);
      setServerError(parsedError);
      toast.error(parsedError.message, { duration: 10000 });
    }
  };

  const handleMonthChange = (value) => {
    setMonthFilter(parseInt(value));
  };

  const handleYearChange = (value) => {
    setYearFilter(parseInt(value));
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
        const aValue = a.name.toLowerCase();
        const bValue = b.name.toLowerCase();
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(bValue);
      });
  }, [employees, sortOrder, monthlySearch]);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * employeesPerPage;
    return sortedEmployees.slice(startIndex, startIndex + employeesPerPage);
  }, [sortedEmployees, currentPage]);

  const totalPages = Math.ceil(sortedEmployees.length / employeesPerPage);

  const filteredEmployees = useMemo(() => {
    return sortedEmployees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(employeeFilter.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(employeeFilter.toLowerCase())
    );
  }, [sortedEmployees, employeeFilter]);

  const handleDateSelect = (date) => {
    if (date > new Date()) {
      toast.error("Cannot select a future date", { duration: 5000 });
      return;
    }
    setSelectedDate(date);
  };

  // View Attendance Handlers
  const resetFilters = () => {
    setFilterDate(null);
    setFilterStatus("all");
  };

  const handleFilterDateSelect = (selectedDate) => {
    if (selectedDate > new Date()) {
      toast.error("Cannot select a future date", { duration: 5000 });
      return;
    }
    setFilterDate(selectedDate);
  };

const handleViewSort = () => {
  setViewSort(viewSort === "asc" ? "desc" : "asc");
};

const sortedAttendance = useMemo(() => {
  const currentYear = new Date().getFullYear();
  const data =
    filterMonth &&
    filterYear &&
    filterMonth >= 1 &&
    filterMonth <= 12 &&
    filterYear >= 2000 &&
    filterYear <= currentYear
      ? monthlyAttendance
      : attendance;

  if (!data || !Array.isArray(data)) {
    console.warn("No valid attendance data to sort:", { data, filterMonth, filterYear });
    return [];
  }

  const sorted = [...data].sort((a, b) => {
    if (sortConfig.column === "name") {
      const nameA = a.employee?.name || "";
      const nameB = b.employee?.name || "";
      return sortConfig.direction === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    } else {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      // Handle invalid dates by pushing them to the end
      if (isNaN(dateA) && isNaN(dateB)) return 0;
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }
  });

  // Debug: Log sorted records
  console.log("Sorted Attendance:", sorted.slice(0, 3).map(record => ({
    id: record._id,
    date: record.date,
    formattedDate: format(new Date(record.date), "yyyy-MM-dd"),
    name: record.employee?.name,
  })));

  return sorted;
}, [attendance, monthlyAttendance, filterMonth, filterYear, sortConfig]);

const filteredAttendance = useMemo(() => {
  let filtered = sortedAttendance || [];
  if (filterStatus && filterStatus !== "all") {
    filtered = filtered.filter((record) => record.status === filterStatus);
  }
  if (filterDate && filterMonth && filterYear) {
    filtered = filtered.filter((record) => {
      const recordDate = new Date(record.date);
      return (
        recordDate.getMonth() + 1 === filterMonth &&
        recordDate.getFullYear() === filterYear &&
        format(recordDate, "yyyy-MM-dd") === format(filterDate, "yyyy-MM-dd")
      );
    });
  } else if (filterDate) {
    filtered = filtered.filter((record) =>
      format(new Date(record.date), "yyyy-MM-dd") === format(filterDate, "yyyy-MM-dd")
    );
  }
  if (searchQuery) {
    filtered = filtered.filter(
      (record) =>
        record.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.employee?.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Debug: Log filtered records to verify sorting
  console.log("Filtered Attendance:", filtered.slice(0, 3).map(record => ({
    id: record._id,
    date: record.date,
    formattedDate: format(new Date(record.date), "yyyy-MM-dd"),
  })));

  return filtered;
}, [sortedAttendance, filterStatus, filterDate, filterMonth, filterYear, searchQuery]);

  const handleDismissErrors = () => {
    dispatch(reset());
    setServerError(null);
    requestForm.reset();
    toast.dismiss();
  };

const getFilterStateText = () => {
  const parts = [];
  if (filterMonth) parts.push(`Month: ${months.find(m => m.value === filterMonth)?.label || "N/A"}`);
  if (filterYear) parts.push(`Year: ${filterYear}`);
  if (filterDate) parts.push(`Date: ${format(filterDate, "PPP")}`);
  if (filterStatus && filterStatus !== "all") {
    parts.push(`Status: ${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}`);
  }
  if (searchQuery) parts.push(`Search: "${searchQuery}"`);
  return parts.length > 0 ? `Showing records for ${parts.join(", ")}` : "Showing all records";
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
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-accent" />;
      case "rejected":
        return <X className="h-4 w-4 text-error" />;
      default:
        return null;
    }
  };

  // Sort attendance edit requests
  const sortedAttendanceEditRequests = useMemo(() => {
    return [...(attendanceEditRequests || [])].sort((a, b) => {
      const aValue = a.employee?.name?.toLowerCase() || "";
      const bValue = b.employee?.name?.toLowerCase() || "";
      return sortOrder === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [attendanceEditRequests, sortOrder]);

  const handleRequestsSort = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const statusTotals = useMemo(() => {
  return filteredAttendance.reduce(
    (totals, record) => {
      totals[record.status] = (totals[record.status] || 0) + 1;
      return totals;
    },
    { present: 0, absent: 0, leave: 0, "half-day": 0 }
  );
}, [filteredAttendance]);

const handleSort = (column) => {
  setSortConfig((prev) => ({
    column,
    direction:
      prev.column === column && prev.direction === "asc" ? "desc" : "asc",
  }));
};

  return (
    <Layout title="Attendance" role="siteincharge">
      {serverError && (
        <Alert
          variant="destructive"
          className="mb-6 border-error text-error max-w-2xl mx-auto animate-fade-in"
        >
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-base font-bold">Error</AlertTitle>
          <AlertDescription className="text-sm">
            <p>{serverError.message}</p>
            {serverError.fields &&
              Object.keys(serverError.fields).length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto">
                  <ul className="list-disc pl-5 space-y-1">
                    {Object.entries(serverError.fields).map(
                      ([field, message], index) => (
                        <li key={index}>
                          {message} (Field: {field})
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissErrors}
            className="absolute top-2 right-2 text-error hover:bg-accent-hover"
            aria-label="Dismiss error alert"
          >
            <X className="h-5 w-5" />
          </Button>
        </Alert>
      )}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full h-fit grid-cols-3 bg-complementary p-1 border border-complementary rounded-lg shadow-sm animate-fade-in">
          <TabsTrigger
            value="mark"
            className="text-xs sm:text-sm py-3 rounded-md data-[state=active]:bg-accent data-[state=active]:text-complementary hover:bg-accent-hover hover:text-complementary focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Switch to Mark Attendance tab"
            aria-current={activeTab === "mark" ? "page" : undefined}
          >
            Mark Attendance
          </TabsTrigger>
          <TabsTrigger
            value="view"
            className="text-xs sm:text-sm py-3 rounded-md data-[state=active]:bg-accent data-[state=active]:text-complementary hover:bg-accent-hover hover:text-complementary focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Switch to View Attendance tab"
            aria-current={activeTab === "view" ? "page" : undefined}
          >
            View Attendance
          </TabsTrigger>
          <TabsTrigger
            value="requests"
            className="text-xs sm:text-sm py-3 rounded-md data-[state=active]:bg-accent data-[state=active]:text-complementary hover:bg-accent-hover hover:text-complementary focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Switch to Requests tab"
            aria-current={activeTab === "requests" ? "page" : undefined}
          >
            Edit Requests
          </TabsTrigger>
        </TabsList>

        {/* Mark Attendance Tab */}
        <TabsContent value="mark" className="animate-fade-in">
          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          )}
          <div className="space-y-8">
            <Card className="bg-body text-body border border-complementary rounded-lg shadow-sm">
              <CardHeader className="border-b border-complementary">
                <CardTitle className="text-2xl font-bold">
                  Mark Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor="date"
                      className="block text-sm font-medium text-body"
                    >
                      Select Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full sm:w-64 justify-start text-left font-normal bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
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
                          className="border border-complementary rounded-lg"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Label className="text-sm font-medium text-body">
                      Mode:
                    </Label>
                    <div className="flex items-center space-x-2 bg-complementary rounded-md p-1">
                      <Button
                        variant={isBulkMode ? "default" : "ghost"}
                        onClick={() => setIsBulkMode(true)}
                        className={`flex items-center gap-2 ${
                          isBulkMode
                            ? "bg-accent text-complementary"
                            : "text-body"
                        } hover:bg-accent-hover rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent`}
                        aria-label="Switch to bulk marking mode"
                      >
                        <Users className="h-4 w-4" />
                        Bulk
                      </Button>
                      <Button
                        variant={!isBulkMode ? "default" : "ghost"}
                        onClick={() => setIsBulkMode(false)}
                        className={`flex items-center gap-2 ${
                          !isBulkMode
                            ? "bg-accent text-complementary"
                            : "text-body"
                        } hover:bg-accent-hover rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent`}
                        aria-label="Switch to individual marking mode"
                      >
                        <User className="h-4 w-4" />
                        Individual
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="employeeFilter"
                    className="block text-sm font-medium text-body"
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
                      aria-label="Filter employees by name or ID"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-complementary" />
                  </div>
                </div>
                {isBulkMode ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-body">
                          {bulkSelectedEmployees.length} employee
                          {bulkSelectedEmployees.length !== 1 ? "s" : ""}{" "}
                          selected
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm text-muted-foreground underline cursor-help">
                                (Non-selected marked as Present)
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-body text-body border-complementary">
                              Employees not selected will be marked as Present
                              upon submission. If no employees are selected, all
                              will be marked as Present.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => handleBulkSubmit(true)}
                          variant="outline"
                          className="border-accent text-accent hover:bg-accent-hover hover:text-complementary text-sm py-3 px-4 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
                          disabled={loading || empLoading || !locationId}
                          aria-label="Preview bulk attendance changes"
                        >
                          <Eye className="h-5 w-5" />
                          Preview
                        </Button>
                        <Button
                          onClick={() => handleBulkSubmit(false)}
                          className="bg-accent text-complementary hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
                          disabled={loading || empLoading || !locationId}
                          aria-label="Mark attendance for selected employees"
                        >
                          {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-5 w-5" />
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
            checked={bulkSelectedEmployees.length === filteredEmployees.length}
            onCheckedChange={handleSelectAll}
            disabled={!locationId}
            className="h-5 w-5"
            aria-label="Select all employees for bulk marking"
          />
        </TableHead>
        <TableHead className="text-body text-sm">Employee</TableHead>
        <TableHead className="text-body text-sm">Status</TableHead>
        <TableHead className="text-body text-sm">Available Leaves</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {filteredEmployees.map((emp, index) => (
        <TableRow
          key={emp._id}
          className={index % 2 === 0 ? "bg-body" : "bg-complementary"}
        >
          <TableCell className="whitespace-nowrap">
            <Checkbox
              checked={bulkSelectedEmployees.includes(emp._id.toString())}
              onCheckedChange={() => handleBulkSelect(emp._id.toString())}
              disabled={!locationId}
              className="h-5 w-5"
              aria-label={`Select ${emp.name} for bulk marking`}
            />
          </TableCell>
          <TableCell className="text-body text-sm whitespace-nowrap">
            {emp.name} ({emp.employeeId})
          </TableCell>
          <TableCell className="text-body whitespace-nowrap">
            <Select
              value={bulkEmployeeStatuses[emp._id] || "present"}
              onValueChange={(value) => handleBulkStatusChange(emp._id, value)}
              disabled={!bulkSelectedEmployees.includes(emp._id.toString()) || !locationId}
            >
              <SelectTrigger
                className="w-full sm:w-32 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                aria-label={`Select status for ${emp.name}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-body text-body">
                <SelectItem value="present" className="text-sm">Present</SelectItem>
                <SelectItem value="absent" className="text-sm">Absent</SelectItem>
                <SelectItem value="half-day" className="text-sm">Half Day</SelectItem>
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
        <TableHead className="text-body text-sm">Employee</TableHead>
        <TableHead className="text-body text-sm">Status</TableHead>
        <TableHead className="text-body text-sm">Available Leaves</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {filteredEmployees.map((emp, index) => (
        <TableRow
          key={emp._id}
          className={index % 2 === 0 ? "bg-body" : "bg-complementary"}
        >
          <TableCell className="text-body text-sm whitespace-nowrap">
            {emp.name} ({emp.employeeId})
          </TableCell>
          <TableCell className="text-body whitespace-nowrap">
            <Select
              value={attendanceData[emp._id] || "present"}
              onValueChange={(value) => handleAttendanceChange(emp._id, value)}
              disabled={!locationId}
            >
              <SelectTrigger
                className="w-full sm:w-48 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                aria-label={`Select status for ${emp.name}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-body text-body">
                <SelectItem value="present" className="text-sm">Present</SelectItem>
                <SelectItem value="absent" className="text-sm">Absent</SelectItem>
                <SelectItem value="half-day" className="text-sm">Half Day</SelectItem>
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
                    <div className="flex gap-4">
                      <Button
                        onClick={() => handleSubmit(true)}
                        variant="outline"
                        className="border-accent text-accent hover:bg-accent-hover hover:text-complementary text-sm py-3 px-4 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        disabled={
                          loading ||
                          empLoading ||
                          !filteredEmployees.length ||
                          !locationId
                        }
                        aria-label="Preview individual attendance changes"
                      >
                        <Eye className="h-5 w-5" />
                        Preview
                      </Button>
                      <Button
                        onClick={() => handleSubmit(false)}
                        className="bg-accent text-complementary hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        disabled={
                          loading ||
                          empLoading ||
                          !filteredEmployees.length ||
                          !locationId
                        }
                        aria-label="Mark attendance for all employees individually"
                      >
                        {loading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-5 w-5" />
                            Mark Attendance
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-body text-body border border-complementary rounded-md shadow-sm">
              <CardHeader className="border-b border-complementary">
                <CardTitle className="text-2xl font-bold">
                  Monthly Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-3 mb-4">
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
                          disabled={!locationId}
                          aria-label="Select date to filter monthly attendance"
                        >
                          <CalendarIcon className="mr-2 h-5 w-5 text-complementary" />
                          {dateFilter ? (
                            format(dateFilter, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
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
                          disabled={(date) =>
                            date > new Date() ||
                            date < startDate ||
                            date > endDate
                          }
                          className="border border-complementary rounded-md"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1 min-w-[100px]">
                    <Label className="block text-sm font-medium text-body">
                      {" "}
                    </Label>
                    <Button
                      variant="outline"
                      onClick={() => setDateFilter(null)}
                      className="w-full border-accent text-accent hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      disabled={!dateFilter || !locationId}
                      aria-label="Reset date filter"
                    >
                      <RotateCcw className="h-5 w-5" />
                      Reset Date
                    </Button>
                  </div>
                  <div className="flex-1 min-w-[100px]">
                    <Label className="block text-sm font-medium text-body">
                      {" "}
                    </Label>
                    <Button
                      onClick={() => {
                        const doc = new jsPDF();
                        doc.text("Monthly Attendance Report", 14, 20);
                        doc.text(
                          `Month: ${
                            months.find((m) => m.value === monthFilter).label
                          } ${yearFilter}`,
                          14,
                          30
                        );
                        doc.text(
                          `Location: ${
                            user?.locations?.[0]?.name || "Unknown"
                          }`,
                          14,
                          40
                        );

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
                            const record = monthlyAttendance.find(
                              (att) =>
                                att.employee?._id?.toString() ===
                                  emp._id.toString() &&
                                format(new Date(att.date), "yyyy-MM-dd") ===
                                  format(day.date, "yyyy-MM-dd")
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
                            const records = monthlyAttendance.filter(
                              (att) =>
                                format(new Date(att.date), "yyyy-MM-dd") ===
                                format(day.date, "yyyy-MM-dd")
                            );
                            const totals = {
                              present: records.filter(
                                (r) => r.status === "present"
                              ).length,
                              absent: records.filter(
                                (r) => r.status === "absent"
                              ).length,
                              leave: records.filter((r) => r.status === "leave")
                                .length,
                              "half-day": records.filter(
                                (r) => r.status === "half-day"
                              ).length,
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
                          head: [
                            [
                              "ID",
                              "Employee",
                              ...days.map((day) => day.formatted),
                              "Present",
                              "Absent",
                              "Leave",
                              "Half-Day",
                            ],
                          ],
                          body,
                          theme: "striped",
                          styles: { fontSize: 8, cellPadding: 2 },
                          headStyles: { fillColor: [59, 130, 246] },
                        });

                        doc.save(
                          `Attendance_${
                            months.find((m) => m.value === monthFilter).label
                          }_${yearFilter}.pdf`
                        );
                        toast.success("PDF downloaded successfully", {
                          duration: 5000,
                        });
                      }}
                      className="w-full border-accent text-accent hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      disabled={
                        loading ||
                        empLoading ||
                        !locationId ||
                        !sortedEmployees.length
                      }
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
                      disabled={!locationId}
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
                      disabled={!locationId}
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
                {loading || empLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  </div>
                ) : paginatedEmployees.length > 0 ? (
                  <div className="space-y-4">
                    <div className="max-h-[400px] overflow-x-auto relative">
                      <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
                      <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-complementary to-transparent pointer-events-none" />
                      <Table className="border border-complementary">
                        <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                          <TableRow>
                            <TableHead className="text-body text-sm">
                              ID
                            </TableHead>
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
                              <TableHead
                                key={day.formatted}
                                className="text-body text-sm"
                              >
                                {day.dayName}
                                <br />
                                {day.formatted}
                              </TableHead>
                            ))}
                            <TableHead className="text-body text-sm">
                              Present
                            </TableHead>
                            <TableHead className="text-body text-sm">
                              Absent
                            </TableHead>
                            <TableHead className="text-body text-sm">
                              Leave
                            </TableHead>
                            <TableHead className="text-body text-sm">
                              Half-Day
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
                                className={
                                  index % 2 === 0
                                    ? "bg-body"
                                    : "bg-complementary"
                                }
                              >
                                <TableCell className="text-body text-sm">
                                  {emp.employeeId}
                                </TableCell>
                                <TableCell className="text-body text-sm">
                                  {emp.name}
                                </TableCell>
                                {days.map((day) => {
                                  const record = monthlyAttendance.find(
                                    (att) =>
                                      att.employee?._id?.toString() ===
                                        emp._id.toString() &&
                                      format(
                                        new Date(att.date),
                                        "yyyy-MM-dd"
                                      ) === format(day.date, "yyyy-MM-dd")
                                  );
                                  if (record) {
                                    counts[record.status]++;
                                  }
                                  return (
                                    <TableCell
                                      key={day.formatted}
                                      className={`text-sm ${
                                        record ? "cursor-pointer" : ""
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
                                            <TooltipTrigger className="flex items-center gap-1">
                                              {getStatusIcon(record.status)}
                                              <span>
                                                {record.status
                                                  .charAt(0)
                                                  .toUpperCase()}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-body text-body border-complementary">
                                              {record.status
                                                .charAt(0)
                                                .toUpperCase() +
                                                record.status.slice(1)}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : (
                                        "-"
                                      )}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-body text-sm">
                                  {counts.present}
                                </TableCell>
                                <TableCell className="text-body text-sm">
                                  {counts.absent}
                                </TableCell>
                                <TableCell className="text-body text-sm">
                                  {counts.leave}
                                </TableCell>
                                <TableCell className="text-body text-sm">
                                  {counts["half-day"]}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="bg-accent font-semibold border-t-2 border-complementary">
                            <TableCell className="text-complementary text-sm"></TableCell>
                            <TableCell className="text-complementary text-sm">
                              Daily Totals
                            </TableCell>
                            {days.map((day, index) => {
                              const records = monthlyAttendance.filter(
                                (att) =>
                                  format(new Date(att.date), "yyyy-MM-dd") ===
                                  format(day.date, "yyyy-MM-dd")
                              );
                              const totals = {
                                present: records.filter(
                                  (r) => r.status === "present"
                                ).length,
                                absent: records.filter(
                                  (r) => r.status === "absent"
                                ).length,
                                leave: records.filter(
                                  (r) => r.status === "leave"
                                ).length,
                                "half-day": records.filter(
                                  (r) => r.status === "half-day"
                                ).length,
                              };
                              return (
                                <TableCell
                                  key={day.formatted}
                                  className="text-complementary text-sm"
                                >
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger className="flex items-center gap-1">
                                        <span className="underline decoration-dotted cursor-help">
                                          {totals.present +
                                            totals.absent +
                                            totals.leave +
                                            totals["half-day"]}
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
                                  const record = monthlyAttendance.find(
                                    (att) =>
                                      att.employee?._id?.toString() ===
                                        emp._id.toString() &&
                                      format(
                                        new Date(att.date),
                                        "yyyy-MM-dd"
                                      ) === format(day.date, "yyyy-MM-dd")
                                  );
                                  if (record) counts[record.status]++;
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
                                  const record = monthlyAttendance.find(
                                    (att) =>
                                      att.employee?._id?.toString() ===
                                        emp._id.toString() &&
                                      format(
                                        new Date(att.date),
                                        "yyyy-MM-dd"
                                      ) === format(day.date, "yyyy-MM-dd")
                                  );
                                  if (record) counts[record.status]++;
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
                                  const record = monthlyAttendance.find(
                                    (att) =>
                                      att.employee?._id?.toString() ===
                                        emp._id.toString() &&
                                      format(
                                        new Date(att.date),
                                        "yyyy-MM-dd"
                                      ) === format(day.date, "yyyy-MM-dd")
                                  );
                                  if (record) counts[record.status]++;
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
                                  const record = monthlyAttendance.find(
                                    (att) =>
                                      att.employee?._id?.toString() ===
                                        emp._id.toString() &&
                                      format(
                                        new Date(att.date),
                                        "yyyy-MM-dd"
                                      ) === format(day.date, "yyyy-MM-dd")
                                  );
                                  if (record) counts[record.status]++;
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
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
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
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
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
          </div>
        </TabsContent>

        {/* View Attendance Tab */}
        {/* View Attendance Tab */}
<TabsContent value="view" className="animate-fade-in">
  {loading && (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  )}
  <div className="space-y-8">
    <Card className="bg-body text-body border border-complementary max-w-4xl mx-auto rounded-lg shadow-sm">
      <CardHeader className="border-b border-complementary">
        <CardTitle className="text-2xl font-bold">Filter Attendance</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label htmlFor="filterMonth" className="block text-sm font-semibold text-body">
              Month
            </label>
            <Select
              value={filterMonth?.toString() || ""}
              onValueChange={(value) => setFilterMonth(value ? parseInt(value) : null)}
              disabled={!locationId}
            >
              <SelectTrigger
                id="filterMonth"
                className={`w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm ${filterMonth ? "bg-complementary" : ""}`}
                aria-label="Select month to filter attendance records"
              >
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent className="bg-body text-body">
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()} className="text-sm">
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="filterYear" className="block text-sm font-semibold text-body">
              Year
            </label>
            <Select
              value={filterYear?.toString() || ""}
              onValueChange={(value) => setFilterYear(value ? parseInt(value) : null)}
              disabled={!locationId}
            >
              <SelectTrigger
                id="filterYear"
                className={`w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm ${filterYear ? "bg-complementary" : ""}`}
                aria-label="Select year to filter attendance records"
              >
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent className="bg-body text-body">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()} className="text-sm">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="filterDate" className="block text-sm font-semibold text-body">
              Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal bg-body text-body border-complementary hover:bg-accent-hover hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm ${filterDate ? "bg-complementary" : ""}`}
                  disabled={!locationId}
                  aria-label="Select date to filter attendance records"
                >
                  <CalendarIcon className="mr-2 h-5 w-5 text-complementary" />
                  {filterDate ? format(filterDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-body text-body">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={handleFilterDateSelect}
                  initialFocus
                  disabled={(date) => date > new Date()}
                  className="border border-complementary rounded-lg"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <label htmlFor="filterStatus" className="block text-sm font-semibold text-body">
              Status
            </label>
            <Select
              value={filterStatus}
              onValueChange={setFilterStatus}
              disabled={!locationId}
            >
              <SelectTrigger
                id="filterStatus"
                className={`w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm ${filterStatus !== "all" ? "bg-complementary" : ""}`}
                aria-label="Select status to filter attendance records"
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-body text-body">
                <SelectItem value="all" className="text-sm">All Statuses</SelectItem>
                <SelectItem value="present" className="text-sm">Present</SelectItem>
                <SelectItem value="absent" className="text-sm">Absent</SelectItem>
                <SelectItem value="leave" className="text-sm">Leave</SelectItem>
                <SelectItem value="half-day" className="text-sm">Half Day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setFilterDate(null);
              setFilterStatus("all");
              setFilterMonth(null);
              setFilterYear(null);
              setSearchQuery("");
            }}
            className={`text-sm py-3 px-4 flex items-center gap-2 ${filterDate || filterStatus !== "all" || filterMonth || filterYear || searchQuery ? "bg-accent text-complementary hover:bg-accent-hover" : "border-accent text-accent hover:bg-accent-hover"} focus:outline-none focus:ring-2 focus:ring-accent`}
            disabled={!locationId || (!filterDate && filterStatus === "all" && !filterMonth && !filterYear && !searchQuery)}
            aria-label="Reset attendance filters"
          >
            <RotateCcw className="h-5 w-5" />
            Reset Filters
          </Button>
        </div>
        <p className="text-sm text-body mt-4">{getFilterStateText()}</p>
      </CardContent>
    </Card>
    {/* Attendance Records Section */}

<Card className="bg-body text-body border border-complementary rounded-lg shadow-sm">
  <CardHeader className="border-b border-complementary flex flex-row justify-between items-center">
    <CardTitle className="text-2xl font-bold">Attendance Records</CardTitle>
    <div className="flex items-center gap-3">
      <div className="relative">
        <Input
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-48 pl-10 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
          aria-label="Search attendance records by employee name or ID"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-complementary" />
      </div>
      <Button
        onClick={() => {
          const doc = new jsPDF();
          doc.text("Attendance Records Report", 14, 20);
          doc.text(`Location: ${user?.locations?.[0]?.name || "Unknown"}`, 14, 30);
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
            head: [["ID", "Employee Name", "Status", "Date"]],
            body,
            theme: "striped",
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [59, 130, 246] },
          });

          doc.save(`Attendance_Records_${format(new Date(), "yyyy-MM-dd")}.pdf`);
          toast.success("PDF downloaded successfully", { duration: 5000 });
        }}
        className="bg-accent text-complementary hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2"
        disabled={loading || !filteredAttendance.length}
        aria-label="Download attendance records as PDF"
      >
        <Download className="h-4 w-4" />
        Download PDF
      </Button>
    </div>
  </CardHeader>
  <CardContent className="p-6">
    {loading ? (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    ) : filteredAttendance.length > 0 ? (
      <div className="max-h-[500px] overflow-y-auto overflow-x-auto relative border rounded-md">
        <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-complementary to-transparent pointer-events-none" />
        <Table className="border border-complementary">
          <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
            <TableRow>
              <TableHead className="text-body text-sm">ID</TableHead>
              <TableHead className="text-body text-sm">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("name")}
                  className="flex items-center space-x-1"
                  aria-label="Sort by employee name"
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
              <TableHead className="text-body text-sm">Status</TableHead>
              <TableHead className="text-body text-sm">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("date")}
                  className="flex items-center space-x-1"
                  aria-label="Sort by date"
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
            {filteredAttendance.map((record, index) => (
              <TableRow
                key={record._id}
                className={index % 2 === 0 ? "bg-body" : "bg-complementary"}
              >
                <TableCell className="text-body text-sm">
                  {record.employee?.employeeId || "N/A"}
                </TableCell>
                <TableCell className="text-body text-sm">
                  {record.employee?.name || "Unknown"}
                </TableCell>
                <TableCell className="text-sm">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        {getStatusIcon(record.status)}
                        <span>{record.status.charAt(0).toUpperCase()}</span>
                      </TooltipTrigger>
                      <TooltipContent className="bg-body text-body border-complementary">
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-body text-sm">
                  {isNaN(new Date(record.date)) ? "Invalid Date" : format(new Date(record.date), "PPP")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-complementary sticky bottom-0">
            <TableRow>
              <TableCell colSpan={2} className="text-body text-sm font-semibold">
                Totals
              </TableCell>
              <TableCell className="text-body text-sm">
                Present: {statusTotals.present} <br />
                Absent: {statusTotals.absent} <br />
                Leave: {statusTotals.leave} <br />
                Half-Day: {statusTotals["half-day"]}
              </TableCell>
              <TableCell className="text-body text-sm"></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    ) : (
      <p className="text-body text-sm">No attendance records found for the selected filters.</p>
    )}
  </CardContent>
</Card>
   
  </div>
</TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="animate-fade-in">
          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          )}
          <div className="space-y-8">
            <Card className="bg-body text-body border border-complementary rounded-lg shadow-sm">
              <CardHeader className="border-b border-complementary">
                <CardTitle className="text-2xl font-bold">
                  Attendance Edit Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  </div>
                ) : sortedAttendanceEditRequests?.length > 0 ? (
                 <div className="max-h-[400px] overflow-y-auto overflow-x-auto border border-complementary rounded-md shadow-sm relative">
  <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
  <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-complementary to-transparent pointer-events-none" />
  <Table className="border border-complementary">
    <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
      <TableRow>
        <TableHead className="text-body text-sm">
          <Button
            variant="ghost"
            onClick={handleRequestsSort}
            className="flex items-center space-x-1"
          >
            Employee Name
            <ArrowUpDown className="h-5 w-5" />
          </Button>
        </TableHead>
        <TableHead className="text-body text-sm">Date</TableHead>
        <TableHead className="text-body text-sm">Current Status</TableHead>
        <TableHead className="text-body text-sm">Requested Status</TableHead>
        <TableHead className="text-body text-sm">Reason</TableHead>
        <TableHead className="text-body text-sm">Status</TableHead>
        <TableHead className="text-body text-sm">Admin Response</TableHead>
        <TableHead className="text-body text-sm">Requested On</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {sortedAttendanceEditRequests.map((request, index) => (
        <TableRow
          key={request._id}
          className={index % 2 === 0 ? "bg-body" : "bg-complementary"}
        >
          <TableCell className="text-body text-sm">
            {request.employee?.name || "Unknown"} ({request.employee?.employeeId || "N/A"})
          </TableCell>
          <TableCell className="text-body text-sm">
            {format(new Date(request.date), "PPP")}
          </TableCell>
          <TableCell className="text-body text-sm">
            {request.currentStatus !== 'N/A'
              ? request.currentStatus.charAt(0).toUpperCase() + request.currentStatus.slice(1)
              : 'N/A'}
          </TableCell>
          <TableCell className="text-body text-sm">
            {request.requestedStatus.charAt(0).toUpperCase() + request.requestedStatus.slice(1)}
          </TableCell>
          <TableCell className="text-body text-sm">{request.reason}</TableCell>
          <TableCell className="text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1">
                  {getStatusIcon(request.status)}
                  <span>{request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
                </TooltipTrigger>
                <TooltipContent className="bg-body text-body border-complementary">
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TableCell>
          <TableCell className="text-body text-sm">{request.adminResponse || "-"}</TableCell>
          <TableCell className="text-body text-sm">
            {format(new Date(request.createdAt), "PPP")}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
                ) : (
                  <p className="text-body text-sm">
                    No attendance edit requests found.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-lg max-h-[80vh] h-full overflow-hidden flex flex-col rounded-lg animate-fade-in">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {bulkConfirmDialog.preview ? (
                <>
                  <Eye className="h-5 w-5 text-accent" />
                  Preview Bulk Attendance
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  Confirm Bulk Attendance
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm mt-2">
              {bulkConfirmDialog.preview
                ? bulkConfirmDialog.records.length > 0
                  ? `Review the attendance changes for ${bulkConfirmDialog.records.length} employee(s) and ${bulkConfirmDialog.remaining.length} to be marked as Present.`
                  : `Review the attendance changes: all ${bulkConfirmDialog.remaining.length} employee(s) will be marked as Present.`
                : bulkConfirmDialog.records.length > 0
                ? `Are you sure you want to mark attendance for ${bulkConfirmDialog.records.length} employee(s) with the selected statuses and ${bulkConfirmDialog.remaining.length} employee(s) as Present?`
                : `Are you sure you want to mark all ${bulkConfirmDialog.remaining.length} employee(s) as Present?`}
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
          <DialogFooter className="shrink-0 px-6 py-4 border-t border-complementary flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setBulkConfirmDialog({
                  open: false,
                  records: [],
                  remaining: [],
                  preview: false,
                })
              }
              className="border-complementary text-body hover:bg-complementary text-sm py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={loading}
            >
              {bulkConfirmDialog.preview ? "Close" : "Cancel"}
            </Button>
            {!bulkConfirmDialog.preview && (
              <Button
                type="button"
                onClick={confirmBulkSubmit}
                className="bg-accent text-complementary hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={loading}
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
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-lg max-h-[80vh] h-full overflow-hidden flex flex-col rounded-lg animate-fade-in">
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
          <DialogFooter className="shrink-0 px-6 py-4 border-t border-complementary flex justify-end gap-3">
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
              className="border-complementary text-body hover:bg-complementary text-sm py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={loading}
            >
              {individualConfirmDialog.preview ? "Close" : "Cancel"}
            </Button>
            {!individualConfirmDialog.preview && (
              <Button
                type="button"
                onClick={confirmIndividualSubmit}
                className="bg-accent text-complementary hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={loading}
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
          })
        }
      >
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-lg rounded-lg animate-fade-in">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit className="h-5 w-5 text-accent" />
              Request Attendance Edit
            </DialogTitle>
            <DialogDescription className="text-sm mt-2">
              Request to change the attendance status for{" "}
              {requestDialog.employeeName} on{" "}
              {requestDialog.date ? format(requestDialog.date, "PPP") : ""}.
              Current status:{" "}
              {requestDialog.currentStatus.charAt(0).toUpperCase() +
                requestDialog.currentStatus.slice(1)}
              .
            </DialogDescription>
          </DialogHeader>
          <Form {...requestForm}>
            <form
              onSubmit={requestForm.handleSubmit(submitRequestEdit)}
              className="space-y-6"
            >
              <div className="space-y-4">
                <FormField
                  control={requestForm.control}
                  name="requestedStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-body">
                        Requested Status
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!locationId}
                          aria-label="Select requested attendance status"
                        >
                          <SelectTrigger className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent className="bg-body text-body">
                            <SelectItem
                              value="present"
                              className="text-sm"
                              disabled={
                                requestDialog.currentStatus === "present"
                              }
                            >
                              Present
                            </SelectItem>
                            <SelectItem
                              value="absent"
                              className="text-sm"
                              disabled={
                                requestDialog.currentStatus === "absent"
                              }
                            >
                              Absent
                            </SelectItem>
                            <SelectItem
                              value="leave"
                              className="text-sm"
                              disabled={requestDialog.currentStatus === "leave"}
                            >
                              Leave
                            </SelectItem>
                            <SelectItem
                              value="half-day"
                              className="text-sm"
                              disabled={
                                requestDialog.currentStatus === "half-day"
                              }
                            >
                              Half Day
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage className="text-error text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={requestForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-body">
                        Reason for Edit
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Explain why this change is needed..."
                          className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                          disabled={!locationId}
                          aria-label="Enter reason for attendance edit request"
                        />
                      </FormControl>
                      <FormMessage className="text-error text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="flex justify-end gap-3">
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
                    })
                  }
                  className="border-complementary text-body hover:bg-complementary text-sm py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-accent text-complementary hover:bg-accent-hover text-sm py-3 px-4 flex items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={loading || !locationId}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Submit Request
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Attendance;
