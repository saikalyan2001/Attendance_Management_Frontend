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

// Indian number formatter
const formatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const SalaryTable = ({
  salaryReport,
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
  const calculateTotals = (data) => {
    const uniqueLocations = new Set(data.map((emp) => emp.location?.name || "Unknown"));
    return data.reduce(
      (acc, emp) => ({
        employeeCount: acc.employeeCount + 1,
        uniqueLocations: uniqueLocations.size,
        presentDays:
          acc.presentDays + (typeof emp.presentDays === "number" ? emp.presentDays : 0),
        halfDays: acc.halfDays + (typeof emp.halfDays === "number" ? emp.halfDays : 0),
        absentDays:
          acc.absentDays + (typeof emp.absentDays === "number" ? emp.absentDays : 0),
        leaveDays:
          acc.leaveDays + (typeof emp.leaveDays === "number" ? emp.leaveDays : 0),
        grossSalary:
          acc.grossSalary +
          (typeof emp.grossSalary === "number" ? emp.grossSalary : 0),
        netSalary:
          acc.netSalary + (typeof emp.netSalary === "number" ? emp.netSalary : 0),
        advance: acc.advance + (typeof emp.advance === "number" ? emp.advance : 0),
        totalSalary:
          acc.totalSalary +
          (typeof emp.totalSalary === "number" ? emp.totalSalary : 0),
      }),
      {
        employeeCount: 0,
        uniqueLocations: 0,
        presentDays: 0,
        halfDays: 0,
        absentDays: 0,
        leaveDays: 0,
        grossSalary: 0,
        netSalary: 0,
        advance: 0,
        totalSalary: 0,
      }
    );
  };

  const totals = useMemo(
    () => calculateTotals(salaryReport?.employees || []),
    [salaryReport]
  );

  const handleDownloadPDF = () => {
    if (!salaryReport?.employees?.length) {
      toast.error("No salary data to export", {
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
    doc.text("Salary Report", 14, 15);
    doc.setFontSize(10);
    doc.text(
      `Month: ${format(new Date(year, parseInt(month) - 1, 1), "MMMM yyyy")}`,
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

    const currency = "INR ";
    const tableData = salaryReport.employees.map((emp) => [
      `${emp.employee?.name || "Unknown"} (${emp.employee?.employeeId || "N/A"})`,
      emp.location?.name || "Unknown",
      emp.presentDays,
      emp.halfDays,
      emp.absentDays,
      emp.leaveDays,
      `${currency}${typeof emp.grossSalary === "number" ? formatter.format(emp.grossSalary) : "0.00"}`,
      `${currency}${typeof emp.netSalary === "number" ? formatter.format(emp.netSalary) : "0.00"}`,
      `${currency}${typeof emp.advance === "number" ? formatter.format(emp.advance) : "0.00"}`,
      `${currency}${typeof emp.totalSalary === "number" ? formatter.format(emp.totalSalary) : "0.00"}`,
    ]);

    tableData.push([
      `Total (${totals.employeeCount})`,
      `${totals.uniqueLocations} Location${totals.uniqueLocations !== 1 ? "s" : ""}`,
      totals.presentDays,
      totals.halfDays,
      totals.absentDays,
      totals.leaveDays,
      `${currency}${formatter.format(totals.grossSalary)}`,
      `${currency}${formatter.format(totals.netSalary)}`,
      `${currency}${formatter.format(totals.advance)}`,
      `${currency}${formatter.format(totals.totalSalary)}`,
    ]);

    autoTable(doc, {
      startY: 35,
      head: [
        [
          "Employee",
          "Location",
          "Present Days",
          "Half Days",
          "Absent Days",
          "Leave Days",
          "Gross Salary",
          "Net Salary",
          "Advance",
          "Total Salary",
        ],
      ],
      body: tableData,
      theme: "striped",
      pageBreak: "auto",
      margin: { top: 35, left: 14, right: 14, bottom: 20 },
      styles: {
        font: "helvetica",
        fontSize: 7,
        cellPadding: 1.5,
        overflow: "linebreak",
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
        0: { cellWidth: 35 },
        1: { cellWidth: 25 },
        2: { cellWidth: 15 },
        3: { cellWidth: 12 },
        4: { cellWidth: 12 },
        5: { cellWidth: 12 },
        6: { cellWidth: 20 },
        7: { cellWidth: 20 },
        8: { cellWidth: 20 },
        9: { cellWidth: 20 },
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

    doc.save(`salary-report-${month}-${year}.pdf`);
  };

  const handleDownloadExcel = () => {
    if (!salaryReport?.employees?.length) {
      toast.error("No salary data to export", {
        id: "export-error",
        duration: 6000,
        position: "top-center",
      });
      return;
    }

    const data = salaryReport.employees.map((emp) => ({
      Employee: `${employee?.name || "Unknown"} (${employee?.employeeId || "N/A"})`,
      Location: employee.location?.name || "Unknown",
      "Present Days": emp.presentDays,
      "Half Days": emp.halfDays,
      "Absent Days": emp.absentDays,
      "Leave Days": emp.leaveDays,
      "Gross Salary": `INR ${typeof emp.grossSalary === "number" ? formatter.format(emp.grossSalary) : "0.00"}`,
      "Net Salary": `INR ${typeof emp.netSalary === "number" ? formatter.format(emp.netSalary) : "0.00"}`,
      Advance: `INR ${typeof emp.advance === "number" ? formatter.format(emp.advance) : "0.00"}`,
      "Total Salary": `INR ${typeof emp.totalSalary === "number" ? formatter.format(emp.totalSalary) : "0.00"}`,
    }));

    data.push({
      Employee: `Total (${totals.employeeCount})`,
      Location: `${totals.uniqueLocations} Location${totals.uniqueLocations !== 1 ? "s" : ""}`,
      "Present Days": totals.presentDays,
      "Half Days": totals.halfDays,
      "Absent Days": totals.absentDays,
      "Leave Days": totals.leaveDays,
      "Gross Salary": `INR ${formatter.format(totals.grossSalary)}`,
      "Net Salary": `INR ${formatter.format(totals.netSalary)}`,
      Advance: `INR ${formatter.format(totals.advance)}`,
      "Total Salary": `INR ${formatter.format(totals.totalSalary)}`,
    });

    const ws = XLSX.utils.json_to_sheet(data, {
      header: [
        "Employee",
        "Location",
        "Present Days",
        "Half Days",
        "Absent Days",
        "Leave Days",
        "Gross Salary",
        "Net Salary",
        "Advance",
        "Total Salary",
      ],
    });

    ws["!cols"] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
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
    XLSX.utils.book_append_sheet(wb, ws, "Salary Report");

    const headerWs = XLSX.utils.json_to_sheet(
      [
        { A: "Salary Report" },
        {
          A: `Month: ${format(new Date(year, parseInt(month) - 1, 1), "MMMM yyyy")}`,
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

    const filename = `salary-report-${month}-${year}.xlsx`;
    XLSX.writeFile(wb, filename, { bookType: "xlsx", type: "binary" });
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const newSort = { ...prev };
      if (newSort.salary?.key === key && newSort.salary?.direction === "asc") {
        newSort.salary = { key, direction: "desc" };
      } else {
        newSort.salary = { key, direction: "asc" };
      }
      return newSort;
    });
  };

  const filterData = (data) => {
    const query = searchQuery.salary.toLowerCase();
    if (!query) return data;
    return data.filter(
      (emp) =>
        emp.employee?.name?.toLowerCase().includes(query) ||
        emp.employee?.employeeId?.toLowerCase().includes(query)
    );
  };

  const sortData = (data) => {
    if (!data || !sortConfig.salary) return data;
    const { key, direction } = sortConfig.salary;
    return [...data].sort((a, b) => {
      let aValue, bValue;
      if (key === "employee") {
        aValue = a.employee?.name?.toLowerCase() || "";
        bValue = b.employee?.name?.toLowerCase() || "";
      } else if (key === "location") {
        aValue = a.location?.name?.toLowerCase() || "";
        bValue = b.location?.name?.toLowerCase() || "";
      } else {
        aValue = typeof a[key] === "number" ? a[key] : 0;
        bValue = typeof b[key] === "number" ? b[key] : 0;
      }
      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const filteredSalary = useMemo(
    () => (salaryReport?.employees ? filterData(salaryReport.employees) : []),
    [salaryReport, searchQuery.salary]
  );
  const sortedSalary = useMemo(
    () => sortData(filteredSalary),
    [filteredSalary, sortConfig.salary]
  );

  const getRowTotal = (emp) => ({
    presentDays: typeof emp.presentDays === "number" ? emp.presentDays : 0,
    halfDays: typeof emp.halfDays === "number" ? emp.halfDays : 0,
    absentDays: typeof emp.absentDays === "number" ? emp.absentDays : 0,
    leaveDays: typeof emp.leaveDays === "number" ? emp.leaveDays : 0,
    grossSalary: typeof emp.grossSalary === "number" ? emp.grossSalary : 0,
    netSalary: typeof emp.netSalary === "number" ? emp.netSalary : 0,
    advance: typeof emp.advance === "number" ? emp.advance : 0,
    totalSalary: typeof emp.totalSalary === "number" ? emp.totalSalary : 0,
  });

  // Use totalPages from backend pagination metadata
  const totalPages = salaryReport?.pagination?.totalPages || 1;

  return (
    <Card className="bg-complementary text-body max-w-7xl mx-auto shadow-xl rounded-xl border border-accent/20 animate-animate-fade-in mb-6">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span className="text-xl md:text-2xl font-bold">Salary Report</span>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-body h-5 w-5" />
              <Input
                placeholder="Search employees..."
                className="pl-10 h-10 bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg text-sm transition-all duration-300 hover:shadow-sm placeholder-text-body/50"
                value={searchQuery.salary}
                onChange={(e) =>
                  setSearchQuery({ ...searchQuery, salary: e.target.value })
                }
                aria-label="Search employees by name or ID"
              />
            </div>
            <Button
              onClick={handleDownloadExcel}
              className="bg-accent text-body hover:bg-accent-hover rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md flex items-center gap-2"
              disabled={reportsLoading || !salaryReport?.employees?.length}
              aria-label="Download salary report as Excel"
              title="Download as Excel"
            >
              <Download className="h-4 w-4" /> Excel
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="bg-accent text-body hover:bg-accent-hover rounded-lg text-sm py-2 px-4 transition-all duration-300 hover:shadow-md flex items-center gap-2"
              disabled={reportsLoading || !salaryReport?.employees?.length}
              aria-label="Download salary report as PDF"
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
            Total Employees: {totals.employeeCount} | Total Locations: {totals.uniqueLocations} | Total Present Days: {totals.presentDays} | Total Half Days: {totals.halfDays} | Total Absent Days: {totals.absentDays} | Total Leave Days: {totals.leaveDays} | Total Gross Salary: ₹{formatter.format(totals.grossSalary)} | Total Net Salary: ₹{formatter.format(totals.netSalary)} | Total Advance: ₹{formatter.format(totals.advance)} | Total Salary: ₹{formatter.format(totals.totalSalary)}
          </p>
        </div>
        {reportsLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2
              className="h-8 w-8 animate-spin text-accent"
              aria-label="Loading salary data"
            />
          </div>
        ) : sortedSalary.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-lg border border-accent/20">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="bg-complementary-light hover:bg-accent/10 border-b border-body/20">
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("employee")}
                    >
                      Employee
                      {sortConfig.salary?.key === "employee" &&
                        (sortConfig.salary.direction === "asc" ? (
                          < ChevronUp className="inline ml-4 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-2 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("location")}
                    >
                      Location
                      {sortConfig.salary?.key === "location" &&
                        (sortConfig.salary.direction === "asc" ? (
                          <ChevronUp className="inline ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-2 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("presentDays")}
                    >
                      Present Days
                      {sortConfig.salary?.key === "presentDays" &&
                        (sortConfig.salary.direction === "asc" ? (
                          <ChevronUp className="inline ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-2 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("halfDays")}
                    >
                      Half Days
                      {sortConfig.salary?.key === "halfDays" &&
                        (sortConfig.salary.direction === "asc" ? (
                          <ChevronUp className="inline ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-2 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("absentDays")}
                    >
                      Absent Days
                      {sortConfig.salary?.key === "absentDays" &&
                        (sortConfig.salary.direction === "asc" ? (
                          <ChevronUp className="inline ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-2 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("leaveDays")}
                    >
                      Leave Days
                      {sortConfig.salary?.key === "leaveDays" &&
                        (sortConfig.salary.direction === "asc" ? (
                          <ChevronUp className="inline ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-2 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("grossSalary")}
                    >
                      Gross Salary
                      {sortConfig.salary?.key === "grossSalary" &&
                        (sortConfig.salary.direction === "asc" ? (
                          <ChevronUp className="inline ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-2 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("advance")}
                    >
                      Advance
                      {sortConfig.salary?.key === "advance" &&
                        (sortConfig.salary.direction === "asc" ? (
                          <ChevronUp className="inline ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-2 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("netSalary")}
                    >
                      Net Salary
                      {sortConfig.salary?.key === "netSalary" &&
                        (sortConfig.salary.direction === "asc" ? (
                          <ChevronUp className="inline ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-2 h-4 w-4" />
                        ))}
                    </TableHead>
                    <TableHead
                      className="text-body font-semibold cursor-pointer text-sm md:text-base px-4 py-3"
                      onClick={() => handleSort("totalSalary")}
                    >
                      Total Salary
                      {sortConfig.salary?.key === "totalSalary" &&
                        (sortConfig.salary.direction === "asc" ? (
                          <ChevronUp className="inline ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDown className="inline ml-2 h-4 w-4" />
                        ))}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSalary.map((emp) => {
                    const rowTotal = getRowTotal(emp);
                    return (
                      <TableRow
                        key={emp.employee._id}
                        className="border-b border-accent/10 transition-all duration-300 hover:bg-accent/5"
                      >
                        <TableCell
                          className="text-sm md:text-base text-body font-medium px-4 py-3 truncate max-w-[200px]"
                        >
                          {emp.employee?.name || "Unknown"} (
                          {emp.employee?.employeeId || "N/A"})
                        </TableCell>
                        <TableCell
                          className="text-sm md:text-base text-body px-4 py-3 truncate max-w-[150px]"
                        >
                          {emp.location?.name || "Unknown"}
                        </TableCell>
                        <TableCell className="text-sm md:text-base text-body px-4 py-3">
                          {rowTotal.presentDays}
                        </TableCell>
                        <TableCell className="text-sm md:text-base text-body px-4 py-3">
                          {rowTotal.halfDays}
                        </TableCell>
                        <TableCell className="text-sm md:text-base text-body px-4 py-3">
                          {rowTotal.absentDays}
                        </TableCell>
                        <TableCell className="text-sm md:text-base text-body px-4 py-3">
                          {rowTotal.leaveDays}
                        </TableCell>
                        <TableCell className="text-sm md:text-base text-body px-4 py-3">
                          ₹{formatter.format(rowTotal.grossSalary)}
                        </TableCell>
                        <TableCell className="text-sm md:text-base text-body px-4 py-3">
                          ₹{formatter.format(rowTotal.advance)}
                        </TableCell>
                        <TableCell className="text-sm md:text-base text-body px-4 py-3">
                          ₹{formatter.format(rowTotal.netSalary)}
                        </TableCell>
                        <TableCell className="text-sm md:text-base text-body px-4 py-3">
                          ₹{formatter.format(rowTotal.totalSalary)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-complementary-light font-semibold border-b border-accent/10">
                    <TableCell
                      className="text-sm md:text-base text-body px-4 py-3"
                    >
                      Total ({totals.employeeCount})
                    </TableCell>
                    <TableCell
                      className="text-sm md:text-base text-body px-4 py-3"
                    >
                      {totals.uniqueLocations} Location
                      {totals.uniqueLocations !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell
                      className="text-sm md:text-base text-body px-4 py-3"
                    >
                      {totals.presentDays}
                    </TableCell>
                    <TableCell
                      className="text-sm md:text-base text-body px-4 py-3"
                    >
                      {totals.halfDays}
                    </TableCell>
                    <TableCell
                      className="text-sm md:text-base text-body px-4 py-3"
                    >
                      {totals.absentDays}
                    </TableCell>
                    <TableCell
                      className="text-sm md:text-base text-body px-4 py-3"
                    >
                      {totals.leaveDays}
                    </TableCell>
                    <TableCell
                      className="text-sm md:text-base text-body px-4 py-3"
                    >
                      ₹{formatter.format(totals.grossSalary)}
                    </TableCell>
                    <TableCell
                      className="text-sm md:text-base text-body px-4 py-3"
                    >
                      ₹{formatter.format(totals.advance)}
                    </TableCell>
                    <TableCell
                      className="text-sm md:text-base text-body px-4 py-3"
                    >
                      ₹{formatter.format(totals.netSalary)}
                    </TableCell>
                    <TableCell
                      className="text-sm md:text-base text-body px-4 py-3"
                    >
                      ₹{formatter.format(totals.totalSalary)}
                    </TableCell>
                  </TableRow>
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
                            salary: currentPage.salary - 1,
                          })
                        }
                        disabled={currentPage.salary === 1}
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
                                currentPage.salary === page
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                setCurrentPage({
                                  ...currentPage,
                                  salary: page,
                                })
                              }
                              disabled={currentPage.salary === page}
                              className={cn(
                                currentPage.salary === page
                                  ? "bg-accent text-body font-semibold shadow-sm"
                                  : "border-accent text-accent hover:bg-accent-hover hover:text-body",
                                "rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 min-h-[36px] text-xs xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
                              )}
                              aria-label={`Go to page ${page}`}
                              aria-current={
                                currentPage.salary === page ? "page" : undefined
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
                            salary: currentPage.salary + 1,
                          })
                        }
                        disabled={currentPage.salary >= totalPages}
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
              No salary records available. Try adjusting the filters.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalaryTable;