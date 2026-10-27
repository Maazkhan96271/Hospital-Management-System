"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  FileQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string | React.ReactNode;
  accessorKey?: keyof T | string;
  accessorFn?: (row: T) => any;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  cell?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchableKeys?: (keyof T | string)[];
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  onRowClick?: (row: T) => void;
  className?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  extraHeaderActions?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = "Filter records...",
  searchableKeys,
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  onRowClick,
  className,
  isLoading = false,
  emptyMessage = "No matching records found.",
  extraHeaderActions,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Helper to extract nested key or accessor value
  const getRowValue = (row: T, key: string | keyof T) => {
    if (typeof key === "string" && key.includes(".")) {
      return key.split(".").reduce((acc, part) => acc?.[part], row);
    }
    return row[key as keyof T];
  };

  // 1. Global / multi-column search filtering
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();

    return data.filter((row) => {
      // If searchableKeys provided, check those; otherwise check all object values
      const keysToCheck = searchableKeys || Object.keys(row);
      return keysToCheck.some((key) => {
        const val = getRowValue(row, key as string);
        if (val === null || val === undefined) return false;
        if (typeof val === "object") return JSON.stringify(val).toLowerCase().includes(q);
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [data, searchQuery, searchableKeys]);

  // 2. Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    const column = columns.find((c) => (c.accessorKey as string) === sortKey);

    return [...filteredData].sort((a, b) => {
      let valA: any = column?.accessorFn ? column.accessorFn(a) : getRowValue(a, sortKey);
      let valB: any = column?.accessorFn ? column.accessorFn(b) : getRowValue(b, sortKey);

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      if (sortDirection === "asc") {
        return strA.localeCompare(strB);
      } else {
        return strB.localeCompare(strA);
      }
    });
  }, [filteredData, sortKey, sortDirection, columns]);

  // Reset page when search or sorting changes
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // 3. Pagination calculations
  const totalRows = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, validCurrentPage, pageSize]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Table Toolbar Header: Search & Extra Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 pr-8 text-xs h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {extraHeaderActions && (
          <div className="flex items-center gap-2">{extraHeaderActions}</div>
        )}
      </div>

      {/* Advanced Table Container */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
              <TableRow>
                {columns.map((column, idx) => {
                  const key = (column.accessorKey as string) || String(idx);
                  const isCurrentSort = sortKey === key;

                  return (
                    <TableHead
                      key={key}
                      className={cn(
                        "text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 select-none py-3",
                        column.sortable && "cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors",
                        column.headerClassName
                      )}
                      onClick={() => column.sortable && handleSort(key)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{column.header}</span>
                        {column.sortable && (
                          <span className="text-slate-400">
                            {isCurrentSort ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, rIdx) => (
                  <TableRow key={rIdx}>
                    {columns.map((col, cIdx) => (
                      <TableCell key={cIdx} className="py-3">
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-full max-w-[120px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-10 text-xs text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileQuestion className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                      <span>{emptyMessage}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, rIdx) => (
                  <TableRow
                    key={row.id || rIdx}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/80",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {columns.map((column, cIdx) => {
                      const cellValue = column.cell
                        ? column.cell(row, rIdx)
                        : column.accessorFn
                        ? column.accessorFn(row)
                        : getRowValue(row, column.accessorKey as string);

                      return (
                        <TableCell
                          key={cIdx}
                          className={cn("py-3 text-xs", column.className)}
                        >
                          {cellValue}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination & Row Summary Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 text-xs focus:outline-hidden cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span className="hidden sm:inline">
              Showing{" "}
              <strong>
                {totalRows === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1}
              </strong>{" "}
              to <strong>{Math.min(validCurrentPage * pageSize, totalRows)}</strong> of{" "}
              <strong>{totalRows}</strong> records
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="mr-2 font-mono text-[11px]">
              Page {validCurrentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 text-xs"
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage <= 1}
              title="First Page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 text-xs"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              title="Previous Page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 text-xs"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              title="Next Page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 text-xs"
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage >= totalPages}
              title="Last Page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
