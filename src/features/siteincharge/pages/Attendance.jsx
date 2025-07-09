import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkAttendance from "./MarkAttendance";
import MonthlyAttendance from "./MonthlyAttendance";
import ViewAttendance from "./ViewAttendance";
import AttendanceRequests from "./AttendanceRequests";
import Layout from "../../../components/layout/Layout";
import { toast } from "react-hot-toast";

const Attendance = () => {
  const { user } = useSelector((state) => state.auth);
  const locationId = user?.locations?.[0]?._id;
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("mark");

  useEffect(() => {
    if (!locationId) {
      toast.error("No location assigned. Please contact admin.", {
        id: 'no-location-error',
        duration: 5000,
        position: 'top-center',
      });
    }
  }, [locationId]);

  const handleDropdownChange = (e) => {
    setActiveTab(e.target.value);
  };

  const tabClass = (tab) =>
    `py-3 text-sm rounded-md hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent ${
      activeTab === tab ? "bg-accent text-body" : ""
    }`;

  return (
    <Layout title="Attendance" role={user?.role || "siteincharge"}>
      <div className="w-full max-w-full overflow-x-hidden">
        {/* Mobile Dropdown */}
        <div className="sm:hidden mb-4">
          <select
            value={activeTab}
            onChange={handleDropdownChange}
            className="w-full p-3 text-sm font-medium bg-complementary text-body rounded-lg border border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Select attendance tab"
          >
            <option value="mark">Mark Attendance</option>
            <option value="monthly">Monthly Attendance</option>
            <option value="view">View Attendance</option>
            <option value="requests">Edit Requests</option>
          </select>
        </div>

        {/* Tabs for desktop */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6 w-full max-w-full overflow-x-hidden hidden sm:block"
        >
          <TabsList className="grid w-full h-fit p-2 grid-cols-4 bg-complementary text-body rounded-lg shadow-sm max-w-full">
            <TabsTrigger value="mark" className={tabClass("mark")}>
              Mark Attendance
            </TabsTrigger>
            <TabsTrigger value="monthly" className={tabClass("monthly")}>
              Monthly Attendance
            </TabsTrigger>
            <TabsTrigger value="view" className={tabClass("view")}>
              View Attendance
            </TabsTrigger>
            <TabsTrigger value="requests" className={tabClass("requests")}>
              Edit Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mark">
            <MarkAttendance
              month={month}
              year={year}
              setMonth={setMonth}
              setYear={setYear}
              locationId={locationId}
            />
          </TabsContent>
          <TabsContent value="monthly">
            <MonthlyAttendance />
          </TabsContent>
          <TabsContent value="view">
            <ViewAttendance locationId={locationId} />
          </TabsContent>
          <TabsContent value="requests">
            <AttendanceRequests locationId={locationId} />
          </TabsContent>
        </Tabs>

        {/* Mobile Content */}
        <div className="sm:hidden">
          {activeTab === "mark" && (
            <MarkAttendance
              month={month}
              year={year}
              setMonth={setMonth}
              setYear={setYear}
              locationId={locationId}
            />
          )}
          {activeTab === "monthly" && <MonthlyAttendance />}
          {activeTab === "view" && <ViewAttendance locationId={locationId} />}
          {activeTab === "requests" && <AttendanceRequests locationId={locationId} />}
        </div>
      </div>
    </Layout>
  );
};

export default Attendance;
