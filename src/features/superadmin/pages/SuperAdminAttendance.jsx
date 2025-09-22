// src/features/superadmin/pages/SuperAdminAttendance.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLocations } from '../redux/locationsSlice';
import { fetchEmployees, reset as resetEmployees, clearSuccess } from '../redux/superadminEmployeeSlice';
import Layout from '../../../components/layout/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import SuperAdminMarkAttendance from './SuperAdminMarkAttendance';
import MonthlyAttendance from './SuperAdminMonthlyAttendance'; 
import ViewAttendance from './SuperAdminViewAttendance'; 
import AttendanceRequests from './SuperAdminAttendanceRequests'; 

const SuperAdminAttendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.superAdminLocations);
  const { employees, loading: employeesLoading, error: employeesError, success: employeeSuccess } = useSelector((state) => state.superadminEmployees);
  const { user, isLoading } = useSelector((state) => state.auth);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [location, setLocation] = useState(''); // Superadmin can select 'all' without restrictions
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('mark');
  const [isDelayLoading, setIsDelayLoading] = useState(true);
  // ✅ ADD: In src/features/superadmin/pages/SuperAdminAttendance.jsx
const [previousTab, setPreviousTab] = useState('mark');

// ✅ NEW: Force refresh when switching from monthly back to mark
useEffect(() => {
  if (previousTab === 'monthly' && activeTab === 'mark') {
    setTimeout(() => {
      if (location) {
        dispatch(fetchEmployees({ 
          location: location === 'all' ? undefined : location,
          month,
          year,
          page: 1,
          limit: 1000,
          _cacheBuster: Date.now()
        }));
      }
    }, 500);
  }
  
  setPreviousTab(activeTab);
}, [activeTab, previousTab, location, month, year, dispatch]);


    // ✅ ADD: Clear success state when component unmounts or tab changes
    useEffect(() => {
      return () => {
        if (employeeSuccess) {
          dispatch(clearSuccess());
        }
      };
    }, [employeeSuccess, dispatch]);
  
    // ✅ ADD: Reset success when switching tabs
    useEffect(() => {
      if (employeeSuccess) {
        // Clear success after a short delay to allow other components to react
        setTimeout(() => {
          dispatch(clearSuccess());
        }, 1000);
      }
    }, [activeTab, employeeSuccess, dispatch]);
  

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDelayLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

 // In SuperAdminMarkAttendance.jsx - modify useEffect
// In SuperAdminAttendance.jsx - modify useEffect
// In SuperAdminAttendance.jsx - modify useEffect
useEffect(() => {
  if (!user || user.role !== 'super_admin') {
    toast.error("Unauthorized access. Please log in as a superadmin.", {
      duration: 5000,
    });
    navigate('/login');
    return;
  }
  
  // ✅ Use a filter that actually excludes locations
  dispatch(fetchLocations({ 
    role: 'super_admin', 
    filter: 'limited' // This will show only first 3 locations
  }));
  
  if (location) {
    dispatch(fetchEmployees({ location: location === 'all' ? undefined : location }));
  }
}, [dispatch, user, navigate, location]);


  useEffect(() => {
    if (locationsError || employeesError) {
      toast.error(locationsError || employeesError || 'Failed to load data', {
        duration: 5000,
      });
      dispatch({ type: 'adminLocations/reset' });
      dispatch(resetEmployees());
    }
  }, [locationsError, employeesError, dispatch]);

  const handleDropdownChange = (e) => {
    setActiveTab(e.target.value);
  };

  const tabClass = (tab) =>
    `py-3 text-sm rounded-md hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent ${
      activeTab === tab ? 'bg-accent text-body' : ''
    }`;

  return (
    <Layout title="Superadmin Attendance">
      {(locationsError || employeesError) && (
        <Alert className="mb-6 border-error bg-error text-error w-full max-w-full">
          <AlertDescription>{locationsError || employeesError}</AlertDescription>
        </Alert>
      )}
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="sm:hidden mb-4">
          <select
            value={activeTab}
            onChange={handleDropdownChange}
            className="w-full p-3 text-sm font-medium bg-complementary text-body rounded-lg border border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="mark">Mark Attendance</option>
            <option value="monthly">Monthly Attendance</option>
            <option value="overview">Attendance Overview</option>
            <option value="requests">Attendance Requests</option>
          </select>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6 w-full max-w-full overflow-x-hidden hidden sm:block"
        >
          <TabsList className="grid w-full h-fit p-2 grid-cols-4 bg-complementary text-body rounded-lg shadow-sm max-w-full">
            <TabsTrigger value="mark" className={tabClass('mark')}>
              Mark Attendance
            </TabsTrigger>
            <TabsTrigger value="monthly" className={tabClass('monthly')}>
              Monthly Attendance
            </TabsTrigger>
            <TabsTrigger value="overview" className={tabClass('overview')}>
              Attendance Overview
            </TabsTrigger>
            <TabsTrigger value="requests" className={tabClass('requests')}>
              Attendance Requests
            </TabsTrigger>
          </TabsList>
          <TabsContent value="mark">
            <SuperAdminMarkAttendance
              month={month}
              year={year}
              location={location}
              setLocation={setLocation}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              setMonth={setMonth}
              setYear={setYear}
            />
          </TabsContent>
          <TabsContent value="monthly">
            <MonthlyAttendance
              month={month}
              year={year}
              location={location}
              setLocation={setLocation}
              setMonth={setMonth}
              setYear={setYear}
            />
          </TabsContent>
          <TabsContent value="overview">
            <ViewAttendance />
          </TabsContent>
          <TabsContent value="requests">
            <AttendanceRequests locationId={location} />
          </TabsContent>
        </Tabs>
        <div className="sm:hidden">
          {activeTab === 'mark' && (
            <SuperAdminMarkAttendance
              month={month}
              year={year}
              location={location}
              setLocation={setLocation}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              setMonth={setMonth}
              setYear={setYear}
            />
          )}
          {activeTab === 'monthly' && (
            <MonthlyAttendance
              month={month}
              year={year}
              location={location}
              setLocation={setLocation}
              setMonth={setMonth}
              setYear={setYear}
            />
          )}
          {activeTab === 'overview' && <ViewAttendance />}
          {activeTab === 'requests' && <AttendanceRequests locationId={location} />}
        </div>
      </div>
    </Layout>
  );
};

export default SuperAdminAttendance;