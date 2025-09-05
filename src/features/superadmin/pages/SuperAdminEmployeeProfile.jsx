import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchEmployeeById,
  fetchEmployeeAttendance,
  addEmployeeDocuments,
  updateEmployee,
  reset as resetEmployees,
  fetchEmployeeAdvances,
  fetchEmployeeDocuments,
} from '../redux/superadminEmployeeSlice';
import { fetchSettings } from '../redux/settingsSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Copy, Badge } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useNavigate, useParams } from 'react-router-dom';
import EmployeeProfileSection from '../../../components/employees/EmployeeProfileSection';
import EmployeeAttendanceSection from '../../../components/employees/EmployeeAttendanceSection'; 
import DocumentsSection from '../../../components/employees/DocumentsSection';
import AdvanceHistory from '../../../components/employees/AdvanceHistory';
import { format } from 'date-fns';

// Reusable CopyButton component
const CopyButton = ({ text, fieldId }) => {
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldId);
      toast.dismiss();
      toast.success('Copied to clipboard!', { id: `copy-${fieldId}`, duration: 2000, position: 'top-center' });
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {
      toast.dismiss();
      toast.error('Failed to copy to clipboard', { id: `copy-error-${fieldId}`, duration: 2000, position: 'top-center' });
    });
  };

  return (
    <div className="relative inline-block">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="ml-2 sm:ml-3 text-accent hover:text-accent-hover relative focus:ring-2 focus:ring-accent focus:ring-offset-2"
        aria-label={`Copy ${fieldId}`}
      >
        <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
    </div>
  );
};

const SuperAdminEmployeeProfile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const {
    currentEmployee,
    attendance,
    attendancePagination,
    advances,
    advancesPagination,
    documents,
    documentsPagination,
    loading,
    error,
  } = useSelector((state) => state.superadminEmployees);
  const { settings, loading: loadingSettings, error: settingsError } = useSelector(
    (state) => state.superAdminSettings
  );

  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [advancesSortField, setAdvancesSortField] = useState('year');
  const [advancesSortOrder, setAdvancesSortOrder] = useState('desc');
  const [advancesCurrentPage, setAdvancesCurrentPage] = useState(1);
  const [documentsCurrentPage, setDocumentsCurrentPage] = useState(1);
  const [documentsSearchQuery, setDocumentsSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  const autoDismissDuration = 5000;
  const ITEMS_PER_PAGE = 2;
  const ADVANCES_ITEMS_PER_PAGE = 5;
  const DOCUMENTS_ITEMS_PER_PAGE = 3;

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'advances', label: 'Advances' },
    { id: 'documents', label: 'Documents' },
  ];

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const totalYearlyPaidLeaves = useMemo(() => {
    if (!currentEmployee?.joinDate || !settings?.paidLeavesPerYear) {
      return settings?.paidLeavesPerYear || 0;
    }
    const joinDate = new Date(currentEmployee.joinDate);
    const joinYear = joinDate.getFullYear();
    const joinMonth = joinDate.getMonth();
    const currentYear = new Date().getFullYear();
    if (joinYear === currentYear) {
      const remainingMonths = 12 - joinMonth;
      return Math.round((settings.paidLeavesPerYear * remainingMonths) / 12);
    }
    return settings.paidLeavesPerYear;
  }, [currentEmployee?.joinDate, settings?.paidLeavesPerYear]);

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      navigate('/login');
      return;
    }

    const employeeId = String(id);
    if (!/^[0-9a-fA-F]{24}$/.test(employeeId)) {
      
      toast.error('Invalid employee ID format', { id: 'invalid-employee-id', duration: 5000, position: 'top-center' });
      navigate('/superadmin/employees');
      return;
    }

    dispatch(fetchEmployeeById(employeeId));
    dispatch(
      fetchEmployeeAttendance({
        employeeId,
        month: monthFilter,
        year: yearFilter,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sortField,
        sortOrder,
      })
    );
    if (activeTab === 'advances') {
      dispatch(
        fetchEmployeeAdvances({
          id: employeeId,
          page: advancesCurrentPage,
          limit: ADVANCES_ITEMS_PER_PAGE,
          sortField: advancesSortField,
          sortOrder: advancesSortOrder,
        })
      );
    }
    if (activeTab === 'documents') {
      dispatch(
        fetchEmployeeDocuments({
          id: employeeId,
          page: documentsCurrentPage,
          limit: DOCUMENTS_ITEMS_PER_PAGE,
          searchQuery: documentsSearchQuery,
        })
      );
    }
    dispatch(fetchSettings());

    return () => {
      dispatch(resetEmployees());
    };
  }, [
    dispatch,
    id,
    user,
    navigate,
    monthFilter,
    yearFilter,
    currentPage,
    activeTab,
    advancesCurrentPage,
    advancesSortField,
    advancesSortOrder,
    documentsCurrentPage,
    documentsSearchQuery,
    sortField,
    sortOrder,
  ]);

  useEffect(() => {
    if (settingsError) {
      toast.dismiss();
      toast.error(settingsError, {
        id: 'settings-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
    }
  }, [settingsError]);

  const HIGHLIGHT_DURATION = settings?.highlightDuration ?? 24 * 60 * 60 * 1000;

  const shouldHighlightEmployee = (employee) => {
    if (!employee?.transferTimestamp) return false;
    const transferDate = new Date(employee.transferTimestamp);
    if (isNaN(transferDate.getTime())) return false;
    const currentTime = new Date().getTime();
    const transferTime = transferDate.getTime();
    return currentTime - transferTime <= HIGHLIGHT_DURATION;
  };

  useEffect(() => {
    if (!currentEmployee) return;
    setIsHighlighted(shouldHighlightEmployee(currentEmployee));
    const interval = setInterval(() => {
      setIsHighlighted(shouldHighlightEmployee(currentEmployee));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [currentEmployee]);

  useEffect(() => {
    if (error) {
      toast.dismiss();
      toast.error(error.message || 'Operation failed', {
        id: 'form-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
    }
  }, [error]);

  const handleMonthChange = (value) => {
    setMonthFilter(parseInt(value));
    setCurrentPage(1);
  };

  const handleYearChange = (value) => {
    setYearFilter(parseInt(value));
    setCurrentPage(1);
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

  const handleEditSubmit = async (id, data) => {
    try {
      toast.dismiss();
      const employeeData = {
        name: data.name,
        email: data.email,
        designation: data.designation,
        department: data.department,
        salary: Number(data.salary),
        phone: data.phone || undefined,
        dob: data.dob || undefined,
        bankDetails: data.bankDetails,
        paidLeaves: {
          available: Number(data.paidLeaves.available),
          used: Number(data.paidLeaves.used),
          carriedForward: Number(data.paidLeaves.carriedForward),
        },
      };
      await dispatch(updateEmployee({ id, data: employeeData })).unwrap();
      toast.success('Employee updated successfully', {
        id: 'edit-success',
        duration: autoDismissDuration,
        position: 'top-center',
      });
    } catch (err) {
      
      toast.error(err.message || 'Failed to update employee', {
        id: 'form-submit-error',
        duration: autoDismissDuration,
        position: 'top-center',
      });
      throw err;
    }
  };

  if (loading || !currentEmployee || loadingSettings) {
    return (
      <Layout title="SuperAdmin Employee Profile">
        <div className="max-w-5xl mx-auto p-4 sm:p-6">
          <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded" />
          <div className="mt-4 sm:mt-6 grid grid-cols-1 gap-4 sm:gap-6">
            {Array(5).fill().map((_, i) => (
              <div key={i} className="h-12 w-full bg-gray-200 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="SuperAdmin Employee Profile">
      <Toaster position="top-center" />
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Button
          variant="outline"
          onClick={() => navigate('/superadmin/employees')}
          className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
          aria-label="Go back to employee list"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
          Back to Employees
        </Button>

        {/* Tab Navigation */}
        <div className="block sm:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full p-2 border border-accent rounded-lg bg-body text-body focus:ring-2 focus:ring-accent focus:ring-offset-2 text-sm"
            aria-label="Select employee profile section"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden sm:flex border-b border-accent/20">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium',
                activeTab === tab.id
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-body hover:text-accent',
                'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2'
              )}
              aria-label={`View ${tab.label} tab`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'profile' && (
            <EmployeeProfileSection
              employee={currentEmployee}
              isHighlighted={isHighlighted}
              totalYearlyPaidLeaves={totalYearlyPaidLeaves}
              canEdit={true}
              title="Profile"
              onEditClick={handleEditSubmit}
              CopyButton={CopyButton}
              settings={settings}
            />
          )}
          {activeTab === 'attendance' && (
            <EmployeeAttendanceSection
              employeeId={id}
              employeeName={currentEmployee.name}
              attendanceData={attendance}
              isLoading={loading}
              error={error}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={attendancePagination.totalPages}
              itemsPerPage={ITEMS_PER_PAGE}
              sortField={sortField}
              setSortField={setSortField}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              monthFilter={monthFilter}
              yearFilter={yearFilter}
              months={months}
              years={years}
              handleMonthChange={handleMonthChange}
              handleYearChange={handleYearChange}
              handleSort={handleSort}
              fetchAttendance={fetchEmployeeAttendance}
              dispatch={dispatch}
             
              role="superadmin"
            />
          )}
          {activeTab === 'advances' && (
            <AdvanceHistory
              advances={advances}
              currentPage={advancesCurrentPage}
              setCurrentPage={setAdvancesCurrentPage}
              sortField={advancesSortField}
              setSortField={setAdvancesSortField}
              sortOrder={advancesSortOrder}
              setSortOrder={setAdvancesSortOrder}
              employeeName={currentEmployee.name}
              totalPages={advancesPagination.totalPages}
              isLoading={loading}
              dispatch={dispatch}
              id={id}
              itemsPerPage={ADVANCES_ITEMS_PER_PAGE}
            />
          )}
         {activeTab === 'documents' && (
  <DocumentsSection
    documents={documents}
    documentsPagination={documentsPagination}
    employeeName={currentEmployee.name}
    employeeId={id}
    isLoading={loading}
    currentPage={documentsCurrentPage}
    searchQuery={documentsSearchQuery}
    setCurrentPage={setDocumentsCurrentPage}
    setSearchQuery={setDocumentsSearchQuery}
    itemsPerPage={DOCUMENTS_ITEMS_PER_PAGE}
    showSearch={true}
    showUpload={true}
    showSorting={false}
    onUploadDocuments={async (documents) => {
      await dispatch(addEmployeeDocuments({ 
        id, 
        documents, 
        page: 1, 
        limit: DOCUMENTS_ITEMS_PER_PAGE 
      })).unwrap();
      await dispatch(fetchEmployeeDocuments({ 
        id, 
        page: 1, 
        limit: DOCUMENTS_ITEMS_PER_PAGE, 
        searchQuery: documentsSearchQuery 
      })).unwrap();
    }}
    onSearchDocuments={(query) => {
      setDocumentsSearchQuery(query);
      setDocumentsCurrentPage(1);
      dispatch(fetchEmployeeDocuments({
        id,
        page: 1,
        limit: DOCUMENTS_ITEMS_PER_PAGE,
        searchQuery: query,
      }));
    }}
    onPageChange={(page) => {
      setDocumentsCurrentPage(page);
      dispatch(fetchEmployeeDocuments({
        id,
        page,
        limit: DOCUMENTS_ITEMS_PER_PAGE,
        searchQuery: documentsSearchQuery,
      }));
    }}
  />
)}
        </div>
      </div>
    </Layout>
  );
};

export default SuperAdminEmployeeProfile;