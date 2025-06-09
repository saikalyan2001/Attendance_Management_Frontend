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
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, ArrowUpDown, Clock4, CheckCircle2, X } from "lucide-react";
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
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 10;

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
      console.log("AttendanceRequests: No locationId provided");
      return;
    }
    console.log("AttendanceRequests: Fetching data for locationId:", locationId);
    dispatch(fetchEmployees({ location: locationId }));
    dispatch(fetchAttendanceEditRequests({ location: locationId }));
  }, [dispatch, locationId]);

  // Polling for attendance edit requests every 30 seconds
  useEffect(() => {
    if (!locationId) return;
    const interval = setInterval(() => {
      dispatch(fetchAttendanceEditRequests({ location: locationId }))
        .unwrap()
        .then((newRequests) => {
          console.log("AttendanceRequests: Polling fetched requests:", newRequests);
          const prevRequests = attendanceEditRequests || [];
          (newRequests || []).forEach((newReq) => {
            const prevReq = prevRequests.find((req) => req._id === newReq._id);
            if (prevReq && prevReq.status !== newReq.status) {
              toast.info(
                `Attendance edit request for ${
                  newReq.employee?.name || "Unknown"
                } on ${format(new Date(newReq.date), "PPP")} has been ${
                  newReq.status
                }`,
                { duration: 5000 }
              );
            }
          });
        })
        .catch((err) => {
          console.error("AttendanceRequests: Polling error:", err);
        });
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch, locationId, attendanceEditRequests]);

  // Log requests for debugging
  useEffect(() => {
    console.log("AttendanceRequests: Current attendanceEditRequests:", attendanceEditRequests);
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
      return matchesEmployee && matchesStatus;
    });
  }, [sortedAttendanceEditRequests, employees, employeeFilter, statusFilter]);

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * requestsPerPage;
    return filteredRequests.slice(startIndex, startIndex + requestsPerPage);
  }, [filteredRequests, currentPage]);

  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);

  const handleRequestsSort = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  if (!locationId) {
    return (
      <div className="text-body text-sm p-6">
        No location assigned. Please contact admin to assign a location.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="bg-body text-body border border-complementary rounded-lg shadow-sm">
        <CardHeader className="border-b border-complementary">
          <CardTitle className="text-2xl font-bold">
            Attendance Edit Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-wrap items-end gap-4">
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
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
                disabled={!locationId}
              >
                <SelectTrigger
                  id="statusFilter"
                  className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                  aria-label="Filter requests by status"
                >
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body">
                  <SelectItem value="all" className="text-sm">
                    All Statuses
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
          {reqLoading || empLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : filteredRequests.length > 0 ? (
            <div className="space-y-4">
              <div className="max-h-[400px] overflow-x-auto relative">
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
                          aria-label="Sort by employee name"
                        >
                          Employee Name
                          <ArrowUpDown className="h-5 w-5" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-body text-sm">Date</TableHead>
                      <TableHead className="text-body text-sm">
                        Current Status
                      </TableHead>
                      <TableHead className="text-body text-sm">
                        Requested Status
                      </TableHead>
                      <TableHead className="text-body text-sm">
                        Reason
                      </TableHead>
                      <TableHead className="text-body text-sm">
                        Status
                      </TableHead>
                      <TableHead className="text-body text-sm">
                        Admin Response
                      </TableHead>
                      <TableHead className="text-body text-sm">
                        Requested On
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.map((request, index) => (
                      <TableRow
                        key={request._id}
                        className={
                          index % 2 === 0 ? "bg-body" : "bg-complementary"
                        }
                      >
                        <TableCell className="text-body text-sm">
                          {request.employee?.name || "Unknown"} (
                          {request.employee?.employeeId || "N/A"})
                        </TableCell>
                        <TableCell className="text-body text-sm">
                          {format(new Date(request.date), "PPP")}
                        </TableCell>
                        <TableCell className="text-body text-sm">
                          {request.currentStatus !== "N/A"
                            ? request.currentStatus.charAt(0).toUpperCase() +
                              request.currentStatus.slice(1)
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-body text-sm">
                          {request.requestedStatus
                            ? request.requestedStatus.charAt(0).toUpperCase() +
                              request.requestedStatus.slice(1)
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-body text-sm max-w-[200px] truncate">
                          {request.reason || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-1">
                                {getStatusIcon(request.status)}
                                <span>
                                  {request.status
                                    ? request.status.charAt(0).toUpperCase() +
                                      request.status.slice(1)
                                    : "N/A"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-body text-body border-complementary">
                                {request.status
                                  ? request.status.charAt(0).toUpperCase() +
                                    request.status.slice(1)
                                  : "N/A"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-body text-sm">
                          {request.adminResponse || "-"}
                        </TableCell>
                        <TableCell className="text-body text-sm">
                          {request.createdAt
                            ? format(new Date(request.createdAt), "PPP")
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center">
                <Button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="bg-accent text-complementary hover:bg-accent-hover text-sm text-complementary py-2 px-4"
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
                  className="bg-accent text-complementary hover:bg-accent-hover text-sm text-complementary py-2 px-6"
                  aria-label="Next page"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-body text-sm py-2">
              No attendance edit requests found.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceRequests;