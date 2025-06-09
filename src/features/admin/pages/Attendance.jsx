import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchLocations } from "../redux/locationsSlice";
import { fetchEmployees, reset as resetEmployees } from "../redux/employeeSlice";
import Layout from "../../../components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import MarkAttendance from "./MarkAttendance";
import MonthlyAttendance from "./MonthlyAttendance";
import ViewAttendance from "./ViewAttendance";
import AttendanceRequests from "./AttendanceRequests";

const Attendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { locations, loading: locationsLoading, error: locationsError } =
    useSelector((state) => state.adminLocations);
  const { employees, loading: employeesLoading, error: employeesError } =
    useSelector((state) => state.adminEmployees);
  const { user } = useSelector((state) => state.auth);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [location, setLocation] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("mark");

  useEffect(() => {
    if (!user || user.role !== "admin") navigate("/login");
    dispatch(fetchLocations());
  }, [dispatch, user, navigate]);

  useEffect(() => {
    if (locationsError || employeesError) {
      toast.error(locationsError || employeesError || "Failed to load data", {
        action: {
          label: "Retry",
          onClick: () => {
            dispatch(fetchLocations());
          },
        },
      });
      dispatch({ type: "adminLocations/reset" });
      dispatch(resetEmployees());
    }
  }, [locationsError, employeesError, dispatch]);

  const handleDropdownChange = (e) => {
    setActiveTab(e.target.value);
  };

  return (
    <Layout title="Attendance">
      {(locationsError || employeesError) && (
        <Alert variant="destructive" className="mb-6 border-error text-error w-full max-w-full">
          <AlertDescription>{locationsError || employeesError}</AlertDescription>
        </Alert>
      )}
      <div className="w-full max-w-full overflow-x-hidden">
        {/* Mobile Dropdown (hidden on sm and above) */}
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
        {/* Tabs for larger screens (hidden on mobile) */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6 w-full max-w-full overflow-x-hidden hidden sm:block"
        >
          <TabsList className="grid w-full h-fit p-2 grid-cols-4 bg-complementary text-body rounded-lg shadow-sm max-w-full">
            <TabsTrigger
              value="mark"
              className="py-3 text-sm rounded-md data-[state=active]:bg-accent data-[state=active]:text-body hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Mark Attendance
            </TabsTrigger>
            <TabsTrigger
              value="monthly"
              className="py-3 text-sm rounded-md data-[state=active]:bg-accent data-[state=active]:text-body hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Monthly Attendance
            </TabsTrigger>
            <TabsTrigger
              value="overview"
              className="py-3 text-sm rounded-md data-[state=active]:bg-accent data-[state=active]:text-body hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Attendance Overview
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="py-3 text-sm rounded-md data-[state=active]:bg-accent data-[state=active]:text-body hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Attendance Requests
            </TabsTrigger>
          </TabsList>
          <TabsContent value="mark">
            <MarkAttendance
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
            <MonthlyAttendance />
          </TabsContent>
          <TabsContent value="overview">
            <ViewAttendance />
          </TabsContent>
          <TabsContent value="requests">
            <AttendanceRequests locationId={location} />
          </TabsContent>
        </Tabs>
        {/* Mobile Content (visible on mobile, controlled by dropdown) */}
        <div className="sm:hidden">
          {activeTab === "mark" && (
            <MarkAttendance
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
          {activeTab === "monthly" && <MonthlyAttendance />}
          {activeTab === "overview" && <ViewAttendance />}
          {activeTab === "requests" && <AttendanceRequests locationId={location} />}
        </div>
      </div>
    </Layout>
  );
};

export default Attendance;