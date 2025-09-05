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

const LeaveTable = ({
  leaveReport,
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
    if (!leaveReport?.employees?.length) {
      toast.error("No leave data to export", {
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
    doc.text("Leave Report", 14, 15);
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

    const tableData = leaveReport.employees.map((emp) => {
      const monthlyLeave = emp.monthlyLeaves[0] || {};
      return [
        `${emp.name || "Unknown"} (${emp.employeeId || "N/A"})`,
        emp.location?.name || "Unknown",
        monthlyLeave.available ?? 0,
        monthlyLeave.taken ?? 0,
        monthlyLeave.carriedForward ?? 0,
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [["Employee", "Location", "Available", "Used", "Carried Forward"]],
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
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
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

    doc.save(`leave-report-${month}-${year}.pdf`);
  };

  const handleDownloadExcel = () => {
    if (!leaveReport?.employees?.length) {
      toast.error("No leave data to export", {
        id: "export-error",
        duration: 6000,
        position: "top-center",
      });
      return;
    }

    const data = leaveReport.employees.map((emp) => {
      const monthlyLeave = emp.monthlyLeaves[0] || {};
      return {
        Employee: `${emp.name || "Unknown"} (${emp.employeeId || "N/A"})`,
        Location: emp.location?.name || "Unknown",
        Available: monthlyLeave.available ?? 0,
        Used: monthlyLeave.taken ?? 0,
        "Carried Forward": monthlyLeave.carriedForward ?? 0,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data, {
      header: ["Employee", "Location", "Available", "Used", "Carried Forward"],
    });

    ws["!cols"] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 10 },
      { wch: 10 },
      { wch: 15 },
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
    XLSX.utils.book_append_sheet(wb, ws, "Leave Report");

    const headerWs = XLSX.utils.json_to_sheet(
      [
        { A: "Leave Report" },
        {
          A: `Month: ${format(
            new Date(parseInt(year), parseInt(month) - 1),
            "MMMM yyyy"
          )}`,
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

    const filename = `leave-report-${month}-${year}.xlsx`;
    XLSX.writeFile(wb, filename, { bookType: "xlsx", type: "binary" });
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const newSort = { ...prev };
      if (newSort.leave?.key === key && newSort.leave?.direction === "asc") {
        newSort.leave = { key, direction: "desc" };
      } else {
        newSort.leave = { key, direction: "asc" };
      }
      return newSort;
    });
  };

  const filterData = (data) => {
    const query = searchQuery.leave.toLowerCase();
    if (!query) return data;
    return data.filter(
      (emp) =>
        emp.name?.toLowerCase().includes(query) ||
        emp.employeeId?.toLowerCase().includes(query)
    );
  };

  const sortData = (data) => {
    if (!data || !sortConfig.leave) return data;
    const { key, direction } = sortConfig.leave;
    return [...data].sort((a, b) => {
      let aValue, bValue;
      if (key === "employee") {
        aValue = a.name?.toLowerCase() || "";
        bValue = b.name?.toLowerCase() || "";
      } else if (key === "location") {
        aValue = a.location?.name?.toLowerCase() || "";
        bValue = b.location?.name?.toLowerCase() || "";
      } else {
        const aMonthlyLeave = a.monthlyLeaves[0] || {};
        const bMonthlyLeave = b.monthlyLeaves[0] || {};
        aValue = aMonthlyLeave[key] ?? 0;
        bValue = bMonthlyLeave[key] ?? 0;
      }
      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const filteredLeave = useMemo(
    () => (leaveReport?.employees ? filterData(leaveReport.employees) : []),
    [leaveReport, searchQuery.leave]
  );
  const sortedLeave = useMemo(
    () => sortData(filteredLeave),
    [filteredLeave, sortConfig.leave]
  );

  // Use totalPages from backend pagination metadata
  const totalPages = leaveReport?.pagination?.totalPages || 1;

  return (
    <Card className="bg-complementary text-body max-w-7xl mx-auto shadow-xl rounded-xl border border-accent/20 animate-fade-in mb-6">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span className="text-xl md:text-2xl font-bold">Leave Report</span>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-body h-5 w-5" />
              <Input
                placeholder="Search employees..."
                className="pl-10 h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm placeholder:text-body/50"
                value={searchQuery.leave}
                onChange={(e) =>
                  setSearchQuery({ ...searchQuery, leave: e.target.value })
                }
                aria-label="Search employees by name or ID"
              />
            </div>
            <Button
              onClick={handleDownloadExcel}
              className="bg-accent text-body hover:bg-accent-hover rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md flex items-center gap-2"
              disabled={reportsLoading || !leaveReport?.employees?.length}
              aria-label="Download leave report as Excel"
              title="Download as Excel"
            >
              <Download className="h-4 w-4" /> Excel
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="bg-accent text-body hover:bg-accent-hover rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md flex items-center gap-2"
              disabled={reportsLoading || !leaveReport?.employees?.length}
              aria-label="Download leave report as PDF"
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
            Total Available: {leaveReport?.summary?.totalAvailable || 0} | Total
            Used: {leaveReport?.summary?.totalUsed || 0} | Total Carried Forward:{" "}
            {leaveReport?.summary?.totalCarriedForward || 0}
          </p>
        </div>
        {reportsLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2
              className="h-8 w-8 animate-spin text-accent"
              aria-label="Loading leave data"
            />
          </div>
        ) : leaveReport?.employees?.length > 0 ? (
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
                      {sortConfig.leave?.key === "employee" &&
                        (sortConfig.leave.direction === "asc" ? (
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
                      {sortConfig.leave?.key === "location" &&
                        (sortConfig.leave.direction === "asc" ? (
                          <ChevronUp className="inline ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-1 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("available")}
                    >
                      Available
                      {sortConfig.leave?.key === "available" &&
                        (sortConfig.leave.direction === "asc" ? (
                          <ChevronUp className="inline ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-1 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("taken")}
                    >
                      Used
                      {sortConfig.leave?.key === "taken" &&
                        (sortConfig.leave.direction === "asc" ? (
                          <ChevronUp className="inline ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-1 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("carriedForward")}
                    >
                      Carried Forward
                      {sortConfig.leave?.key === "carriedForward" &&
                        (sortConfig.leave.direction === "asc" ? (
                          <ChevronUp className="inline ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-1 h-4 w-4" />
                        ))}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveReport.employees.map((emp) => {
                    const monthlyLeave = emp.monthlyLeaves[0] || {};
                    return (
                      <TableRow
                        key={emp._id}
                        className="border-b border-accent/10 transition-all duration-300 hover:bg-accent/5"
                      >
                        <TableCell className="text-sm md:text-base text-body font-medium px-4 py-3 truncate max-w-[200px]">
                          {emp.name || "Unknown"} ({emp.employeeId || "N/A"})
                        </TableCell>
                        <TableCell className="text-sm md:text-base text-body px-4 py-3 truncate max-w-[150px]">
                          {emp.location?.name || "Unknown"}
                        </TableCell>
                        <TableCell className="text-sm md:text-base text-body px-4 py-3">
                          {monthlyLeave.available ?? 0}
                        </TableCell>
                        <TableCell className="text-sm md:text-base text-body px-4 py-3">
                          {monthlyLeave.taken ?? 0}
                        </TableCell>
                        <TableCell className="text-sm md:text-base text-body px-4 py-3">
                          {monthlyLeave.carriedForward ?? 0}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                            leave: currentPage.leave - 1,
                          })
                        }
                        disabled={currentPage.leave === 1}
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <TooltipProvider key={page}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={
                                currentPage.leave === page ? "default" : "outline"
                              }
                              onClick={() =>
                                setCurrentPage({
                                  ...currentPage,
                                  leave: page,
                                })
                              }
                              disabled={currentPage.leave === page}
                              className={cn(
                                currentPage.leave === page
                                  ? "bg-accent text-body font-semibold shadow-sm"
                                  : "border-accent text-accent hover:bg-accent-hover hover:text-body",
                                "rounded-lg text-xs xs:text-sm sm:text-base py-1 px-2 xs:px-3 min-h-[36px] transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
                              )}
                              aria-label={`Go to page ${page}`}
                              aria-current={
                                currentPage.leave === page ? "page" : undefined
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
                    )
                  )}
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentPage({
                            ...currentPage,
                            leave: currentPage.leave + 1,
                          })
                        }
                        disabled={currentPage.leave >= totalPages}
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
              No leave records available. Try adjusting the filters.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaveTable;