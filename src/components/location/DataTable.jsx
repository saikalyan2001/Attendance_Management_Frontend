import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DataTable = ({
  columns,
  data,
  loading,
  skeletonRowCount = 5,
  sortConfig,
  onSort,
  renderRow,
}) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-accent/20">
      <Table className="min-w-[700px]">
        <TableHeader>
          <TableRow className="bg-complementary-light hover:bg-accent/10 border-b border-body/20">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "text-body text-sm md:text-base font-semibold px-4 py-3",
                  col.width,
                  col.sortable ? "cursor-pointer" : "cursor-default"
                )}
              >
                {col.sortable ? (
                  <Button
                    variant="ghost"
                    onClick={() => onSort(col.key)}
                    className="text-body hover:text-accent font-semibold text-sm md:text-base transition-colors duration-300 cursor-pointer"
                    aria-label={`Sort by ${col.label} ${
                      sortConfig.column === col.key && sortConfig.order === "asc"
                        ? "ascending"
                        : "descending"
                    }`}
                  >
                    {col.label}{" "}
                    {sortConfig.column === col.key
                      ? sortConfig.order === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </Button>
                ) : (
                  <span className="cursor-default">{col.label}</span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array(skeletonRowCount)
              .fill()
              .map((_, i) => (
                <TableRow
                  key={i}
                  className="border-b border-accent/10 animate-shimmer"
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn("px-4 py-3", col.width, "cursor-default")}>
                      <Skeleton className="h-6 w-3/4 bg-complementary-light" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
          ) : data.length > 0 ? (
            data.map((item, index) => renderRow(item, index))
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataTable;