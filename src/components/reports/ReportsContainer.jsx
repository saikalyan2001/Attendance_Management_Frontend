// components/shared/ReportsContainer.jsx
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Layout from "../../components/layout/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";

const ReportsContainer = ({
  config = {
    title: "Reports",
    isSuperAdmin: false,
    userRole: "admin",
    showToast: null,
    navigate: null,
    checkAuth: true
  },
  slices = {
    reports: "adminReports",
    locations: "adminLocations"
  },
  actions = {
    fetchAttendanceReport: null,
    fetchLeaveReport: null,
    fetchSalaryReport: null,
    fetchLocations: null,
    resetReports: null,
    resetLocations: null
  },
  children, // Tab content components
}) => {
  const dispatch = useDispatch();
  
  // Get data from Redux store
  const reportsState = useSelector((state) => state[slices.reports]);
  const locationsState = useSelector((state) => state[slices.locations]);
  const { user } = useSelector((state) => state.auth);

  const {
    attendanceReport,
    leaveReport,
    salaryReport,
    loading: reportsLoading,
    error: reportsError,
  } = reportsState;

  const {
    locations,
    loading: locationsLoading,
    error: locationsError,
  } = locationsState;

  const [month, setMonth] = useState("1");
  const [year, setYear] = useState("2025");
  const [location, setLocation] = useState("all");
  const [currentPage, setCurrentPage] = useState({
    attendance: 1,
    leave: 1,
    salary: 1,
  });
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    attendance: null,
    leave: null,
    salary: null,
  });
  const [searchQuery, setSearchQuery] = useState({
    attendance: "",
    leave: "",
    salary: "",
  });
  const [activeTab, setActiveTab] = useState("attendance");

  // Auth check effect
  useEffect(() => {
    if (config.checkAuth && user?.role !== config.userRole) {
      const message = config.isSuperAdmin 
        ? "Unauthorized access. Please log in as a superadmin."
        : "Unauthorized access.";
      
      config.showToast?.error(message, { duration: 5000 });
      
      if (config.navigate) {
        config.navigate("/login");
        return;
      }
    }
  }, [user, config]);

  // Fetch reports effect
  useEffect(() => {
    if (config.checkAuth && user?.role !== config.userRole) return;
    
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const startDate = format(
      toZonedTime(startOfMonth(date), "Asia/Kolkata"),
      "yyyy-MM-dd"
    );
    const endDate = format(
      toZonedTime(endOfMonth(date), "Asia/Kolkata"),
      "yyyy-MM-dd'T'23:59:59+05:30"
    );

    dispatch(
      actions.fetchAttendanceReport({
        startDate,
        endDate,
        location: location === "all" ? "" : location,
        page: currentPage.attendance,
        limit: itemsPerPage,
      })
    );
    dispatch(
      actions.fetchLeaveReport({
        location: location === "all" ? "" : location,
        month,
        year,
        page: currentPage.leave,
        limit: itemsPerPage,
      })
    );
    dispatch(
      actions.fetchSalaryReport({
        startDate,
        endDate,
        location: location === "all" ? "" : location,
        page: currentPage.salary,
        limit: itemsPerPage,
      })
    );
    dispatch(actions.fetchLocations());
  }, [
    dispatch,
    month,
    year,
    location,
    currentPage.attendance,
    currentPage.leave,
    currentPage.salary,
    itemsPerPage,
    user,
    config,
    actions,
  ]);

  // Error handling effect
  useEffect(() => {
    if (reportsError || locationsError) {
      config.showToast?.error(reportsError || locationsError || "Failed to load reports", {
        id: "fetch-error",
        duration: 6000,
        position: "top-center",
        action: {
          label: "Retry",
          onClick: () => {
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            const startDate = format(
              toZonedTime(startOfMonth(date), "Asia/Kolkata"),
              "yyyy-MM-dd"
            );
            const endDate = format(
              toZonedTime(endOfMonth(date), "Asia/Kolkata"),
              "yyyy-MM-dd'T'23:59:59+05:30"
            );
            dispatch(
              actions.fetchAttendanceReport({
                startDate,
                endDate,
                location: location === "all" ? "" : location,
                page: currentPage.attendance,
                limit: itemsPerPage,
              })
            );
            dispatch(
              actions.fetchLeaveReport({
                location: location === "all" ? "" : location,
                month,
                year,
                page: currentPage.leave,
                limit: itemsPerPage,
              })
            );
            dispatch(
              actions.fetchSalaryReport({
                startDate,
                endDate,
                location: location === "all" ? "" : location,
                page: currentPage.salary,
                limit: itemsPerPage,
              })
            );
            dispatch(actions.fetchLocations());
          },
        },
      });
      dispatch(actions.resetReports());
      dispatch(actions.resetLocations());
    }
  }, [
    reportsError,
    locationsError,
    dispatch,
    config,
    actions,
    month,
    year,
    location,
    currentPage,
    itemsPerPage,
  ]);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2025, i), "MMMM"),
  }));
  const years = ["2024", "2025", "2026"];

  // Props to pass to child components
  const commonProps = {
    locations,
    reportsLoading,
    month,
    year,
    location,
    searchQuery,
    setSearchQuery,
    sortConfig,
    setSortConfig,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    config,
  };

  return (
    <Layout title={config.title}>
      {(reportsError || locationsError) && (
        <Alert
          variant="destructive"
          className="mb-6 max-w-7xl mx-auto rounded-lg border-error bg-error/10 text-error p-4 animate-fade-in"
          role="alert"
        >
          <AlertDescription className="text-sm md:text-base">
            {reportsError || locationsError}
          </AlertDescription>
        </Alert>
      )}
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="bg-complementary text-body shadow-xl rounded-xl border border-accent/20 animate-fade-in">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-xl md:text-2xl font-bold">
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month" className="text-body text-sm font-medium">
                  Month
                </Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger
                    id="month"
                    className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                    aria-label="Select month"
                  >
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent className="bg-complementary text-body border-complementary">
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-sm">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year" className="text-body text-sm font-medium">
                  Year
                </Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger
                    id="year"
                    className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                    aria-label="Select year"
                  >
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="bg-complementary text-body border-complementary">
                    {years.map((y) => (
                      <SelectItem key={y} value={y} className="text-sm">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-body text-sm font-medium">
                  Location
                </Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger
                    id="location"
                    className="h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm"
                    aria-label="Select location"
                  >
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="bg-complementary text-body border-complementary">
                    <SelectItem value="all" className="text-sm">
                      All Locations
                    </SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc._id} value={loc._id} className="text-sm">
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="bg-complementary text-body rounded-xl border border-accent/20 shadow-xl animate-fade-in"
        >
          <TabsList className="flex flex-wrap justify-start gap-2 p-4 sm:p-6 bg-complementary rounded-t-xl">
            <TabsTrigger
              value="attendance"
              className={cn(
                "rounded-lg px-4 py-2 text-sm md:text-base transition-all duration-300",
                activeTab === "attendance"
                  ? "bg-accent text-body font-semibold shadow-sm"
                  : "border border-accent text-accent hover:bg-accent-hover hover:text-body",
                "focus:ring-2 focus:ring-accent focus:ring-offset-2"
              )}
              aria-label="Select Attendance report"
            >
              Attendance
            </TabsTrigger>
            <TabsTrigger
              value="leave"
              className={cn(
                "rounded-lg px-4 py-2 text-sm md:text-base transition-all duration-300",
                activeTab === "leave"
                  ? "bg-accent text-body font-semibold shadow-sm"
                  : "border border-accent text-accent hover:bg-accent-hover hover:text-body",
                "focus:ring-2 focus:ring-accent focus:ring-offset-2"
              )}
              aria-label="Select Leave report"
            >
              Leave
            </TabsTrigger>
            <TabsTrigger
              value="salary"
              className={cn(
                "rounded-lg px-4 py-2 text-sm md:text-base transition-all duration-300",
                activeTab === "salary"
                  ? "bg-accent text-body font-semibold shadow-sm"
                  : "border border-accent text-accent hover:bg-accent-hover hover:text-body",
                "focus:ring-2 focus:ring-accent focus:ring-offset-2"
              )}
              aria-label="Select Salary report"
            >
              Salary
            </TabsTrigger>
          </TabsList>
          <TabsContent value="attendance" className="p-4 sm:p-6 animate-fade-in">
            {children.attendance && children.attendance({ ...commonProps, attendanceReport })}
          </TabsContent>
          <TabsContent value="leave" className="p-4 sm:p-6 animate-fade-in">
            {children.leave && children.leave({ ...commonProps, leaveReport })}
          </TabsContent>
          <TabsContent value="salary" className="p-4 sm:p-6 animate-fade-in">
            {children.salary && children.salary({ ...commonProps, salaryReport })}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ReportsContainer;
