import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchEmployees,
  registerEmployee,
  registerEmployeesFromExcel,
  reset as resetEmployees,
} from "../redux/employeeSlice";
import {
  fetchLocations,
  reset as resetLocations,
} from "../redux/locationsSlice";
import Layout from "../../../components/layout/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2, Plus, FileText, Image, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import toast, { Toaster } from "react-hot-toast";
import { File as FileIcon } from "lucide-react";
import * as XLSX from "xlsx";

// Define employeeSchema for form validation
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
  email: z.string().min(1, "Email is required").email("Invalid email address"),
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
  console.log("Raw server error:", error);
  if (!error)
    return { message: "An unknown error occurred", fields: {}, errors: [] };
  if (error instanceof TypeError) {
    return {
      message: "Unexpected response from server. Please try again.",
      fields: {},
      errors: [],
    };
  }
  if (typeof error === "string") {
    const fieldErrors = {};
    if (error.includes("already exists")) {
      if (error.includes("Email")) fieldErrors.email = "Email already exists";
      if (error.includes("Employee ID"))
        fieldErrors.employeeId = "Employee ID already exists";
      if (error.includes("Phone number"))
        fieldErrors.phone = "Phone number already exists";
    }
    return { message: error, fields: fieldErrors, errors: [] };
  }
  if (error.message?.includes("Missing required headers")) {
    return { message: error.message, fields: {}, errors: [] };
  }
  if (error.message?.includes("Validation errors in file")) {
    return {
      message: error.message,
      fields: {},
      errors: error.errors || [],
    };
  }
  if (error.message?.includes("Location not found")) {
    return {
      message: error.message,
      fields: { locationName: error.message },
      errors: error.errors || [],
    };
  }
  const message = error.message || error.error || "Failed to register employee";
  const fields =
    error.errors?.reduce((acc, err) => {
      if (err.field) acc[err.field] = err.message;
      return acc;
    }, {}) || {};
  const errors = error.errors || [];
  return { message, fields, errors };
};

const getFileIcon = (file) => {
  if (!file) return <FileIcon className="h-5 w-5 text-body" />;
  const extension = file.name.toLowerCase().split(".").pop();
  if (["jpg", "jpeg", "png"].includes(extension)) {
    return <Image className="h-5 w-5 text-body" />;
  }
  if (["pdf"].includes(extension)) {
    return <FileText className="h-5 w-5 text-body" />;
  }
  if (["doc", "docx"].includes(extension)) {
    return <FileText className="h-5 w-5 text-body" />;
  }
  if (["xlsx", "xls"].includes(extension)) {
    return <FileIcon className="h-5 w-5 text-body" />;
  }
  return <FileIcon className="h-5 w-5 text-body" />;
};

const isImageFile = (file) => {
  if (!file) return false;
  const extension = file.name.toLowerCase().split(".").pop();
  return ["jpg", "jpeg", "png"].includes(extension);
};

const validateExcelFile = async (file) => {
  try {
    // Validate file size (5MB = 5 * 1024 * 1024 bytes)
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

    const workbook = XLSX.read(arrayBuffer, { type: "array", raw: false, dateNF: "yyyy-mm-dd" });
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
      return { isValid: false, error: `Missing required headers: ${missingHeaders.join(", ")}` };
    }

    const rows = jsonData.slice(1).filter((row) => row.some((cell) => cell !== undefined && cell !== ""));
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
      if (!rowData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rowData.email)) {
        errors.push(`Row ${rowNumber}: Invalid or missing email`);
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
    console.error("Excel validation error:", error);
    return { isValid: false, error: `Failed to validate Excel file: ${error.message}` };
  }
};

const RegisterEmployee = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const {
    loading: employeesLoading,
    error: employeesError,
    errorType,
    success,
    successType,
  } = useSelector((state) => state.adminEmployees);
  const {
    locations,
    loading: locationsLoading,
    error: locationsError,
  } = useSelector((state) => state.adminLocations);
  const [serverError, setServerError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [removingIndices, setRemovingIndices] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragStates, setDragStates] = useState({});
  const [previews, setPreviews] = useState({});
  const [excelFile, setExcelFile] = useState(null);
  const [excelDragState, setExcelDragState] = useState(false);
  const [registrationMode, setRegistrationMode] = useState(null); // null, 'single', or 'excel'
  const maxRetries = 3;
  const autoDismissDuration = 5000;
  const formRef = useRef(null);
  const documentsSectionRef = useRef(null);
  const excelSectionRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeId: "",
      name: "",
      email: "",
      designation: "",
      department: "",
      salary: "",
      location: "",
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

    const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const employeeData = {
        employeeId: data.employeeId,
        name: data.name,
        email: data.email,
        designation: data.designation,
        department: data.department,
        salary: Number(data.salary),
        location: data.location,
        phone: data.phone,
        joinDate: new Date(data.joinDate).toISOString(),
        bankDetails: data.bankDetails,
        paidLeaves: { available: 2, used: 0, carriedForward: 0 },
        createdBy: user._id,
      };

      await dispatch(
        registerEmployee({ employeeData, documents: data.documents })
      ).unwrap();
    } catch (error) {
      console.error("Single employee registration error:", error);
      toast.dismiss();
      const parsedError = parseServerError(error);
      setServerError(parsedError);
      setRetryCount((prev) => prev + 1);
      toast.error(parsedError.message, {
        id: "server-error-submit",
        duration: 10000,
        position: "top-center",
        action: retryCount < maxRetries && {
          text: "Retry",
          onClick: () => form.handleSubmit(handleSubmit)(),
        },
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
  };

  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/login");
    }
    dispatch(fetchLocations());
  }, [dispatch, user, navigate]);

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previews]);

  useEffect(() => {
    if (employeesError && errorType === "single") {
      console.log("Raw server error:", employeesError);
      const parsedError = parseServerError(employeesError);
      setServerError(parsedError);
      toast.dismiss();
      toast.error(parsedError.message, {
        id: "error",
        duration: 10000,
        position: "top-center",
        action: retryCount < maxRetries && {
          text: "Retry",
          onClick: () => handleSubmit(form.getValues()),
        },
      });
      if (parsedError.errors?.length > 0) {
        parsedError.errors.forEach((err) => {
          toast.error(`Row ${err.row}: ${Object.values(err).join(", ")}`, {
            id: `row-error-${err.row}`,
            duration: autoDismissDuration,
            position: "top-center",
          });
        });
      }
    }
  }, [employeesError, errorType, retryCount, handleSubmit, form]);

  useEffect(() => {
    if (success && (successType === "single" || successType === "excel")) {
      toast.dismiss(); // Clear all existing toasts
      toast.success(
        successType === "single"
          ? "Employee registered successfully"
          : "Employees registered successfully from Excel",
        {
          id: "success",
          duration: autoDismissDuration,
          position: "top-center",
        }
      );
      const successTimer = setTimeout(() => {
        dispatch(resetEmployees());
        form.reset();
        setServerError(null);
        setRetryCount(0);
        setRemovingIndices([]);
        setDragStates({});
        setPreviews({});
        setExcelFile(null);
        setRegistrationMode(null);
        toast.dismiss("success");
        navigate("/admin/employees");
      }, autoDismissDuration);
      return () => clearTimeout(successTimer);
    }
  }, [success, successType, dispatch, form, navigate]);

  useEffect(() => {
    if (!employeesLoading) {
      setIsSubmitting(false);
    }
  }, [employeesLoading]);

  const handleExcelSubmit = async () => {
    if (!excelFile) {
      toast.error("Please select an Excel file", {
        id: "excel-no-file",
        duration: 5000,
        position: "top-center",
      });
      return;
    }

    const validation = await validateExcelFile(excelFile);
    if (!validation.isValid) {
      toast.error(validation.error, {
        id: "excel-validation-error",
        duration: 5000,
        position: "top-center",
      });
      return;
    }

    try {
      console.log("Submitting Excel file:", {
        name: excelFile.name,
        type: excelFile.type,
        size: excelFile.size,
        lastModified: excelFile.lastModified,
      });

      await dispatch(registerEmployeesFromExcel({ excelFile })).unwrap();
      setExcelFile(null);
    } catch (error) {
      console.error("Excel upload error:", error);
      const errorMessage = error.message || "Failed to register employees from Excel";
      toast.error(errorMessage, {
        id: "excel-error",
        duration: 5000,
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
          "email",
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
                addError(`documents[${index}].file`, docError.file.message);
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
            id: `validation-error-${firstError.field.replace(".", "-")}`,
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
        id: "form-submit-error",
        duration: autoDismissDuration,
        position: "top-center",
      });
    }
  };

  const addDocumentField = () => {
    if (documentFields.length >= 5) {
      toast.dismiss();
      toast.error("Cannot add more than 5 documents", {
        id: "max-documents",
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
      const previewUrl = URL.createObjectURL(file);
      setPreviews((prev) => ({ ...prev, [index]: previewUrl }));
      onChange(file);
    }
    setDragStates((prev) => ({ ...prev, [index]: false }));
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
      console.log("Dropped Excel file:", {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
      });
      setExcelFile(file);
    }
    setExcelDragState(false);
  };

  const handleExcelFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log("Selected Excel file:", {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
      });
      setExcelFile(file);
    }
  };

  const handleRemoveExcel = () => {
    setExcelFile(null);
  };

  const renderSelectionScreen = () => (
    <div className="flex flex-col items-center space-y-6">
      <h3 className="text-lg sm:text-xl xl:text-2xl font-semibold text-body">
        Choose Registration Method
      </h3>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Button
          onClick={() => setRegistrationMode("single")}
          className="bg-accent text-body hover:bg-accent-hover rounded-lg text-sm sm:text-base xl:text-lg py-3 sm:py-4 px-6 sm:px-8 flex-1 transition-all duration-300 hover:shadow-lg"
        >
          Register Single Employee
        </Button>
        <Button
          onClick={() => setRegistrationMode("excel")}
          className="bg-accent text-body hover:bg-accent-hover rounded-lg text-sm sm:text-base xl:text-lg py-3 sm:py-4 px-6 sm:px-8 flex-1 transition-all duration-300 hover:shadow-lg"
        >
          Import Employees from Excel
        </Button>
      </div>
    </div>
  );

  const renderSingleEmployeeForm = () => (
    <Form {...form}>
      <form className="space-y-6 sm:space-y-8" ref={formRef}>
        <div>
          <h3 className="text-sm sm:text-base xl:text-lg font-semibold mb-3 sm:mb-4 text-body">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Employee ID *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., EMP003"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.employeeId || form.formState.errors.employeeId?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Name *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Alice Johnson"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.name || form.formState.errors.name?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Designation *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Analyst"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.designation || form.formState.errors.designation?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Department *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Finance"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.department || form.formState.errors.department?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Location *
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={employeesLoading || locationsLoading || locations.length === 0 || isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg">
                        <SelectValue
                          placeholder={locations.length === 0 ? "No locations available" : "Select location"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-complementary text-body">
                      {locations.map((loc) => (
                        <SelectItem
                          key={loc._id}
                          value={loc._id}
                          className="text-[10px] sm:text-sm xl:text-base"
                        >
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {locations.length === 0 && !locationsLoading && (
                    <p className="text-error text-[9px] sm:text-xs xl:text-base mt-1">
                      No locations available. Please add a location in the Locations page.
                    </p>
                  )}
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.location || form.formState.errors.location?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Salary (₹/year) *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      placeholder="e.g., 55000"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.salary || form.formState.errors.salary?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="joinDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Join Date *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.joinDate || form.formState.errors.joinDate?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Phone *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., 1234567890"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.phone || form.formState.errors.phone?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Email *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      {...field}
                      placeholder="e.g., alice@example.com"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.email || form.formState.errors.email?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
          </div>
        </div>
        <div>
          <h3 className="text-sm sm:text-base xl:text-lg font-semibold mb-3 sm:mb-4 text-body">
            Bank Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField
              control={form.control}
              name="bankDetails.accountNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Account Number *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., 123456789012"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.["bankDetails.accountNo"] ||
                      form.formState.errors.bankDetails?.accountNo?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankDetails.ifscCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    IFSC Code *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., SBIN0001234"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.["bankDetails.ifscCode"] ||
                      form.formState.errors.bankDetails?.ifscCode?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankDetails.bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Bank Name *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., State Bank of India"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.["bankDetails.bankName"] ||
                      form.formState.errors.bankDetails?.bankName?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankDetails.accountHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-body text-[10px] sm:text-sm xl:text-lg font-medium">
                    Account Holder Name *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Alice Johnson"
                      className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                      disabled={employeesLoading || locationsLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base">
                    {serverError?.fields?.["bankDetails.accountHolder"] ||
                      form.formState.errors.bankDetails?.accountHolder?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
          </div>
        </div>
        <div ref={documentsSectionRef}>
          <h3 className="text-sm sm:text-base xl:text-lg font-semibold mb-3 sm:mb-4 text-body">
            Employee Documents
          </h3>
          {documentFields.map((field, index) => (
            <div
              key={field.id}
              className={cn(
                "mb-3 sm:mb-4 rounded-md border border-complementary/30 bg-body shadow-sm hover:shadow-md transition-shadow duration-300",
                removingIndices.includes(index) ? "animate-fade-out" : "animate-fade-in"
              )}
            >
              <FormField
                control={form.control}
                name={`documents.${index}.file`}
                render={({ field: fieldProps }) => (
                  <FormItem className="p-3 sm:p-4">
                    <div
                      className={cn(
                        "relative border-2 border-dashed rounded-md p-4 sm:p-6 text-center transition-all duration-300",
                        dragStates[index] ? "border-accent bg-accent/10" : "border-complementary",
                        fieldProps.value ? "bg-body" : "bg-complementary/10",
                        (employeesLoading || locationsLoading || isSubmitting) && "opacity-50 cursor-not-allowed"
                      )}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={() => handleDragLeave(index)}
                      onDrop={(e) => handleDrop(e, index, fieldProps.onChange)}
                      role="region"
                      aria-label={`Upload document ${index + 1}`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          document.getElementById(`file-input-${index}`).click();
                        }
                      }}
                    >
                      <Input
                        id={`file-input-${index}`}
                        type="file"
                        accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const previewUrl = URL.createObjectURL(file);
                            setPreviews((prev) => ({ ...prev, [index]: previewUrl }));
                            fieldProps.onChange(file);
                          }
                        }}
                        className="hidden"
                        disabled={employeesLoading || locationsLoading || isSubmitting}
                      />
                      {!fieldProps.value ? (
                        <div className="flex flex-col items-center space-y-2">
                          <FileIcon className="h-6 w-6 sm:h-8 sm:w-8 text-body/60" />
                          <p className="text-[10px] sm:text-sm xl:text-base text-body/60">
                            Drag & drop a file here or click to upload
                          </p>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={() => document.getElementById(`file-input-${index}`).click()}
                              className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                              disabled={employeesLoading || locationsLoading || isSubmitting}
                            >
                              Choose File
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleRemoveDocument(index)}
                              className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                              disabled={employeesLoading || locationsLoading || isSubmitting}
                              aria-label="Cancel document upload"
                            >
                              Cancel
                            </Button>
                          </div>
                          <p className="text-[9px] sm:text-xs xl:text-sm text-body/50">
                            (PDF, DOC, DOCX, JPG, JPEG, PNG; Max 5MB)
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-2 truncate">
                              {getFileIcon(fieldProps.value)}
                              <div className="truncate">
                                <span className="text-[10px] sm:text-sm xl:text-base text-body truncate">
                                  {fieldProps.value.name}
                                </span>
                                <span className="text-[9px] sm:text-xs xl:text-sm text-body/60 block">
                                  {(fieldProps.value.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <a
                                href={previews[index]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "p-1 text-accent hover:text-accent-hover focus:ring-2 focus:ring-accent/20 rounded-full",
                                  (employeesLoading || locationsLoading || isSubmitting || !previews[index]) &&
                                    "opacity-50 cursor-not-allowed"
                                )}
                                aria-label={`Preview document ${fieldProps.value.name}`}
                                onClick={(e) => {
                                  if (employeesLoading || locationsLoading || isSubmitting || !previews[index]) {
                                    e.preventDefault();
                                  }
                                }}
                              >
                                <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                              </a>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveDocument(index)}
                                className="text-error hover:text-error-hover focus:ring-2 focus:ring-error/20 rounded-full"
                                disabled={employeesLoading || locationsLoading || isSubmitting}
                                aria-label={`Remove document ${fieldProps.value.name}`}
                              >
                                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                              </Button>
                            </div>
                          </div>
                          {isImageFile(fieldProps.value) && previews[index] && (
                            <div className="mt-2 flex justify-center">
                              <img
                                src={previews[index]}
                                alt={`Preview of ${fieldProps.value.name}`}
                                className="h-24 w-24 object-cover rounded-md border border-complementary"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base mt-2">
                      {serverError?.fields?.[`documents[${index}].file`] ||
                        form.formState.errors.documents?.[index]?.file?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />
            </div>
          ))}
          <Button
            type="button"
            onClick={addDocumentField}
            className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md"
            disabled={employeesLoading || locationsLoading || isSubmitting}
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Add Document
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setRegistrationMode(null)}
            className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-md"
            disabled={employeesLoading || locationsLoading || isSubmitting}
            aria-label="Back"
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={handleSaveClick}
            className={cn(
              "bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] w-full sm:w-auto transition-all duration-300 hover:shadow-md",
              isSubmitting && "animate-scale-in",
              success && !employeesLoading && "animate-pulse"
            )}
            disabled={employeesLoading || locationsLoading || isSubmitting}
            aria-label="Register Employee"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Register Employee"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );

  const renderExcelImport = () => (
    <div ref={excelSectionRef}>
      <h3 className="text-sm sm:text-base xl:text-lg font-semibold mb-3 sm:mb-4 text-body">
        Import Employees from Excel
      </h3>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-md p-4 sm:p-6 text-center transition-all duration-300",
          excelDragState ? "border-accent bg-accent/10" : "border-complementary",
          excelFile ? "bg-body" : "bg-complementary/10",
          (employeesLoading || locationsLoading || isSubmitting) && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={handleExcelDragOver}
        onDragLeave={handleExcelDragLeave}
        onDrop={handleExcelDrop}
        role="region"
        aria-label="Upload file"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("excel-file-input").click();
          }
        }}
      >
        <Input
          id="excel-file-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleExcelFileChange}
          className="hidden"
          disabled={employeesLoading || locationsLoading || isSubmitting}
        />
        {!excelFile ? (
          <div className="flex flex-col items-center space-y-2">
            <FileIcon className="h-6 w-6 sm:h-8 sm:w-8 text-body/60" />
            <p className="text-[10px] sm:text-sm xl:text-base text-body/60">
              Drag & drop a file here or click to upload
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => document.getElementById("excel-file-input").click()}
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                disabled={employeesLoading || locationsLoading || isSubmitting}
              >
                Choose File
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExcelFile(null)}
                className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                disabled={employeesLoading || locationsLoading || isSubmitting}
                aria-label="Cancel file upload"
              >
                Cancel
              </Button>
            </div>
            <p className="text-[9px] sm:text-xs xl:text-sm text-body/50">
              (XLSX, XLS, CSV; Max 5MB)
            </p>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-2 truncate">
                {getFileIcon(excelFile)}
                <div className="truncate">
                  <span className="text-[10px] sm:text-sm xl:text-base text-body truncate">
                    {excelFile.name}
                  </span>
                  <span className="text-[9px] sm:text-xs xl:text-sm text-body/60 block">
                    {(excelFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveExcel}
                className="text-error hover:text-error-hover focus:ring-2 focus:ring-error/20 rounded-full"
                disabled={employeesLoading || locationsLoading || isSubmitting}
                aria-label={`Remove file ${excelFile.name}`}
              >
                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <Button
          type="button"
          onClick={() => setRegistrationMode(null)}
          className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300 hover:shadow-md"
          disabled={employeesLoading || locationsLoading || isSubmitting}
          aria-label="Back"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleExcelSubmit}
          className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md"
          disabled={employeesLoading || locationsLoading || isSubmitting || !excelFile}
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          Import Employees
        </Button>
      </div>
    </div>
  );

  return (
    <Layout title="Register Employee">
      <Toaster position="top-center" />
      <Card className="bg-complementary text-body max-w-full sm:max-w-3xl xl:max-w-4xl mx-auto shadow-lg rounded-lg border border-accent/10 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold text-center">
            Register Employee
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          {!registrationMode ? (
            renderSelectionScreen()
          ) : registrationMode === "single" ? (
            renderSingleEmployeeForm()
          ) : (
            renderExcelImport()
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default RegisterEmployee;