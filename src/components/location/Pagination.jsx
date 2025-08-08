// src/components/common/Pagination.jsx
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled,
}) => {
  const maxPagesToShow = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  return (
    totalPages > 1 && (
      <div className="flex justify-center items-center gap-2 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || disabled}
          className="border-complementary text-body hover:bg-accent/20 rounded-lg py-1 px-2 transition-all duration-300"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pageNumbers.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className={cn(
              "border-complementary text-body rounded-lg py-1 px-3 transition-all duration-300",
              page === currentPage
                ? "bg-accent text-body hover:bg-accent-hover"
                : "hover:bg-accent/20"
            )}
            disabled={disabled}
            aria-label={`Go to page ${page}`}
          >
            {page}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || disabled}
          className="border-complementary text-body hover:bg-accent/20 rounded-lg py-1 px-2 transition-all duration-300"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  );
};

export default Pagination;