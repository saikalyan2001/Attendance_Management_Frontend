import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees } from "../redux/employeeSlice";
import { fetchAttendance, fetchMonthlyAttendance, reset } from "../redux/attendanceSlice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Loader2, Search, Download, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ViewAttendance = ({ locationId }) => {
  const dispatch = useDispatch();
  const { employees, loading: empLoading } = useSelector(
    (state) => state.siteInchargeEmployee
  );
  const { attendance, monthlyAttendance, loading: attLoading, error } = useSelector(
    (state) => state.siteInchargeAttendance
  );

  const [filterDate, setFilterDate] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState(null);
  const [filterYear, setFilterYear] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ column: "date", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 10;

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString("default", { month: "long" }),
  }));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  // Handle error display
  useEffect(() => {
    if (error) {
      toast.error(error, { duration: 5000 });
      dispatch(reset());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (!locationId) return;
    dispatch(fetchEmployees({ location: locationId }));

    const currentYear = new Date().getFullYear();
    if (
      filterMonth &&
      filterYear &&
      filterMonth >= 1 &&
      filterMonth <= 12 &&
      filterYear >= 2000 &&
      filterYear <= currentYear
    ) {
      dispatch(
        fetchMonthlyAttendance({
          month: filterMonth,
          year: filterYear,
          location: locationId,
        })
      );
    } else {
      const filters = { location: locationId };
      if (filterDate) filters.date = format(filterDate, "yyyy-MM-dd");
      if (filterStatus && filterStatus !== "all") filters.status = filterStatus;
      dispatch(fetchAttendance(filters));
    }
  }, [dispatch, locationId, filterDate, filterStatus, filterMonth, filterYear]);

  const sortedAttendance = useMemo(() => {
    const data = filterMonth && filterYear ? monthlyAttendance : attendance;
    if (!data || !Array.isArray(data)) return [];

    return [...data].sort((a, b) => {
      if (sortConfig.column === "name") {
        const nameA = a.employee?.name || "";
        const nameB = b.employee?.name || "";
        return sortConfig.direction === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameB);
      } else {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
      }
    });
  }, [attendance, monthlyAttendance, filterMonth, filterYear, sortConfig]);

  const filteredAttendance = useMemo(() => {
    let filtered = sortedAttendance || [];
    if (filterStatus && filterStatus !== "all") {
      filtered = filtered.filter((record) => record.status === filterStatus);
    }
    if (filterDate && filterMonth && filterYear) {
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.date);
        return (
          recordDate.getMonth() + 1 === filterMonth &&
          recordDate.getFullYear() === filterYear &&
          format(recordDate, "yyyy-MM-dd") === format(filterDate, "yyyy-MM-dd")
        );
      });
    } else if (filterDate) {
      filtered = filtered.filter((record) =>
        format(new Date(record.date), "yyyy-MM-dd") === format(filterDate, "yyyy-MM-dd")
      );
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (record) =>
          record.employee?.name?.toLowerCase().includes(searchQuery?.toLowerCase()) ||
          record.employee?.employeeId?.toLowerCase().includes(searchQuery?.toLowerCase())
      );
    }
    return filtered;
  }, [sortedAttendance, filterStatus, filterDate, filterMonth, filterYear, searchQuery]);

  const paginatedAttendance = useMemo(() => {
    const startIndex = (currentPage - 1) * employeesPerPage;
    return filteredAttendance.slice(startIndex, startIndex + employeesPerPage);
  }, [filteredAttendance, currentPage]);

  const totalPages = Math.ceil(filteredAttendance.length / employeesPerPage);

  const statusTotals = useMemo(() => {
    return filteredAttendance.reduce(
      (totals, record) => ({
        ...totals,
        [record.status]: (totals[record.status] || 0) + 1,
      }),
      { present: 0, absent: 0, leave: 0, "half-day": 0 }
    );
  }, [filteredAttendance]);

  const handleSort = (column) => {
    setSortConfig((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleDateSelect = (date) => {
    if (date > new Date()) {
      toast.error("Cannot select a future date", { duration: 5000 });
      return;
    }
    setFilterDate(date);
    setCurrentPage(1);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Attendance Records Report", 14, 20);
    doc.text(`Location: ${locationId}`, 14, 30);
    if (filterMonth) doc.text(`Month: ${months.find(m => m.value === filterMonth)?.label || "N/A"}`, 14, 40);
    if (filterYear) doc.text(`Year: ${filterYear}`, 14, 50);
    if (filterDate) doc.text(`Date: ${format(filterDate, "PPP")}`, 14, 60);
    if (filterStatus !== "all") doc.text(`Status: ${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}`, 14, 70);
    doc.text(`Total Present: ${statusTotals.present}`, 14, 80);
    doc.text(`Total Absent: ${statusTotals.absent}`, 14, 90);
    doc.text(`Total Leave: ${statusTotals.leave}`, 14, 100);
    doc.text(`Total Half-Day: ${statusTotals["half-day"]}`, 14, 110);

    const body = filteredAttendance.map(record => [
      record.employee?.employeeId || "N/A",
      record.employee?.name || "Unknown",
      record.status.charAt(0).toUpperCase() + record.status.slice(1),
      isNaN(new Date(record.date)) ? "Invalid Date" : format(new Date(record.date), "PPP"),
    ]);

    autoTable(doc, {
      startY: 120,
      head: [["ID", "Name", "Status", "Date"]],
      body,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`Attendance_Records_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF downloaded successfully", { duration: 5000 });
  };

  return (
    <div className="space-y-8">
      <Card className="bg-body text-body border border-complementary max-w-4xl mx-auto rounded-lg shadow-sm">
        <CardHeader className="border-b border-complementary">
          <CardTitle className="text-2xl font-bold">Filter Attendance</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="filterMonth" className="block text-sm font-semibold text-body">
                Month
              </Label>
              <Select
                value={filterMonth?.toString() || ""}
                onValueChange={(value) => setFilterMonth(value ? parseInt(value) : null)}
                disabled={!locationId}
              >
                <SelectTrigger
                  id="filterMonth"
                  className={`w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm ${filterMonth ? "bg-complementary" : ""}`}
                  aria-label="Select month to filter attendance records"
                >
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body">
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()} className="text-sm">
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterYear" className="block text-sm font-semibold text-body">
                Year
              </Label>
              <Select
                value={filterYear?.toString() || ""}
                onValueChange={(value) => setFilterYear(value ? parseInt(value) : null)}
                disabled={!locationId}
              >
                <SelectTrigger
                  id="filterYear"
                  className={`w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm ${filterYear ? "bg-complementary" : ""}`}
                  aria-label="Select year to filter attendance records"
                >
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()} className="text-sm">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterDate" className="block text-sm font-semibold text-body">
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal bg-body text-body border-complementary hover:bg-accent-hover hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm ${filterDate ? "bg-complementary" : ""}`}
                    disabled={!locationId}
                    aria-label="Select date to filter attendance records"
                  >
                    <CalendarIcon className="mr-2 h-5 w-5 text-complementary" />
                    {filterDate ? format(filterDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-body text-body">
                  <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    disabled={(date) => date > new Date()}
                    className="border border-complementary rounded-lg"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterStatus" className="block text-sm font-semibold text-body">
                Status
              </Label>
              <Select
                value={filterStatus}
                onValueChange={setFilterStatus}
                disabled={!locationId}
              >
                <SelectTrigger
                  id="filterStatus"
                  className={`w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm ${filterStatus !== "all" ? "bg-complementary" : ""}`}
                  aria-label="Select status to filter attendance records"
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-body text-body">
                  <SelectItem value="all" className="text-sm">All Statuses</SelectItem>
                  <SelectItem value="present" className="text-sm">Present</SelectItem>
                  <SelectItem value="absent" className="text-sm">Absent</SelectItem>
                  <SelectItem value="leave" className="text-sm">Leave</SelectItem>
                  <SelectItem value="half-day" className="text-sm">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setFilterDate(null);
                setFilterStatus("all");
                setFilterMonth(null);
                setFilterYear(null);
                setSearchQuery("");
              }}
              className={`text-sm py-3 px-4 flex items-center gap-2 ${filterDate || filterStatus !== "all" || filterMonth || filterYear || searchQuery ? "bg-accent text-complementary hover:bg-accent-hover" : "border-accent text-accent hover:bg-accent-hover"} focus:outline-none focus:ring-2 focus:ring-accent`}
              disabled={!locationId || (!filterDate && filterStatus === "all" && !filterMonth && !filterYear && !searchQuery)}
              aria-label="Reset attendance filters"
            >
              <RotateCcw className="h-5 w-5" />
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-body text-body border border-complementary rounded-lg shadow-sm">
        <CardHeader className="border-b border-complementary flex flex-row justify-between items-center">
          <CardTitle className="text-2xl font-bold">Attendance Records</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Input
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 pl-10 bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-10 text-sm"
                aria-label="Search attendance records by employee name or ID"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-complementary" />
            </div>
            <Button
              onClick={handleDownloadPDF}
              className="bg-accent text-complementary hover:bg-accent-hover text-sm py-2 px-4 flex items-center gap-2"
              disabled={attLoading || empLoading || !filteredAttendance.length || !locationId}
              aria-label="Download attendance records as PDF"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {attLoading || empLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : filteredAttendance.length > 0 ? (
            <div className="max-h-[400px] overflow-x-auto relative">
              <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-complementary to-transparent pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-complementary to-transparent pointer-events-none" />
              <Table className="border border-complementary">
                <TableHeader className="sticky top-0 bg-complementary shadow-sm z-10">
                  <TableRow>
                    <TableHead className="text-body text-sm">ID</TableHead>
                    <TableHead className="text-body text-sm">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("name")}
                        className="flex items-center space-x-1"
                        aria-label="Sort by employee name"
                      >
                        Employee Name
                        {sortConfig.column === "name" && (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-body text-sm">Status</TableHead>
                    <TableHead className="text-body text-sm">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("date")}
                        className="flex items-center space-x-1"
                        aria-label="Sort by date"
                      >
                        Date
                        {sortConfig.column === "date" && (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        )}
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAttendance.map((record, index) => (
                    <TableRow
                      key={record._id}
                      className={index % 2 === 0 ? "bg-body" : "bg-complementary"}
                    >
                      <TableCell className="text-body text-sm">
                        {record.employee?.employeeId || "N/A"}
                      </TableCell>
                      <TableCell className="text-body text-sm">
                        {record.employee?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-body text-sm">
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </TableCell>
                      <TableCell className="text-body text-sm">
                        {isNaN(new Date(record.date)) ? "Invalid Date" : format(new Date(record.date), "PPP")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-complementary sticky bottom-0">
                  <TableRow>
                    <TableCell colSpan={2} className="text-body text-sm font-semibold">
                      Totals
                    </TableCell>
                    <TableCell className="text-body text-sm">
                      Present: {statusTotals.present} <br />
                      Absent: {statusTotals.absent} <br />
                      Leave: {statusTotals.leave} <br />
                      Half-Day: {statusTotals["half-day"]}
                    </TableCell>
                    <TableCell className="text-body text-sm"></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          ) : (
            <p className="text-body text-sm">No attendance records found</p>
          )}
          {filteredAttendance.length > 0 && (
            <div className="flex justify-between items-center mt-4">
              <Button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-accent text-complementary hover:bg-accent-hover text-sm py-2 px-4"
                aria-label="Previous page"
              >
                Previous
              </Button>
              <span className="text-sm text-body">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-accent text-complementary hover:bg-accent-hover text-sm py-2 px-4"
                aria-label="Next page"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewAttendance;
