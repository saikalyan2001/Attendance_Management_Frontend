import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPaginatedLocations,
  addLocation,
  editLocation,
  deleteLocation,
  reset,
  setCurrentPage,
} from "../redux/locationsSlice";
import Layout from "../../../components/layout/Layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Eye, Edit, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import debounce from "lodash.debounce";
import LocationForm from "../../../components/location/LocationForm";
import DataTable from "../../../components/location/DataTable";
import Pagination from "../../../components/location/Pagination";
import TooltipButton from "../../../components/location/TooltipButton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";

const MemoizedDataTable = memo(DataTable);
const PAGE_LIMIT = 2;

const SuperAdminLocations = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux store selectors
  const { user } = useSelector((state) => state.auth);
  const {
    paginatedLocations,
    totalPages,
    currentPage,
    loading,
    error,
  } = useSelector((state) => state.superAdminLocations);

  // Local state
  const [sortConfig, setSortConfig] = useState({ column: "name", order: "asc" });
  const [locationSearch, setLocationSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLocationId, setDeleteLocationId] = useState(null);
  const [actionLoading, setActionLoading] = useState({ add: false, edit: false, delete: false });
  const [searchLoading, setSearchLoading] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState(null);
  const [recentlyEdited, setRecentlyEdited] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchInputRef = useRef(null);
  const searchVersion = useRef(0);

  const columns = useMemo(() => [
    { key: "name", label: "Name", width: "w-1/6", sortable: true },
    { key: "address", label: "Address", width: "w-2/6", sortable: true },
    { key: "city", label: "City", width: "w-1/6", sortable: true },
    { key: "state", label: "State", width: "w-1/6", sortable: true },
    { key: "employeeCount", label: "Employees", width: "w-1/6", sortable: true },
    { key: "actions", label: "Actions", width: "w-1/6", sortable: false },
  ], []);

  // Debounced API fetch with cancellable versioning to avoid race conditions
  const debouncedFetchLocations = useMemo(() =>
    debounce(async (search, page, sortColumn, sortOrder, version) => {
      setSearchLoading(true);
      try {
        await dispatch(fetchPaginatedLocations({
          search,
          page: Math.max(1, page),
          limit: PAGE_LIMIT,
          sortColumn,
          sortOrder,
        })).unwrap();
      } catch (err) {
        if (version === searchVersion.current) {
          toast.error(err.message || "Failed to search locations", {
            id: "search-error",
            duration: 6000,
            position: "top-center",
          });
        }
      } finally {
        if (version === searchVersion.current) {
          setSearchLoading(false);
        }
      }
    }, 250),
    [dispatch]
  );

  const triggerSearch = useCallback((search, page, sortColumn, sortOrder) => {
    searchVersion.current += 1;
    debouncedFetchLocations(search, page, sortColumn, sortOrder, searchVersion.current);
  }, [debouncedFetchLocations]);

  // Effect: fetch data whenever relevant parameters change
  useEffect(() => {
    if (user?.role !== "super_admin") {
      navigate("/login");
      return;
    }
    triggerSearch(locationSearch, currentPage, sortConfig.column, sortConfig.order);
    return () => debouncedFetchLocations.cancel();
  }, [user, navigate, locationSearch, currentPage, sortConfig, triggerSearch, debouncedFetchLocations]);

  // Focus search input on mount and Ctrl+/ shortcut
  useEffect(() => {
    searchInputRef.current?.focus();
    const handleKeydown = (e) => {
      if (e.ctrlKey && e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  // Show toast error if `error` state changes
  useEffect(() => {
    if (error) {
      toast.error(error, {
        id: `location-error-${error}`,
        duration: 6000,
        position: "top-center",
      });
    }
  }, [error]);

  // Temporary animations for recently added/edited rows
  useEffect(() => {
    if (recentlyAdded || recentlyEdited) {
      const timer = setTimeout(() => {
        setRecentlyAdded(null);
        setRecentlyEdited(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [recentlyAdded, recentlyEdited]);

  // Handle pagination state changes by dispatching a pure state update
  const handlePageChange = useCallback((page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      dispatch(setCurrentPage(page)); // triggers a single API call via effect
    }
  }, [dispatch, currentPage, totalPages]);

  // Update internal input state on typing (sanitizing input)
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value.replace(/[<>{}|;]/g, "").replace(/\s+/g, " ");
    setSearchInput(value);
  }, []);

  // Debounce the actual search query state updates & reset page to 1 on search change
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLocationSearch((prev) => {
        if (searchInput !== prev) {
          if (currentPage !== 1) {
            dispatch(setCurrentPage(1));
          }
          return searchInput;
        }
        return prev;
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, currentPage, dispatch]);

  // Sort handler updates sort config (effect triggers search)
  const handleSort = useCallback((column) => {
    setSortConfig((prev) => ({
      column,
      order: prev.column === column && prev.order === "asc" ? "desc" : "asc",
    }));
  }, []);

  // Clear search input and reset search and page
  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setLocationSearch("");
    searchInputRef.current?.focus();
    dispatch(setCurrentPage(1));
  }, [dispatch]);

  // Add Location handler
  const handleAddSubmit = useCallback(async (data) => {
    try {
      setActionLoading((prev) => ({ ...prev, add: true }));
      const result = await dispatch(addLocation(data)).unwrap();
      setRecentlyAdded(result._id);
      toast.success("Location added successfully");
      setAddOpen(false);
      triggerSearch(locationSearch, currentPage, sortConfig.column, sortConfig.order);
    } catch (err) {
      toast.error(err.message || "Failed to add location. Please try again.", {
        id: "add-error",
        duration: 6000,
        position: "top-center",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, add: false }));
    }
  }, [dispatch, locationSearch, currentPage, sortConfig, triggerSearch]);

  // Edit Location handler
  const handleEditSubmit = useCallback(async (data) => {
    try {
      setActionLoading((prev) => ({ ...prev, edit: true }));
      if (!selectedLocation?._id) throw new Error("No location selected");
      const result = await dispatch(editLocation({ id: selectedLocation._id, data })).unwrap();
      setRecentlyEdited(result._id);
      setEditOpen(false);
      setSelectedLocation(null);
      toast.success("Location updated successfully");
      triggerSearch(locationSearch, currentPage, sortConfig.column, sortConfig.order);
    } catch (err) {
      toast.error(err.message || "Failed to update location. Please try again.", {
        id: "edit-error",
        duration: 6000,
        position: "top-center",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, edit: false }));
    }
  }, [dispatch, selectedLocation, locationSearch, currentPage, sortConfig, triggerSearch]);

  // Delete Location handler: page change before deletion reduces flicker
  const handleDeleteConfirm = useCallback(async () => {
    try {
      // Preemptively move one page back if needed (edge case: last location on last page)
      if (paginatedLocations.length === 1 && currentPage > 1) {
        dispatch(setCurrentPage(currentPage - 1));
      }

      setActionLoading((prev) => ({ ...prev, delete: true }));
      setIsDeleting(true);
      await dispatch(deleteLocation(deleteLocationId)).unwrap();
      toast.success("Location deleted successfully");
      setDeleteOpen(false);
      setDeleteLocationId(null);
      // Fetch triggered by page change effect
    } catch (err) {
      toast.error(err.message || "Failed to delete location. Please try again.", {
        id: "delete-error",
        duration: 6000,
        position: "top-center",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, delete: false }));
      setIsDeleting(false);
    }
  }, [dispatch, deleteLocationId, paginatedLocations.length, currentPage]);

  // Table row renderer with animations and actions
  const renderRow = (loc) => (
    <TableRow
      key={loc._id}
      className={cn(
        "border-b border-accent/10 transition-all duration-300 hover:bg-accent/5",
        recentlyAdded === loc._id && "animate-slide-in-row",
        recentlyEdited === loc._id && "animate-highlight",
        actionLoading.delete && deleteLocationId === loc._id && "animate-fade-out"
      )}
    >
      <TableCell className="text-sm md:text-base text-body font-medium px-4 py-3 w-1/6">
        {loc.name}
      </TableCell>
      <TableCell className="text-sm md:text-base text-body px-4 py-3 w-2/6">
        {loc.address}
      </TableCell>
      <TableCell className="text-sm md:text-base text-body px-4 py-3 w-1/6">
        {loc.city || "-"}
      </TableCell>
      <TableCell className="text-sm md:text-base text-body px-4 py-3 w-1/6">
        {loc.state || "-"}
      </TableCell>
      <TableCell className="text-sm md:text-base text-body px-4 py-3 w-1/6">
        {typeof loc.employeeCount === "number" ? loc.employeeCount : "-"}
      </TableCell>
      <TableCell className="px-4 py-3 w-1/6">
        <div className="flex gap-2">
          <TooltipButton
            onClick={() => navigate(`/superadmin/employees?location=${loc._id}`)}
            disabled={Object.values(actionLoading).some(Boolean)}
            tooltipText="View Employees"
            ariaLabel={`View employees for ${loc.name}`}
          >
            <Eye className="h-4 w-4" />
          </TooltipButton>
          <TooltipButton
            onClick={() => {
              setSelectedLocation(loc);
              setEditOpen(true);
            }}
            disabled={Object.values(actionLoading).some(Boolean)}
            tooltipText="Edit Location"
            ariaLabel={`Edit ${loc.name}`}
          >
            <Edit className="h-4 w-4" />
          </TooltipButton>
          <AlertDialog
            open={deleteOpen && deleteLocationId === loc._id}
            onOpenChange={(open) => {
              setDeleteOpen(open);
              if (!open) setDeleteLocationId(null);
            }}
          >
            <AlertDialogTrigger asChild>
              <TooltipButton
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteLocationId(loc._id);
                }}
                disabled={Object.values(actionLoading).some(Boolean)}
                tooltipText="Delete Location"
                ariaLabel={`Delete ${loc.name}`}
                className="text-error hover:bg-error/10"
              >
                <Trash2 className="h-4 w-4" />
              </TooltipButton>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-complementary text-body rounded-xl shadow-2xl max-w-lg p-6 z-[1400]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg md:text-xl font-bold text-body">
                  Confirm Deletion
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-body/80">
                  Are you sure you want to delete "{loc.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex justify-end gap-3">
                <AlertDialogCancel
                  onClick={() => setDeleteOpen(false)}
                  className="border-complementary text-body hover:bg-complementary/20 rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md"
                  disabled={actionLoading.delete}
                  aria-label="Cancel delete"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  className="bg-error text-body hover:bg-error/80 rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md flex items-center gap-2"
                  disabled={actionLoading.delete}
                  aria-label="Confirm delete"
                >
                  {actionLoading.delete ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );

  // Conditional rendering main content based on loading and data state
  return (
    <Layout title="Superadmin Locations" role="super_admin">
      {error && (
        <Alert variant="destructive" className="mb-6 max-w-3xl mx-auto rounded-lg border-error bg-error/10 text-error p-4 animate-fade-in" role="alert">
          <AlertDescription className="text-sm md:text-base flex justify-between items-center">
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                dispatch(reset());
                triggerSearch(locationSearch, 1, sortConfig.column, sortConfig.order);
              }}
              className="border-error text-error hover:bg-error/10 rounded-lg text-sm py-1 px-3 transition-all duration-300"
              aria-label="Retry fetching locations"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-complementary text-body max-w-7xl mx-auto shadow-xl rounded-xl border border-accent/20 animate-fade-in">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <span className="text-xl md:text-2xl font-bold">Superadmin Location Management</span>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="flex items-center w-full sm:w-80 gap-2">
                <div className="relative flex-1">
                  {searchLoading ? (
                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-accent h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-body h-5 w-5" />
                  )}
                  <Input
                    ref={searchInputRef}
                    placeholder="Search by name, address, city, or state (Ctrl + /)"
                    className="pl-10 h-10 bg-body text-body rounded-lg border border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-300 text-sm md:text-base placeholder:text-body/50 hover:shadow-md"
                    value={searchInput}
                    onChange={handleSearchChange}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && searchInput) {
                        handleClearSearch();
                      }
                    }}
                    aria-label="Search locations"
                    aria-busy={searchLoading}
                  />
                </div>
                {searchInput && (
                  <TooltipButton
                    onClick={handleClearSearch}
                    tooltipText="Clear Search"
                    ariaLabel="Clear search"
                    className="w-10 h-10 flex items-center justify-center"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </TooltipButton>
                )}
              </div>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <TooltipButton
                    onClick={() => {}}
                    tooltipText="Add new location"
                    ariaLabel="Add new location"
                    className="bg-accent text-body hover:bg-accent-hover flex items-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Add Location
                  </TooltipButton>
                </DialogTrigger>
                <DialogContent className="bg-complementary text-body rounded-xl shadow-2xl max-w-lg max-h-[90vh] overflow-y-auto p-6 z-[1400]">
                  <DialogHeader>
                    <DialogTitle className="text-lg md:text-xl font-bold text-body">
                      Add New Location
                    </DialogTitle>
                    <DialogDescription className="text-sm text-body/80">Fill in the details to add a new location.</DialogDescription>
                  </DialogHeader>
                  <LocationForm mode="add" onSubmit={handleAddSubmit} onCancel={() => setAddOpen(false)} isLoading={actionLoading.add} />
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="table-responsive" aria-live="polite">
            {loading || searchLoading || isDeleting ? (
              <MemoizedDataTable columns={columns} data={[]} loading skeletonRowCount={5} sortConfig={sortConfig} onSort={handleSort} renderRow={renderRow} />
            ) : paginatedLocations.length === 0 ? (
              <div className="text-center py-8 text-body/80 text-sm md:text-base">
                No locations found.{" "}
                {locationSearch ? "No matches for your search. Try adjusting your query." : "Add a new location to get started."}
              </div>
            ) : (
              <>
                <MemoizedDataTable columns={columns} data={paginatedLocations} loading={false} skeletonRowCount={5} sortConfig={sortConfig} onSort={handleSort} renderRow={renderRow} />
                {totalPages > 1 && (
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} disabled={loading || searchLoading || isDeleting} />
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setSelectedLocation(null); }}>
        <DialogContent className="bg-complementary text-body rounded-xl shadow-2xl max-w-lg max-h-[90vh] overflow-y-auto p-6 z-[1400]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold text-body">Edit Location</DialogTitle>
            <DialogDescription className="text-sm text-body/80">Update the details for {selectedLocation?.name || "this location"}.</DialogDescription>
          </DialogHeader>
          <LocationForm
            mode="edit"
            defaultValues={{
              name: selectedLocation?.name || "",
              address: selectedLocation?.address || "",
              city: selectedLocation?.city || "",
              state: selectedLocation?.state || "",
            }}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditOpen(false)}
            isLoading={actionLoading.edit}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default SuperAdminLocations;
