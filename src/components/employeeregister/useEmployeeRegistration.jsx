import { useEffect, useState, useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { useSelector } from "react-redux";

const parseServerError = (error) => {
  if (!error) {
    return { message: "An unknown error occurred", fields: {}, errors: [] };
  }

  // Handle Excel validation errors
  if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
    return {
      message: error.message || "Excel file contains validation errors",
      fields: {},
      errors: error.errors
    };
  }

  // Handle backend error object with message-only structure
  if (typeof error === "object" && error.message) {
    const fieldErrors = {};
    let message = error.message;

    if (message === "Something went wrong!") {
      message = "Failed to process request. Please try again.";
    }
    
    // Parse the message to determine which field has the error
    if (message.includes("EmployeeId") || message.includes("Employee ID")) {
      fieldErrors.employeeId = message;
    } else if (message.includes("Email")) {
      fieldErrors.email = message;
    } else if (message.includes("Phone")) {
      fieldErrors.phone = message;
    }
    
    // If backend provides field property, use it
    if (error.field) {
      fieldErrors[error.field] = message;
    }
    
    return { 
      message: message, 
      fields: fieldErrors, 
      errors: error.errors || [] 
    };
  }
  
  if (typeof error === "string") {
    const fieldErrors = {};
    if (error.includes("already exists")) {
      if (error.includes("Email")) fieldErrors.email = "Email already exists";
      if (error.includes("Employee ID") || error.includes("EmployeeId")) {
        fieldErrors.employeeId = "Employee ID already exists";
      }
      if (error.includes("Phone number")) fieldErrors.phone = "Phone number already exists";
    }
    return { message: error, fields: fieldErrors, errors: [] };
  }

  // Fallback for other error structures
  const message = error.message || error.error || "Failed to register employee";
  const fields = error.errors?.reduce((acc, err) => {
    if (err.field) acc[err.field] = err.message;
    return acc;
  }, {}) || {};
  
  return { message, fields, errors: error.errors || [] };
};

const useEmployeeRegistration = ({
  user,
  dispatch,
  navigate,
  employeeSlice,
  locationSlice,
  requiredRole,
  redirectPath,
  includeEmailField,
  defaultLocationId,
}) => {
  const [serverError, setServerError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [removingIndices, setRemovingIndices] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragStates, setDragStates] = useState({});
  const [previews, setPreviews] = useState({});
  const [excelFile, setExcelFile] = useState(null);
  const [excelDragState, setExcelDragState] = useState(false);
  const [registrationMode, setRegistrationMode] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [lastSuccess, setLastSuccess] = useState(null);
  const renderCount = useRef(0);
  const formRef = useRef(null);
  const documentsSectionRef = useRef(null);
  const excelSectionRef = useRef(null);
  const maxRetries = 3;
  const autoDismissDuration = 5000;

  const { employeesLoading, employeesError, errorType, success, successType } =
    useSelector((state) =>
      requiredRole === "admin"
        ? state.adminEmployees
        : requiredRole === "super_admin"
        ? state.superadminEmployees
        : state.siteInchargeEmployee
    );
  const { locations, locationsLoading } = useSelector((state) =>
    requiredRole === "admin"
      ? state.adminLocations
      : requiredRole === "super_admin"
      ? state.superAdminLocations
      : { locations: (user && user.locations) ? user.locations : [], locationsLoading: false }
  );

  renderCount.current += 1;

  const form = useForm({
    defaultValues: {
      employeeId: "",
      name: "",
      email: includeEmailField ? "" : undefined,
      designation: "",
      department: "",
      salary: "",
      location: defaultLocationId || "",
      phone: "",
      joinDate: "",
      bankDetails: {
        accountNo: "",
        ifscCode: "",
        bankName: "",
        accountHolder: "",
      },
      documents: [],
    },
  });

  const {
    fields: documentFields,
    append: appendDocument,
    remove: removeDocument,
  } = useFieldArray({
    control: form.control,
    name: "documents",
  });

const handleSubmit = useCallback(
  async (data) => {
    try {
      setIsSubmitting(true);
      dispatch(employeeSlice.reset());
      toast.dismiss();
      
      // Validate and format the join date
      let formattedJoinDate;
      if (data.joinDate) {
        const dateObj = new Date(data.joinDate);
        if (isNaN(dateObj.getTime())) {
          throw new Error("Invalid join date provided");
        }
        formattedJoinDate = dateObj.toISOString();
      } else {
        throw new Error("Join date is required");
      }
      
      const employeeData = {
        employeeId: data.employeeId,
        name: data.name,
        email: includeEmailField ? data.email : undefined,
        designation: data.designation,
        department: data.department,
        salary: Number(data.salary),
        location: data.location,
        phone: data.phone,
        joinDate: formattedJoinDate, // Use validated date
        bankDetails: data.bankDetails,
        paidLeaves: { available: 2, used: 0, carriedForward: 0 },
        createdBy: user?._id,
      };

      await dispatch(
        employeeSlice.registerEmployee({ employeeData, documents: data.documents })
      ).unwrap();
    } catch (error) {
      const parsedError = parseServerError(error);
      setServerError(parsedError);
      setRetryCount((prev) => prev + 1);
      
      toast.error(parsedError.message, {
        id: `error-main-${Date.now()}`,
        duration: 10000,
        position: "top-center",
      });
    } finally {
      setIsSubmitting(false);
    }
  },
  [dispatch, user, employeeSlice]
);


  useEffect(() => {
    if (!user || user?.role !== requiredRole) {
      navigate("/login");
    }
    // Skip location fetching for siteincharge since location is pre-set
    if (requiredRole !== "siteincharge" && !locations.length && !locationsLoading && locationSlice) {
      dispatch(locationSlice.fetchLocations());
    }
  }, [dispatch, user, navigate, locationSlice, locations, locationsLoading, requiredRole]);

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previews]);

  // Excel Error useEffect
  useEffect(() => {
    if (employeesError && errorType === "excel" && employeesError !== lastError) {
      toast.dismiss();
      const parsedError = parseServerError(employeesError);
      setServerError(parsedError);
      setLastError(employeesError);
      
      // Main error message
      const errorMessage = parsedError.message.includes("Validation errors in file") 
        ? "Excel file contains validation errors"
        : parsedError.message.includes("duplicate")
        ? "Some employee data already exists in the system"
        : parsedError.message || "Failed to process Excel file";
      
      toast.error(errorMessage, {
        id: `excel-error-main-${Date.now()}`,
        duration: 10000,
        position: "top-center",
      });
      
      // Show specific row errors
      if (parsedError.errors?.length > 0) {
        parsedError.errors.slice(0, 5).forEach((err, index) => {
          const errorMessage = typeof err === 'object' && err.row 
            ? `Row ${err.row}: ${err.message}`
            : typeof err === 'string' 
            ? err 
            : `Error: ${err.message || 'Unknown validation error'}`;
          
          toast.error(errorMessage, {
            id: `excel-row-error-${index}-${Date.now()}`,
            duration: 8000,
            position: "top-center",
          });
        });
      }
      
      // Delay the reset to allow toasts to display
      setTimeout(() => {
        dispatch(employeeSlice.reset());
        setLastError(null);
      }, 2000);
    }
  }, [employeesError, errorType, dispatch, lastError, employeeSlice]);

  useEffect(() => {
    if (employeesError && errorType === "single" && employeesError !== lastError) {
      toast.dismiss();
      const parsedError = parseServerError(employeesError);
      setServerError(parsedError);
      setLastError(employeesError);
      
      toast.error(parsedError.message, {
        id: `error-main-${Date.now()}`,
        duration: 10000,
        position: "top-center",
        action:
          retryCount < maxRetries && {
            text: "Retry",
            onClick: () => {
              toast.dismiss();
              dispatch(employeeSlice.reset());
              setRetryCount((prev) => prev + 1);
              handleSubmit(form.getValues());
            },
          },
      });
      
      if (parsedError.errors?.length > 0) {
        parsedError.errors.forEach((err, index) => {
          toast.error(`Row ${err.row}: ${Object.values(err).join(", ")}`, {
            id: `row-error-${err.row}-${index}-${Date.now()}`,
            duration: autoDismissDuration,
            position: "top-center",
          });
        });
      }
      
      setTimeout(() => {
        dispatch(employeeSlice.reset());
        setLastError(null);
      }, 100);
    }
  }, [employeesError, errorType, dispatch, handleSubmit, lastError, retryCount, employeeSlice]);

  useEffect(() => {
    if (success && (successType === "single" || successType === "excel") && success !== lastSuccess) {
      toast.dismiss();
      const successMessage = successType === "single"
        ? "Employee registered successfully"
        : "Employees registered successfully from Excel";
      toast.success(successMessage, {
        id: `success-${successType}-${Date.now()}`,
        duration: autoDismissDuration,
        position: "top-center",
      });
      setLastSuccess(success);
      const successTimer = setTimeout(() => {
        dispatch(employeeSlice.reset());
        form.reset();
        setServerError(null);
        setRetryCount(0);
        setRemovingIndices([]);
        setDragStates({});
        setPreviews({});
        setExcelFile(null);
        setRegistrationMode(null);
        toast.dismiss();
        navigate(redirectPath);
      }, autoDismissDuration);
      return () => clearTimeout(successTimer);
    }
  }, [success, successType, dispatch, form, navigate, redirectPath, employeeSlice, lastSuccess]);

  useEffect(() => {
    if (!employeesLoading) {
      setIsSubmitting(false);
    }
  }, [employeesLoading]);

  const handleExcelSubmit = async () => {
    if (!excelFile) {
      toast.error("Please select an Excel file", {
        id: `excel-no-file-${Date.now()}`,
        duration: 5000,
        position: "top-center",
      });
      return;
    }

    try {
      // Conditionally dispatch the correct action based on role
      const action = requiredRole === "siteincharge" 
        ? employeeSlice.importEmployees 
        : employeeSlice.registerEmployeesFromExcel;
      
      await dispatch(action({ excelFile })).unwrap();
      setExcelFile(null);
    } catch (error) {
      // More specific error messages based on the actual error
      let errorMessage = "Failed to process Excel file";
      
      if (error.message?.includes("Validation errors in file")) {
        errorMessage = "Excel file contains validation errors";
      } else if (error.message?.includes("duplicate")) {
        errorMessage = "Some employee data already exists in the system";
      } else if (error.message?.includes("Missing required headers")) {
        errorMessage = "Excel file is missing required columns";
      } else if (error.message?.includes("No Excel file")) {
        errorMessage = "Please select a valid Excel file";
      } else if (error.message?.includes("Unsupported file format")) {
        errorMessage = "Invalid Excel file format";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        id: `excel-error-${Date.now()}`,
        duration: 8000,
        position: "top-center",
      });
    }
  };

  const handleSaveClick = async () => {
    try {
      await form.handleSubmit(handleSubmit)();
    } catch (error) {
      toast.dismiss();
      toast.error("Error submitting form, please try again", {
        id: `form-submit-error-${Date.now()}`,
        duration: autoDismissDuration,
        position: "top-center",
      });
    }
  };

  const addDocumentField = () => {
    appendDocument({ file: null });
  };

  const handleRemoveDocument = (index) => {
    setRemovingIndices((prev) => [...prev, index]);
    setTimeout(() => {
      setPreviews((prev) => {
        const newUrls = { ...prev };
        if (newUrls[index]) {
          URL.revokeObjectURL(newUrls[index]);
          delete newUrls[index];
        }
        return newUrls;
      });
      removeDocument(index);
      setRemovingIndices((prev) => prev.filter((i) => i !== index));
      setDragStates((prev) => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
    }, 300);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragStates((prev) => ({ ...prev, [index]: true }));
  };

  const handleDragLeave = (index) => {
    setDragStates((prev) => ({ ...prev, [index]: false }));
  };

  const handleDrop = (e, index, onChange) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreviews((prev) => {
        const newPreviews = { ...prev, [index]: previewUrl };
        return newPreviews;
      });
      onChange(file);
    }
    setDragStates((prev) => ({ ...prev, [index]: false }));
  };

  const setPreview = (index, url) => {
    setPreviews((prev) => {
      const newPreviews = { ...prev, [index]: url };
      return newPreviews;
    });
  };

  const handleExcelDragOver = (e) => {
    e.preventDefault();
    setExcelDragState(true);
  };

  const handleExcelDragLeave = () => {
    setExcelDragState(false);
  };

  const handleExcelDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setExcelFile(file);
    }
    setExcelDragState(false);
  };

  const handleExcelFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setExcelFile(file);
    }
  };

  const handleRemoveExcel = () => {
    setExcelFile(null);
  };

  return {
    form,
    documentFields,
    appendDocument: addDocumentField,
    handleRemoveDocument,
    dragStates,
    previews,
    setPreview,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    excelFile,
    setExcelFile,
    excelDragState,
    handleExcelDragOver,
    handleExcelDragLeave,
    handleExcelDrop,
    handleExcelFileChange,
    handleRemoveExcel,
    handleExcelSubmit,
    handleSaveClick,
    serverError,
    isSubmitting,
    employeesLoading,
    locationsLoading,
    locations,
    registrationMode,
    setRegistrationMode,
    formRef,
    documentsSectionRef,
    excelSectionRef,
  };
};

export default useEmployeeRegistration;
