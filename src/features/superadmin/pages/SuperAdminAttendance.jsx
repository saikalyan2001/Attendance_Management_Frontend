// src/features/superadmin/pages/SuperAdminAttendance.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLocations } from '../redux/locationsSlice';
import { fetchEmployees, reset as resetEmployees } from '../redux/superadminEmployeeSlice';
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
  const { employees, loading: employeesLoading, error: employeesError } = useSelector((state) => state.superadminEmployees);
  const { user, isLoading } = useSelector((state) => state.auth);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [location, setLocation] = useState('all'); // Superadmin can select 'all' without restrictions
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('mark');
  const [isDelayLoading, setIsDelayLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDelayLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      toast.error("Unauthorized access. Please log in as a superadmin.", {
        duration: 5000,
      });
      navigate('/login');
      return;
    }
    dispatch(fetchLocations());
    dispatch(fetchEmployees({ location }));
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