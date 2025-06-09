import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAttendanceEditRequests } from "../redux/attendanceSlice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getStatusIcon } from "./utils";

const Requests = ({ locationId, activeTab, setServerError }) => {
  const dispatch = useDispatch();
  const { attendanceEditRequests, loading, error } = useSelector(
    (state) => state.siteInchargeAttendance
  );
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    if (!locationId || activeTab !== "requests") return;
    dispatch(fetchAttendanceEditRequests({ location: locationId }));
  }, [dispatch, locationId, activeTab]);

  useEffect(() => {
    if (!locationId || activeTab !== "requests") return;
    const interval = setInterval(() => {
      dispatch(fetchAttendanceEditRequests({ location: locationId }))
        .unwrap()
        .then((newRequests) => {
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
                { duration: 5000 }
              );
            }
          });
        })
        .catch((err) => {
          console.error("Polling error:", err);
        });
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch, locationId, activeTab, attendanceEditRequests]);

  useEffect(() => {
    if (error) {
      const parsedError = parseServerError(error);
      setServerError(parsedError);
      toast.error(parsedError.message, { duration: 10000 });
    }
  }, [error, setServerError]);

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

  return (
    <div className="space-y-8">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}
      <Card className="bg-body text-body border border-complementary rounded-lg shadow-sm">
        <CardHeader className="border-b border-complementary">
          <CardTitle className="text-2xl font-bold">Attendance Edit Requests</CardTitle>
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
              <Table className="border border-complementary min-w-[600px]">
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
                    <TableHead className="text-body text-sm">Current Status</TableHead>
                    <TableHead className="text-body text-sm">Requested Status</TableHead>
                    <TableHead className="text-body text-sm">Reason</TableHead>
                    <TableHead className="text-body text-sm">Request Status</TableHead>
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1">
                              {getStatusIcon(request.currentStatus)}
                              <span>{request.currentStatus.charAt(0).toUpperCase()}</span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-body text-body border-complementary">
                              {request.currentStatus.charAt(0).toUpperCase() + request.currentStatus.slice(1)}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-body text-sm">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1">
                              {getStatusIcon(request.requestedStatus)}
                              <span>{request.requestedStatus.charAt(0).toUpperCase()}</span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-body text-body border-complementary">
                              {request.requestedStatus.charAt(0).toUpperCase() + request.requestedStatus.slice(1)}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-body text-sm max-w-[200px] truncate">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>{request.reason}</TooltipTrigger>
                            <TooltipContent className="bg-body text-body border-complementary max-w-xs">
                              {request.reason}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-body text-sm capitalize">
                        {request.status}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-body text-sm">No attendance edit requests found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Requests;