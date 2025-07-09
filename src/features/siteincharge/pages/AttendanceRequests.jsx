import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees } from "../redux/employeeSlice";
import { fetchAttendanceEditRequests, reset } from "../redux/attendanceSlice";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Search, ArrowUpDown, Clock4, CheckCircle2, X, CalendarIcon, Eye, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const getStatusIcon = (status) => {
  switch (status) {
    case "pending":
      return <Clock4 className="h-4 w-4 text-yellow-500" />;
    case "approved":
      return <CheckCircle2 className="h-4 w-4 text-accent" />;
    case "rejected":
      return <X className="h-4 w-4 text-error" />;
    default:
      return null;
  }
};

const AttendanceRequests = ({ locationId }) => {
  const dispatch = useDispatch();
  const { employees, loading: empLoading } = useSelector(
    (state) => state.siteInchargeEmployee
  );
  const {
    attendanceEditRequests,
    loading: reqLoading,
    error,
  } = useSelector((state) => state.siteInchargeAttendance);

  const [employeeFilter, setEmployeeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterDate, setFilterDate] = useState(null);
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth());
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear());
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [reasonDialog, setReasonDialog] = useState({
    open: false,
    reason: "",
    employeeName: "",
    date: "",
  });
  const recordsPerPage = 5;

  // Handle error display
  useEffect(() => {
    if (error) {
      toast.error(error, { duration: 5000 });
      dispatch(reset());
    }
  }, [error, dispatch]);

  // Fetch initial data
  useEffect(() => {
    if (!locationId) {
      return;
    }
    dispatch(fetchEmployees({ location: locationId }));
    const filters = { location: locationId };
    if (filterDate) filters.date = format(filterDate, "yyyy-MM-dd");
    dispatch(fetchAttendanceEditRequests(filters));
  }, [dispatch, locationId, filterDate]);

  // Log requests for debugging
  useEffect(() => {
    console.log("AttendanceRequests updated:", attendanceEditRequests);
  }, [attendanceEditRequests]);

  const sortedAttendanceEditRequests = useMemo(() => {
    return [...(attendanceEditRequests || [])].sort((a, b) => {
      const aValue = a.employee?.name?.toLowerCase() || "";
      const bValue = b.employee?.name?.toLowerCase() || "";
      return sortOrder === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [attendanceEditRequests, sortOrder]);

  const filteredRequests = useMemo(() => {
    return sortedAttendanceEditRequests.filter((request) => {
      const employee = employees.find(
        (emp) => emp._id?.toString() === request.employee?._id?.toString()
      );
      const matchesEmployee =
        !employeeFilter ||
        employee?.name?.toLowerCase().includes(employeeFilter.toLowerCase()) ||
        employee?.employeeId?.toLowerCase().includes(employeeFilter.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        request.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchesDate =
        !filterDate ||
        format(new Date(request.date), "yyyy-MM-dd") === format(filterDate, "yyyy-MM-dd");
      return matchesEmployee && matchesStatus && matchesDate;
    });
  }, [sortedAttendanceEditRequests, employees, employeeFilter, statusFilter, filterDate]);

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

  const handleRequestsSort = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
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

  if (!locationId) {
    return (
      <div className="text-body text-sm p-6 text-center">
        No location assigned. Please contact admin to assign a location.
      </div>
    );
  }

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
              <Label
                htmlFor="employeeFilter"
                className="text-sm font-semibold text-body"
              >
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
              <Label
                htmlFor="statusFilter"
                className="text-sm font-semibold text-body"
              >
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
                disabled={!locationId}
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
              <Label
                htmlFor="filterDate"
                className="text-sm font-semibold text-body"
              >
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-semibold bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm truncate"
                    disabled={!locationId}
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
          {reqLoading || empLoading ? (
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
                          onClick={handleRequestsSort}
                          className="flex items-center space-x-1 text-body hover:bg-accent-light mx-auto"
                          aria-label={`Sort by employee name ${sortOrder === "asc" ? "descending" : "ascending"}`}
                        >
                          Employee Name
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        Date
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        Current Status
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        Requested Status
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        Reason
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        Status
                      </TableHead>
                      <TableHead className="text-body text-sm text-center px-2">
                        Requested On
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.map((request, index) => (
                      <TableRow
                        key={request._id}
                        className={`${
                          index % 2 === 0 ? "bg-body" : "bg-complementary-light"
                        } hover:bg-accent-light animate-slide-in-row`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <TableCell className="text-body text-sm text-center px-2 max-w-[200px] truncate">
                          {request.employee?.name || "Unknown"} (
                          {request.employee?.employeeId || "N/A"})
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap">
                          {format(new Date(request.date), "PPP")}
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center justify-center gap-1">
                                  {getStatusIcon(request.currentStatus)}
                                  {request.currentStatus !== "N/A"
                                    ? request.currentStatus.charAt(0).toUpperCase()
                                    : "N/A"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-body text-body border-complementary text-sm">
                                {request.currentStatus !== "N/A"
                                  ? request.currentStatus.charAt(0).toUpperCase() +
                                    request.currentStatus.slice(1)
                                  : "N/A"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center justify-center gap-1">
                                  {getStatusIcon(request.requestedStatus)}
                                  {request.requestedStatus
                                    ? request.requestedStatus.charAt(0).toUpperCase()
                                    : "N/A"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-body text-body border-complementary text-sm">
                                {request.requestedStatus
                                  ? request.requestedStatus.charAt(0).toUpperCase() +
                                    request.requestedStatus.slice(1)
                                  : "N/A"}
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
                                  reason: request.reason || "-",
                                  employeeName: request.employee?.name || "Unknown",
                                  date: format(new Date(request.date), "PPP"),
                                })
                              }
                              className="text-accent hover:underline p-0"
                              aria-label={`View reason for ${request.employee?.name}'s request`}
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
                                  {getStatusIcon(request.status)}
                                  {request.status
                                    ? request.status.charAt(0).toUpperCase()
                                    : "N/A"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-body text-body border-complementary text-sm">
                                {request.status
                                  ? request.status.charAt(0).toUpperCase() +
                                    request.status.slice(1)
                                  : "N/A"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-body text-sm text-center px-2 whitespace-nowrap">
                          {request.createdAt
                            ? format(new Date(request.createdAt), "PPP")
                            : "N/A"}
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
                      <TableCell colSpan={2} className="text-body text-sm text-center px-2"></TableCell>
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
    </div>
  );
};

export default AttendanceRequests;