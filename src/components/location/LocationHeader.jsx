import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import { Search, Plus, Loader2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import debounce from "lodash.debounce";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CardHeader, CardTitle } from "@/components/ui/card";
import TooltipButton from "./TooltipButton";
import LocationForm from "./LocationForm";

const LocationHeader = ({
  title,
  reduxSlice,
  navigatePath,
  fetchPaginatedLocations,
  addLocation,
  setCurrentPage,
  sortConfig, // ✅ New prop for sorting
}) => {
  const dispatch = useDispatch();
  const { currentPage } = useSelector((state) => state[reduxSlice]);
  
  // Local state
  const [searchInput, setSearchInput] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({ add: false });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchVersion = useRef(0);

  // Debounced API fetch (single debounce)
  const triggerSearch = useMemo(
    () =>
      debounce(async (search, page, sortColumn, sortOrder) => {
        searchVersion.current += 1;
        setSearchLoading(true);
        try {
          await dispatch(
            fetchPaginatedLocations({
              search,
              page: Math.max(1, page),
              limit: 2,
              sortColumn,
              sortOrder,
            })
          ).unwrap();
        } catch (err) {
          const errorMessage = typeof err === 'string' ? err : err.message || "Failed to search locations";
          toast.error(errorMessage, {
            id: "search-error",
            duration: 6000,
            position: "top-center",
          });
        } finally {
          setSearchLoading(false);
        }
      }, 1000),
    [dispatch, fetchPaginatedLocations]
  );

  // ✅ FIXED: Use dynamic sortConfig instead of hardcoded values
  useEffect(() => {
    if (sortConfig) {
      triggerSearch(searchInput, currentPage, sortConfig.column, sortConfig.order);
    }
    return () => triggerSearch.cancel();
  }, [searchInput, currentPage, sortConfig, triggerSearch]);

  // Focus handling
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
    const handleKeydown = (e) => {
      if (e.ctrlKey && e.key === "/") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isSearchOpen]);

  // Outside click close
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target) &&
        isSearchOpen &&
        searchInput.trim() === ""
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearchOpen, searchInput]);

  // Search input change
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value
      .replace(/[<>{}|;]/g, "")
      .replace(/\s+/g, " ");
    setSearchInput(value);
    if (currentPage !== 1) {
      dispatch(setCurrentPage(1));
    }
  }, [currentPage, dispatch, setCurrentPage]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setIsSearchOpen(false);
    dispatch(setCurrentPage(1));
  }, [dispatch, setCurrentPage]);

  // Enhanced Add Location submit with proper error handling
  const handleAddSubmit = useCallback(
    async (data) => {
      try {
        setActionLoading((prev) => ({ ...prev, add: true }));
        const result = await dispatch(addLocation(data)).unwrap();
        
        toast.success(`"${result.name}" location added successfully`, {
          id: "add-success",
        });
        setAddOpen(false);
        
        // ✅ FIXED: Use dynamic sortConfig instead of hardcoded values
        if (sortConfig) {
          triggerSearch(searchInput, currentPage, sortConfig.column, sortConfig.order);
        }
      } catch (err) {
        const errorMessage = typeof err === 'string' ? err : err.message || "Failed to add location";
        
        if (errorMessage.includes('already exists')) {
          toast.error(`Location name "${data.name}" already exists. Please choose a different name.`, {
            id: "add-duplicate-error",
          });
        } else {
          toast.error(errorMessage, {
            id: "add-error",
          });
        }
      } finally {
        setActionLoading((prev) => ({ ...prev, add: false }));
      }
    },
    [dispatch, addLocation, searchInput, currentPage, triggerSearch, sortConfig]
  );

  return (
    <CardHeader className="p-4 sm:p-6">
      <CardTitle className="flex flex-col sm:flex-row justify-center sm:justify-between items-center gap-3">
        {/* Title */}
        <span className="text-xl md:text-2xl font-bold w-full text-center sm:w-auto sm:text-left">
          {title}
        </span>
        
        {/* Search + Add Button */}
        <div className="flex flex-row gap-3 w-48 sm:w-full max-w-md justify-center sm:justify-end mt-4 sm:mt-0">
          {/* Search */}
          <div
            className="flex items-center gap-2 flex-grow max-w-full sm:flex-grow-0"
            ref={searchContainerRef}
          >
            {(isSearchOpen || window.innerWidth >= 640) && (
              <div className="relative flex-grow sm:flex-grow-0 focus-within:ring-2 focus-within:ring-accent/20 rounded-lg">
                {searchLoading ? (
                  <Loader2
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-accent h-5 w-5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-body h-5 w-5" />
                )}
                <Input
                  ref={searchInputRef}
                  placeholder="Search locations"
                  className={cn(
                    "pl-10 pr-14 h-9 sm:h-10 bg-body text-body rounded-lg border border-complementary focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-300 text-sm md:text-base placeholder:text-body/50 hover:shadow-md"
                  )}
                  value={searchInput}
                  onChange={handleSearchChange}
                  onBlur={() => {
                    if (searchInput.trim() === "" && isSearchOpen) {
                      setIsSearchOpen(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      if (searchInput.trim() === "") {
                        setIsSearchOpen(false);
                      } else {
                        handleClearSearch();
                      }
                    }
                  }}
                  aria-label="Search locations"
                  aria-busy={searchLoading}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-body hover:text-accent focus:outline-none cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            {!isSearchOpen && window.innerWidth < 640 && (
              <TooltipButton
                onClick={() => setIsSearchOpen(true)}
                tooltipText="Open Search"
                ariaLabel="Open search"
                aria-expanded={isSearchOpen}
                className={cn(
                  "w-9 h-9 flex items-center justify-center mx-auto",
                  "cursor-pointer"
                )}
              >
                <Search className="h-5 w-5" />
              </TooltipButton>
            )}
          </div>
          
          {/* Add Location */}
          {(!isSearchOpen || window.innerWidth >= 640) && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <TooltipButton
                  tooltipText="Add new location"
                  ariaLabel="Add new location"
                  className={cn(
                    "bg-accent text-body hover:bg-accent-hover flex items-center gap-2 px-3 py-0 h-9 sm:h-10 text-sm sm:text-base"
                  )}
                >
                  <Plus className="h-5 w-5" />
                  Add Location
                </TooltipButton>
              </DialogTrigger>
              <DialogContent className="bg-complementary text-body rounded-xl shadow-2xl max-w-lg w-[calc(100%-1.5rem)] sm:w-full mx-auto p-4 sm:p-6 z-[1400] box-border">
                <DialogHeader>
                  <DialogTitle className="text-lg md:text-xl font-bold text-body cursor-default">
                    Add New Location
                  </DialogTitle>
                  <DialogDescription className="text-sm text-body/80 cursor-default">
                    Fill in the details to add a new location.
                  </DialogDescription>
                </DialogHeader>
                <LocationForm
                  mode="add"
                  onSubmit={handleAddSubmit}
                  onCancel={() => setAddOpen(false)}
                  isLoading={actionLoading.add}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardTitle>
    </CardHeader>
  );
};

export default LocationHeader;
