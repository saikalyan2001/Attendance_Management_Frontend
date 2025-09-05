// src/features/superadmin/SuperAdminEmployees.jsx
import { useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchEmployees,
  fetchDepartments,
  reset as resetEmployees,
  deleteEmployee,
  restoreEmployee,
} from "../redux/superadminEmployeeSlice";
import { fetchSettings } from "../redux/settingsSlice";
import { fetchLocations, reset as resetLocations } from "../redux/locationsSlice";
import { fetchMe } from "../../../redux/slices/authSlice";
import EmployeeList from "../../../components/employees/EmployeeList";
import SuperAdminEditEmployeeDialog from "./SuperAdminEditEmployeeDialog";
import SuperAdminTransferEmployeeDialog from "./SuperAdminTransferEmployeeDialog";
import SuperAdminRejoinEmployeeDialog from "./SuperAdminRejoinEmployeeDialog";
import SuperAdminAddDocumentsDialog from "./SuperAdminAddDocumentsDialog";
import SuperAdminDeactivateDialog from "./SuperAdminDeactivateDialog";
import SuperAdminUpdateAdvanceDialog from "./SuperAdminUpdateAdvanceDialog";

const SuperAdminEmployees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading: authLoading, isLoading } = useSelector((state) => state.auth);

  // Memoize actions to prevent recreation on every render
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

  // Memoize DialogComponents to prevent recreation
  const DialogComponents = useMemo(
    () => ({
      EditDialog: SuperAdminEditEmployeeDialog,
      TransferDialog: SuperAdminTransferEmployeeDialog,
      RejoinDialog: SuperAdminRejoinEmployeeDialog,
      AddDocumentsDialog: SuperAdminAddDocumentsDialog,
      DeactivateDialog: SuperAdminDeactivateDialog,
      UpdateAdvanceDialog: SuperAdminUpdateAdvanceDialog,
    }),
    []
  );

  useEffect(() => {
    // Only fetchMe if user is not already loaded
    if (!user && !authLoading && !isLoading) {
      dispatch(fetchMe()).unwrap().catch(() => {
        navigate("/login");
      });
    } else if (!authLoading && (!user || user.role !== "super_admin")) {
      console.log('Redirecting to /login: Invalid user or role', { user });
      navigate("/login");
    }
  }, [user, authLoading, isLoading, dispatch, navigate]);

  return (
    <EmployeeList
      role="super_admin"
      reduxSelectors={{
        employees: (state) => state.superadminEmployees,
        settings: (state) => state.superAdminSettings,
        locations: (state) => state.superAdminLocations,
      }}
      actions={actions}
      DialogComponents={DialogComponents}
      showLocationFilter={true}
      useDynamicDepartments={false}
      itemsPerPage={10} // Fixed from 2 to reasonable number
    />
  );
};

export default SuperAdminEmployees;
