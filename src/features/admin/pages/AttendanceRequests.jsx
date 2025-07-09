import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAttendanceRequests,
  handleAttendanceRequest,
  reset as resetAttendance,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarIcon, Loader2, Search, ArrowUpDown, Check, X, Eye, Clock4, CheckCircle2, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";

const getStatusIcon = (status) => {
  switch (status) {
    case "pending":
      return <Clock4 className="h-4 w-4 text-yellow-500" />;
    case "approved":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "rejected":
      return <X className="h-4 w-4 text-red-500" />;
    case "present":
      return <Check className="h-4 w-4 text-green-500" />;
    case "absent":
      return <X className="h-4 w-4 text-red-500" />;
    case "leave":
    case "half-day":
      return <Eye className="h-4 w-4 text-yellow-500" />;
    default:
      return null;
  }
};

const AttendanceRequests = ({ locationId }) => {
  const dispatch = useDispatch();
  const {
    attendanceRequests,
    loading: reqLoading,
    error: attError,
  } = useSelector((state) => state.adminAttendance);
  const {
    employees,
    loading: empLoading,
    error: empError,
  } = useSelector((state) => state.adminEmployees);
  const { locations, loading: locLoading } = useSelector(
    (state) => state.adminLocations
  );

  const [locationFilter, setLocationFilter] = useState(locationId || "all");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterDate, setFilterDate] = useState(null);
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth());
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear());
  const [sortConfig, setSortConfig] = useState({
    column: "date",
    direction: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [reasonDialog, setReasonDialog] = useState({
    open: false,
    reason: "",
    employeeName: "",
    date: "",
  });
  const [actionDialog, setActionDialog] = useState({
    open: false,
    requestId: null,
    action: "",
    employeeName: "",
    date: "",
    requestedStatus: "",
    isoDate: "",
  });
  const recordsPerPage = 5; // Fixed page size of 5

  // Handle errors
  useEffect(() => {
    if (attError || empError) {
      toast.error(attError || empError || "Failed to load data", { duration: 5000 });
      dispatch(resetAttendance());
    }
  }, [attError, empError, dispatch]);

  // Fetch data
  useEffect(() => {
    const filters = {};
    if (locationFilter !== "all") filters.location = locationFilter;
    if (filterDate) filters.date = format(filterDate, "yyyy-MM-dd");
    if (statusFilter !== "all") filters.status = statusFilter;
    dispatch(fetchAttendanceRequests(filters));
    if (locationFilter !== "all") {
      dispatch(fetchEmployees({ location: locationFilter }));
    }
  }, [dispatch, locationFilter, filterDate, statusFilter]);

  // Sorting logic
  const sortedRequests = useMemo(() => {
    if (!attendanceRequests || !Array.isArray(attendanceRequests)) return [];
    return [...attendanceRequests].sort((a, b) => {
      let aValue, bValue;
      if (sortConfig.column === "employee") {
        aValue = a.employee?.name?.toLowerCase() || "";
        bValue = b.employee?.name?.toLowerCase() || "";
      } else if (sortConfig.column === "date") {
        aValue = new Date(a.date);
        bValue = new Date(b.date);
      } else if (sortConfig.column === "currentStatus") {
        aValue = a.currentStatus || "";
        bValue = b.currentStatus || "";
      } else if (sortConfig.column === "requestedStatus") {
        aValue = a.requestedStatus || "";
        bValue = b.requestedStatus || "";
      } else {
        aValue = a.status || "";
        bValue = b.status || "";
      }
      if (sortConfig.column === "date") {
        if (isNaN(aValue)) return 1;
        if (isNaN(bValue)) return -1;
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }
      return sortConfig.direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [attendanceRequests, sortConfig]);

  // Filtering logic
  const filteredRequests = useMemo(() => {
    return sortedRequests.filter((request) => {
      const matchesLocation =
        locationFilter === "all" ||
        request.location?._id?.toString() === locationFilter;
      const matchesEmployee =
        !employeeFilter ||
        request.employee?.name
          ?.toLowerCase()
          .includes(employeeFilter.toLowerCase()) ||
        request.employee?.employeeId
          ?.toLowerCase()
          .includes(employeeFilter.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        request.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchesDate =
        !filterDate ||
        format(new Date(request.date), "yyyy-MM-dd") === format(filterDate, "yyyy-MM-dd");
      return matchesLocation && matchesEmployee && matchesStatus && matchesDate;
    });
  }, [sortedRequests, locationFilter, employeeFilter, statusFilter, filterDate]);

  // Pagination
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    return filteredRequests.slice(startIndex, startIndex + recordsPerPage);
  }, [filteredRequests, currentPage]);

  const totalPages = Math.ceil(filteredRequests.length / recordsPerPage);

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
    return filteredRequests.reduce(
      (totals, request) => ({
        ...totals,
        [request.status]: (totals[request.status] || 0) + 1,
      }),
      { pending: 0, approved: 0, rejected: 0 }
    );
  }, [filteredRequests]);

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

  const handleRequestAction = (
    requestId,
    action,
    employeeName,
    date,
    requestedStatus,
    isoDate
  ) => {
    setActionDialog({
      open: true,
      requestId,
      action,
      employeeName,
      date,
      requestedStatus,
      isoDate,
    });
  };

  const confirmRequestAction = () => {
    const { requestId, action, isoDate } = actionDialog;
    if (!isoDate) {
      toast.error("Date not found for this request", { duration: 5000 });
      return;
    }
    dispatch(
      handleAttendanceRequest({ id: requestId, status: action, date: isoDate })
    )
      .unwrap()
      .then(() => {
        toast.success(`Request ${action} successfully`, { duration: 5000 });
        dispatch(fetchAttendanceRequests({
          location: locationFilter !== "all" ? locationFilter : undefined,
          date: filterDate ? format(filterDate, "yyyy-MM-dd") : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        }));
      })
      .catch((err) => {
        toast.error(err || "Failed to handle request", { duration: 5000 });
      })
      .finally(() =>
        setActionDialog({
          open: false,
          requestId: null,
          action: "",
          employeeName: "",
          date: "",
          requestedStatus: "",
          isoDate: "",
        })
      );
  };

  return (
    <div className="space-y-8 p-4 animate-fade-in">
      {reqLoading && (
        <div className="fixed inset-0 bg-overlay flex justify-center items-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}
      <Card className="bg-body text-body border border-complementary max-w-4xl mx-auto rounded-lg shadow-md">
        <CardHeader className="border-b border-complementary">
          <CardTitle className="text-2xl font-bold text-body">
            Filter Attendance Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2 min-w-[160px] flex-1">
              <Label htmlFor="locationFilter" className="text-sm font-semibold text-body">
                Location
              </Label>
              <Select
                value={locationFilter}
                onValueChange={(value) => {
                  setLocationFilter(value);
                  setFilterDate(null);
                  setCurrentPage(1);
                }}
                disabled={locLoading}
              >
                <SelectTrigger
                  id="locationFilter"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                  aria-label="Filter requests by location"
                >
                  <SelectValue placeholder="All Locations" />
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
            <div className="space-y-2 min-w-[160px] flex-1">
              <Label htmlFor="employeeFilter" className="text-sm font-semibold text-body">
                Employee
              </Label>
              <div className="relative">
                <Input
                  id="employeeFilter"
                  placeholder="Search by name or ID..."
                  value={employeeFilter}
                  onChange={(e) => {
                    setEmployeeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-64 pl-10 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                  aria-label="Filter requests by employee name or ID"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-complementary" />
              </div>
            </div>
            <div className="space-y-2 min-w-[120px] flex-1">
              <Label htmlFor="statusFilter" className="text-sm font-semibold text-body">
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
                disabled={locLoading}
              >
                <SelectTrigger
                  id="statusFilter"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                  aria-label="Filter requests by status"
                >
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body border-complementary">
                  <SelectItem value="all" className="text-sm hover:bg-accent-light">
                    All Statuses
                  </SelectItem>
                  <SelectItem value="pending" className="text-sm hover:bg-accent-light">
                    Pending
                  </SelectItem>
                  <SelectItem value="approved" className="text-sm hover:bg-accent-light">
                    Approved
                  </SelectItem>
                  <SelectItem value="rejected" className="text-sm hover:bg-accent-light">
                    Rejected
                  </SelectItem>
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
                    disabled={locLoading}
                    aria-label="Select date to filter attendance requests"
                  >
                    <CalendarIcon className="mr-2 h-5 w-5 text-complementary flex-shrink-0" />
                    <span className="truncate">
                      {filterDate ? format(filterDate, "PPP") : "Pick a date or view all dates"}
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
                      aria-label="Show all dates"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Show All Dates
                    </Button>
                    <Calendar
                      mode="single"
                      selected={filterDate}
                      onSelect={handleDateSelect}
                      month={new Date(displayYear, displayMonth)}
                      onMonthChange={(newMonth) => {
                        setDisplayMonth(newMonth.getMonth());
                        setDisplayYear(newMonth.getFullYear());
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
          </div>
        </CardContent>
      </Card>
      <Card className="bg-body text-body border border-complementary rounded-lg shadow-md">
        <CardHeader className="border-b border-complementary">
          <CardTitle className="text-2xl font-bold text-body">
            Attendance Edit Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {reqLoading || empLoading || locLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : filteredRequests.length > 0 ? (
            <div className="space-y-4">
              <div className="max-h-[400px] overflow-x-auto relative">
                <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-complementary to-transparent pointer-events-none" />
                <Table className="border border-complementary min-w-[1000px]">
                  <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                    <TableRow>
                      <TableHead className="text-body text-sm text-center px-2">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("employee")}
                          className="flex items-center space-x-1 text-body hover:bg-accent-light mx-auto"
                          aria-label={`Sort by employee name ${sortConfig.direction === "asc" ? "descending" : "ascending"}`}
                        >
                          Employee
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        Location
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("date")}
                          className="flex items-center space-x-1 text-body hover:bg-accent-light mx-auto"
                          aria-label={`Sort by date ${sortConfig.direction === "asc" ? "descending" : "ascending"}`}
                        >
                          Date
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("currentStatus")}
                          className="flex items-center space-x-1 text-body hover:bg-accent-light mx-auto"
                          aria-label={`Sort by current status ${sortConfig.direction === "asc" ? "descending" : "ascending"}`}
                        >
                          Current Status
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("requestedStatus")}
                          className="flex items-center space-x-1 text-body hover:bg-accent-light mx-auto"
                          aria-label={`Sort by requested status ${sortConfig.direction === "asc" ? "descending" : "ascending"}`}
                        >
                          Requested Status
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        Reason
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("status")}
                          className="flex items-center space-x-1 text-body hover:bg-accent-light mx-auto"
                          aria-label={`Sort by status ${sortConfig.direction === "asc" ? "descending" : "ascending"}`}
                        >
                          Status
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.map((req, index) => (
                      <TableRow
                        key={req._id}
                        className={`${
                          index % 2 === 0 ? "bg-body" : "bg-complementary-light"
                        } hover:bg-accent-light cursor-pointer animate-slide-in-row`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        onClick={() =>
                          setReasonDialog({
                            open: true,
                            reason: req.reason,
                            employeeName: req.employee?.name || "Unknown",
                            date: format(new Date(req.date), "PPP"),
                          })
                        }
                      >
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap max-w-[200px] truncate">
                          {req.employee?.name || "Unknown"} ({req.employee?.employeeId || "N/A"})
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap">
                          {req.location?.name || "N/A"}
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap">
                          {format(new Date(req.date), "PPP")}
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center justify-center gap-1">
                                  {getStatusIcon(req.currentStatus)}
                                  {req.currentStatus ? req.currentStatus.charAt(0).toUpperCase() : "N/A"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-body text-body border-complementary text-sm">
                                {req.currentStatus ? req.currentStatus.charAt(0).toUpperCase() + req.currentStatus.slice(1) : "N/A"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center justify-center gap-1">
                                  {getStatusIcon(req.requestedStatus)}
                                  {req.requestedStatus.charAt(0).toUpperCase()}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-body text-body border-complementary text-sm">
                                {req.requestedStatus.charAt(0).toUpperCase() + req.requestedStatus.slice(1)}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2">
                          <div className="flex justify-center">
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() =>
                                setReasonDialog({
                                  open: true,
                                  reason: req.reason,
                                  employeeName: req.employee?.name || "Unknown",
                                  date: format(new Date(req.date), "PPP"),
                                })
                              }
                              className="text-accent hover:underline p-0"
                              aria-label={`View reason for ${req.employee?.name}'s request`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center justify-center gap-1">
                                  {getStatusIcon(req.status)}
                                  {req.status.charAt(0).toUpperCase()}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-body text-body border-complementary text-sm">
                                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap">
                          {req.status === "pending" ? (
                            <div className="flex justify-center space-x-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestAction(
                                    req._id,
                                    "approved",
                                    req.employee?.name || "Unknown",
                                    format(new Date(req.date), "PPP"),
                                    req.requestedStatus,
                                    req.date
                                  );
                                }}
                                className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-3 flex items-center gap-1 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                                disabled={reqLoading}
                                aria-label={`Approve request for ${req.employee?.name}`}
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestAction(
                                    req._id,
                                    "rejected",
                                    req.employee?.name || "Unknown",
                                    format(new Date(req.date), "PPP"),
                                    req.requestedStatus,
                                    req.date
                                  );
                                }}
                                className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-3 flex items-center gap-1 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                                disabled={reqLoading}
                                aria-label={`Reject request for ${req.employee?.name}`}
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span>-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="bg-complementary sticky bottom-0">
                    <TableRow>
                      <TableCell colSpan={4} className="text-body text-sm font-semibold text-center px-2">
                        Totals
                      </TableCell>
                      <TableCell className="text-body text-sm text-center px-2">
                        Pending: {statusTotals.pending} <br />
                        Approved: {statusTotals.approved} <br />
                        Rejected: {statusTotals.rejected}
                      </TableCell>
                      <TableCell colSpan={3} className="text-body text-sm text-center px-2"></TableCell>
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
            <p className="text-body text-sm text-center py-4">
              No attendance edit requests available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Reason Dialog */}
      <Dialog
        open={reasonDialog.open}
        onOpenChange={(open) =>
          !open &&
          setReasonDialog({
            open: false,
            reason: "",
            employeeName: "",
            date: "",
          })
        }
      >
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-md max-h-[70vh] overflow-hidden flex flex-col rounded-lg animate-scale-in">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle className="text-xl font-bold text-body flex items-center gap-2">
              <Eye className="h-5 w-5 text-accent" />
              Reason for Request
            </DialogTitle>
            <DialogDescription className="text-sm mt-2 text-body">
              Request by {reasonDialog.employeeName} on {reasonDialog.date}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Textarea
              value={reasonDialog.reason}
              readOnly
              className="w-full bg-complementary-light text-body border-complementary h-32 text-sm resize-none cursor-not-allowed"
              aria-label="Reason for attendance request"
            />
          </div>
          <DialogFooter className="shrink-0 px-6 py-4 border-t border-complementary flex justify-end">
            <Button
              variant="outline"
              onClick={() =>
                setReasonDialog({
                  open: false,
                  reason: "",
                  employeeName: "",
                  date: "",
                })
              }
              className="border-accent text-accent hover:bg-accent-light text-sm py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Close reason dialog"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) =>
          !open &&
          setActionDialog({
            open: false,
            requestId: null,
            action: "",
            employeeName: "",
            date: "",
            requestedStatus: "",
            isoDate: "",
          })
        }
      >
        <DialogContent className="bg-body text-body border-complementary max-w-[90vw] sm:max-w-md max-h-[70vh] overflow-hidden flex flex-col rounded-lg animate-scale-in">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle className="text-xl font-bold text-body flex items-center gap-2">
              {actionDialog.action === "approved" ? (
                <>
                  <Check className="h-5 w-5 text-accent" />
                  Approve Request
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-accent" />
                  Reject Request
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm mt-2 text-body">
              Are you sure you want to {actionDialog.action} the request for{" "}
              {actionDialog.employeeName} on {actionDialog.date} to mark as{" "}
              {actionDialog.requestedStatus}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="shrink-0 px-6 py-4 border-t border-complementary flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() =>
                setActionDialog({
                  open: false,
                  requestId: null,
                  action: "",
                  employeeName: "",
                  date: "",
                  requestedStatus: "",
                  isoDate: "",
                })
              }
              className="border-accent text-accent hover:bg-accent-light text-sm py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={reqLoading}
              aria-label="Cancel action"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRequestAction}
              className="bg-accent text-body hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={reqLoading}
              aria-label={`${actionDialog.action} request`}
            >
              {reqLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : actionDialog.action === "approved" ? (
                "Approve"
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceRequests;