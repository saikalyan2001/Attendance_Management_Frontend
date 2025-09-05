import { useEffect, useState, useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { useSelector } from "react-redux";

const employeeSchema = z.object({
  employeeId: z
    .string()
    .min(1, "Employee ID is required")
    .regex(/^[A-Z0-9-]+$/, "Employee ID must be alphanumeric with hyphens"),
  name: z
    .string()
    .min(1, "Name is required")
    .regex(/^[a-zA-Z\s]+$/, "Name must contain only letters and spaces")
    .max(100, "Name must be 100 characters or less"),
  email: z.string().optional().refine(
    (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    { message: "Invalid email address" }
  ),
  designation: z
    .string()
    .min(1, "Designation is required")
    .max(100, "Designation must be 100 characters or less"),
  department: z
    .string()
    .min(1, "Department is required")
    .max(100, "Department must be 100 characters or less"),
  salary: z
    .string()
    .min(1, "Salary is required")
    .regex(/^\d+$/, "Salary must be a positive number")
    .refine((val) => Number(val) > 0 && Number(val) <= 10000000, {
      message: "Salary must be between 1 and 10,000,000",
    }),
  location: z
    .string()
    .min(1, "Location is required")
    .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid location ID",
    }),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\d{10,15}$/, "Phone number must be 10 to 15 digits"),
  joinDate: z
    .string()
    .min(1, "Join date is required")
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime()) && date <= new Date();
      },
      {
        message: "Invalid or future join date",
      }
    ),
  bankDetails: z.object({
    accountNo: z
      .string()
      .min(1, "Account number is required")
      .regex(/^\d+$/, "Account number must be numeric")
      .max(20, "Account number must be 20 digits or less"),
    ifscCode: z
      .string()
      .min(1, "IFSC code is required")
      .max(11, "IFSC code must be 11 characters or less"),
    bankName: z
      .string()
      .min(1, "Bank name is required")
      .max(100, "Bank name must be 100 characters or less"),
    accountHolder: z
      .string()
      .min(1, "Account holder name is required")
      .regex(
        /^[a-zA-Z\s]+$/,
        "Account holder name must contain only letters and spaces"
      )
      .max(100, "Account holder name must be 100 characters or less"),
  }),
  documents: z
    .array(
      z.object({
        file: z.instanceof(File, { message: "Document file is required" }),
      })
    )
    .min(1, "At least one document is required")
    .max(5, "Cannot upload more than 5 documents"),
});

const parseServerError = (error) => {
  
  
  
  if (!error) {
    return { message: "An unknown error occurred", fields: {}, errors: [] };
  }

  // ✅ IMPROVED: Handle Excel validation errors with better structure detection
  if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
    
    
    
    return {
      message: error.message || "Excel file contains validation errors",
      fields: {},
      errors: error.errors // This should preserve the original structure
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
    
    // If backend provides field property, use it (for future compatibility)
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



const validateExcelFile = async (file) => {
  try {
    if (file.size > 5 * 1024 * 1024) {
      return {
        isValid: false,
        error: "File size exceeds 5MB limit",
      };
    }

    const arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });

    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      raw: false,
      dateNF: "yyyy-mm-dd",
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const headers = jsonData[0].map((h) => h.toString().trim());
    const requiredHeaders = [
      "employeeId",
      "name",
      "email",
      "designation",
      "department",
      "salary",
      "locationName",
      "phone",
      "joinDate",
      "accountNo",
      "ifscCode",
      "bankName",
      "accountHolder",
    ];

    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return {
        isValid: false,
        error: `Missing required headers: ${missingHeaders.join(", ")}`,
      };
    }

    const rows = jsonData
      .slice(1)
      .filter((row) => row.some((cell) => cell !== undefined && cell !== ""));
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index] !== undefined ? row[index] : null;
      });
      const rowNumber = i + 2;

      let parsedJoinDate;
      if (typeof rowData.joinDate === "number") {
        const dateObj = XLSX.SSF.parse_date_code(rowData.joinDate);
        parsedJoinDate = new Date(dateObj.y, dateObj.m - 1, dateObj.d);
      } else {
        parsedJoinDate = new Date(rowData.joinDate);
      }

      if (isNaN(parsedJoinDate) || parsedJoinDate > new Date()) {
        errors.push(`Row ${rowNumber}: Invalid or future join date`);
        continue;
      }

      if (!rowData.employeeId || !/^[A-Z0-9-]+$/.test(rowData.employeeId)) {
        errors.push(`Row ${rowNumber}: Invalid or missing employee ID`);
      }
      if (!rowData.name || !/^[a-zA-Z\s]+$/.test(rowData.name)) {
        errors.push(`Row ${rowNumber}: Invalid or missing name`);
      }
      if (rowData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rowData.email)) {
        errors.push(`Row ${rowNumber}: Invalid email`);
      }
      if (!rowData.phone || !/^\d{10,15}$/.test(rowData.phone)) {
        errors.push(`Row ${rowNumber}: Invalid or missing phone number`);
      }
      const parsedSalary = Number(rowData.salary);
      if (isNaN(parsedSalary) || parsedSalary < 1000 || parsedSalary > 10000000) {
        errors.push(`Row ${rowNumber}: Invalid salary`);
      }
      if (!rowData.designation || typeof rowData.designation !== "string") {
        errors.push(`Row ${rowNumber}: Invalid or missing designation`);
      }
      if (!rowData.department || typeof rowData.department !== "string") {
        errors.push(`Row ${rowNumber}: Invalid or missing department`);
      }
      if (!rowData.locationName || typeof rowData.locationName !== "string") {
        errors.push(`Row ${rowNumber}: Invalid or missing location name`);
      }
      if (
        !rowData.accountNo ||
        !rowData.ifscCode ||
        !rowData.bankName ||
        !rowData.accountHolder
      ) {
        errors.push(`Row ${rowNumber}: Missing bank details`);
      }
    }

    if (errors.length > 0) {
      return { isValid: false, error: errors.join("; ") };
    }

    return { isValid: true };
  } catch (error) {
    
    return {
      isValid: false,
      error: `Failed to validate Excel file: ${error.message}`,
    };
  }
};

const validateFile = (file) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const acceptedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
  ];
  if (!file) {
    return { isValid: false, error: "No file selected" };
  }
  if (file.size > maxSize) {
    return { isValid: false, error: "File size exceeds 5MB limit" };
  }
  if (!acceptedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG",
    };
  }
  return { isValid: true };
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
    resolver: zodResolver(employeeSchema),
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
        
        const employeeData = {
          employeeId: data.employeeId,
          name: data.name,
          email: includeEmailField ? data.email : undefined,
          designation: data.designation,
          department: data.department,
          salary: Number(data.salary),
          location: data.location,
          phone: data.phone,
          joinDate: new Date(data.joinDate).toISOString(),
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

        const firstErrorFieldName = Object.keys(parsedError.fields)[0];
        if (firstErrorFieldName) {
          const fieldElement = document.querySelector(
            `[name="${firstErrorFieldName}"]`
          );
          if (fieldElement) {
            fieldElement.scrollIntoView({ behavior: "smooth", block: "center" });
            fieldElement.focus();
          }
        }
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

 // Add this useEffect specifically for Excel errors
// Excel Error useEffect - FIXED VERSION
// Excel Error useEffect - ENHANCED DEBUG VERSION
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
    
    // Debug the errors array
    
    
    
    
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
    } else {
      
    }
    
    // Delay the reset to allow toasts to display
    setTimeout(() => {
      dispatch(employeeSlice.reset());
      setLastError(null);
    }, 2000);
  }
}, [employeesError, errorType, dispatch, lastError, employeeSlice]);


// Option 1: Keep both useEffects (Recommended)
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

    const validation = await validateExcelFile(excelFile);
    if (!validation.isValid) {
      toast.error(validation.error, {
        id: `excel-validation-error-${Date.now()}`,
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
      
      const isValid = await form.trigger();
      if (!isValid) {
        const errors = [];
        const fieldLabels = {
          employeeId: "Employee ID",
          name: "Name",
          email: "Email",
          designation: "Designation",
          department: "Department",
          salary: "Salary",
          location: "Location",
          phone: "Phone number",
          joinDate: "Join date",
          "bankDetails.accountNo": "Account number",
          "bankDetails.ifscCode": "IFSC code",
          "bankDetails.bankName": "Bank name",
          "bankDetails.accountHolder": "Account holder name",
          documents: "Documents",
        };

        const fieldOrder = [
          "employeeId",
          "name",
          ...(includeEmailField ? ["email"] : []),
          "designation",
          "department",
          "salary",
          "location",
          "phone",
          "joinDate",
          "bankDetails.accountNo",
          "bankDetails.ifscCode",
          "bankDetails.bankName",
          "bankDetails.accountHolder",
          "documents",
        ];

        const addError = (field, message) => {
          if (message && !errors.some((e) => e.field === field)) {
            const displayMessage = message.includes("is required")
              ? `${fieldLabels[field] || field} is required`
              : message;
            errors.push({ field, message: displayMessage });
          }
        };

        for (const field of fieldOrder) {
          if (field.startsWith("bankDetails.")) {
            const subField = field.split(".")[1];
            const error = form.formState.errors.bankDetails?.[subField];
            addError(field, error?.message);
          } else if (
            field === "documents" &&
            form.formState.errors.documents?.message
          ) {
            addError(field, form.formState.errors.documents.message);
          } else if (
            field === "documents" &&
            Array.isArray(form.formState.errors.documents)
          ) {
            form.formState.errors.documents.forEach((docError, index) => {
              if (docError?.file?.message) {
                addError(field, docError.file.message);
              }
            });
          } else {
            const error = form.formState.errors[field];
            addError(field, error?.message);
          }
        }

        if (
          form.getValues().documents.length === 0 ||
          !form.getValues().documents.every((doc) => doc.file instanceof File)
        ) {
          addError("documents", "At least one valid document is required");
        }

        if (errors.length > 0) {
          toast.dismiss();
          const firstError = errors.sort(
            (a, b) => fieldOrder.indexOf(a.field) - fieldOrder.indexOf(b.field)
          )[0];
          toast.error(firstError.message, {
            id: `validation-error-${firstError.field.replace(".", "-")}-${Date.now()}`,
            duration: autoDismissDuration,
            position: "top-center",
          });

          if (
            firstError.field !== "documents" &&
            !firstError.field.startsWith("documents[")
          ) {
            const firstErrorField = document.querySelector(
              `[name="${firstError.field}"]`
            );
            if (firstErrorField) {
              firstErrorField.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              firstErrorField.focus();
            }
          } else if (documentsSectionRef.current) {
            documentsSectionRef.current.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
          return;
        }
      }

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
    if (documentFields.length >= 5) {
      toast.dismiss();
      toast.error("Cannot add more than 5 documents", {
        id: `max-documents-${Date.now()}`,
        duration: autoDismissDuration,
        position: "top-center",
      });
      return;
    }
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
      const validation = validateFile(file);
      if (!validation.isValid) {
        toast.error(validation.error, {
          id: `file-validation-error-${index}-${Date.now()}`,
          duration: autoDismissDuration,
          position: "top-center",
        });
        setDragStates((prev) => ({ ...prev, [index]: false }));
        return;
      }
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
