import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendanceReport, fetchLeaveReport, fetchSalaryReport, reset as resetReports } from '../redux/reportsSlice';
import { fetchLocations, reset as resetLocations } from '../redux/locationsSlice';
import Layout from '../../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, endOfDay } from 'date-fns'; // Add endOfDay import
import AttendanceTable from './AttendanceTable';
import LeaveTable from './LeaveTable';
import SalaryTable from './SalaryTable';

const Reports = () => {
  const dispatch = useDispatch();
  const { attendanceReport, leaveReport, salaryReport, loading: reportsLoading, error: reportsError } = useSelector((state) => state.adminReports);
  const { locations, loading: locationsLoading, error: locationsError } = useSelector((state) => state.adminLocations);
  const { user } = useSelector((state) => state.auth);

  console.log("salaryReport", salaryReport);

  const [month, setMonth] = useState('5'); // May 2025
  const [year, setYear] = useState('2025');
  const [location, setLocation] = useState('all');
  const [currentPage, setCurrentPage] = useState({ attendance: 1, leave: 1, salary: 1 });
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ attendance: null, leave: null, salary: null });
  const [searchQuery, setSearchQuery] = useState({ attendance: '', leave: '', salary: '' });
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const startDate = format(startOfMonth(date), 'yyyy-MM-dd');
    const endDate = format(endOfDay(endOfMonth(date)), 'yyyy-MM-dd HH:mm:ss.SSS'); // Use endOfDay
    dispatch(fetchAttendanceReport({ startDate, endDate, location: location === 'all' ? '' : location }));
    dispatch(fetchLeaveReport({ location: location === 'all' ? '' : location }));
    dispatch(fetchSalaryReport({ startDate, endDate, location: location === 'all' ? '' : location }));
    dispatch(fetchLocations());
  }, [dispatch, month, year, location, user]);

  useEffect(() => {
    if (reportsError || locationsError) {
      toast.error(reportsError || locationsError || 'Failed to load reports', {
        action: {
          label: 'Retry',
          onClick: () => {
            const date = new Date(parseInt(year), parseInt(month) - 1);
            const startDate = format(startOfMonth(date), 'yyyy-MM-dd');
            const endDate = format(endOfDay(endOfMonth(date)), 'yyyy-MM-dd HH:mm:ss.SSS'); // Update retry logic
            dispatch(fetchAttendanceReport({ startDate, endDate, location: location === 'all' ? '' : location }));
            dispatch(fetchLeaveReport({ location: location === 'all' ? '' : location }));
            dispatch(fetchSalaryReport({ startDate, endDate, location: location === 'all' ? '' : location }));
            dispatch(fetchLocations());
          },
        },
      });
      dispatch(resetReports());
      dispatch(resetLocations());
    }
  }, [reportsError, locationsError, dispatch, month, year, location]);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2025, i), 'MMMM'),
  }));
  const years = ['2024', '2025', '2026'];

  return (
    <Layout title="Reports">
      {(reportsError || locationsError) && (
        <Alert variant="destructive" className="mb-6 border-error text-error">
          <AlertDescription>{reportsError || locationsError}</AlertDescription>
        </Alert>
      )}
      {/* Filters */}
      <Card className="bg-complementary text-body mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month" className="text-sm font-medium">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="month" className="bg-complementary text-body border-accent">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-complementary text-body">
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year" className="text-sm font-medium">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="year" className="bg-complementary text-body border-accent">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="bg-complementary text-body">
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger id="location" className="bg-complementary text-body border-accent">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-complementary text-body">
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc._id} value={loc._id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <AttendanceTable
        attendanceReport={attendanceReport}
        locations={locations}
        reportsLoading={reportsLoading}
        month={month}
        year={year}
        location={location}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortConfig={sortConfig}
        setSortConfig={setSortConfig}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        itemsPerPage={itemsPerPage}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
      <LeaveTable
        leaveReport={leaveReport}
        locations={locations}
        reportsLoading={reportsLoading}
        month={month}
        year={year}
        location={location}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortConfig={sortConfig}
        setSortConfig={setSortConfig}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        itemsPerPage={itemsPerPage}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
      <SalaryTable
        salaryReport={salaryReport}
        locations={locations}
        reportsLoading={reportsLoading}
        month={month}
        year={year}
        location={location}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortConfig={sortConfig}
        setSortConfig={setSortConfig}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        itemsPerPage={itemsPerPage}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
    </Layout>
  );
};

export default Reports;