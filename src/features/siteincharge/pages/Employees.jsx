// components/siteincharge/Employees.js
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
  Pencil, // Add Pencil icon
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { format } from 'date-fns';

const Employees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const {
    employees,
    locations,
    allLocations,
    settings,
    loading: employeesLoading,
  } = useSelector((state) => state.siteInchargeEmployee);

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
  const [advanceMonth, setAdvanceMonth] = useState(new Date().getMonth() + 1); // Current month (1-12)
  const [advanceYear, setAdvanceYear] = useState(new Date().getFullYear()); // Current year
  const itemsPerPage = 5;

  const locationId = user?.locations?.[0]?._id;
  const HIGHLIGHT_DURATION = settings?.highlightDuration ?? 24 * 60 * 60 * 1000;

  const departments = useMemo(() => {
    return [...new Set(employees.map((emp) => emp.department))].sort();
  }, [employees]);

  // Helper function to get advance for the selected month and year
  const getCurrentAdvance = (employee) => {
    if (!employee?.advances || !Array.isArray(employee.advances)) return 0;
    const advanceEntry = employee.advances.find(
      (adv) => adv.year === advanceYear && adv.month === advanceMonth
    );
    return advanceEntry ? advanceEntry.amount : 0;
  };

  const filteredEmployees = useMemo(() => {
    return employees
      .filter(
        (emp) =>
          (emp.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (emp.employeeId || "").toLowerCase().includes(search.toLowerCase())
      )
      .filter(
        (emp) => filterDepartment === "all" || emp.department === filterDepartment
      )
      .filter((emp) => filterStatus === "all" || emp.status === filterStatus);
  }, [employees, search, filterDepartment, filterStatus]);

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      let aValue, bValue;
      if (sortField === "salary") {
        aValue = a[sortField] || 0;
        bValue = b[sortField] || 0;
      } else if (sortField === "advance") {
        aValue = getCurrentAdvance(a) || 0;
        bValue = getCurrentAdvance(b) || 0;
      } else if (sortField === "location") {
        aValue = (a.location?.name || a.location?.city || "").toLowerCase();
        bValue = (b.location?.name || b.location?.city || "").toLowerCase();
      } else if (sortField === "leaves") {
        aValue = a.paidLeaves?.available || 0;
        bValue = b.paidLeaves?.available || 0;
      } else if (sortField === "status") {
        aValue = (a.status || "").toLowerCase();
        bValue = (b.status || "").toLowerCase();
      } else {
        aValue = (a[sortField] || "").toLowerCase();
        bValue = (b[sortField] || "").toLowerCase();
      }
      return sortOrder === "asc" ? (aValue < bValue ? -1 : 1) : (aValue > bValue ? -1 : 1);
    });
  }, [filteredEmployees, sortField, advanceMonth, advanceYear]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = sortedEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages]);

  useEffect(() => {
    dispatch(fetchMe()).unwrap().catch(() => navigate("/login"));
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "siteincharge")) {
      navigate("/login");
    } else if (!authLoading && !user?.locations?.length) {
      navigate("/siteincharge/dashboard");
    } else if (!authLoading && locationId) {
      dispatch(fetchEmployees({ location: locationId, status: filterStatus === "all" ? undefined : filterStatus }));
      dispatch(fetchLocations());
      dispatch(fetchAllLocations());
      dispatch(fetchSettings());
    }
  }, [user, authLoading, locationId, dispatch, navigate, filterStatus]);

  const handleSort = (field) => {
    setSortField(field);
    setSortOrder(sortField === field ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
    setCurrentPage(1);
  };

  const handleFilterDepartmentChange = (value) => {
    setFilterDepartment(value);
    setSearchParams({
      ...(value !== "all" && { department: value}),
      ...(filterStatus !== "all" && { status: value }),
    });
    setCurrentPage(1);
  };

  const handleFilterStatusChange = (value) => {
    setFilterStatus(value);
    setSearchParams({
      ...(filterDepartment !== "all" && { department: filterDepartment }),
      ...(value !== "all" && { status: value }),
    });
    setCurrentPage(1);
  };

  const handleAdvanceMonthChange = (value) => {
    setAdvanceMonth(parseInt(value));
    setCurrentPage(1);
  };

  const handleAdvanceYearChange = (value) => {
    setAdvanceYear(parseInt(value));
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleUpdateAdvanceClick = (employee) => {
    setEmployeeToUpdateAdvance({ ...employee, currentMonth: advanceMonth, currentYear: advanceYear });
    setOpenUpdateAdvanceDialog(true);
  };

  const shouldHighlightEmployee = (employee) => {
    if (!employee.transferTimestamp) return false;
    const transferTime = new Date(employee.transferTimestamp).getTime();
    const currentTime = new Date().getTime();
    return currentTime - transferTime <= HIGHLIGHT_DURATION;
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2025, i), 'MMMM'),
  }));
  const years = [2024, 2025, 2026].map(y => y.toString());

  return (
    <Layout title="Employees" role="siteincharge">
      <Alerts />
      <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-max-w-full mx-auto">
        <CardHeader>
          <CardTitle className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 w-full max-w-full">
            <span className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
              Employee List
            </span>
            <div className="flex flex-col lg:flex-row gap-3 items-center w-full lg:w-auto">
              <div className="relative w-full lg:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-body h-5 w-5" />
                <Input
                  placeholder="Search by name or ID"
                  className="pl-10 h-9 xl:h-10 bg-body text-background border-background focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-xs sm:text-sm xl:text-base transition-all duration-300 hover:shadow-sm w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                value={filterDepartment}
                onValueChange={handleFilterDepartmentChange}
              >
                <SelectTrigger className="w-full lg:w-48 h-9 xl:h-10 bg-complementary text-body border-complementary">
                  <SelectValue placeholder="Filter by Department" />
                </SelectTrigger>
                <SelectContent className="bg-complementary text-body">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterStatus}
                onValueChange={handleFilterStatusChange}
              >
                <SelectTrigger className="w-full lg:w-48 h-9 xl:h-10 bg-complementary text-body border-background">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent className="bg-complementary text-body">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={advanceMonth.toString()}
                onValueChange={handleAdvanceMonthChange}
              >
                <SelectTrigger className="w-full lg:w-48 h-9 xl:h-10 bg-complementary text-body border-background">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent className="bg-complementary text-body">
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={advanceYear.toString()}
                onValueChange={handleAdvanceYearChange}
              >
                <SelectTrigger className="w-full lg:w-48 h-9 xl:h-10 bg-complementary text-body border-background">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent className="bg-complementary text-body">
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => navigate("/siteincharge/register-employee")}
                className="bg-accent text-background hover:bg-accent-dark rounded-md text-xs sm:text-sm xl:text-base py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md w-full lg:w-auto"
              >
                <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Add Employee
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employeesLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : sortedEmployees.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table className="w-full border-collapse">
                  <TableHeader>
                    <TableRow className="bg-complementary hover:bg-accent/10">
                      {["employeeId", "name", "designation", "department", "location", "salary", "advance", "leaves", "status"].map(
                        (field) => (
                          <TableHead key={field} className="text-body px-4 py-2">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort(field)}
                              className="text-body hover:text-accent w-full text-left flex items-center gap-1 text-xs sm:text-sm xl:text-base"
                            >
                              {field === "leaves"
                                ? "Leaves (O/C)"
                                : field === "advance"
                                ? "Advance"
                                : field.charAt(0).toUpperCase() + field.slice(1)}
                              <ArrowUpDown
                                className={cn(
                                  "h-4 w-4 transition-transform",
                                  sortField === field && sortOrder === "desc" && "rotate-180"
                                )}
                              />
                            </Button>
                          </TableHead>
                        )
                      )}
                      <TableHead className="text-body px-4 py-2 text-xs sm:text-sm xl:text-base">
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

                      return (
                        <TableRow
                          key={employee._id}
                          className={cn(
                            "transition-colors duration-200",
                            shouldHighlightEmployee(employee) && "bg-accent-light animate-pulse"
                          )}
                        >
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">{employee.employeeId}</TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">{employee.name}</TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">{employee.designation}</TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">{employee.department}</TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">{employee.location?.name || employee.location?.city || "N/A"}</TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">₹{employee.salary?.toFixed(2)}</TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">₹{getCurrentAdvance(employee).toFixed(2)}</TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">{openingLeaves}/{closingLeaves}</TableCell>
                          <TableCell className="px-4 py-2 text-xs sm:text-sm xl:text-base">{employee.status}</TableCell>
                          <TableCell className="px-4 py-2 space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/siteincharge/employees/${employee._id}`)}
                                    className="text-accent hover:text-accent-hover transition-colors"
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
                                    onClick={() => {
                                      setEmployeeToEdit(employee);
                                      setOpenEditDialog(true);
                                    }}
                                    className="text-accent hover:text-accent-hover transition-colors"
                                  >
                                    <Pencil className="h-5 w-5" /> {/* Replaced SVG with Pencil icon */}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Employee</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setTransferEmployeeId(employee._id);
                                      setOpenTransferDialog(true);
                                    }}
                                    className="text-accent hover:text-accent-hover transition-colors"
                                    disabled={employee.status !== "active"}
                                  >
                                    <Truck className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Transfer Employee</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/siteincharge/employees/${employee._id}/history`)}
                                    className="text-accent hover:text-accent-hover transition-colors"
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
                                    onClick={() => {
                                      setAddDocumentsEmployeeId(employee._id);
                                      setOpenAddDocumentsDialog(true);
                                    }}
                                    className="text-accent hover:text-accent-hover transition-colors"
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
                                    onClick={() => handleUpdateAdvanceClick(employee)}
                                    className="text-accent hover:text-accent-hover transition-colors"
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
                                      onClick={() => {
                                        setDeactivateEmployeeId(employee._id);
                                        setOpenDeactivateDialog(true);
                                      }}
                                      className="text-error hover:text-error-hover transition-colors"
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
                                      onClick={() => {
                                        setEmployeeToRejoin(employee);
                                        setOpenRejoinDialog(true);
                                      }}
                                      className="text-accent hover:text-accent-hover transition-colors"
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
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-xs sm:text-sm xl:text-base py-1 sm:py-2 px-2 sm:px-3"
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
                          ? "bg-accent text-bg-accent"
                          : "border-complementary text-body hover:bg-complementary/10",
                        "rounded-md text-xs sm:text-sm xl:text-base py-1 sm:py-2 px-2 sm:px-3"
                      )}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-xs sm:text-sm xl:text-base py-1 sm:py-2 px-2 sm:px-3"
                  >
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
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
                onClick={() => navigate("/siteincharge/register-employee")}
                className="mt-2 bg-accent text-bg-accent hover:bg-accent-hover rounded-md text-xs sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4"
              >
                <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Add Employee
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <EditDialog
        open={openEditDialog}
        onOpenChange={setOpenEditDialog}
        employee={employeeToEdit}
      />
      <TransferDialog
        open={openTransferDialog}
        onOpenChange={setOpenTransferDialog}
        employeeId={transferEmployeeId}
        allLocations={allLocations}
      />
      <RejoinDialog
        open={openRejoinDialog}
        onOpenChange={setOpenRejoinDialog}
        employee={employeeToRejoin}
      />
      <AddDocumentsDialog
        open={openAddDocumentsDialog}
        onOpenChange={setOpenAddDocumentsDialog}
        employeeId={addDocumentsEmployeeId}
      />
      <DeactivateDialog
        open={openDeactivateDialog}
        onOpenChange={setOpenDeactivateDialog}
        employeeId={deactivateEmployeeId}
      />
      <UpdateAdvanceDialog
        open={openUpdateAdvanceDialog}
        onOpenChange={setOpenUpdateAdvanceDialog}
        employee={employeeToUpdateAdvance}
      />
    </Layout>
  );
};

export default Employees;