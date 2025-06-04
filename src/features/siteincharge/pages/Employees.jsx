import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmployees, fetchLocations, fetchAllLocations, fetchSettings, editEmployee, transferEmployee, uploadDocument, deactivateEmployee, rejoinEmployee, reset } from '../redux/employeeSlice';
import { fetchMe } from '../../../redux/slices/authSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Search, ArrowUpDown, AlertCircle, X, CheckCircle, PlusCircle, Users, ChevronLeft, ChevronRight, FilePlus, Truck, Eye, FileText, Image as ImageIcon, History, LogOut, UserPlus, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';

const FileIcon = () => <svg className="h-5 w-5 text-body" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;

const editEmployeeSchema = z.object({
  name: z.string().min(1, 'This field is required'),
  email: z.string().min(1, 'This field is required').email('Please enter a valid email address'),
  designation: z.string().min(1, 'This field is required'),
  department: z.string().min(1, 'This field is required'),
  salary: z.string().min(1, 'This field is required'),
  phone: z.string().optional(),
});

const transferEmployeeSchema = z.object({
  location: z.string().min(1, 'Please select a location'),
});

const rejoinSchema = z.object({
  rejoinDate: z.string().min(1, 'Please select a rejoin date'),
});

const uploadDocumentSchema = z.object({
  documents: z.array(
    z.object({
      file: z.any().refine((file) => file instanceof File, 'Please upload a file'),
    })
  ).min(1, 'At least one document is required'),
});

const getFileIcon = (file) => {
  if (!file) return <FileIcon className="h-5 w-5 text-body" />;
  const extension = file.name.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png'].includes(extension)) {
    return <ImageIcon className="h-5 w-5 text-body" />;
  }
  if (['pdf'].includes(extension)) {
    return <FileText className="h-5 w-5 text-body" />;
  }
  if (['doc', 'docx'].includes(extension)) {
    return <FileText className="h-5 w-5 text-body" />;
  }
  return <FileIcon className="h-5 w-5 text-body" />;
};

const isImageFile = (file) => {
  if (!file) return false;
  const extension = file.name.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png'].includes(extension);
};

const Employees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const { employees, locations, allLocations, settings, loading: employeesLoading, error: employeesError, success } = useSelector((state) => state.siteInchargeEmployee);

  const initialDepartment = searchParams.get('department') || 'all';
  const initialStatus = searchParams.get('status') || 'all';
  const [filterDepartment, setFilterDepartment] = useState(initialDepartment);
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('employeeId');
  const [sortOrder, setSortOrder] = useState('asc');
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openTransferDialog, setOpenTransferDialog] = useState(false);
  const [openRejoinDialog, setOpenRejoinDialog] = useState(false);
  const [openAddDocumentsDialog, setOpenAddDocumentsDialog] = useState(false);
  const [openDeactivateDialog, setOpenDeactivateDialog] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [transferEmployeeId, setTransferEmployeeId] = useState(null);
  const [employeeToRejoin, setEmployeeToRejoin] = useState(null);
  const [addDocumentsEmployeeId, setAddDocumentsEmployeeId] = useState(null);
  const [deactivateEmployeeId, setDeactivateEmployeeId] = useState(null);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [removingIndices, setRemovingIndices] = useState([]);
  const [dragStates, setDragStates] = useState({});
  const [previewUrls, setPreviewUrls] = useState({});
  const itemsPerPage = 5;
  const autoDismissDuration = 5000;

  const locationId = user?.locations?.[0]?._id;

  // Use dynamic HIGHLIGHT_DURATION from settings, fallback to 24 hours if not available
  const HIGHLIGHT_DURATION = settings?.highlightDuration ?? 24 * 60 * 60 * 1000;

  // Function to check if the employee should be highlighted based on transfer timestamp
  const shouldHighlightEmployee = (employee) => {
    if (!employee.transferTimestamp) return false;
    const transferTime = new Date(employee.transferTimestamp).getTime();
    const currentTime = new Date().getTime();
    return (currentTime - transferTime) <= HIGHLIGHT_DURATION;
  };

  const editForm = useForm({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      name: '',
      email: '',
      designation: '',
      department: '',
      salary: '',
      phone: '',
    },
  });

  const transferForm = useForm({
    resolver: zodResolver(transferEmployeeSchema),
    defaultValues: {
      location: '',
    },
  });

  const rejoinForm = useForm({
    resolver: zodResolver(rejoinSchema),
    defaultValues: {
      rejoinDate: '',
    },
  });

  const addDocumentsForm = useForm({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: {
      documents: [],
    },
  });

  const { fields: documentFields, append: appendDocument, remove: removeDocument } = useFieldArray({
    control: addDocumentsForm.control,
    name: 'documents',
  });

  const departments = useMemo(() => {
    return [...new Set(employees.map(emp => emp.department))].sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const searchFiltered = employees.filter(
      (emp) =>
        (emp.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (emp.employeeId || '').toLowerCase().includes(search.toLowerCase())
    );
    const departmentFiltered = searchFiltered.filter(emp => filterDepartment === 'all' || emp.department === filterDepartment);
    const statusFiltered = departmentFiltered.filter(emp => filterStatus === 'all' || emp.status === filterStatus);

    console.log('Employees after search filter:', searchFiltered);
    console.log('Employees after department filter:', departmentFiltered);
    console.log('Employees after status filter:', statusFiltered);

    return statusFiltered;
  }, [employees, search, filterDepartment, filterStatus]);

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      let aValue, bValue;

      if (sortField === 'salary') {
        aValue = a.salary || 0;
        bValue = b.salary || 0;
      } else if (sortField === 'location') {
        aValue = a.location?.name || a.location?.city || '';
        bValue = b.location?.name || b.location?.city || '';
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (sortField === 'leaves') {
        aValue = a.paidLeaves?.available || 0;
        bValue = b.paidLeaves?.available || 0;
      } else if (sortField === 'status') {
        aValue = a.status || '';
        bValue = b.status || '';
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else {
        aValue = (a[sortField] || '').toLowerCase();
        bValue = (b[sortField] || '').toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredEmployees, sortField, sortOrder]);

  const totalItems = sortedEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = sortedEmployees.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  useEffect(() => {
    dispatch(fetchMe()).unwrap().catch(() => {
      toast.error('Failed to fetch user data', { duration: autoDismissDuration });
      navigate('/login');
    });
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'siteincharge')) {
      navigate('/login');
      return;
    }
    if (!authLoading && !user?.locations?.length) {
      setErrorMessage('No location assigned. Please contact an admin.');
      setShowErrorAlert(true);
      navigate('/siteincharge/dashboard');
    } else if (!authLoading && locationId) {
      console.log('locationId:', locationId);
      console.log('filterStatus:', filterStatus);
      dispatch(fetchEmployees({ 
        location: locationId,
        status: filterStatus === 'all' ? undefined : filterStatus,
      })).then((result) => {
        console.log('fetchEmployees result:', result);
        console.log('Employees in state:', employees);
      });
      dispatch(fetchLocations());
      dispatch(fetchAllLocations());
      dispatch(fetchSettings()); // Fetch settings to get highlightDuration
    }
  }, [user, authLoading, locationId, dispatch, navigate, filterStatus]);

  useEffect(() => {
    if (employeesError) {
      console.log('Employees error:', employeesError);
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
    if (success) {
      if (successMessage) {
        setShowSuccessAlert(true);
        toast.success(successMessage, { duration: autoDismissDuration });

        const successTimer = setTimeout(() => {
          setShowSuccessAlert(false);
          setSuccessMessage(null);
          dispatch(reset());
        }, autoDismissDuration);

        return () => clearTimeout(successTimer);
      }
      setOpenTransferDialog(false);
      setOpenRejoinDialog(false);
      transferForm.reset();
      rejoinForm.reset();
      dispatch(reset());
    }
  }, [success, successMessage, dispatch, transferForm, rejoinForm]);

  const handleEditClick = (employee) => {
    setEmployeeToEdit(employee);
    editForm.reset({
      name: employee.name,
      email: employee.email,
      designation: employee.designation,
      department: employee.department,
      salary: employee.salary ? employee.salary.toString() : '',
      phone: employee.phone || '',
    });
    setOpenEditDialog(true);
  };

  const handleEditSubmit = (data) => {
    const employeeData = {
      ...data,
    };
    Object.keys(employeeData).forEach((key) => employeeData[key] === undefined && delete employeeData[key]);
    dispatch(editEmployee({ id: employeeToEdit._id, data: employeeData })).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        setOpenEditDialog(false);
        setEmployeeToEdit(null);
        setSuccessMessage('Employee updated successfully');
        setShowSuccessAlert(true);
        toast.success('Employee updated successfully', { duration: autoDismissDuration });

        const successTimer = setTimeout(() => {
          setShowSuccessAlert(false);
          setSuccessMessage(null);
          dispatch(reset());
        }, autoDismissDuration);

        return () => clearTimeout(successTimer);
      } else {
        toast.error(result.payload || 'Failed to update employee', { duration: autoDismissDuration });
      }
    });
  };

  const handleTransferClick = (employee) => {
    setTransferEmployeeId(employee._id);
    transferForm.reset({
      location: employee.location?._id || '',
    });
    setOpenTransferDialog(true);
  };

  const handleTransferSubmit = (data) => {
    dispatch(transferEmployee({ 
      id: transferEmployeeId, 
      location: data.location,
      transferTimestamp: new Date().toISOString()
    }))
      .unwrap()
      .then(() => {
        const newLocation = allLocations.find(loc => loc._id === data.location);
        setSuccessMessage(`Employee transferred to ${newLocation?.name || newLocation?.city || 'new location'} successfully`);
      })
      .catch((error) => {
        toast.error(error || 'Failed to transfer employee', { duration: autoDismissDuration });
      });
  };

  const handleRejoinClick = (employee) => {
    setEmployeeToRejoin(employee);
    setOpenRejoinDialog(true);
  };

  const handleRejoinSubmit = (data) => {
    dispatch(rejoinEmployee({ id: employeeToRejoin._id, rejoinDate: new Date(data.rejoinDate).toISOString() }))
      .unwrap()
      .then(() => {
        setSuccessMessage('Employee rejoined successfully');
      })
      .catch((error) => {
        toast.error(error || 'Failed to rejoin employee', { duration: autoDismissDuration });
      });
  };

  const handleHistoryClick = (employee) => {
    navigate(`/siteincharge/employees/${employee._id}/history`);
  };

  const handleAddDocumentsClick = (employee) => {
    setAddDocumentsEmployeeId(employee._id);
    addDocumentsForm.reset({
      documents: [],
    });
    setOpenAddDocumentsDialog(true);
  };

  const handleAddDocumentsSubmit = (data) => {
    dispatch(uploadDocument({ id: addDocumentsEmployeeId, documents: data.documents })).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        setOpenAddDocumentsDialog(false);
        setAddDocumentsEmployeeId(null);
        setSuccessMessage('Documents added successfully');
        setShowSuccessAlert(true);
        toast.success('Documents added successfully', { duration: autoDismissDuration });

        const successTimer = setTimeout(() => {
          setShowSuccessAlert(false);
          setSuccessMessage(null);
          dispatch(reset());
          setDragStates({});
          setPreviewUrls({});
          setRemovingIndices([]);
        }, autoDismissDuration);

        return () => clearTimeout(successTimer);
      } else {
        toast.error(result.payload || 'Failed to add documents', { duration: autoDismissDuration });
      }
    });
  };

  const handleDeactivateClick = (id) => {
    setDeactivateEmployeeId(id);
    setOpenDeactivateDialog(true);
  };

  const handleDeactivateConfirm = () => {
    dispatch(deactivateEmployee(deactivateEmployeeId)).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        setOpenDeactivateDialog(false);
        setSuccessMessage('Employee deactivated successfully');
        setShowSuccessAlert(true);
        toast.success('Employee deactivated successfully', { duration: autoDismissDuration });

        const successTimer = setTimeout(() => {
          setShowSuccessAlert(false);
          setSuccessMessage(null);
          dispatch(reset());
        }, autoDismissDuration);

        return () => clearTimeout(successTimer);
      } else {
        toast.error(result.payload || 'Failed to deactivate employee', { duration: autoDismissDuration });
      }
    });
  };

  const handleViewClick = (employeeId) => {
    navigate(`/siteincharge/employees/${employeeId}`);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleFilterDepartmentChange = (value) => {
    setFilterDepartment(value);
    const params = {};
    if (value !== 'all') params.department = value;
    if (filterStatus !== 'all') params.status = filterStatus;
    setSearchParams(params);
    setCurrentPage(1);
  };

  const handleFilterStatusChange = (value) => {
    setFilterStatus(value);
    const params = {};
    if (filterDepartment !== 'all') params.department = filterDepartment;
    if (value !== 'all') params.status = value;
    setSearchParams(params);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleDismissErrors = () => {
    setShowErrorAlert(false);
    setErrorMessage(null);
    dispatch(reset());
  };

  const handleDismissSuccess = () => {
    setShowSuccessAlert(false);
    setSuccessMessage(null);
    dispatch(reset());
    setDragStates({});
    setPreviewUrls({});
    setRemovingIndices([]);
  };

  const handleRemoveDocument = (index) => {
    setRemovingIndices((prev) => [...prev, index]);
    setTimeout(() => {
      setPreviewUrls((prev) => {
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
      setPreviewUrls((prev) => ({ ...prev, [index]: previewUrl }));
      onChange(file);
    }
    setDragStates((prev) => ({ ...prev, [index]: false }));
  };

  const handleFileChange = (index, file, onChange) => {
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrls((prev) => ({ ...prev, [index]: previewUrl }));
      onChange(file);
    }
  };

  return (
    <Layout title="Employees" role="siteincharge">
      {(errorMessage || employeesError) && showErrorAlert && (
        <Alert
          variant="destructive"
          className={cn(
            'fixed top-4 right-4 w-80 sm:w-96 z-[100] border-error text-error rounded-md shadow-lg bg-error-light',
            showErrorAlert ? 'animate-fade-in' : 'animate-fade-out'
          )}
        >
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          <AlertTitle className="text-[10px] sm:text-sm md:text-base xl:text-lg font-bold">Error</AlertTitle>
          <AlertDescription className="text-[10px] sm:text-sm md:text-base xl:text-lg">
            {errorMessage || employeesError}
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissErrors}
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
            'fixed top-4 right-4 w-80 sm:w-96 z-[100] border-accent text-accent rounded-md shadow-lg bg-accent-light',
            showSuccessAlert ? 'animate-fade-in' : 'animate-fade-out'
          )}
        >
          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          <AlertTitle className="text-[10px] sm:text-sm md:text-base xl:text-lg font-bold">Success</AlertTitle>
          <AlertDescription className="text-[10px] sm:text-sm md:text-base xl:text-lg">
            {successMessage}
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissSuccess}
            className="absolute top-2 right-2 text-accent hover:text-accent-hover"
            aria-label="Dismiss success alert"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Alert>
      )}
      <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in max-w-full mx-auto">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <span className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Employee List</span>
            <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-body h-5 w-5" />
                <Input
                  placeholder="Search by name or ID"
                  className="pl-10 h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search employees"
                />
              </div>
              <Select value={filterDepartment} onValueChange={handleFilterDepartmentChange}>
                <SelectTrigger className="w-full sm:w-48 h-9 sm:h-10 xl:h-12 bg-complementary text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg">
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent className="bg-complementary text-body">
                  <SelectItem value="all" className="text-[10px] sm:text-sm xl:text-base">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept} className="text-[10px] sm:text-sm xl:text-base">
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={handleFilterStatusChange}>
                <SelectTrigger className="w-full sm:w-48 h-9 sm:h-10 xl:h-12 bg-complementary text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-complementary text-body">
                  <SelectItem value="all" className="text-[10px] sm:text-sm xl:text-base">All Statuses</SelectItem>
                  <SelectItem value="active" className="text-[10px] sm:text-sm xl:text-base">Active</SelectItem>
                  <SelectItem value="inactive" className="text-[10px] sm:text-sm xl:text-base">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => navigate('/siteincharge/register-employee')}
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md w-full sm:w-auto"
                aria-label="Register new employee"
              >
                <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Add Employee
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employeesLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : sortedEmployees.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table className="w-full border-collapse">
                  <TableHeader>
                    <TableRow className="bg-complementary hover:bg-accent/10">
                      {['employeeId', 'name', 'designation', 'department', 'location', 'salary', 'leaves', 'status'].map((field) => (
                        <TableHead key={field} className="text-body px-4 py-2">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort(field)}
                            className="text-body hover:text-accent w-full text-left flex items-center gap-1 text-[10px] sm:text-sm xl:text-base"
                            aria-label={`Sort by ${field}`}
                          >
                            {field === 'leaves' ? 'Leaves (O/C)' : field.charAt(0).toUpperCase() + field.slice(1)}
                            <ArrowUpDown
                              className={cn(
                                'h-4 w-4 transition-transform',
                                sortField === field && sortOrder === 'desc' && 'rotate-180'
                              )}
                            />
                          </Button>
                        </TableHead>
                      ))}
                      <TableHead className="text-body px-4 py-2 text-[10px] sm:text-sm xl:text-base">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEmployees.map((employee) => {
                      const openingLeaves = employee.paidLeaves?.available || 0;
                      const leavesAccrued = employee.paidLeaves?.carriedForward || 0;
                      const leavesTaken = employee.paidLeaves?.used || 0;
                      const closingLeaves = openingLeaves + leavesAccrued - leavesTaken;
                      const isHighlighted = shouldHighlightEmployee(employee);

                      return (
                        <TableRow
                          key={employee._id}
                          className={cn(
                            "transition-colors duration-200",
                            isHighlighted ? "bg-accent-light animate-pulse" : ""
                          )}
                        >
                          <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">{employee.employeeId}</TableCell>
                          <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">{employee.name}</TableCell>
                          <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">{employee.designation}</TableCell>
                          <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">{employee.department}</TableCell>
                          <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">{employee.location?.name || employee.location?.city || 'N/A'}</TableCell>
                          <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">₹{employee.salary}</TableCell>
                          <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">{openingLeaves}/{closingLeaves}</TableCell>
                          <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">{employee.status}</TableCell>
                          <TableCell className="px-4 py-2 space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewClick(employee._id)}
                                    className="text-accent hover:text-accent-hover transition-colors"
                                    aria-label={`View employee ${employee.name}`}
                                  >
                                    <Eye className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Employee</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditClick(employee)}
                                    className="text-accent hover:text-accent-hover transition-colors"
                                    aria-label={`Edit employee ${employee.name}`}
                                  >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"
                                      />
                                    </svg>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Employee</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleTransferClick(employee)}
                                    className="text-accent hover:text-accent-hover transition-colors"
                                    disabled={employee.status !== 'active'}
                                    aria-label={`Transfer employee ${employee.name}`}
                                  >
                                    <Truck className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Transfer Employee</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleHistoryClick(employee)}
                                    className="text-accent hover:text-accent-hover transition-colors"
                                    aria-label={`View history for employee ${employee.name}`}
                                  >
                                    <History className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View History</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAddDocumentsClick(employee)}
                                    className="text-accent hover:text-accent-hover transition-colors"
                                    aria-label={`Add documents for employee ${employee.name}`}
                                  >
                                    <FilePlus className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Add Documents</TooltipContent>
                              </Tooltip>
                              {employee.status === 'active' ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeactivateClick(employee._id)}
                                      className="text-error hover:text-error-hover transition-colors"
                                      aria-label={`Deactivate employee ${employee.name}`}
                                    >
                                      <LogOut className="h-5 w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Deactivate Employee</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRejoinClick(employee)}
                                      className="text-accent hover:text-accent-hover transition-colors"
                                      aria-label={`Rejoin employee ${employee.name}`}
                                    >
                                      <UserPlus className="h-5 w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Rejoin Employee</TooltipContent>
                                </Tooltip>
                              )}
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-base py-1 sm:py-2 px-2 sm:px-3 transition-all duration-300"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className={cn(
                        currentPage === page
                          ? 'bg-accent text-body'
                          : 'border-complementary text-body hover:bg-complementary/10',
                        'rounded-md text-[10px] sm:text-sm xl:text-base py-1 sm:py-2 px-2 sm:px-3 transition-all duration-300'
                      )}
                      aria-label={`Go to page ${page}`}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-base py-1 sm:py-2 px-2 sm:px-3 transition-all duration-300"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-body">
              <Users className="h-12 w-12 text-accent/50 mb-2" />
              <p className="text-[10px] sm:text-sm xl:text-base">No employees found</p>
              <Button
                onClick={() => navigate('/siteincharge/register-employee')}
                className="mt-2 bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md"
                aria-label="Register new employee"
              >
                <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Add Employee
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="bg-complementary text-body max-h-[80vh] overflow-y-auto max-w-[90vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Edit Employee: {employeeToEdit?.name}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
              {['name', 'email', 'designation', 'department', 'phone'].map((field) => (
                <FormField
                  key={field}
                  control={editForm.control}
                  name={field}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">{field.charAt(0).toUpperCase() + field.slice(1)}</FormLabel>
                      <FormControl>
                        <Input
                          {...f}
                          className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                          aria-label={field}
                        />
                      </FormControl>
                      <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base" />
                    </FormItem>
                  )}
                />
              ))}
              <FormField
                control={editForm.control}
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Salary</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        {...field}
                        className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                        aria-label="Salary"
                      />
                    </FormControl>
                    <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base" />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Location</FormLabel>
                <Input
                  value={employeeToEdit?.location?.name || employeeToEdit?.location?.city || 'N/A'}
                  className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                  disabled
                  aria-label="Location"
                />
              </FormItem>
              <div className="sm:col-span-2 flex justify-end gap-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenEditDialog(false)}
                  className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
                  disabled={employeesLoading}
                  aria-label="Cancel edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
                  disabled={employeesLoading}
                  aria-label="Save changes"
                >
                  {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={openTransferDialog} onOpenChange={setOpenTransferDialog}>
        <DialogContent className="bg-complementary text-body max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Transfer Employee</DialogTitle>
          </DialogHeader>
          <Form {...transferForm}>
            <form onSubmit={transferForm.handleSubmit(handleTransferSubmit)} className="space-y-4">
              <FormField
                control={transferForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">New Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg">
                          <SelectValue placeholder="Select new location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-complementary text-body">
                        {allLocations.map((loc) => (
                          <SelectItem key={loc._id} value={loc._id} className="text-[10px] sm:text-sm xl:text-base">
                            {loc.name || loc.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base" />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenTransferDialog(false)}
                  className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
                  disabled={employeesLoading}
                  aria-label="Cancel transfer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
                  disabled={employeesLoading}
                  aria-label="Confirm transfer"
                >
                  {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Transfer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Rejoin Dialog */}
      <Dialog open={openRejoinDialog} onOpenChange={setOpenRejoinDialog}>
        <DialogContent className="bg-complementary text-body max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Rejoin Employee: {employeeToRejoin?.name}</DialogTitle>
          </DialogHeader>
          <Form {...rejoinForm}>
            <form onSubmit={rejoinForm.handleSubmit(handleRejoinSubmit)} className="space-y-4">
              <FormField
                control={rejoinForm.control}
                name="rejoinDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] sm:text-sm xl:text-lg font-medium">Rejoin Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="h-9 sm:h-10 xl:h-12 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-md text-[10px] sm:text-sm xl:text-lg transition-all duration-300 hover:shadow-sm"
                        aria-label="Rejoin Date"
                      />
                    </FormControl>
                    <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base" />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenRejoinDialog(false)}
                  className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
                  disabled={employeesLoading}
                  aria-label="Cancel rejoin"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
                  disabled={employeesLoading}
                  aria-label="Confirm rejoin"
                >
                  {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Rejoin'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Documents Dialog */}
      <Dialog open={openAddDocumentsDialog} onOpenChange={setOpenAddDocumentsDialog}>
        <DialogContent className="bg-complementary text-body max-h-[80vh] overflow-y-auto max-w-[90vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Add Documents</DialogTitle>
          </DialogHeader>
          <Form {...addDocumentsForm}>
            <form onSubmit={addDocumentsForm.handleSubmit(handleAddDocumentsSubmit)} className="space-y-4 p-4">
              {documentFields.map((field, index) => (
                <div
                  key={field.id}
                  className={cn(
                    'mb-3 sm:mb-4 rounded-md border border-complementary/30 bg-body shadow-sm hover:shadow-md transition-shadow duration-300',
                    removingIndices.includes(index) ? 'animate-fade-out' : 'animate-slide-in-row'
                  )}
                >
                  <FormField
                    control={addDocumentsForm.control}
                    name={`documents.${index}.file`}
                    render={({ field }) => (
                      <FormItem className="p-3 sm:p-4">
                        <div
                          className={cn(
                            'relative border-2 border-dashed rounded-md p-4 sm:p-6 text-center transition-all duration-300',
                            dragStates[index] ? 'border-accent bg-accent/10' : 'border-complementary',
                            field.value ? 'bg-body' : 'bg-complementary/10',
                            employeesLoading && 'opacity-50 cursor-not-allowed'
                          )}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={() => handleDragLeave(index)}
                          onDrop={(e) => handleDrop(e, index, field.onChange)}
                          role="region"
                          aria-label={`Upload document ${index + 1}`}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              document.getElementById(`add-document-${index}`).click();
                            }
                          }}
                        >
                          <Input
                            id={`add-document-${index}`}
                            type="file"
                            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                            onChange={(e) => handleFileChange(index, e.target.files[0], field.onChange)}
                            className="hidden"
                            disabled={employeesLoading}
                          />
                          {!field.value ? (
                            <div className="flex flex-col items-center space-y-2">
                              <FileIcon className="h-6 w-6 sm:h-8 sm:w-8 text-body/60" />
                              <p className="text-[10px] sm:text-sm xl:text-base text-body/60">
                                Drag & drop a file here or click to upload
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  onClick={() => document.getElementById(`add-document-${index}`).click()}
                                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                                  disabled={employeesLoading}
                                >
                                  Choose File
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleRemoveDocument(index)}
                                  className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                                  disabled={employeesLoading}
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
                                  {getFileIcon(field.value)}
                                  <div className="truncate">
                                    <span className="text-[10px] sm:text-sm xl:text-base text-body truncate">
                                      {field.value.name}
                                    </span>
                                    <span className="text-[9px] sm:text-xs xl:text-sm text-body/60 block">
                                      ({(field.value.size / 1024 / 1024).toFixed(2)} MB)
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <a
                                    href={previewUrls[index]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                      "p-1 text-accent hover:text-accent-hover focus:ring-2 focus:ring-accent/20 rounded-full",
                                      (employeesLoading || !previewUrls[index]) && "opacity-50 cursor-not-allowed"
                                    )}
                                    aria-label={`Preview document ${field.value.name}`}
                                    onClick={(e) => {
                                      if (employeesLoading || !previewUrls[index]) {
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
                                    disabled={employeesLoading}
                                    aria-label={`Remove document ${field.value.name}`}
                                  >
                                    <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                  </Button>
                                </div>
                              </div>
                              {isImageFile(field.value) && previewUrls[index] && (
                                <div className="mt-2 flex justify-center">
                                  <img
                                    src={previewUrls[index]}
                                    alt={`Preview of ${field.value.name}`}
                                    className="h-24 w-24 object-cover rounded-md border border-complementary"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base mt-2" />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
              <Button
                type="button"
                onClick={() => appendDocument({ file: null })}
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md"
                disabled={employeesLoading}
              >
                <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Add Document
              </Button>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenAddDocumentsDialog(false)}
                  className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
                  disabled={employeesLoading}
                  aria-label="Cancel add documents"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
                  disabled={employeesLoading}
                  aria-label="Upload documents"
                >
                  {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Upload Documents'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Dialog */}
      <Dialog open={openDeactivateDialog} onOpenChange={setOpenDeactivateDialog}>
        <DialogContent className="bg-complementary text-body max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">Deactivate Employee</DialogTitle>
          </DialogHeader>
          <p className="text-body text-[10px] sm:text-sm xl:text-base">Are you sure you want to deactivate this employee? They can be reactivated later.</p>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenDeactivateDialog(false)}
              className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
              disabled={employeesLoading}
              aria-label="Cancel deactivation"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeactivateConfirm}
              className="bg-error text-body hover:bg-error-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
              disabled={employeesLoading}
              aria-label="Confirm deactivation"
            >
              {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Employees;