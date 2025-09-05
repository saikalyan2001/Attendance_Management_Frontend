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
import { Eye, Edit, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import LocationForm from "../../../components/location/LocationForm";
import DataTable from "../../../components/location/DataTable";
import Pagination from "../../../components/location/Pagination";
import TooltipButton from "../../../components/location/TooltipButton";
import { Card, CardContent } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";
import LocationHeader from "../../../components/location/LocationHeader";
import { locationToasts } from "../../../utils/toastMessages";

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
  const [editOpen, setEditOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLocationId, setDeleteLocationId] = useState(null);
  const [actionLoading, setActionLoading] = useState({ edit: false, delete: false });
  const [recentlyAdded, setRecentlyAdded] = useState(null);
  const [recentlyEdited, setRecentlyEdited] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const columns = useMemo(() => [
    { key: "name", label: "Name", width: "w-1/6", sortable: true },
    { key: "address", label: "Address", width: "w-2/6", sortable: true },
    { key: "city", label: "City", width: "w-1/6", sortable: true },
    { key: "state", label: "State", width: "w-1/6", sortable: true },
    { key: "employeeCount", label: "Employees", width: "w-1/6", sortable: true },
    { key: "actions", label: "Actions", width: "w-1/6", sortable: false },
  ], []);

  // Effect: check user role
  useEffect(() => {
    if (user?.role !== "super_admin") {
      navigate("/login");
    }
  }, [user, navigate]);

  // Enhanced error handling - only show system errors, not user action errors
  useEffect(() => {
    if (error) {
      const isUserActionError = error.includes('already exists') || 
                               error.includes('assigned employees') ||
                               error.includes('not found') ||
                               error.includes('validation') ||
                               error.includes('required');
      
      if (!isUserActionError) {
        if (error.includes('network') || error.includes('Network')) {
          locationToasts.networkError();
        } else {
          toast.error(error, {
            id: `location-system-error-${Date.now()}`,
          });
        }
      }
    }
  }, [error]);

  // Temporary animations
  useEffect(() => {
    if (recentlyAdded || recentlyEdited) {
      const timer = setTimeout(() => {
        setRecentlyAdded(null);
        setRecentlyEdited(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [recentlyAdded, recentlyEdited]);

  // Handle pagination
  const handlePageChange = useCallback((page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      dispatch(setCurrentPage(page));
    }
  }, [dispatch, currentPage, totalPages]);

  // Sort handler - this now triggers the API call
  const handleSort = useCallback((column) => {
    setSortConfig((prev) => ({
      column,
      order: prev.column === column && prev.order === "asc" ? "desc" : "asc",
    }));
  }, []);

  // Enhanced Edit Location with better error handling
  const handleEditSubmit = useCallback(
    async (data) => {
      try {
        setActionLoading((prev) => ({ ...prev, edit: true }));
        if (!selectedLocation?._id) throw new Error("No location selected");
        
        const result = await dispatch(editLocation({ id: selectedLocation._id, data })).unwrap();
        setRecentlyEdited(result._id);
        setEditOpen(false);
        setSelectedLocation(null);
        
        locationToasts.updated(result.name);
      } catch (err) {
        const errorMessage = typeof err === 'string' ? err : err.message || "Failed to update location";
        
        if (errorMessage.includes('already exists')) {
          locationToasts.duplicate(data.name);
        } else if (errorMessage.includes('not found')) {
          locationToasts.notFound();
        } else {
          locationToasts.serverError('update location');
        }
      } finally {
        setActionLoading((prev) => ({ ...prev, edit: false }));
      }
    },
    [dispatch, selectedLocation]
  );

  // Enhanced Delete Location with better error handling
  const handleDeleteConfirm = useCallback(
    async () => {
      try {
        const locationToDelete = paginatedLocations.find(loc => loc._id === deleteLocationId);
        const locationName = locationToDelete?.name || 'Location';
        
        if (paginatedLocations.length === 1 && currentPage > 1) {
          dispatch(setCurrentPage(currentPage - 1));
        }
        
        setActionLoading((prev) => ({ ...prev, delete: true }));
        setIsDeleting(true);
        
        await dispatch(deleteLocation(deleteLocationId)).unwrap();
        
        locationToasts.deleted(locationName);
        setDeleteOpen(false);
        setDeleteLocationId(null);
      } catch (err) {
        const errorMessage = typeof err === 'string' ? err : err.message || "Failed to delete location";
        
        if (errorMessage.includes('assigned employees') || errorMessage.includes('Cannot delete location with assigned employees')) {
          locationToasts.hasEmployees();
        } else if (errorMessage.includes('not found')) {
          locationToasts.notFound();
        } else {
          locationToasts.serverError('delete location');
        }
      } finally {
        setActionLoading((prev) => ({ ...prev, delete: false }));
        setIsDeleting(false);
      }
    },
    [dispatch, deleteLocationId, paginatedLocations, currentPage]
  );

  // Table row renderer
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
      <TableCell className="text-sm md:text-base text-body font-medium px-4 py-3 w-1/6 cursor-default">
        {loc.name}
      </TableCell>
      <TableCell className="text-sm md:text-base text-body px-4 py-3 w-2/6 cursor-default">
        {loc.address}
      </TableCell>
      <TableCell className="text-sm md:text-base text-body px-4 py-3 w-1/6 cursor-default">
        {loc.city || "-"}
      </TableCell>
      <TableCell className="text-sm md:text-base text-body px-4 py-3 w-1/6 cursor-default">
        {loc.state || "-"}
      </TableCell>
      <TableCell className="text-sm md:text-base text-body px-4 py-3 w-1/6 cursor-default">
        {typeof loc.employeeCount === "number" ? loc.employeeCount : "-"}
      </TableCell>
      <TableCell className="px-4 py-3 w-1/6">
        <div className="flex gap-2">
          <TooltipButton
            onClick={() => navigate(`/superadmin/employees?location=${loc._id}`)}
            disabled={Object.values(actionLoading).some(Boolean)}
            tooltipText="View Employees"
            ariaLabel={`View employees for ${loc.name}`}
            className={cn(
              Object.values(actionLoading).some(Boolean) && "cursor-not-allowed"
            )}
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
            className={cn(
              Object.values(actionLoading).some(Boolean) && "cursor-not-allowed"
            )}
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
                className={cn(
                  "text-error hover:bg-error/10",
                  Object.values(actionLoading).some(Boolean) && "cursor-not-allowed"
                )}
              >
                <Trash2 className="h-4 w-4" />
              </TooltipButton>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-complementary text-body rounded-xl shadow-2xl max-w-lg w-[calc(100%-1.5rem)] sm:w-full mx-auto p-4 sm:p-6 z-[1400] box-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg md:text-xl font-bold text-body cursor-default">
                  Confirm Deletion
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-body/80 cursor-default">
                  Are you sure you want to delete "{loc.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex justify-end gap-3">
                <AlertDialogCancel
                  onClick={() => setDeleteOpen(false)}
                  className={cn(
                    "border-complementary text-body hover:bg-complementary/20 rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md",
                    actionLoading.delete ? "cursor-not-allowed" : "cursor-pointer"
                  )}
                  disabled={actionLoading.delete}
                  aria-label="Cancel delete"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  className={cn(
                    "bg-error text-body hover:bg-error/80 rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md flex items-center gap-2",
                    actionLoading.delete ? "cursor-not-allowed" : "cursor-pointer"
                  )}
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

  return (
    <Layout title="Superadmin Locations" role="super_admin">
      <Card className="bg-complementary text-body max-w-7xl mx-auto shadow-xl rounded-xl border border-accent/20 animate-fade-in">
        <LocationHeader
          title="Superadmin Locations"
          reduxSlice="superAdminLocations"
          navigatePath="/superadmin/employees"
          fetchPaginatedLocations={fetchPaginatedLocations}
          addLocation={addLocation}
          setCurrentPage={setCurrentPage}
          setRecentlyAdded={setRecentlyAdded}
          sortConfig={sortConfig} // ✅ Pass sortConfig as prop
        />
        
        <CardContent className="p-4 sm:p-6">
          <div className="table-responsive" aria-live="polite">
            {loading || isDeleting ? (
              <MemoizedDataTable 
                columns={columns} 
                data={[]} 
                loading 
                skeletonRowCount={5} 
                sortConfig={sortConfig} 
                onSort={handleSort} 
                renderRow={renderRow} 
              />
            ) : paginatedLocations.length === 0 ? (
              <div className="text-center py-8 text-body/80 text-sm md:text-base cursor-default">
                No locations found. Add a new location to get started.
              </div>
            ) : (
              <>
                <MemoizedDataTable 
                  columns={columns} 
                  data={paginatedLocations} 
                  loading={false} 
                  skeletonRowCount={5} 
                  sortConfig={sortConfig} 
                  onSort={handleSort} 
                  renderRow={renderRow} 
                />
                {totalPages > 1 && (
                  <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={handlePageChange} 
                    disabled={loading || isDeleting} 
                  />
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={(open) => { 
        setEditOpen(open); 
        if (!open) setSelectedLocation(null); 
      }}>
        <DialogContent className="bg-complementary text-body rounded-xl shadow-2xl max-w-lg w-[calc(100%-1.5rem)] sm:w-full mx-auto p-4 sm:p-6 z-[1400] box-border">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold text-body cursor-default">
              Edit Location
            </DialogTitle>
            <DialogDescription className="text-sm text-body/80 cursor-default">
              Update the details for {selectedLocation?.name || "this location"}.
            </DialogDescription>
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
