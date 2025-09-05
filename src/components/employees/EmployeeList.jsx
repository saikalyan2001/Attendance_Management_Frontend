import { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Trash2,
  MoreHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import Layout from "../layout/Layout";
import TooltipButton from "./ToolTipButton";
import SuperAdminEditEmployeeDialog from "../../features/superadmin/pages/SuperAdminEditEmployeeDialog";
import AdminEditEmployeeDialog from "../../features/admin/pages/AdminEditEmployeeDialog";
import SiteInchargeEditEmployeeDialog from "../../features/siteincharge/pages/SiteInchargeEditEmployeeDialog";
import SuperAdminAddDocumentsDialog from "../../features/superadmin/pages/SuperAdminAddDocumentsDialog";
import AdminAddDocumentsDialog from "../../features/admin/pages/AdminAddDocumentsDialog";
import SiteInchargeAddDocumentsDialog from "../../features/siteincharge/pages/SiteInchargeAddDocumentsDialog";

// Helper function to generate pagination pages with ellipsis
const generatePaginationPages = (currentPage, totalPages, maxVisiblePages = 5) => {
  const pages = [];
  
  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    const halfVisible = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);
    
    if (currentPage <= halfVisible) {
      endPage = Math.min(totalPages, maxVisiblePages);
    } else if (currentPage > totalPages - halfVisible) {
      startPage = Math.max(1, totalPages - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
  }
  
  return pages;
};

// Helper function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Helper function to get navigation path with role conversion
const getNavigationPath = (role, path) => {
  const routeRole = role === 'super_admin' ? 'super_admin' : role;
  return `/${routeRole}/${path}`;
};

const EmployeeList = ({
  role,
  reduxSelectors,
  actions,
  DialogComponents,
  AlertsComponent,
  locationId,
  showLocationFilter = true,
  useDynamicDepartments = false,
  itemsPerPage = 10,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);

  

  const employeesState = useSelector(reduxSelectors.employees);
  const settingsState = useSelector(reduxSelectors.settings);
  const locationsState = useSelector(reduxSelectors.locations);
  const locationSelector = role === "siteincharge" ? reduxSelectors.allLocations : reduxSelectors.locations;
  const locationsData = useSelector(locationSelector) || {};
  const allLocationsData = role === "siteincharge" ? useSelector(reduxSelectors.allLocations) || {} : {};
  const { allEmployees = [] } = employeesState;

  const {
    employees = [],
    departments = [],
    loading: employeesLoading,
    pagination = {},
  } = employeesState || {};

  const { settings = {}, loading: settingsLoading } = settingsState || {};
  const { locations = [], loading: locationsLoading } = locationsData || {};
  const { allLocations = [] } = allLocationsData;

  
  
  
  

  const initialDepartment = searchParams.get("department") || "all";
  const initialStatus = searchParams.get("status") || "all";
  const initialLocation = searchParams.get("location") || "all";
  const initialSearch = searchParams.get("search") || "";
  const initialPage = parseInt(searchParams.get("page")) || 1;

  const [filterDepartment, setFilterDepartment] = useState(initialDepartment);
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [filterLocation, setFilterLocation] = useState(
    showLocationFilter ? initialLocation : "all"
  );
  const [search, setSearch] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [sortField, setSortField] = useState("employeeId");
  const [sortOrder, setSortOrder] = useState("asc");
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openTransferDialog, setOpenTransferDialog] = useState(false);
  const [openRejoinDialog, setOpenRejoinDialog] = useState(false);
  const [openAddDocumentsDialog, setOpenAddDocumentsDialog] = useState(false);
  const [openDeactivateDialog, setOpenDeactivateDialog] = useState(false);
  const [openUpdateAdvanceDialog, setOpenUpdateAdvanceDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [transferEmployeeId, setTransferEmployeeId] = useState(null);
  const [employeeToRejoin, setEmployeeToRejoin] = useState(null);
  const [addDocumentsEmployeeId, setAddDocumentsEmployeeId] = useState(null);
  const [deactivateEmployeeId, setDeactivateEmployeeId] = useState(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState(null);
  const [restoreEmployeeId, setRestoreEmployeeId] = useState(null);
  const [employeeToUpdateAdvance, setEmployeeToUpdateAdvance] = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [dropdownKey, setDropdownKey] = useState(0);

  const HIGHLIGHT_DURATION = settings?.highlightDuration ?? 24 * 60 * 60 * 1000;

  const availableDepartments = useDynamicDepartments
    ? [...new Set(allEmployees.map((emp) => emp.department).filter(Boolean))].sort()
    : departments || [];

  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      setSearch(searchValue);
      setCurrentPage(1);
    }, 500),
    []
  );

  const getCurrentAdvance = (employee) => {
    if (!employee?.advances || !Array.isArray(employee.advances)) return 0;
    const sortedAdvances = [...employee.advances].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - b.month;
    });
    return sortedAdvances[0]?.amount || 0;
  };

  const shouldHighlightEmployee = (employee) => {
    if (!employee.transferTimestamp) return false;
    const transferTime = new Date(employee.transferTimestamp).getTime();
    const currentTime = new Date().getTime();
    return currentTime - transferTime <= HIGHLIGHT_DURATION;
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setCurrentPage(1);
    setTimeout(() => {
      const searchInput = document.querySelector('[aria-label="Search employees by name or ID"]');
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  };

  const handleDropdownClose = () => {
    setDropdownKey(prev => prev + 1);
    setTimeout(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    }, 100);
  };

  useEffect(() => {
    setOpenDeleteDialog(false);
    setDeleteEmployeeId(null);
    setOpenRestoreDialog(false);
    setRestoreEmployeeId(null);
    dispatch(actions.resetEmployees());
  }, [dispatch, actions.resetEmployees]);

  useEffect(() => {
    dispatch(actions.fetchLocations());
    if (role === "siteincharge" && actions.fetchAllLocations) {
      dispatch(actions.fetchAllLocations());
    }
    dispatch(actions.fetchSettings());
    
    if (!useDynamicDepartments && actions.fetchDepartments) {
      dispatch(actions.fetchDepartments({ location: filterLocation === "all" ? undefined : filterLocation }))
        .unwrap()
        .catch((err) => {
          
          toast.error(err.message || "Failed to fetch departments");
        });
    }
  }, [dispatch, actions, filterLocation, useDynamicDepartments, role]);

  useEffect(() => {
    debouncedSearch(searchInput);
  }, [searchInput, debouncedSearch]);

  useEffect(() => {
    const fetchParams = {
      location: showLocationFilter
        ? filterLocation === "all" 
          ? undefined 
          : filterLocation
        : locationId,
      department: filterDepartment === "all" ? undefined : filterDepartment,
      status: filterStatus === "all" || filterStatus === "deleted" ? undefined : filterStatus,
      isDeleted: filterStatus === "deleted" ? true : undefined,
      search: search || undefined,
      page: currentPage,
      limit: itemsPerPage,
    };

    dispatch(actions.fetchEmployees(fetchParams))
      .unwrap()
      .catch((err) => {
        
        toast.error(err.message || "Failed to fetch employees");
      });

    const params = {};
    if (filterLocation !== "all" && showLocationFilter) params.location = filterLocation;
    if (filterDepartment !== "all") params.department = filterDepartment;
    if (filterStatus !== "all") params.status = filterStatus;
    if (search) params.search = search;
    if (currentPage !== 1) params.page = currentPage;
    setSearchParams(params);
  }, [dispatch, filterLocation, filterDepartment, filterStatus, search, currentPage, locationId, showLocationFilter, itemsPerPage, actions.fetchEmployees, setSearchParams]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage, { duration: 4000 });
      setSuccessMessage(null);
    }
  }, [successMessage]);

  const totalPages = pagination.totalPages || 1;
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      let aValue, bValue;
      if (sortField === "employeeId") {
        aValue = a.employeeId || "";
        bValue = b.employeeId || "";
        
        const aNum = parseInt(aValue.match(/\d+$/)?.[0] || aValue, 10);
        const bNum = parseInt(bValue.match(/\d+$/)?.[0] || bValue, 10);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
        }
        
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (sortField === "salary") {
        aValue = a[sortField] || 0;
        bValue = b[sortField] || 0;
      } else if (sortField === "advance") {
        aValue = getCurrentAdvance(a);
        bValue = getCurrentAdvance(b);
      } else if (sortField === "location") {
        aValue =
          (typeof a.location === "object" ? a.location?.name : a.location) || "N/A";
        bValue =
          (typeof b.location === "object" ? b.location?.name : b.location) || "N/A";
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
  }, [employees, sortField, sortOrder]);

  const getLocationName = (id) => {
    if (id === "all") return "All Locations";
    const location = locations.find((loc) => loc._id === id);
    return location ? location.name || location.city || "Unknown" : id;
  };

  const getDepartmentName = (dept) => (dept === "all" ? "All Departments" : dept);

  const getStatusName = (status) => {
    if (status === "all") return "All Statuses";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const handleEditClick = (employee) => {
    if (!employee || !employee._id) {
      toast.error("Invalid employee data");
      return;
    }
    setEmployeeToEdit(employee);
    setOpenEditDialog(true);
    setSelectedEmployeeId(employee._id);
  };

  const handleTransferClick = (employee) => {
    if (!employee || !employee._id) {
      toast.error("Invalid employee data");
      return;
    }
    setTransferEmployeeId(employee._id);
    setOpenTransferDialog(true);
    setSelectedEmployeeId(employee._id);
  };

  const handleRejoinClick = (employee) => {
    if (!employee || !employee._id) {
      toast.error("Invalid employee data");
      return;
    }
    setEmployeeToRejoin(employee);
    setOpenRejoinDialog(true);
    setSelectedEmployeeId(employee._id);
  };

  const handleHistoryClick = (employee) => {
    if (!employee || !employee._id) {
      toast.error("Invalid employee data");
      return;
    }
    navigate(getNavigationPath(role, `employees/${employee._id}/history`));
    setSelectedEmployeeId(employee._id);
  };

  const handleAddDocumentsClick = (employee) => {
    if (!employee || !employee._id) {
      toast.error("Invalid employee data");
      return;
    }
    setAddDocumentsEmployeeId(employee._id);
    setOpenAddDocumentsDialog(true);
    setSelectedEmployeeId(employee._id);
  };

  const handleDeactivateClick = (id) => {
    if (!id) {
      toast.error("Invalid employee ID");
      return;
    }
    setDeactivateEmployeeId(id);
    setOpenDeactivateDialog(true);
    setSelectedEmployeeId(id);
  };

  const handleDeleteClick = (id) => {
    if (!id) {
      toast.error("Invalid employee ID");
      return;
    }
    setDeleteEmployeeId(id);
    setOpenDeleteDialog(true);
    setSelectedEmployeeId(id);
  };

  const handleRestoreClick = (id) => {
    if (!id) {
      toast.error("Invalid employee ID");
      return;
    }
    setRestoreEmployeeId(id);
    setOpenRestoreDialog(true);
    setSelectedEmployeeId(id);
  };

  const handleUpdateAdvanceClick = (employee) => {
    if (!employee || !employee._id) {
      toast.error("Invalid employee data");
      return;
    }
    setEmployeeToUpdateAdvance(employee);
    setOpenUpdateAdvanceDialog(true);
    setSelectedEmployeeId(employee._id);
  };

  const handleViewClick = (employeeId) => {
    if (!employeeId) {
      toast.error("Invalid employee ID");
      return;
    }
    navigate(getNavigationPath(role, `employees/${employeeId}`));
    setSelectedEmployeeId(employeeId);
  };

  const handleRowClick = (employeeId) => {
    if (!employeeId) {
      toast.error("Invalid employee ID");
      return;
    }
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

  const handleFilterLocationChange = (value) => {
    setFilterLocation(value);
    setFilterDepartment("all");
    setCurrentPage(1);
    setTimeout(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    }, 100);
  };

  const handleFilterDepartmentChange = (value) => {
    setFilterDepartment(value);
    setCurrentPage(1);
    setTimeout(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    }, 100);
  };

  const handleFilterStatusChange = (value) => {
    setFilterStatus(value);
    setCurrentPage(1);
    setTimeout(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    }, 100);
  };

  const handleClearFilters = () => {
    setFilterLocation(showLocationFilter ? "all" : filterLocation);
    setFilterDepartment("all");
    setFilterStatus("all");
    setSearch("");
    setSearchInput("");
    setCurrentPage(1);
    setSelectedEmployeeId(null);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== '...') {
      setCurrentPage(page);
      setSelectedEmployeeId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await dispatch(actions.deleteEmployee(deleteEmployeeId)).unwrap();
      setSuccessMessage("Employee deleted successfully");
      setOpenDeleteDialog(false);
      setDeleteEmployeeId(null);
      dispatch(actions.fetchEmployees({
        location: showLocationFilter
          ? filterLocation === "all" ? undefined : filterLocation
          : locationId,
        department: filterDepartment === "all" ? undefined : filterDepartment,
        status: filterStatus === "all" || filterStatus === "deleted" ? undefined : filterStatus,
        isDeleted: filterStatus === "deleted" ? true : undefined,
        search: search || undefined,
        page: currentPage,
        limit: itemsPerPage,
      }));
    } catch (err) {
      toast.error(err.message || "Failed to delete employee");
    }
  };

  const handleRestoreConfirm = async () => {
    try {
      await dispatch(actions.restoreEmployee(restoreEmployeeId)).unwrap();
      setSuccessMessage("Employee restored successfully");
      setOpenRestoreDialog(false);
      setRestoreEmployeeId(null);
      dispatch(actions.fetchEmployees({
        location: showLocationFilter
          ? filterLocation === "all" ? undefined : filterLocation
          : locationId,
        department: filterDepartment === "all" ? undefined : filterDepartment,
        status: filterStatus === "all" || filterStatus === "deleted" ? undefined : filterStatus,
        isDeleted: filterStatus === "deleted" ? true : undefined,
        search: search || undefined,
        page: currentPage,
        limit: itemsPerPage,
      }));
    } catch (err) {
      toast.error(err.message || "Failed to restore employee");
    }
  };

  // Map role to EditDialog component
  const EditDialog = role === 'super_admin' ? SuperAdminEditEmployeeDialog :
                   role === 'admin' ? AdminEditEmployeeDialog :
                   SiteInchargeEditEmployeeDialog;

  // Map role to AddDocumentsDialog component
  const AddDocumentsDialogComponent = role === 'super_admin' ? SuperAdminAddDocumentsDialog :
                                     role === 'admin' ? AdminAddDocumentsDialog :
                                     SiteInchargeAddDocumentsDialog;

  const { TransferDialog, RejoinDialog, DeactivateDialog, UpdateAdvanceDialog } = DialogComponents;

  const paginationPages = generatePaginationPages(currentPage, totalPages);

  return (
    <Layout title="Employees" role={role}>
      {AlertsComponent && <AlertsComponent />}
      <Card className="bg-gradient-to-br from-complementary to-complementary-dark text-body shadow-lg rounded-md border border-accent/10 animate-fade-in max-w-full mx-auto w-full">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex flex-row flex-wrap gap-2 sm:gap-3 items-center w-full max-w-full">
            <span className="text-base sm:text-lg md:text-xl font-semibold shrink-0">
              Employee List
            </span>
            <TooltipButton
              onClick={() => navigate(getNavigationPath(role, 'register-employee'))}
              tooltipText="Add new employee"
              ariaLabel="Register new employee"
              className="h-9 sm:h-10 text-body border-complementary hover:bg-accent/10 rounded-md text-sm sm:text-base py-1 px-2 sm:py-2 sm:px-3 flex items-center transition-all duration-300 hover:shadow-sm hover:scale-105 shrink-0 md:ml-auto max-sm:w-full cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 mr-1 sm:mr-2" />
              Add
            </TooltipButton>
            <div className="flex flex-row flex-wrap gap-2 sm:gap-3 items-center max-sm:flex-col max-sm:gap-3 max-sm:w-full">
              <div className="relative min-w-[140px] sm:min-w-[180px] sm:max-w-[240px] max-sm:w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-body h-4 w-4 z-10" />
                <Input
                  placeholder="Search by name or ID"
                  className="pl-10 pr-10 h-9 sm:h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent rounded-md text-sm sm:text-base transition-all duration-300 hover:shadow-sm max-sm:w-full cursor-text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search employees by name or ID"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  {searchInput && (
                    <TooltipButton
                      onClick={handleClearSearch}
                      tooltipText="Clear search"
                      ariaLabel="Clear search"
                      asChild
                    >
                      <button className="h-6 w-6 p-0 hover:bg-accent/20 rounded-full transition-all duration-200 hover:scale-110 flex items-center justify-center">
                        <X className="h-3 w-3 text-body/70 hover:text-body" />
                      </button>
                    </TooltipButton>
                  )}
                  {employeesLoading && (
                    <Loader2 className="h-4 w-4 text-body animate-spin" />
                  )}
                </div>
              </div>

              {showLocationFilter && (
                <Select
                  key={`location-filter-${dropdownKey}`}
                  value={filterLocation}
                  onValueChange={handleFilterLocationChange}
                  disabled={locationsLoading || locations.length === 0}
                  aria-label={`Location filter set to ${getLocationName(filterLocation)}`}
                >
                  <SelectTrigger className="min-w-[140px] sm:min-w-[180px] sm:max-w-[240px] h-9 sm:h-10 bg-complementary text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent rounded-md text-sm sm:text-base truncate max-sm:w-full cursor-pointer disabled:cursor-not-allowed">
                    <SelectValue placeholder="Filter by location" className="truncate" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-complementary text-body"
                    position="popper"
                    sideOffset={5}
                  >
                    <SelectItem value="all" className="text-sm">
                      All Locations
                    </SelectItem>
                    {locations.length > 0 ? (
                      locations.map((loc) => (
                        <SelectItem key={loc._id} value={loc._id} className="text-sm">
                          {loc.name || loc.city || "Unknown"}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled className="text-sm">
                        No locations available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}

              <DropdownMenu 
                key={`filters-dropdown-${dropdownKey}`}
                modal={false}
                onOpenChange={(open) => {
                  if (!open) {
                    handleDropdownClose();
                  }
                }}
              >
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
                <DropdownMenuContent 
                  className="bg-complementary text-body w-56"
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <DropdownMenuLabel>Additional Filters</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-4 py-2">
                    <label className="text-xs font-semibold block mb-1">Department</label>
                    <Select
                      key={`department-filter-${dropdownKey}`}
                      value={filterDepartment}
                      onValueChange={handleFilterDepartmentChange}
                      disabled={employeesLoading || availableDepartments.length === 0}
                      aria-label={`Department filter set to ${getDepartmentName(filterDepartment)}`}
                    >
                      <SelectTrigger className="w-full h-9 bg-complementary text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent rounded-md text-sm cursor-pointer disabled:cursor-not-allowed">
                        <SelectValue placeholder="Filter by department" />
                      </SelectTrigger>
                      <SelectContent 
                        className="bg-complementary text-body"
                        position="popper"
                        sideOffset={5}
                      >
                        <SelectItem value="all" className="text-sm">
                          All Departments
                        </SelectItem>
                        {availableDepartments.length > 0 ? (
                          availableDepartments.map((dept) => (
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
                      key={`status-filter-${dropdownKey}`}
                      value={filterStatus}
                      onValueChange={handleFilterStatusChange}
                      aria-label={`Status filter set to ${getStatusName(filterStatus)}`}
                    >
                      <SelectTrigger className="w-full h-9 bg-complementary text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent rounded-md text-sm cursor-pointer">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent 
                        className="bg-complementary text-body"
                        position="popper"
                        sideOffset={5}
                      >
                        <SelectItem value="all" className="text-sm">All Statuses</SelectItem>
                        <SelectItem value="active" className="text-sm">Active</SelectItem>
                        <SelectItem value="inactive" className="text-sm">Inactive</SelectItem>
                        <SelectItem value="deleted" className="text-sm">Deleted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <TooltipButton
                onClick={handleClearFilters}
                tooltipText="Clear all filters and search"
                ariaLabel="Clear all filters"
                className={cn(
                  "h-9 sm:h-10 text-body border-complementary hover:bg-accent/10 rounded-md text-sm sm:text-base py-1 px-2 sm:py-2 sm:px-3 transition-all duration-300 hover:shadow-sm hover:scale-105 min-w-[100px] sm:min-w-[120px] max-sm:w-full cursor-pointer relative",
                  (filterLocation !== "all" || filterDepartment !== "all" || filterStatus !== "all" || searchInput) &&
                  "border-accent/50 bg-accent/5"
                )}
              >
                Clear
                {(() => {
                  const activeFilters = [
                    showLocationFilter && filterLocation !== "all",
                    filterDepartment !== "all", 
                    filterStatus !== "all",
                    searchInput
                  ].filter(Boolean).length;
                  
                  return activeFilters > 0 ? (
                    <span className="absolute -top-2 -right-2 bg-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {activeFilters}
                    </span>
                  ) : null;
                })()}
              </TooltipButton>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {employeesLoading || locationsLoading || settingsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: itemsPerPage }).map((_, i) => (
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
                    <TableHead className="text-body px-1 sm:px-3 py-2 min-w-[80px] sm:min-w-[100px] text-center font-semibold sticky left-0 bg-complementary shadow-sm z-20">
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
                    <TableHead className="text-body px-1 sm:px-3 py-2 min-w-[100px] sm:min-w-[120px] text-center font-semibold sticky left-[80px] sm:left-[100px] bg-complementary shadow-sm z-20">
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
                    <TableHead className="text-body px-1 sm:px-3 py-2 min-w-[80px] sm:min-w-[100px] text-center font-semibold bg-complementary">
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
                    <TableHead className="text-body px-1 sm:px-3 py-2 min-w-[80px] sm:min-w-[100px] text-center font-semibold bg-complementary">
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
                    <TableHead className="text-body px-1 sm:px-3 py-2 min-w-[100px] sm:min-w-[140px] text-center font-semibold bg-complementary">
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
                    <TableHead className="text-body px-1 sm:px-3 py-2 min-w-[80px] sm:min-w-[100px] text-center font-semibold bg-complementary">
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
                    <TableHead className="text-body px-1 sm:px-3 py-2 min-w-[80px] sm:min-w-[100px] text-center font-semibold bg-complementary">
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
                    <TableHead className="text-body px-1 sm:px-3 py-2 min-w-[80px] sm:min-w-[100px] text-center font-semibold bg-complementary hidden sm:table-cell">
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
                    <TableHead className="text-body px-1 sm:px-3 py-2 min-w-[80px] sm:min-w-[100px] text-center font-semibold bg-complementary">
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
                    <TableHead className="text-body px-1 sm:px-3 py-2 min-w-[120px] sm:min-w-[160px] text-center font-semibold bg-complementary">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEmployees.map((employee) => {
                    const openingLeaves = Math.max(employee.paidLeaves?.available || 0, 0);
                    const leavesAccrued = Math.max(employee.paidLeaves?.carriedForward || 0, 0);
                    const leavesTaken = Math.max(employee.paidLeaves?.used || 0, 0);
                    const closingLeaves = Math.max(openingLeaves + leavesAccrued - leavesTaken, 0);
                    const isHighlighted = shouldHighlightEmployee(employee);

                    if (employee.paidLeaves?.carriedForward < 0) {
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
                        <TableCell className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center sticky left-0 bg-complementary shadow-sm z-10">
                          {employee.employeeId}
                        </TableCell>
                        <TableCell className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center sticky left-[80px] sm:left-[100px] bg-complementary shadow-sm z-10">
                          {employee.name}
                        </TableCell>
                        <TableCell className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center whitespace-normal bg-complementary">
                          {employee.designation}
                        </TableCell>
                        <TableCell className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center whitespace-normal bg-complementary">
                          {employee.department}
                        </TableCell>
                        <TableCell className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center whitespace-normal bg-complementary">
                          {employee.location?.name || "N/A"}
                        </TableCell>
                        <TableCell className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center bg-complementary">
                          ₹{employee.salary?.toFixed(2)}
                        </TableCell>
                        <TableCell className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center bg-complementary">
                          ₹{getCurrentAdvance(employee).toFixed(2)}
                        </TableCell>
                        <TableCell className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center bg-complementary hidden sm:table-cell">
                          {openingLeaves}/{closingLeaves}
                        </TableCell>
                        <TableCell className="px-1 sm:px-3 py-2 text-sm sm:text-base text-center bg-complementary">
                          {employee.isDeleted ? "Deleted" : employee.status}
                        </TableCell>
                        <TableCell className="px-1 sm:px-3 py-2 text-sm sm:text-base bg-complementary flex justify-center items-center space-x-1 sm:space-x-2">
                          {employee.isDeleted ? (
                            <TooltipButton
                              onClick={() => handleRestoreClick(employee._id)}
                              tooltipText="Restore Employee"
                              ariaLabel={`Restore employee ${employee.name}`}
                              variant="ghost"
                              size="sm"
                              className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer"
                            >
                              <UserPlus className="h-4 w-4" />
                            </TooltipButton>
                          ) : (
                            <>
                              <TooltipButton
                                onClick={() => handleViewClick(employee._id)}
                                tooltipText="View Employee"
                                ariaLabel={`View employee ${employee.name}`}
                                variant="ghost"
                                size="sm"
                                className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                              </TooltipButton>
                              <TooltipButton
                                onClick={() => handleEditClick(employee)}
                                tooltipText="Edit Employee"
                                ariaLabel={`Edit employee ${employee.name}`}
                                variant="ghost"
                                size="sm"
                                className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer"
                              >
                                <Pencil className="h-4 w-4" />
                              </TooltipButton>
                              <TooltipButton
                                onClick={() => handleTransferClick(employee)}
                                tooltipText="Transfer Employee"
                                ariaLabel={`Transfer employee ${employee.name}`}
                                variant="ghost"
                                size="sm"
                                disabled={employee.status !== "active"}
                                className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer disabled:cursor-not-allowed"
                              >
                                <Truck className="h-4 w-4" />
                              </TooltipButton>
                              <TooltipButton
                                onClick={() => handleHistoryClick(employee)}
                                tooltipText="View History"
                                ariaLabel={`View history for employee ${employee.name}`}
                                variant="ghost"
                                size="sm"
                                className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer"
                              >
                                <History className="h-4 w-4" />
                              </TooltipButton>
                              <TooltipButton
                                onClick={() => handleAddDocumentsClick(employee)}
                                tooltipText="Add Documents"
                                ariaLabel={`Add documents for employee ${employee.name}`}
                                variant="ghost"
                                size="sm"
                                className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer"
                              >
                                <FilePlus className="h-4 w-4" />
                              </TooltipButton>
                              <TooltipButton
                                onClick={() => handleUpdateAdvanceClick(employee)}
                                tooltipText="Update Advance"
                                ariaLabel={`Update advance for employee ${employee.name}`}
                                variant="ghost"
                                size="sm"
                                className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer"
                              >
                                <IndianRupee className="h-4 w-4" />
                              </TooltipButton>
                              {employee.status === "active" ? (
                                <TooltipButton
                                  onClick={() => handleDeactivateClick(employee._id)}
                                  tooltipText="Deactivate Employee"
                                  ariaLabel={`Deactivate employee ${employee.name}`}
                                  variant="ghost"
                                  size="sm"
                                  className="text-error hover:text-error-hover transition-transform hover:scale-105 cursor-pointer"
                                >
                                  <LogOut className="h-4 w-4" />
                                </TooltipButton>
                              ) : (
                                <TooltipButton
                                  onClick={() => handleRejoinClick(employee)}
                                  tooltipText="Rejoin Employee"
                                  ariaLabel={`Rejoin employee ${employee.name}`}
                                  variant="ghost"
                                  size="sm"
                                  className="text-accent hover:text-accent-hover transition-transform hover:scale-105 cursor-pointer"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </TooltipButton>
                              )}
                              <TooltipButton
                                onClick={() => handleDeleteClick(employee._id)}
                                tooltipText="Delete Employee"
                                ariaLabel={`Delete employee ${employee.name}`}
                                variant="ghost"
                                size="sm"
                                className="text-error hover:text-error-hover transition-transform hover:scale-105 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </TooltipButton>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 mt-4">
                  <TooltipButton
                    onClick={() => handlePageChange(currentPage - 1)}
                    tooltipText="Previous page"
                    ariaLabel="Previous page"
                    disabled={currentPage === 1 || employeesLoading}
                    variant="outline"
                    size="sm"
                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-sm py-1 sm:py-2 px-2 sm:px-3 min-w-[32px] sm:min-w-[40px] transition-all hover:scale-105 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </TooltipButton>
                  {paginationPages.map((page, index) => (
                    page === '...' ? (
                      <Button
                        key={`ellipsis-${index}`}
                        variant="outline"
                        size="sm"
                        disabled
                        className="border-complementary text-body rounded-md text-sm py-1 sm:py-2 px-2 sm:px-3 min-w-[32px] sm:min-w-[40px] cursor-default"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    ) : (
                      <TooltipButton
                        key={page}
                        onClick={() => handlePageChange(page)}
                        tooltipText={`Go to page ${page}`}
                        ariaLabel={`Go to page ${page}`}
                        disabled={employeesLoading}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          currentPage === page
                            ? "bg-accent text-body"
                            : "border-complementary text-body hover:bg-complementary/10",
                          "rounded-md text-sm py-1 sm:py-2 px-2 sm:px-3 min-w-[32px] sm:min-w-[40px] transition-all hover:scale-105 cursor-pointer disabled:cursor-not-allowed"
                        )}
                      >
                        {page}
                      </TooltipButton>
                    )
                  ))}
                  <TooltipButton
                    onClick={() => handlePageChange(currentPage + 1)}
                    tooltipText="Next page"
                    ariaLabel="Next page"
                    disabled={currentPage === totalPages || employeesLoading}
                    variant="outline"
                    size="sm"
                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-sm py-1 sm:py-2 px-2 sm:px-3 min-w-[32px] sm:min-w-[40px] transition-all hover:scale-105 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </TooltipButton>
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-2 text-sm text-body/70">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} entries
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-body">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-accent/50 mb-2 animate-pulse" />
              <p className="text-sm">
                {showLocationFilter && filterLocation !== "all" && locations.length > 0
                  ? `No employees found for ${getLocationName(filterLocation)}`
                  : searchInput
                  ? `No employees found matching "${searchInput}"`
                  : "No employees found"}
              </p>
              <div className="flex gap-2 mt-2">
                <TooltipButton
                  onClick={() => navigate(getNavigationPath(role, 'register-employee'))}
                  tooltipText="Register new employee"
                  ariaLabel="Register new employee"
                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-sm py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md hover:scale-105 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Add Employee
                </TooltipButton>
                <TooltipButton
                  onClick={() =>
                    dispatch(
                      actions.fetchEmployees({
                        location: showLocationFilter
                          ? filterLocation === "all"
                            ? undefined
                            : filterLocation
                          : locationId,
                        department: filterDepartment === "all" ? undefined : filterDepartment,
                        status:
                          filterStatus === "all" || filterStatus === "deleted"
                            ? undefined
                            : filterStatus,
                        isDeleted: filterStatus === "deleted" ? true : undefined,
                        search: search || undefined,
                        page: currentPage,
                        limit: itemsPerPage,
                      })
                    )
                  }
                  tooltipText="Refresh employee data"
                  ariaLabel="Refresh employee data"
                  variant="outline"
                  className="text-body hover:bg-accent/10 rounded-md text-sm py-1 sm:py-2 px-3 sm:px-4 transition-all hover:scale-105 cursor-pointer"
                >
                  Refresh
                </TooltipButton>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {employeeToEdit && (
        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <EditDialog
            open={openEditDialog}
            onOpenChange={setOpenEditDialog}
            employee={employeeToEdit}
          />
        </Dialog>
      )}
      {transferEmployeeId && (
        <Dialog open={openTransferDialog} onOpenChange={setOpenTransferDialog}>
          <TransferDialog
            open={openTransferDialog}
            onOpenChange={setOpenTransferDialog}
            employeeId={transferEmployeeId}
            allLocations={role === "siteincharge" ? allLocations : locations}
            setSuccessMessage={setSuccessMessage}
          />
        </Dialog>
      )}
      {employeeToRejoin && (
        <Dialog open={openRejoinDialog} onOpenChange={setOpenRejoinDialog}>
          <RejoinDialog
            open={openRejoinDialog}
            onOpenChange={setOpenRejoinDialog}
            employee={employeeToRejoin}
            setSuccessMessage={setSuccessMessage}
          />
        </Dialog>
      )}
      {addDocumentsEmployeeId && (
        <Dialog open={openAddDocumentsDialog} onOpenChange={setOpenAddDocumentsDialog}>
          <AddDocumentsDialogComponent
            open={openAddDocumentsDialog}
            onOpenChange={setOpenAddDocumentsDialog}
            employeeId={addDocumentsEmployeeId}
            setSuccessMessage={setSuccessMessage}
          />
        </Dialog>
      )}
      {deactivateEmployeeId && (
        <Dialog open={openDeactivateDialog} onOpenChange={setOpenDeactivateDialog}>
          <DeactivateDialog
            open={openDeactivateDialog}
            onOpenChange={setOpenDeactivateDialog}
            employeeId={deactivateEmployeeId}
            setSuccessMessage={setSuccessMessage}
          />
        </Dialog>
      )}
      {employeeToUpdateAdvance && (
        <Dialog open={openUpdateAdvanceDialog} onOpenChange={setOpenUpdateAdvanceDialog}>
          <UpdateAdvanceDialog
            open={openUpdateAdvanceDialog}
            onOpenChange={setOpenUpdateAdvanceDialog}
            employee={employeeToUpdateAdvance}
            setSuccessMessage={setSuccessMessage}
          />
        </Dialog>
      )}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent className="bg-complementary text-body rounded-md shadow-lg max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this employee? This action will mark the employee as deleted and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenDeleteDialog(false)}
              className="border-complementary text-body hover:bg-accent/10"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="bg-error hover:bg-error-hover"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={openRestoreDialog} onOpenChange={setOpenRestoreDialog}>
        <DialogContent className="bg-complementary text-body rounded-md shadow-lg max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Confirm Restore</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore this employee? This will make the employee visible again in the employee list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenRestoreDialog(false)}
              className="border-complementary text-body hover:bg-accent/10"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleRestoreConfirm}
              className="bg-accent hover:bg-accent-hover"
            >
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default EmployeeList;