import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getEmployee, fetchSettings, fetchEmployeeAttendance, reset } from '../redux/employeeSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import EmployeeDetails from './EmployeeDetails';
import AttendanceHistory from './AttendanceHistory';
import AdvanceHistory from './AdvanceHistory';
import Documents from './Documents';
import { cn } from '@/lib/utils';

const EmployeeProfile = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { employee, attendance, attendancePagination, loadingGeneral, loadingFetch: loadingSettings } = useSelector((state) => state.siteInchargeEmployee);
  const [advancesSortField, setAdvancesSortField] = useState('year');
  const [advancesSortOrder, setAdvancesSortOrder] = useState('desc');
  const [advancesCurrentPage, setAdvancesCurrentPage] = useState(1);
  const [documentsCurrentPage, setDocumentsCurrentPage] = useState(1);
  const [attendanceCurrentPage, setAttendanceCurrentPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState(1); // January
  const [yearFilter, setYearFilter] = useState(2025); // 2025
  const [activeTab, setActiveTab] = useState('profile');

  console.log("employee", employee);
  

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'advances', label: 'Advances' },
    { id: 'documents', label: 'Documents' },
  ];

  useEffect(() => {
    console.log('EmployeeProfile - Dispatching fetchEmployeeAttendance with:', {
      employeeId: id,
      month: monthFilter,
      year: yearFilter,
      page: attendanceCurrentPage,
      limit: 10,
      sortField: 'date',
      sortOrder: 'desc',
    });
    dispatch(getEmployee({
      id,
      documentsPage: documentsCurrentPage,
      documentsLimit: 10,
      advancesPage: advancesCurrentPage,
      advancesLimit: 5,
    }));
    dispatch(fetchEmployeeAttendance({
      employeeId: id,
      month: monthFilter,
      year: yearFilter,
      page: attendanceCurrentPage,
      limit: 10,
      sortField: 'date',
      sortOrder: 'desc',
    }));
    dispatch(fetchSettings());
    return () => dispatch(reset());
  }, [dispatch, id, documentsCurrentPage, advancesCurrentPage, attendanceCurrentPage, monthFilter, yearFilter]);

  if (loadingGeneral || !employee || loadingSettings) {
    return (
      <Layout title="Employee Profile" role="siteincharge">
        <div className="max-w-5xl mx-auto p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-complementary text-body shadow-md rounded-md p-2 xs:p-3 sm:p-4">
              <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xs:gap-4 sm:gap-6 mt-3 xs:mt-4 sm:mt-4">
                {Array(5).fill().map((_, i) => (
                  <div key={i} className="h-12 w-full bg-gray-200 animate-pulse rounded" />
                ))}
              </div>
            </div>
            <div className="bg-complementary text-body shadow-md rounded-md p-2 xs:p-3 sm:p-4">
              <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded" />
              <div className="space-y-3 xs:space-y-4 sm:space-y-6 mt-3 xs:mt-4 sm:mt-4">
                {Array(3).fill().map((_, i) => (
                  <div key={i} className="h-12 w-full bg-gray-200 animate-pulse rounded" />
                ))}
              </div>
            </div>
            <div className="bg-complementary text-body shadow-md rounded-md p-2 xs:p-3 sm:p-4">
              <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded" />
              <div className="space-y-3 xs:space-y-4 sm:space-y-6 mt-3 xs:mt-4 sm:mt-4">
                {Array(3).fill().map((_, i) => (
                  <div key={i} className="h-12 w-full bg-gray-200 animate-pulse rounded" />
                ))}
              </div>
            </div>
            <div className="bg-complementary text-body shadow-md rounded-md p-2 xs:p-3 sm:p-4">
              <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded" />
              <div className="space-y-3 xs:space-y-4 sm:space-y-6 mt-3 xs:mt-4 sm:mt-4">
                {Array(3).fill().map((_, i) => (
                  <div key={i} className="h-12 w-full bg-gray-200 animate-pulse rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Employee Profile" role="siteincharge">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="mb-3 xs:mb-4 border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md px-1.5 xs:px-2 py-0.5 xs:py-1 sm:px-4 sm:py-2 text-2xs xs:text-xs sm:text-base"
          aria-label="Go back to employee list"
        >
          <ArrowLeft className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-4 sm:w-4 mr-0.5 xs:mr-1 sm:mr-2" />
          Back to Employees
        </Button>

        {/* Tab Navigation */}
        <div className="block sm:hidden mb-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full p-2 border border-accent rounded-md bg-body text-body focus:ring-2 focus:ring-accent focus:ring-offset-2 text-sm"
            aria-label="Select employee profile section"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden sm:flex border-b border-accent/20 mb-4">
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
        <div className="space-y-4 sm:space-y-6">
          {activeTab === 'profile' && <EmployeeDetails employee={employee} />}
          {activeTab === 'attendance' && (
            <AttendanceHistory
              attendance={attendance}
              attendancePagination={attendancePagination}
              employeeId={id}
              employeeName={employee?.name}
              currentPage={attendanceCurrentPage}
              setCurrentPage={setAttendanceCurrentPage}
              monthFilter={monthFilter}
              setMonthFilter={setMonthFilter}
              yearFilter={yearFilter}
              setYearFilter={setYearFilter}
            />
          )}
          {activeTab === 'advances' && (
            <AdvanceHistory
              advances={employee?.advances || []}
              advancesPagination={employee?.advancesPagination}
              currentPage={advancesCurrentPage}
              setCurrentPage={setAdvancesCurrentPage}
              sortField={advancesSortField}
              setSortField={setAdvancesSortField}
              sortOrder={advancesSortOrder}
              setSortOrder={setAdvancesSortOrder}
              employeeName={employee?.name}
              isLoading={loadingGeneral}
            />
          )}
          {activeTab === 'documents' && (
            <Documents
              employeeId={id}
              documents={employee.documents}
              documentsPagination={employee.documentsPagination}
              setDocumentsCurrentPage={setDocumentsCurrentPage}
              employeeName={employee.name || 'Documents'}
              isLoading={loadingGeneral}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default EmployeeProfile;