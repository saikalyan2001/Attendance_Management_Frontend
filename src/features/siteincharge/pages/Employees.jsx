// src/features/siteincharge/SiteInchargeEmployees.jsx
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchMe } from "../../../redux/slices/authSlice";
import {
  fetchEmployees,
  fetchLocations,
  fetchAllLocations,
  fetchSettings,
  deleteEmployee,
  restoreEmployee,
  reset as resetEmployees,
  fetchAllEmployees,
} from "../redux/employeeSlice";
import Alerts from "./Alerts";
import EmployeeList from "../../../components/employees/EmployeeList";
import SiteInchargeEditEmployeeDialog from "./SiteInchargeEditEmployeeDialog";
import SiteInchargeTransferEmployeeDialog from "./SiteInchargeTransferEmployeeDialog";
import SiteInchargeRejoinDialog from "./SiteInchargeRejoinDialog";
import SiteInchargeAddDocumentsDialog from "./SiteInchargeAddDocumentsDialog";
import SiteInchargeDeactivateDialog from "./SiteInchargeDeactivateDialog";
import SiteInchargeUpdateAdvanceDialog from "./SiteInchargeUpdateAdvanceDialog";

const SiteInchargeEmployees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading: authLoading, isLoading } = useSelector((state) => state.auth);
  const locationId = user?.locations?.[0]?._id;

  useEffect(() => {
    // Only fetchMe if user is not already loaded
    if (!user && !authLoading && !isLoading) {
      dispatch(fetchMe()).unwrap().catch((error) => {
        console.log('fetchMe failed, redirecting to /login:', error);
        navigate("/login");
      });
    } else if (!authLoading && !isLoading) {
      if (!user || user.role !== "siteincharge") {
        console.log('Redirecting to /login: Invalid user or role', { user });
        navigate("/login");
      } else if (!user?.locations?.length) {
        console.log('Redirecting to /siteincharge/dashboard: No locations assigned', { user });
        navigate("/siteincharge/dashboard");
      }
    }
  }, [user, authLoading, isLoading, dispatch, navigate]);


  useEffect(() => {
  if (locationId) {
    dispatch(fetchEmployees({ location: locationId, page: 1 }));   // regular paged call
+   dispatch(fetchAllEmployees({ location: locationId }));         // one-time full call
    dispatch(fetchLocations());
    dispatch(fetchSettings());
  }
}, [dispatch, locationId]);

  // Memoize actions to prevent unnecessary re-renders
  const actions = useMemo(
    () => ({
      fetchEmployees, 
      fetchAllEmployees,
      resetEmployees,
      deleteEmployee,
      restoreEmployee,
      fetchSettings,
      fetchLocations,
      fetchAllLocations,
    }),
    []
  );

  // Memoize DialogComponents to prevent unnecessary re-renders
  const DialogComponents = useMemo(
    () => ({
      EditEmployeeDialog: SiteInchargeEditEmployeeDialog,
      TransferDialog: SiteInchargeTransferEmployeeDialog,
      RejoinDialog : SiteInchargeRejoinDialog,
      SiteInchargeAddDocumentsDialog,
      DeactivateDialog: SiteInchargeDeactivateDialog,
      UpdateAdvanceDialog: SiteInchargeUpdateAdvanceDialog,
    }),
    []
  );

  return (
    <EmployeeList
      role="siteincharge"
      reduxSelectors={{
        employees: (state) => state.siteInchargeEmployee,
        settings: (state) => state.siteInchargeEmployee,
        locations: (state) => state.siteInchargeEmployee,
        allLocations: (state) => state.siteInchargeEmployee,
      }}
      actions={actions}
      DialogComponents={DialogComponents}
      AlertsComponent={Alerts}
      locationId={locationId}
      showLocationFilter={false}
      useDynamicDepartments={true}
      itemsPerPage={5}
    />
  );
};

export default SiteInchargeEmployees;