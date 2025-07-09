import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AttendanceTable = ({
  attendanceReport,
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
}) => {
  const handleDownloadPDF = () => {
    if (!attendanceReport?.attendance?.length) {
      toast.error("No attendance data to export", {
        id: "export-error",
        duration: 6000,
        position: "top-center",
      });
      return;
    }
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("Attendance Report", 14, 15);
    doc.setFontSize(10);
    doc.text(
      `Month: ${format(new Date(parseInt(year), parseInt(month) - 1), "MMMM yyyy")}`,
      14,
      22
    );
    doc.text(
      `Location: ${
        location === "all"
          ? "All Locations"
          : locations.find((loc) => loc._id === location)?.name || "Unknown"
      }`,
      14,
      29
    );

    const tableData = attendanceReport.attendance.map((record) => [
      `${record.employee?.name || "Unknown"} (${record.employee?.employeeId || "N/A"})`,
      record.location?.name || "Unknown",
      format(toZonedTime(new Date(record.date), "Asia/Kolkata"), "MM/dd/yyyy"),
      record.status.charAt(0).toUpperCase() + record.status.slice(1),
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Employee", "Location", "Date", "Status"]],
      body: tableData,
      theme: "striped",
      pageBreak: "auto",
      margin: { top: 35, left: 14, right: 14, bottom: 20 },
      styles: {
        font: "helvetica",
        fontSize: 7,
        cellPadding: 1.5,
        overflow: "ellipsize",
        minCellHeight: 5,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
        font: "helvetica",
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
      },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setFont("helvetica");
        doc.text(
          `Page ${doc.internal.getNumberOfPages()}`,
          doc.internal.pageSize.width - 20,
          doc.internal.pageSize.height - 10,
          { align: "right" }
        );
      },
    });

    doc.save(`attendance-report-${month}-${year}.pdf`);
  };

  const handleDownloadExcel = () => {
    if (!attendanceReport?.attendance?.length) {
      toast.error("No attendance data to export", {
        id: "export-error",
        duration: 6000,
        position: "top-center",
      });
      return;
    }

    const data = attendanceReport.attendance.map((record) => ({
      Employee: `${record.employee?.name || "Unknown"} (${record.employee?.employeeId || "N/A"})`,
      Location: record.location?.name || "Unknown",
      Date: format(toZonedTime(new Date(record.date), "Asia/Kolkata"), "MM/dd/yyyy"),
      Status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
    }));

    const ws = XLSX.utils.json_to_sheet(data, {
      header: ["Employee", "Location", "Date", "Status"],
    });

    ws["!cols"] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 12 },
      { wch: 10 },
    ];

    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
      if (cell) {
        cell.s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "3B82F6" } },
          color: { rgb: "FFFFFF" },
          alignment: { horizontal: "center" },
        };
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");

    const headerWs = XLSX.utils.json_to_sheet(
      [
        { A: "Attendance Report" },
        {
          A: `Month: ${format(new Date(parseInt(year), parseInt(month) - 1), "MMMM yyyy")}`,
        },
        {
          A: `Location: ${
            location === "all"
              ? "All Locations"
              : locations.find((loc) => loc._id === location)?.name || "Unknown"
          }`,
        },
        { A: "" },
      ],
      { skipHeader: true }
    );
    XLSX.utils.book_append_sheet(wb, headerWs, "Header");

    const filename = `attendance-report-${month}-${year}.xlsx`;
    XLSX.writeFile(wb, filename, { bookType: "xlsx", type: "binary" });
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const newSort = { ...prev };
      if (newSort.attendance?.key === key && newSort.attendance?.direction === "asc") {
        newSort.attendance = { key, direction: "desc" };
      } else {
        newSort.attendance = { key, direction: "asc" };
      }
      return newSort;
    });
  };

  const filterData = (data) => {
    const query = searchQuery.attendance.toLowerCase();
    if (!query) return data;
    return data.filter(
      (record) =>
        record.employee?.name?.toLowerCase().includes(query) ||
        record.employee?.employeeId?.toLowerCase().includes(query)
    );
  };

  const sortData = (data) => {
    if (!data || !sortConfig.attendance) return data;
    const { key, direction } = sortConfig.attendance;
    return [...data].sort((a, b) => {
      let aValue, bValue;
      if (key === "employee") {
        aValue = a.employee?.name?.toLowerCase() || "";
        bValue = b.employee?.name?.toLowerCase() || "";
      } else if (key === "location") {
        aValue = a.location?.name?.toLowerCase() || "";
        bValue = b.location?.name?.toLowerCase() || "";
      } else if (key === "date") {
        aValue = new Date(a.date);
        bValue = new Date(b.date);
      } else {
        aValue = a[key]?.toLowerCase() || "";
        bValue = b[key]?.toLowerCase() || "";
      }
      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const filteredAttendance = useMemo(
    () => (attendanceReport?.attendance ? filterData(attendanceReport.attendance) : []),
    [attendanceReport, searchQuery.attendance]
  );
  const sortedAttendance = useMemo(
    () => sortData(filteredAttendance),
    [filteredAttendance, sortConfig.attendance]
  );

  // Use totalPages from backend pagination metadata
  const totalPages = attendanceReport?.pagination?.totalPages || 1;

  return (
    <Card className="bg-complementary text-body max-w-7xl mx-auto shadow-xl rounded-xl border border-accent/20 animate-fade-in mb-6">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span className="text-xl md:text-2xl font-bold">Attendance Report</span>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-body h-5 w-5" />
              <Input
                placeholder="Search employees..."
                className="pl-10 h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm placeholder:text-body/50"
                value={searchQuery.attendance}
                onChange={(e) =>
                  setSearchQuery({ ...searchQuery, attendance: e.target.value })
                }
                aria-label="Search employees by name or ID"
              />
            </div>
            <Button
              onClick={handleDownloadExcel}
              className="bg-accent text-body hover:bg-accent-hover rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md flex items-center gap-2"
              disabled={reportsLoading || !attendanceReport?.attendance?.length}
              aria-label="Download attendance report as Excel"
              title="Download as Excel"
            >
              <Download className="h-4 w-4" /> Excel
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="bg-accent text-body hover:bg-accent-hover rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md flex items-center gap-2"
              disabled={reportsLoading || !attendanceReport?.attendance?.length}
              aria-label="Download attendance report as PDF"
              title="Download as PDF"
            >
              <Download className="h-4 w-4" /> PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="mb-4">
          <p className="text-sm md:text-base text-body/80">
            Present: {attendanceReport?.summary?.totalPresent || 0} | Absent:{" "}
            {attendanceReport?.summary?.totalAbsent || 0} | Leave:{" "}
            {attendanceReport?.summary?.totalLeave || 0} | Half-Day:{" "}
            {attendanceReport?.summary?.totalHalfDay || 0}
          </p>
        </div>
        {reportsLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2
              className="h-8 w-8 animate-spin text-accent"
              aria-label="Loading attendance data"
            />
          </div>
        ) : attendanceReport?.attendance?.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-lg border border-accent/20">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-complementary-light hover:bg-accent/10 border-b border-body/20">
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("employee")}
                    >
                      Employee
                      {sortConfig.attendance?.key === "employee" &&
                        (sortConfig.attendance.direction === "asc" ? (
                          <ChevronUp className="inline ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-1 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("location")}
                    >
                      Location
                      {sortConfig.attendance?.key === "location" &&
                        (sortConfig.attendance.direction === "asc" ? (
                          <ChevronUp className="inline ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-1 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("date")}
                    >
                      Date
                      {sortConfig.attendance?.key === "date" &&
                        (sortConfig.attendance.direction === "asc" ? (
                          <ChevronUp className="inline ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-1 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("status")}
                    >
                      Status
                      {sortConfig.attendance?.key === "status" &&
                        (sortConfig.attendance.direction === "asc" ? (
                          <ChevronUp className="inline ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-1 h-4 w-4" />
                        ))}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceReport.attendance.map((record) => (
                    <TableRow
                      key={record._id}
                      className="border-b border-accent/10 transition-all duration-300 hover:bg-accent/5"
                    >
                      <TableCell className="text-sm md:text-base text-body font-medium px-4 py-3 truncate max-w-[200px]">
                        {record.employee?.name || "Unknown"} (
                        {record.employee?.employeeId || "N/A"})
                      </TableCell>
                      <TableCell className="text-sm md:text-base text-body px-4 py-3 truncate max-w-[150px]">
                        {record.location?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-sm md:text-base text-body px-4 py-3">
                        {format(
                          toZonedTime(new Date(record.date), "Asia/Kolkata"),
                          "MM/dd/yyyy"
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-sm md:text-base px-4 py-3",
                          record.status === "present" && "text-green",
                          record.status === "absent" && "text-error",
                          record.status === "half-day" && "text-accent",
                          record.status === "leave" && "text-yellow"
                        )}
                      >
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && !reportsLoading && (
              <div className="flex justify-between items-center mt-4 xs:mt-5 sm:mt-6">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentPage({
                            ...currentPage,
                            attendance: currentPage.attendance - 1,
                          })
                        }
                        disabled={currentPage.attendance === 1}
                        className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 min-h-[36px] text-xs xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
                        aria-label="Go to previous page"
                      >
                        <ChevronLeft className="h-4 xs:h-5 w-4 xs:w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                      Navigate to previous page
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex flex-wrap justify-center items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <TooltipProvider key={page}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={
                              currentPage.attendance === page ? "default" : "outline"
                            }
                            onClick={() =>
                              setCurrentPage({ ...currentPage, attendance: page })
                            }
                            disabled={currentPage.attendance === page}
                            className={cn(
                              currentPage.attendance === page
                                ? "bg-accent text-body font-semibold shadow-sm"
                                : "border-accent text-accent hover:bg-accent-hover hover:text-body",
                              "rounded-lg text-xs xs:text-sm sm:text-base py-1 px-2 xs:px-3 min-h-[36px] transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
                            )}
                            aria-label={`Go to page ${page}`}
                            aria-current={
                              currentPage.attendance === page ? "page" : undefined
                            }
                          >
                            {page}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                          Go to page {page}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentPage({
                            ...currentPage,
                            attendance: currentPage.attendance + 1,
                          })
                        }
                        disabled={currentPage.attendance >= totalPages}
                        className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 min-h-[36px] text-xs xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
                        aria-label="Go to next page"
                      >
                        <ChevronRight className="h-4 xs:h-5 w-4 xs:w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                      Navigate to next page
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </>
        ) : (
          <div className="p-6 text-center">
            <p className="text-sm md:text-base text-body/80 animate-fade-in">
              No attendance records available. Try adjusting the filters.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceTable;