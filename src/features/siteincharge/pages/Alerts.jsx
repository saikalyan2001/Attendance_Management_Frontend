import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { reset } from "../redux/employeeSlice";
import { toast } from "sonner";

const Alerts = () => {
  const dispatch = useDispatch();
  const { error: employeesError, success, loading: employeesLoading } = useSelector(
    (state) => state.siteInchargeEmployee
  );
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const autoDismissDuration = 5000;

  useEffect(() => {
    if (employeesError) {
      setErrorMessage(employeesError);
      setShowErrorAlert(true);
      const errorTimer = setTimeout(() => {
        setShowErrorAlert(false);
        setErrorMessage(null);
        dispatch(reset());
      }, autoDismissDuration);
      return () => clearTimeout(errorTimer);
    } else {
      setShowErrorAlert(false);
      setErrorMessage(null);
    }
  }, [employeesError, dispatch]);

  useEffect(() => {
    if (success && successMessage) {
      setShowSuccessAlert(true);
      toast.success(successMessage, { duration: autoDismissDuration });
      const successTimer = setTimeout(() => {
        setShowSuccessAlert(false);
        setSuccessMessage(null);
        dispatch(reset());
      }, autoDismissDuration);
      return () => clearTimeout(successTimer);
    }
  }, [success, successMessage, dispatch]);

  return (
    <>
      {(errorMessage || employeesError) && showErrorAlert && (
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
            {errorMessage || employeesError}
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowErrorAlert(false);
              setErrorMessage(null);
              dispatch(reset());
            }}
            className="absolute top-2 right-2 text-error hover:text-error-hover"
            aria-label="Dismiss error alert"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Alert>
      )}
      {showSuccessAlert && (
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
            onClick={() => {
              setShowSuccessAlert(false);
              setSuccessMessage(null);
              dispatch(reset());
            }}
            className="absolute top-2 right-2 text-accent hover:text-accent-hover"
            aria-label="Dismiss success alert"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Alert>
      )}
    </>
  );
};

export default Alerts;