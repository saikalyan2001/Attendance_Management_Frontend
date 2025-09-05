// src/features/admin/AdminEmployees.jsx
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchEmployees,
  fetchDepartments,
  reset as resetEmployees,
  deleteEmployee,
  restoreEmployee,
} from "../redux/employeeSlice";
import { fetchSettings } from "../redux/settingsSlice";
import {
  fetchLocations,
  reset as resetLocations,
} from "../redux/locationsSlice";
import { fetchMe } from "../../../redux/slices/authSlice";
import { useNavigate } from "react-router-dom";
import EmployeeList from "../../../components/employees/EmployeeList";
import AdminEditEmployeeDialog from "./AdminEditEmployeeDialog";
import AdminTransferEmployeeDialog from "./AdminTransferEmployeeDialog";
import AdminRejoinDialog from "./AdminRejoinDialog";
import AdminAddDocumentsDialog from "./AdminAddDocumentsDialog";
import AdminDeactivateDialog from "./AdminDeactivateDialog";
import AdminUpdateAdvanceDialog from "./AdminUpdateAdvanceDialog";

const AdminEmployees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading: authLoading, isLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Only fetchMe if user is not already loaded
    if (!user && !authLoading && !isLoading) {
      dispatch(fetchMe()).unwrap().catch(() => {
        console.log('fetchMe failed, redirecting to /login');
        navigate("/login");
      });
    } else if (!authLoading && (!user || user.role !== "admin")) {
      console.log('Redirecting to /login: Invalid user or role', { user });
      navigate("/login");
    }
  }, [user, authLoading, isLoading, dispatch, navigate]);

  // Memoize actions to prevent unnecessary re-renders
  const actions = useMemo(
    () => ({
      fetchEmployees,
      fetchDepartments,
      resetEmployees,
      deleteEmployee,
      restoreEmployee,
      fetchSettings,
      fetchLocations,
      resetLocations,
    }),
    []
  );

  // Memoize DialogComponents to prevent unnecessary re-renders
  const DialogComponents = useMemo(
    () => ({
      EditDialog: AdminEditEmployeeDialog,
      TransferDialog: AdminTransferEmployeeDialog,
      RejoinDialog: AdminRejoinDialog,
      AdminAddDocumentsDialog: AdminAddDocumentsDialog,
      DeactivateDialog: AdminDeactivateDialog,
      UpdateAdvanceDialog: AdminUpdateAdvanceDialog,
    }),
    []
  );

  return (
    <EmployeeList
      role="admin"
      reduxSelectors={{
        employees: (state) => state.adminEmployees,
        settings: (state) => state.adminSettings,
        locations: (state) => state.adminLocations,
      }}
      actions={actions}
      DialogComponents={DialogComponents}
      showLocationFilter={true}
      useDynamicDepartments={false}
      itemsPerPage={10}
    />
  );
};

export default AdminEmployees;