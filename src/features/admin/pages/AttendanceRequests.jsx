// src/features/admin/pages/AttendanceRequests.jsx
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
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Search,
  ArrowUpDown,
  Check,
  X,
  Eye,
  Clock4,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
  const [sortConfig, setSortConfig] = useState({
    column: "employee",
    direction: "asc",
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
  });
  const requestsPerPage = 10;

  // Handle errors
  useEffect(() => {
    if (attError || empError) {
      toast.error(attError || empError || "Failed to load data", {
        action: {
          label: "Retry",
          onClick: () => {
            dispatch(fetchAttendanceRequests());
            if (locationFilter !== "all") {
              dispatch(fetchEmployees({ location: locationFilter }));
            }
          },
        },
      });
      dispatch(resetAttendance());
    }
  }, [attError, empError, dispatch, locationFilter]);

  // Fetch data
  useEffect(() => {
    dispatch(fetchAttendanceRequests());
    if (locationFilter !== "all") {
      dispatch(fetchEmployees({ location: locationFilter }));
    }
  }, [dispatch, locationFilter]);

  // Polling for attendance requests every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchAttendanceRequests())
        .unwrap()
        .then((newRequests) => {
          (newRequests || []).forEach((newReq) => {
            const prevReq = attendanceRequests.find(
              (req) => req._id === newReq._id
            );
            if (!prevReq && newReq.status === "pending") {
              toast.info(
                `New attendance edit request from ${
                  newReq.employee?.name || "Unknown"
                } for ${format(new Date(newReq.date), "PPP")}`,
                { duration: 5000 }
              );
            } else if (
              prevReq &&
              prevReq.status !== newReq.status &&
              newReq.status !== "pending"
            ) {
              toast.info(
                `Request for ${newReq.employee?.name || "Unknown"} on ${format(
                  new Date(newReq.date),
                  "PPP"
                )} has been ${newReq.status}`,
                { duration: 5000 }
              );
            }
          });
        })
        .catch((err) => console.error("Polling error:", err));
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch, attendanceRequests]);

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
      } else if (sortConfig.column === "requestedStatus") {
        aValue = a.requestedStatus || "";
        bValue = b.requestedStatus || "";
      } else if (sortConfig.column === "currentStatus") {
        aValue = a.currentStatus || "";
        bValue = b.currentStatus || "";
      } else {
        aValue = a.status || "";
        bValue = b.status || "";
      }
      if (sortConfig.column === "date") {
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
      return matchesLocation && matchesEmployee && matchesStatus;
    });
  }, [sortedRequests, locationFilter, employeeFilter, statusFilter]);

  // Pagination
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * requestsPerPage;
    return filteredRequests.slice(startIndex, startIndex + requestsPerPage);
  }, [filteredRequests, currentPage]);

  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);

  const handleSort = (column) => {
    setSortConfig((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleRequestAction = (
    requestId,
    action,
    employeeName,
    date,
    requestedStatus
  ) => {
    setActionDialog({
      open: true,
      requestId,
      action,
      employeeName,
      date: date, // Store the raw ISO date string (e.g., "2025-06-16T18:30:00.000Z")
      requestedStatus,
    });
  };

  const confirmRequestAction = () => {
    const { requestId, action, date, employeeName, requestedStatus } =
      actionDialog;
    dispatch(handleAttendanceRequest({ id: requestId, status: action }))
      .unwrap()
      .then(() => {
        toast.success(`Request ${action} successfully`, {
          action: {
            label: "Undo",
            onClick: () =>
              toast.info("Undo functionality not implemented yet."),
          },
        });
        dispatch(fetchAttendanceRequests());
        // Parse the request date correctly
        const requestDate = new Date(actionDialog.date); // Ensure date is the ISO string from req.date
        if (isNaN(requestDate)) {
          console.error("Invalid date in actionDialog:", actionDialog.date);
          return;
        }
        const month = requestDate.getMonth() + 1;
        const year = requestDate.getFullYear();
        const location = locationFilter === "all" ? locationId : locationFilter;
        console.log("Dispatching fetchAttendance with:", {
          month,
          year,
          location,
          employeeName,
          requestedStatus,
        });
        dispatch(
          fetchAttendance({
            month,
            year,
            location: location || undefined,
          })
        );
      })
      .catch((err) => toast.error(err || "Failed to handle request"))
      .finally(() =>
        setActionDialog({
          open: false,
          requestId: null,
          action: "",
          employeeName: "",
          date: "",
          requestedStatus: "",
        })
      );
  };

  return (
    <Card className="bg-complementary text-body shadow-lg rounded-lg">
      <CardHeader className="border-b border-accent">
        <CardTitle className="text-2xl font-bold">
          Attendance Edit Requests
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label
              htmlFor="locationFilter"
              className="block text-sm font-medium text-body"
            >
              Filter by Location
            </Label>
            <Select
              value={locationFilter}
              onValueChange={setLocationFilter}
              disabled={locLoading}
            >
              <SelectTrigger
                id="locationFilter"
                className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                aria-label="Filter requests by location"
              >
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent className="bg-body text-body">
                <SelectItem value="all" className="text-sm">
                  All Locations
                </SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc._id} value={loc._id} className="text-sm">
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label
              htmlFor="employeeFilter"
              className="block text-sm font-medium text-body"
            >
              Filter by Employee
            </Label>
            <div className="relative">
              <Input
                id="employeeFilter"
                placeholder="Search by name or ID..."
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="pl-10 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                aria-label="Filter requests by employee name or ID"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-complementary" />
            </div>
          </div>
          <div className="flex-1 min-w-[150px]">
            <Label
              htmlFor="statusFilter"
              className="block text-sm font-medium text-body"
            >
              Filter by Status
            </Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                id="statusFilter"
                className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                aria-label="Filter requests by status"
              >
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-body text-body">
                <SelectItem value="all" className="text-sm">
                  All
                </SelectItem>
                <SelectItem value="pending" className="text-sm">
                  Pending
                </SelectItem>
                <SelectItem value="approved" className="text-sm">
                  Approved
                </SelectItem>
                <SelectItem value="rejected" className="text-sm">
                  Rejected
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {reqLoading || empLoading || locLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : filteredRequests.length > 0 ? (
          <div className="space-y-4">
            <div className="max-h-[400px] overflow-x-auto relative">
              <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from bg-complementary to-transparent pointer-events-none" />
              <Table className="border border-gray-200 min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-body text-sm">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("employee")}
                        className="flex items-center space-x-1"
                        aria-label="Sort by employee name"
                      >
                        Employee
                        <ArrowUpDown className="h-5 w-5" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-body text-sm">
                      Location
                    </TableHead>
                    <TableHead className="text-body text-sm">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("date")}
                        className="flex items-center space-x-1"
                        aria-label="Sort by date"
                      >
                        Date
                        <ArrowUpDown className="h-5 w-5" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-body text-sm">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("currentStatus")}
                        className="flex items-center space-x-1"
                        aria-label="Sort by current status"
                      >
                        Current Status
                        <ArrowUpDown className="h-5 w-5" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-body text-sm">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("requestedStatus")}
                        className="flex items-center space-x-1"
                        aria-label="Sort by requested status"
                      >
                        Requested Status
                        <ArrowUpDown className="h-5 w-5" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-body text-sm">Reason</TableHead>
                    <TableHead className="text-body text-sm">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("status")}
                        className="flex items-center space-x-1"
                        aria-label="Sort by status"
                      >
                        Status
                        <ArrowUpDown className="h-5 w-5" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-body text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRequests.map((req, index) => (
                    <TableRow
                      key={req._id}
                      className={
                        index % 2 === 0 ? "bg-complementary" : "bg-body"
                      }
                    >
                      <TableCell className="text-body text-sm truncate max-w-[150px]">
                        {req.employee?.name || "Unknown"} (
                        {req.employee?.employeeId || "N/A"})
                      </TableCell>
                      <TableCell className="text-body text-sm truncate max-w-[150px]">
                        {req.location?.name || "N/A"}
                      </TableCell>
                      <TableCell className="text-body text-sm">
                        {format(new Date(req.date), "PPP")}
                      </TableCell>
                      <TableCell className="text-body text-sm">
                        <Badge
                          variant={
                            req.currentStatus === "present"
                              ? "success"
                              : req.currentStatus === "absent"
                              ? "destructive"
                              : req.currentStatus === "N/A"
                              ? "secondary"
                              : "warning"
                          }
                          className="text-xs"
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(req.currentStatus)}
                            {req.currentStatus === "N/A"
                              ? "N/A"
                              : req.currentStatus.charAt(0).toUpperCase() +
                                req.currentStatus.slice(1)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-body text-sm">
                        <Badge
                          variant={
                            req.requestedStatus === "present"
                              ? "success"
                              : req.requestedStatus === "absent"
                              ? "destructive"
                              : "warning"
                          }
                          className="text-xs"
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(req.requestedStatus)}
                            {req.requestedStatus.charAt(0).toUpperCase() +
                              req.requestedStatus.slice(1)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-body text-sm max-w-[200px]">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() =>
                                  setReasonDialog({
                                    open: true,
                                    reason: req.reason,
                                    employeeName:
                                      req.employee?.name || "Unknown",
                                    date: format(new Date(req.date), "PPP"),
                                  })
                                }
                                className="text-accent hover:underline p-0"
                                aria-label={`View reason for ${req.employee?.name}'s request`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-complementary text-body border-accent max-w-xs">
                              <p className="text-sm">{req.reason}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-body text-sm">
                        <Badge
                          variant={
                            req.status === "pending"
                              ? "secondary"
                              : req.status === "approved"
                              ? "success"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(req.status)}
                            {req.status.charAt(0).toUpperCase() +
                              req.status.slice(1)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-body text-sm">
                        {req.status === "pending" ? (
                          <div className="flex space-x-2">
                            <Button
                              onClick={() =>
                                handleRequestAction(
                                  req._id,
                                  "approved",
                                  req.employee?.name || "Unknown",
                                  req.date, // Pass the raw ISO date string
                                  req.requestedStatus
                                )
                              }
                              className="bg-green-500 text-body hover:bg-green-600 text-sm py-2 px-3 flex items-center gap-1"
                              disabled={reqLoading}
                              aria-label={`Approve request for ${req.employee?.name}`}
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              onClick={() =>
                                handleRequestAction(
                                  req._id,
                                  "rejected",
                                  req.employee?.name || "Unknown",
                                  req.date, // Pass the raw ISO date string
                                  req.requestedStatus
                                )
                              }
                              className="bg-red-500 text-body hover:bg-red-600 text-sm py-2 px-3 flex items-center gap-1"
                              disabled={reqLoading}
                              aria-label={`Reject request for ${req.employee?.name}`}
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center">
              <Button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
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
          <p className="text-body text-center py-2">
            No attendance edit requests available
          </p>
        )}
      </CardContent>

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
        <DialogContent className="bg-complementary text-body border-accent max-w-[90vw] sm:max-w-md max-h-[70vh] overflow-hidden flex flex-col rounded-lg">
          <DialogHeader className="shrink-0 px-4 pt-4">
            <DialogTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5 text-accent" />
              Reason for Request
            </DialogTitle>
            <DialogDescription className="text-sm">
              Request by {reasonDialog.employeeName} on {reasonDialog.date}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <p className="text-sm text-body">{reasonDialog.reason}</p>
          </div>
          <DialogFooter className="shrink-0 px-4 py-4 border-t border-accent flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setReasonDialog({
                  open: false,
                  reason: "",
                  employeeName: "",
                  date: "",
                })
              }
              className="border-accent text-body hover:bg-accent-hover text-sm py-3 px-4"
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
          })
        }
      >
        <DialogContent className="bg-complementary text-body border-accent max-w-[90vw] sm:max-w-md max-h-[70vh] overflow-hidden flex flex-col rounded-lg">
          <DialogHeader className="shrink-0 px-4 pt-4">
            <DialogTitle className="text-lg flex items-center gap-2">
              {actionDialog.action === "approved" ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  Approve Request
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-red-500" />
                  Reject Request
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to {actionDialog.action} the request for{" "}
              {actionDialog.employeeName} on {actionDialog.date} to mark as{" "}
              {actionDialog.requestedStatus}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="shrink-0 px-4 py-4 border-t border-accent flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setActionDialog({
                  open: false,
                  requestId: null,
                  action: "",
                  employeeName: "",
                  date: "",
                  requestedStatus: "",
                })
              }
              className="border-accent text-body hover:bg-accent-hover text-sm py-2 px-4"
              disabled={reqLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmRequestAction}
              className={`${
                actionDialog.action === "approved"
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-red-500 hover:bg-red-600"
              } text-body text-sm py-2 px-4 flex items-center gap-2`}
              disabled={reqLoading}
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
    </Card>
  );
};

export default AttendanceRequests;
