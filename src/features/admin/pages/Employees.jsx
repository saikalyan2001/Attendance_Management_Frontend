import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchEmployees,
  reset as resetEmployees,
} from "../redux/employeeSlice";
import { fetchSettings } from "../redux/settingsSlice";
import {
  fetchLocations,
  reset as resetLocations,
} from "../redux/locationsSlice";
import Layout from "../../../components/layout/Layout";
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
import { Dialog } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  Search,
  ArrowUpDown,
  AlertCircle,
  X,
  CheckCircle,
  PlusCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  Truck,
  Eye,
  History,
  UserPlus,
  LogOut,
  FilePlus,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import EditEmployeeDialog from "./EditEmployeeDialog";
import TransferEmployeeDialog from "./TransferEmployeeDialog";
import RejoinEmployeeDialog from "./RejoinEmployeeDialog";
import AddDocumentsDialog from "./AddDocumentsDialog";
import DeactivateEmployeeDialog from "./DeactivateEmployeeDialog";
import UpdateAdvanceDialog from "./UpdateAdvanceDialog";

const Employees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);
  const {
    employees = [],
    loading: employeesLoading,
    error: employeesError,
    success,
  } = useSelector((state) => state.adminEmployees || {});
  const {
    settings = {},
    loading: settingsLoading,
    error: settingsError,
  } = useSelector((state) => state.adminSettings || {});
  const {
    locations = [],
    loading: locationsLoading,
    error: locationsError,
  } = useSelector((state) => state.adminLocations || {});

  const initialLocation = searchParams.get("location") || "all";
  const initialStatus = searchParams.get("status") || "all";
  const [filterLocation, setFilterLocation] = useState(initialLocation);
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("employeeId");
  const [sortOrder, setSortOrder] = useState("asc");
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeactivateDialog, setOpenDeactivateDialog] = useState(false);
  const [openTransferDialog, setOpenTransferDialog] = useState(false);
  const [openRejoinDialog, setOpenRejoinDialog] = useState(false);
  const [openAddDocumentsDialog, setOpenAddDocumentsDialog] = useState(false);
  const [openUpdateAdvanceDialog, setOpenUpdateAdvanceDialog] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [transferEmployeeId, setTransferEmployeeId] = useState(null);
  const [employeeToRejoin, setEmployeeToRejoin] = useState(null);
  const [addDocumentsEmployeeId, setAddDocumentsEmployeeId] = useState(null);
  const [deactivateEmployeeId, setDeactivateEmployeeId] = useState(null);
  const [employeeToUpdateAdvance, setEmployeeToUpdateAdvance] = useState(null);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const autoDismissDuration = 5000;

  const HIGHLIGHT_DURATION = settings?.highlightDuration ?? 24 * 60 * 60 * 1000;

  const shouldHighlightEmployee = (employee) => {
    if (!employee.transferTimestamp) return false;
    const transferTime = new Date(employee.transferTimestamp).getTime();
    const currentTime = new Date().getTime();
    return currentTime - transferTime <= HIGHLIGHT_DURATION;
  };

  const filteredEmployees = Array.isArray(employees)
    ? employees.filter(
        (emp) =>
          (emp.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (emp.employeeId || "").toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    let aValue, bValue;

    if (sortField === "salary" || sortField === "advance") {
      aValue = a[sortField] || 0;
      bValue = b[sortField] || 0;
    } else if (sortField === "location") {
      aValue = a.location?.name || a.location?.city || "";
      bValue = b.location?.name || b.location?.city || "";
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    } else if (sortField === "leaves") {
      aValue = a.paidLeaves.available || 0;
      bValue = b.paidLeaves.available || 0;
    } else if (sortField === "status") {
      aValue = a.status || "";
      bValue = b.status || "";
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    } else {
      aValue = (a[sortField] || "").toLowerCase();
      bValue = (b[sortField] || "").toLowerCase();
    }

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalItems = sortedEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = sortedEmployees.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    dispatch(fetchLocations());
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchEmployees({
        location: filterLocation === "all" ? undefined : filterLocation,
        status: filterStatus === "all" ? undefined : filterStatus,
      })
    );
  }, [dispatch, filterLocation, filterStatus]);

  useEffect(() => {
    if (employeesError || locationsError || settingsError) {
      setErrorMessage(employeesError || locationsError || settingsError);
      setShowErrorAlert(true);
      const errorTimer = setTimeout(() => {
        setShowErrorAlert(false);
        setErrorMessage(null);
        dispatch(resetEmployees());
        dispatch(resetLocations());
      }, autoDismissDuration);
      return () => clearTimeout(errorTimer);
    }
  }, [employeesError, locationsError, settingsError, dispatch]);

  useEffect(() => {
    if (success && successMessage) {
      setShowSuccessAlert(true);
      toast.success(successMessage, { duration: autoDismissDuration });
      const successTimer = setTimeout(() => {
        setShowSuccessAlert(false);
        setSuccessMessage(null);
        dispatch(resetEmployees());
      }, autoDismissDuration);
      return () => clearTimeout(successTimer);
    }
  }, [success, successMessage, dispatch]);

  const handleEditClick = (employee) => {
    setEditEmployee(employee);
    setOpenEditDialog(true);
  };

  const handleTransferClick = (employee) => {
    setTransferEmployeeId(employee._id);
    setOpenTransferDialog(true);
  };

  const handleRejoinClick = (employee) => {
    setEmployeeToRejoin(employee);
    setOpenRejoinDialog(true);
  };

  const handleHistoryClick = (employee) => {
    navigate(`/admin/employees/${employee._id}/history`);
  };

  const handleAddDocumentsClick = (employee) => {
    setAddDocumentsEmployeeId(employee._id);
    setOpenAddDocumentsDialog(true);
  };

  const handleDeactivateClick = (id) => {
    setDeactivateEmployeeId(id);
    setOpenDeactivateDialog(true);
  };

  const handleUpdateAdvanceClick = (employee) => {
    setEmployeeToUpdateAdvance(employee);
    setOpenUpdateAdvanceDialog(true);
  };

  const handleViewClick = (employeeId) => {
    navigate(`/admin/employees/${employeeId}`);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const handleFilterLocationChange = (value) => {
    setFilterLocation(value);
    const params = {};
    if (value !== "all") params.location = value;
    if (filterStatus !== "all") params.status = filterStatus;
    setSearchParams(params);
    setCurrentPage(1);
  };

  const handleFilterStatusChange = (value) => {
    setFilterStatus(value);
    const params = {};
    if (filterLocation !== "all") params.location = filterLocation;
    if (value !== "all") params.status = value;
    setSearchParams(params);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleDismissErrors = () => {
    setShowErrorAlert(false);
    setErrorMessage(null);
    dispatch(resetEmployees());
    dispatch(resetLocations());
  };

  const handleDismissSuccess = () => {
    setShowSuccessAlert(false);
    setSuccessMessage(null);
    dispatch(resetEmployees());
  };

  return (
    <Layout title="Employees">
      {(errorMessage || employeesError || locationsError || settingsError) &&
        showErrorAlert && (
          <Alert
            variant="destructive"
            className={cn(
              "fixed top-4 right-4 w-80 sm:w-96 z-[100] border-error text-error rounded-md shadow-lg bg-error-light",
              showErrorAlert ? "animate-fade-in" : "animate-fade-out"
            )}
          >
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            <AlertTitle className="text-[10px] sm:text-sm md:text-base xl:text-lg font-bold">
              Error
            </AlertTitle>
            <AlertDescription className="text-[10px] sm:text-sm md:text-base xl:text-lg">
              {errorMessage ||
                employeesError ||
                locationsError ||
                settingsError}
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissErrors}
              className="absolute top-2 right-2 text-error hover:text-error-hover"
              aria-label="Dismiss error alert"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Alert>
        )}
      {success && showSuccessAlert && (
        <Alert
          className={cn(
            "fixed top-4 right-4 w-80 sm:w-96 z-[100] border-accent text-accent rounded-md shadow-lg bg-accent-light",
            showSuccessAlert ? "animate-fade-in" : "animate-fade-out"
          )}
        >
          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          <AlertTitle className="text-[10px] sm:text-sm md:text-base xl:text-lg font-bold">
            Success
          </AlertTitle>
          <AlertDescription className="text-[10px] sm:text-sm md:text-base xl:text-lg">
            {successMessage}
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissSuccess}
            className="absolute top-2 right-2 text-accent hover:text-accent-hover"
            aria-label="Dismiss success alert"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Alert>
      )}
      <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in max-w-full mx-auto w-full overflow-x-hidden">
        <CardHeader>
          <CardTitle className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 w-full max-w-full">
            <span className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
              Employee List
            </span>
            <div className="flex flex-col lg:flex-row gap-3 items-center w-full lg:w-auto">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-body h-5 w-5" />
                <Input
                  placeholder="Search by name or ID"
                  className="pl-10 h-9 xl:h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-xs sm:text-sm xl:text-base transition-all duration-300 hover:shadow-sm w-full lg:w-64 truncate"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search employees"
                />
              </div>
              <Select
                value={filterLocation}
                onValueChange={handleFilterLocationChange}
              >
                <SelectTrigger className="w-full h-9 xl:h-10 bg-complementary text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-xs sm:text-sm xl:text-base lg:w-48 truncate">
                  <SelectValue placeholder="Filter by location" />
                </SelectTrigger>
                <SelectContent className="bg-complementary text-body">
                  <SelectItem
                    value="all"
                    className="text-xs sm:text-sm xl:text-base"
                  >
                    All Locations
                  </SelectItem>
                  {locations.map((loc) => (
                    <SelectItem
                      key={loc._id}
                      value={loc._id}
                      className="text-xs sm:text-sm xl:text-base"
                    >
                      {loc.name || loc.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterStatus}
                onValueChange={handleFilterStatusChange}
              >
                <SelectTrigger className="w-full h-9 xl:h-10 bg-complementary text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-xs sm:text-sm xl:text-base lg:w-48 truncate">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-complementary text-body">
                  <SelectItem
                    value="all"
                    className="text-xs sm:text-sm xl:text-base"
                  >
                    All Statuses
                  </SelectItem>
                  <SelectItem
                    value="active"
                    className="text-xs sm:text-sm xl:text-base"
                  >
                    Active
                  </SelectItem>
                  <SelectItem
                    value="inactive"
                    className="text-xs sm:text-sm xl:text-base"
                  >
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => navigate("/admin/register-employee")}
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-xs sm:text-sm xl:text-base py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md w-full lg:w-auto"
                aria-label="Register new employee"
              >
                <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Add Employee
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employeesLoading || locationsLoading || settingsLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : sortedEmployees.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table className="w-full border-collapse">
                  <TableHeader>
                    <TableRow className="bg-complementary hover:bg-accent/10">
                      {[
                        "employeeId",
                        "name",
                        "designation",
                        "department",
                        "location",
                        "salary",
                        "advance",
                        "leaves",
                        "status",
                      ].map((field) => (
                        <TableHead key={field} className="text-body">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort(field)}
                            className="text-body hover:text-accent w-full text-left flex items-center gap-1 text-xs sm:text-sm xl:text-base"
                            aria-label={`Sort by ${field}`}
                          >
                            {field === "leaves"
                              ? "Leaves (O/C)"
                              : field.charAt(0).toUpperCase() + field.slice(1)}
                            <ArrowUpDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                sortField === field &&
                                  sortOrder === "desc" &&
                                  "rotate-180"
                              )}
                            />
                          </Button>
                        </TableHead>
                      ))}
                      <TableHead className="text-body px-4 py-2 text-xs sm:text-sm xl:text-base">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEmployees.map((employee) => {
                      const openingLeaves = Math.max(
                        employee.paidLeaves.available || 0,
                        0
                      );
                      const leavesAccrued = Math.max(
                        employee.paidLeaves.carriedForward || 0,
                        0
                      );
                      const leavesTaken = Math.max(
                        employee.paidLeaves.used || 0,
                        0
                      );
                      const closingLeaves = Math.max(
                        openingLeaves + leavesAccrued - leavesTaken,
                        0
                      );
                      console.log("closingLeaves", closingLeaves);

                      const isHighlighted = shouldHighlightEmployee(employee);
                      if (employee.paidLeaves.carriedForward < 0) {
                        console.warn(
                          `Negative carriedForward for employee ${employee.employeeId}: ${employee.paidLeaves.carriedForward}`
                        );
                      }

                      return (
                        <TableRow
                          key={employee._id}
                          className={cn(
                            "transition-colors duration-200",
                            isHighlighted ? "bg-accent-light animate-pulse" : ""
                          )}
                        >
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">
                            {employee.employeeId}
                          </TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">
                            {employee.name}
                          </TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">
                            {employee.designation}
                          </TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">
                            {employee.department}
                          </TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">
                            {employee.location?.name ||
                              employee.location?.city ||
                              "N/A"}
                          </TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">
                            ₹{employee.salary}
                          </TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">
                            ₹{employee.advance || 0}
                          </TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">
                            {openingLeaves}/{closingLeaves}
                          </TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">
                            {employee.status}
                          </TableCell>
                          <TableCell className="px-4 py-2 space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleViewClick(employee._id)
                                    }
                                    className="text-accent hover:text-accent-hover transition-colors"
                                    aria-label={`View employee ${employee.name}`}
                                  >
                                    <Eye className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Employee</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditClick(employee)}
                                    className="text-accent hover:text-accent-hover transition-colors"
                                    aria-label={`Edit employee ${employee.name}`}
                                  >
                                    <svg
                                      className="h-5 w-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"
                                      />
                                    </svg>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Employee</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleTransferClick(employee)
                                    }
                                    className="text-accent hover:text-accent-hover transition-colors"
                                    disabled={employee.status !== "active"}
                                    aria-label={`Transfer employee ${employee.name}`}
                                  >
                                    <Truck className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Transfer Employee
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleHistoryClick(employee)}
                                    className="text-accent hover:text-accent-hover transition-colors"
                                    aria-label={`View history for employee ${employee.name}`}
                                  >
                                    <History className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View History</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleAddDocumentsClick(employee)
                                    }
                                    className="text-accent hover:text-accent-hover transition-colors"
                                    aria-label={`Add documents for employee ${employee.name}`}
                                  >
                                    <FilePlus className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Add Documents</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleUpdateAdvanceClick(employee)
                                    }
                                    className="text-accent hover:text-accent-hover transition-colors"
                                    aria-label={`Update advance for employee ${employee.name}`}
                                  >
                                    <IndianRupee className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Update Advance</TooltipContent>
                              </Tooltip>
                              {employee.status === "active" ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleDeactivateClick(employee._id)
                                      }
                                      className="text-error hover:text-error-hover transition-colors"
                                      aria-label={`Deactivate employee ${employee.name}`}
                                    >
                                      <LogOut className="h-5 w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Deactivate Employee
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleRejoinClick(employee)
                                      }
                                      className="text-accent hover:text-accent-hover transition-colors"
                                      aria-label={`Rejoin employee ${employee.name}`}
                                    >
                                      <UserPlus className="h-5 w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Rejoin Employee
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-xs sm:text-sm py-1 px-2 transition-all duration-300"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={cn(
                          currentPage === page
                            ? "bg-accent text-body"
                            : "border-complementary text-body hover:bg-complementary/10",
                          "rounded-md text-xs sm:text-sm py-1 px-2 transition-all duration-300"
                        )}
                        aria-label={`Go to page ${page}`}
                      >
                        {page}
                      </Button>
                    )
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-xs sm:text-sm py-1 px-2 transition-all duration-300"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-body">
              <Users className="h-12 w-12 text-accent/50 mb-2" />
              <p className="text-xs sm:text-sm xl:text-base">
                No employees found
              </p>
              <Button
                onClick={() => navigate("/admin/register-employee")}
                className="mt-2 bg-accent text-body hover:bg-accent-hover rounded-md text-xs sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md"
                aria-label="Register new employee"
              >
                <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Add Employee
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <EditEmployeeDialog
          open={openEditDialog}
          onOpenChange={setOpenEditDialog}
          employee={editEmployee}
          setSuccessMessage={setSuccessMessage}
          setShowSuccessAlert={setShowSuccessAlert}
        />
      </Dialog>

      <Dialog open={openTransferDialog} onOpenChange={setOpenTransferDialog}>
        <TransferEmployeeDialog
          open={openTransferDialog}
          onOpenChange={setOpenTransferDialog}
          employeeId={transferEmployeeId}
          setSuccessMessage={setSuccessMessage}
          setShowSuccessAlert={setShowSuccessAlert}
        />
      </Dialog>

      <Dialog open={openRejoinDialog} onOpenChange={setOpenRejoinDialog}>
        <RejoinEmployeeDialog
          open={openRejoinDialog}
          onOpenChange={setOpenRejoinDialog}
          employee={employeeToRejoin}
          setSuccessMessage={setSuccessMessage}
          setShowSuccessAlert={setShowSuccessAlert}
        />
      </Dialog>

      <Dialog
        open={openAddDocumentsDialog}
        onOpenChange={setOpenAddDocumentsDialog}
      >
        <AddDocumentsDialog
          open={openAddDocumentsDialog}
          onOpenChange={setOpenAddDocumentsDialog}
          employeeId={addDocumentsEmployeeId}
          setSuccessMessage={setSuccessMessage}
          setShowSuccessAlert={setShowSuccessAlert}
        />
      </Dialog>

      <Dialog
        open={openDeactivateDialog}
        onOpenChange={setOpenDeactivateDialog}
      >
        <DeactivateEmployeeDialog
          open={openDeactivateDialog}
          onOpenChange={setOpenDeactivateDialog}
          employeeId={deactivateEmployeeId}
          setSuccessMessage={setSuccessMessage}
          setShowSuccessAlert={setShowSuccessAlert}
        />
      </Dialog>

      <Dialog
        open={openUpdateAdvanceDialog}
        onOpenChange={setOpenUpdateAdvanceDialog}
      >
        <UpdateAdvanceDialog
          open={openUpdateAdvanceDialog}
          onOpenChange={setOpenUpdateAdvanceDialog}
          employee={employeeToUpdateAdvance}
          setSuccessMessage={setSuccessMessage}
          setShowSuccessAlert={setShowSuccessAlert}
        />
      </Dialog>
    </Layout>
  );
};

export default Employees;