import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  ArrowUpDown,
  Eye,
  Truck,
  History,
  FilePlus,
  LogOut,
  UserPlus,
  IndianRupee,
  Pencil,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Layout from "../../../components/layout/Layout";
import EditDialog from "./EditDialog";
import TransferDialog from "./TransferDialog";
import RejoinDialog from "./RejoinDialog";
import AddDocumentsDialog from "./AddDocumentsDialog";
import DeactivateDialog from "./DeactivateDialog";
import UpdateAdvanceDialog from "./UpdateAdvanceDialog";
import Alerts from "./Alerts";
import { fetchMe } from "../../../redux/slices/authSlice";
import {
  fetchEmployees,
  fetchLocations,
  fetchAllLocations,
  fetchSettings,
  reset,
} from "../redux/employeeSlice";
import toast from "react-hot-toast";

const Employees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const {
    employees = [],
    locations = [],
    allLocations = [],
    settings = {},
    loading: employeesLoading,
    success,
  } = useSelector((state) => state.siteInchargeEmployee || {});

  const initialDepartment = searchParams.get("department") || "all";
  const initialStatus = searchParams.get("status") || "all";
  const [filterDepartment, setFilterDepartment] = useState(initialDepartment);
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("employeeId");
  const [sortOrder, setSortOrder] = useState("asc");
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openTransferDialog, setOpenTransferDialog] = useState(false);
  const [openRejoinDialog, setOpenRejoinDialog] = useState(false);
  const [openAddDocumentsDialog, setOpenAddDocumentsDialog] = useState(false);
  const [openDeactivateDialog, setOpenDeactivateDialog] = useState(false);
  const [openUpdateAdvanceDialog, setOpenUpdateAdvanceDialog] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [transferEmployeeId, setTransferEmployeeId] = useState(null);
  const [employeeToRejoin, setEmployeeToRejoin] = useState(null);
  const [addDocumentsEmployeeId, setAddDocumentsEmployeeId] = useState(null);
  const [deactivateEmployeeId, setDeactivateEmployeeId] = useState(null);
  const [employeeToUpdateAdvance, setEmployeeToUpdateAdvance] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const itemsPerPage = 5;

  const locationId = user?.locations?.[0]?._id;
  const HIGHLIGHT_DURATION = settings?.highlightDuration ?? 24 * 60 * 60 * 1000;

  const departments = useMemo(() => {
    return [...new Set(employees.map((emp) => emp.department))].sort();
  }, [employees]);

  const getCurrentAdvance = (employee) => {
    if (!employee?.advances || !Array.isArray(employee.advances)) return 0;
    const sortedAdvances = [...employee.advances].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    return sortedAdvances[0]?.amount || 0;
  };

  const shouldHighlightEmployee = (employee) => {
    if (!employee.transferTimestamp) return false;
    const transferTime = new Date(employee.transferTimestamp).getTime();
    const currentTime = new Date("2025-07-03T17:42:00+05:30").getTime();
    return currentTime - transferTime <= HIGHLIGHT_DURATION;
  };

  const filteredEmployees = useMemo(() => {
    setIsFiltering(true);
    const result = Array.isArray(employees)
      ? employees.filter((emp) => {
          const searchLower = search.toLowerCase();
          const matchesSearch =
            (emp.name || "").toLowerCase().includes(searchLower) ||
            (emp.employeeId || "").toLowerCase().includes(searchLower);
          const matchesDepartment = filterDepartment === "all" || emp.department === filterDepartment;
          const matchesStatus = filterStatus === "all" || emp.status === filterStatus;
          return matchesSearch && matchesDepartment && matchesStatus;
        })
      : [];
    setTimeout(() => setIsFiltering(false), 100);
    return result;
  }, [employees, search, filterDepartment, filterStatus]);

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      let aValue, bValue;
      if (sortField === "salary") {
        aValue = a[sortField] || 0;
        bValue = b[sortField] || 0;
      } else if (sortField === "advance") {
        aValue = getCurrentAdvance(a);
        bValue = getCurrentAdvance(b);
      } else if (sortField === "location") {
        aValue = (typeof a.location === "object" ? a.location?.name : a.location) || "N/A";
        bValue = (typeof b.location === "object" ? b.location?.name : b.location) || "N/A";
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (sortField === "leaves") {
        aValue = a.paidLeaves?.available || 0;
        bValue = b.paidLeaves?.available || 0;
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
  }, [filteredEmployees, sortField, sortOrder]);

  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = sortedEmployees.slice(startIndex, endIndex);

  const getDepartmentName = (dept) => (dept === "all" ? "All Departments" : dept);

  const getStatusName = (status) => {
    if (status === "all") return "All Statuses";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "siteincharge") {
      navigate("/login");
    } else if (!user?.locations?.length) {
      navigate("/siteincharge/dashboard");
    } else if (locationId) {
      dispatch(
        fetchEmployees({
          location: locationId,
          department: filterDepartment === "all" ? undefined : filterDepartment,
          status: filterStatus === "all" ? undefined : filterStatus,
          cache: false,
        })
      );
      dispatch(fetchLocations());
      dispatch(fetchAllLocations());
      dispatch(fetchSettings());
    }
  }, [user, authLoading, locationId, dispatch, navigate, filterDepartment, filterStatus, success]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage, { duration: 4000 });
      setSuccessMessage(null);
    }
  }, [successMessage]);

  const handleEditClick = (employee) => {
    setEmployeeToEdit(employee);
    setOpenEditDialog(true);
    setSelectedEmployeeId(employee._id);
  };

  const handleTransferClick = (employee) => {
    setTransferEmployeeId(employee._id);
    setOpenTransferDialog(true);
    setSelectedEmployeeId(employee._id);
  };

  const handleRejoinClick = (employee) => {
    setEmployeeToRejoin(employee);
    setOpenRejoinDialog(true);
    setSelectedEmployeeId(employee._id);
  };

  const handleHistoryClick = (employee) => {
    navigate(`/siteincharge/employees/${employee._id}/history`);
    setSelectedEmployeeId(employee._id);
  };

  const handleAddDocumentsClick = (employee) => {
    setAddDocumentsEmployeeId(employee._id);
    setOpenAddDocumentsDialog(true);
    setSelectedEmployeeId(employee._id);
  };

  const handleDeactivateClick = (id) => {
    setDeactivateEmployeeId(id);
    setOpenDeactivateDialog(true);
    setSelectedEmployeeId(id);
  };

  const handleUpdateAdvanceClick = (employee) => {
    setEmployeeToUpdateAdvance(employee);
    setOpenUpdateAdvanceDialog(true);
    setSelectedEmployeeId(employee._id);
  };

  const handleViewClick = (employeeId) => {
    navigate(`/siteincharge/employees/${employeeId}`);
    setSelectedEmployeeId(employeeId);
  };

  const handleRowClick = (employeeId) => {
    setSelectedEmployeeId(employeeId);
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

  const handleFilterDepartmentChange = (value) => {
    setFilterDepartment(value);
    const params = {};
    if (value !== "all") params.department = value;
    if (filterStatus !== "all") params.status = filterStatus;
    setSearchParams(params);
    setCurrentPage(1);
  };

  const handleFilterStatusChange = (value) => {
    setFilterStatus(value);
    const params = {};
    if (filterDepartment !== "all") params.department = filterDepartment;
    if (value !== "all") params.status = value;
    setSearchParams(params);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilterDepartment("all");
    setFilterStatus("all");
    setSearch("");
    setSearchParams({});
    setCurrentPage(1);
    setSelectedEmployeeId(null);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedEmployeeId(null);
    }
  };

  return (
    <Layout title="Employees" role="siteincharge">
      <Alerts />
      <Card className="bg-gradient-to-br from-complementary to-complementary-dark text-body shadow-lg rounded-md border border-accent/10 animate-fade-in max-w-full mx-auto w-full">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex flex-row flex-wrap gap-2 sm:gap-3 items-center w-full max-w-full">
            <span className="text-base sm:text-lg md:text-xl font-semibold shrink-0">
              Employee List
            </span>
            <Button
              variant="outline"
              onClick={() => navigate("/siteincharge/register-employee")}
              className="h-9 sm:h-10 text-body border-complementary hover:bg-accent/10 rounded-md text-sm sm:text-base py-1 px-2 sm:py-2 sm:px-3 flex items-center transition-all duration-300 hover:shadow-sm hover:scale-105 shrink-0 md:ml-auto max-sm:w-full cursor-pointer"
              aria-label="Register new employee"
            >
              <PlusCircle className="h-4 w-4 mr-1 sm:mr-2" />
              Add
            </Button>
            <div className="flex flex-row flex-wrap gap-2 sm:gap-3 items-center max-sm:flex-col max-sm:gap-3 max-sm:w-full">
              <div className="relative min-w-[140px] sm:min-w-[180px] sm:max-w-[240px] max-sm:w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-body h-4 w-4" />
                {isFiltering && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-body h-4 w-4 animate-spin" />
                )}
                <Input
                  placeholder="Search by name or ID"
                  className="pl-10 pr-10 h-9 sm:h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent rounded-md text-sm sm:text-base transition-all duration-300 hover:shadow-sm max-sm:w-full cursor-text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search employees by name or ID"
                  aria-busy={isFiltering}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 sm:h-10 text-body border-complementary hover:bg-accent/10 rounded-md text-sm sm:text-base py-1 px-2 sm:py-2 sm:px-3 flex items-center gap-1 sm:gap-2 transition-all duration-300 hover:shadow-sm hover:scale-105 min-w-[100px] sm:min-w-[120px] max-sm:w-full cursor-pointer"
                    aria-label="Open additional filters"
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-complementary text-body w-56">
                  <DropdownMenuLabel>Additional Filters</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-4 py-2">
                    <label className="text-xs font-semibold block mb-1">Department</label>
                    <Select
                      value={filterDepartment}
                      onValueChange={handleFilterDepartmentChange}
                      aria-label={`Department filter set to ${getDepartmentName(filterDepartment)}`}
                    >
                      <SelectTrigger className="w-full h-9 bg-complementary text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent rounded-md text-sm cursor-pointer">
                        <SelectValue placeholder="Filter by department" />
                      </SelectTrigger>
                      <SelectContent className="bg-complementary text-body">
                        <SelectItem value="all" className="text-sm">
                          All Departments
                        </SelectItem>
                        {departments.length > 0 ? (
                          departments.map((dept) => (
                            <SelectItem key={dept} value={dept} className="text-sm">
                              {dept}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled className="text-sm">
                            No departments available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="px-4 py-2">
                    <label className="text-xs font-semibold block mb-1">Status</label>
                    <Select
                      value={filterStatus}
                      onValueChange={handleFilterStatusChange}
                      aria-label={`Status filter set to ${getStatusName(filterStatus)}`}
                    >
                      <SelectTrigger className="w-full h-9 bg-complementary text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent rounded-md text-sm cursor-pointer">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent className="bg-complementary text-body">
                        <SelectItem value="all" className="text-sm">
                          All Statuses
                        </SelectItem>
                        <SelectItem value="active" className="text-sm">
                          Active
                        </SelectItem>
                        <SelectItem value="inactive" className="text-sm">
                          Inactive
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                className="h-9 sm:h-10 text-body border-complementary hover:bg-accent/10 rounded-md text-sm sm:text-base py-1 px-2 sm:py-2 sm:px-3 transition-all duration-300 hover:shadow-sm hover:scale-105 min-w-[100px] sm:min-w-[120px] max-sm:w-full cursor-pointer"
                onClick={handleClearFilters}
                aria-label="Clear all filters"
              >
                Clear
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {employeesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex space-x-4">
                  <div className="h-4 bg-complementary/20 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : sortedEmployees.length > 0 ? (
            <>
              <Table className="w-full border-collapse">
                <TableHeader className="sticky top-0 z-10 bg-complementary shadow-sm">
                  <TableRow className="hover:bg-accent/10">
                    <TableHead
                      className="text-body px-1 sm:px-3 py-2 min-w-[80px] sm:min-w-[100px] text-center font-semibold sticky left-0 bg-complementary shadow-sm z-20"
                    >
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("employeeId")}
                        className="text-body hover:text-accent w-full flex justify-center items-center gap-1 text-sm sm:text-base cursor-pointer"
                        aria-label="Sort by employee ID"
                      >
                        ID
                        <ArrowUpDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            sortField === "employeeId" && sortOrder === "desc" && "rotate-180"
                          )}
                        />
                      </Button>
                    </TableHead>
                    <TableHead
                      className="text-body px-1 sm:px-3 py-2 min-w-[100px] sm:min-w-[120px] text-center font-semibold sticky left-[80px] sm:left-[100px] bg-complementary shadow-sm z-20"
                    >
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("name")}
                        className="text-body hover:text-accent w-full flex justify-center items-center gap-1 text-sm sm:text-base cursor-pointer"
                        aria-label="Sort by name"
                      >
                        Name
                        <ArrowUpDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            sortField === "name" && sortOrder === "desc" && "rotate-180"
                          )}
                        />
                      </Button>
                    </TableHead>
                    <TableHead
                      className="text-body px-1 sm:px-3 py-2 min-w-[80px] sm:min-w-[100px] text-center font-semibold"
                    >
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("designation")}
                        className="text-body hover:text-accent w-full flex justify-center items-center gap-1 text-sm sm:text-base cursor-pointer"
                        aria-label="Sort by designation"
                      >
                        Designation
                        <ArrowUpDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            sortField === "designation" && sortOrder === "desc" && "rotate-180"
                          )}
                        />
                      </Button>
                    </TableHead>
                    <TableHead
                      className="text-body px-1 sm:px-3 py-2 min-w-[80px] sm:min-w-[100px] text-center font-semibold"
                    >
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("department")}
                        className="text-body hover:text-accent w-full flex justify-center items-center gap-1 text-sm sm:text-base cursor-pointer"
                        aria-label="Sort by department"
                      >
                        Department
                        <ArrowUpDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            sortField === "department" && sortOrder === "desc" && "rotate-180"
                          )}
                        />
                      </Button>
                    </TableHead>
                    <TableHead
                      className="text-body px-1 sm:px-3 py-2 min-w-[100px] sm:min-w-[140px] text-center font-semibold"
                    >
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("location")}
                        className="text-body hover:text-accent w-full flex justify-center items-center gap-1 text-sm sm:text-base cursor-pointer"
                        aria-label="Sort by location"
                      >
                        Location
                        <ArrowUpDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            sortField === "location" && sortOrder === "desc" && "rotate-180"
                          )}
                        />
                      </Button>
                    </TableHead>
                    <TableHead
                      className="text-body px-1 sm:px-3 py-2 min-w-[80px] sm:min-w-[100px] text-center font-semibold"
                    >
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("salary")}
                        className="text-body hover:text-accent w-full flex justify-center items-center gap-1 text-sm sm:text-base cursor-pointer"
                        aria-label="Sort by salary"
                      >
                        Salary
                        <ArrowUpDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            sortField === "salary" && sortOrder === "desc" && "rotate-180"
                          )}
                        />
                      </Button>
                    </TableHead>
                    <TableHead
                      className="text-body px-1 sm:px-3 py-2 min-w-[80px] sm:min-w-[100px] text-center font-semibold"
                    >
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("advance")}
                        className="text-body hover:text-accent w-full flex justify-center items-center gap-1 text-sm sm:text-base cursor-pointer"
                        aria-label="Sort by advance"
                      >
                        Advance
                        <ArrowUpDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            sortField === "advance" && sortOrder === "desc" && "rotate-180"
                          )}
                        />
                      </Button>
                    </TableHead>
                    <TableHead
                      className="text-body px-1 sm:px-3 py-2 min-w-[80px] sm:min-w-[100px] text-center font-semibold hidden sm:table-cell"
                    >
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("leaves")}
                        className="text-body hover:text-accent w-full flex justify-center items-center gap-1 text-sm sm:text-base cursor-pointer"
                        aria-label="Sort by leaves"
                      >
                        Leaves (O/C)
                        <ArrowUpDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            sortField === "leaves" && sortOrder === "desc" && "rotate-180"
                          )}
                        />
                      </Button>
                    </TableHead>
                    <TableHead
                      className="text-body px-1 sm:px-3 py-2 min-w-[80px] sm:min-w-[100px] text-center font-semibold"
                    >
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("status")}
                        className="text-body hover:text-accent w-full flex justify-center items-center gap-1 text-sm sm:text-base cursor-pointer"
                        aria-label="Sort by status"
                      >
                        Status
                        <ArrowUpDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            sortField === "status" && sortOrder === "desc" && "rotate-180"
                          )}
                        />
                      </Button>
                    </TableHead>
                    <TableHead
                      className="text-body px-1 sm:px-3 py-2 min-w-[120px] sm:min-w-[160px] text-center font-semibold"
                    >
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.map((employee) => {
                    const openingLeaves = Math.max(employee.paidLeaves?.available || 0, 0);
                    const leavesAccrued = Math.max(employee.paidLeaves?.carriedForward || 0, 0);
                    const leavesTaken = Math.max(employee.paidLeaves?.used || 0, 0);
                    const closingLeaves = Math.max(openingLeaves + leavesAccrued - leavesTaken, 0);

                    const isHighlighted = shouldHighlightEmployee(employee);
                    if (employee.paidLeaves?.carriedForward < 0) {
                      console.warn(`Negative carriedForward for employee ${employee.employeeId}: ${employee.paidLeaves.carriedForward}`);
                    }

                    return (
                      <TableRow
                        key={employee._id}
                        className={cn(
                          "transition-colors duration-200 hover:bg-accent/10 cursor-pointer",
                          isHighlighted && "bg-accent-light animate-pulse",
                          selectedEmployeeId === employee._id && "bg-accent/20"
                        )}
                        onClick={() => handleRowClick(employee._id)}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleViewClick(employee._id)}
                      >
                        <TableCell
                          className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center sticky left-0 bg-complementary shadow-sm z-10"
                        >
                          {employee.employeeId}
                        </TableCell>
                        <TableCell
                          className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center sticky left-[80px] sm:left-[100px] bg-complementary shadow-sm z-10"
                        >
                          {employee.name}
                        </TableCell>
                        <TableCell
                          className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center whitespace-normal"
                        >
                          {employee.designation}
                        </TableCell>
                        <TableCell
                          className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center whitespace-normal"
                        >
                          {employee.department}
                        </TableCell>
                        <TableCell
                          className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center whitespace-normal"
                        >
                          {employee.location?.name || "N/A"}
                        </TableCell>
                        <TableCell
                          className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center"
                        >
                          ₹{employee.salary?.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center"
                        >
                          ₹{getCurrentAdvance(employee).toFixed(2)}
                        </TableCell>
                        <TableCell
                          className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center hidden sm:table-cell"
                        >
                          {openingLeaves}/{closingLeaves}
                        </TableCell>
                        <TableCell
                          className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center"
                        >
                          {employee.status}
                        </TableCell>
                        <TableCell
                          className="px-1 sm:px-3 py-2 text-sm sm:text-base flex justify-center items-center space-x-1 sm:space-x-2"
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewClick(employee._id)}
                                  className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer"
                                  aria-label={`View employee ${employee.name}`}
                                >
                                  <Eye className="h-4 w-4" />
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
                                  className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer"
                                  aria-label={`Edit employee ${employee.name}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Employee</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTransferClick(employee)}
                                  className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer disabled:cursor-not-allowed"
                                  disabled={employee.status !== "active"}
                                  aria-label={`Transfer employee ${employee.name}`}
                                >
                                  <Truck className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Transfer Employee</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleHistoryClick(employee)}
                                  className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer"
                                  aria-label={`View history for employee ${employee.name}`}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View History</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAddDocumentsClick(employee)}
                                  className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer"
                                  aria-label={`Add documents for employee ${employee.name}`}
                                >
                                  <FilePlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Add Documents</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateAdvanceClick(employee)}
                                  className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer"
                                  aria-label={`Update advance for employee ${employee.name}`}
                                >
                                  <IndianRupee className="h-4 w-4" />
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
                                    onClick={() => handleDeactivateClick(employee._id)}
                                    className="text-error hover:text-error-hover transition-transform hover:scale-105 cursor-pointer"
                                    aria-label={`Deactivate employee ${employee.name}`}
                                  >
                                    <LogOut className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Deactivate Employee</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRejoinClick(employee)}
                                    className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer"
                                    aria-label={`Rejoin employee ${employee.name}`}
                                  >
                                    <UserPlus className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Rejoin Employee</TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-sm py-1 sm:py-2 px-2 sm:px-3 min-w-[32px] sm:min-w-[40px] transition-all hover:scale-105 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className={cn(
                        currentPage === page
                          ? "bg-accent text-body"
                          : "border-complementary text-body hover:bg-complementary/10",
                        "rounded-md text-sm py-1 sm:py-2 px-2 sm:px-3 min-w-[32px] sm:min-w-[40px] transition-all hover:scale-105 cursor-pointer"
                      )}
                      aria-label={`Go to page ${page}`}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-sm py-1 sm:py-2 px-2 sm:px-3 min-w-[32px] sm:min-w-[40px] transition-all hover:scale-105 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-body">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-accent/50 mb-2 animate-pulse" />
              <p className="text-sm">
                No employees found
              </p>
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={() => navigate("/siteincharge/register-employee")}
                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-sm py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md hover:scale-105 cursor-pointer"
                  aria-label="Register new employee"
                >
                  <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Add Employee
                </Button>
                <Button
                  variant="outline"
                  className="text-body hover:bg-accent/10 rounded-md text-sm py-1 sm:py-2 px-3 sm:px-4 transition-all hover:scale-105 cursor-pointer"
                  onClick={() =>
                    dispatch(
                      fetchEmployees({
                        location: locationId,
                        department: filterDepartment === "all" ? undefined : filterDepartment,
                        status: filterStatus === "all" ? undefined : filterStatus,
                        cache: false,
                      })
                    )
                  }
                  aria-label="Refresh employee data"
                >
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EditDialog
        open={openEditDialog}
        onOpenChange={setOpenEditDialog}
        employee={employeeToEdit}
        setSuccessMessage={setSuccessMessage}
      />
      <TransferDialog
        open={openTransferDialog}
        onOpenChange={setOpenTransferDialog}
        employeeId={transferEmployeeId}
        allLocations={allLocations}
        setSuccessMessage={setSuccessMessage}
      />
      <RejoinDialog
        open={openRejoinDialog}
        onOpenChange={setOpenRejoinDialog}
        employee={employeeToRejoin}
        setSuccessMessage={setSuccessMessage}
      />
      <AddDocumentsDialog
        open={openAddDocumentsDialog}
        onOpenChange={setOpenAddDocumentsDialog}
        employeeId={addDocumentsEmployeeId}
        setSuccessMessage={setSuccessMessage}
      />
      <DeactivateDialog
        open={openDeactivateDialog}
        onOpenChange={setOpenDeactivateDialog}
        employeeId={deactivateEmployeeId}
        setSuccessMessage={setSuccessMessage}
      />
      <UpdateAdvanceDialog
        open={openUpdateAdvanceDialog}
        onOpenChange={setOpenUpdateAdvanceDialog}
        employee={employeeToUpdateAdvance}
        setSuccessMessage={setSuccessMessage}
      />
    </Layout>
  );
};

export default Employees;