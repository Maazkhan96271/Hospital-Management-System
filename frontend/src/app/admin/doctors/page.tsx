"use client";

import React, { useState, useMemo, Suspense } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Stethoscope,
  Search,
  Building2,
  Calendar,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Award,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
} from "lucide-react";

interface DoctorProfile {
  id: number;
  user_id: number;
  specialization: string | null;
  qualification: string | null;
  experience_years: number;
  weekly_availability: Record<
    string,
    { start: string; end: string; available: boolean }
  >;
  user: {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    is_active: boolean;
    role?: { name: string };
  };
  department: {
    id: number;
    name: string;
    description: string | null;
  } | null;
}

interface Department {
  id: number;
  name: string;
}

function AdminDoctorsContent() {
  const searchParams = useSearchParams();
  const initialDept = searchParams?.get("dept") || "all";

  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>(initialDept);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // SWR fetching doctors and departments
  const {
    data: doctors,
    isLoading: isDoctorsLoading,
    error: doctorsError,
  } = useSWR<DoctorProfile[]>("/api/doctors/", () =>
    apiFetch<DoctorProfile[]>("/api/doctors/")
  );

  const { data: departments } = useSWR<Department[]>("/api/departments/", () =>
    apiFetch<Department[]>("/api/departments/")
  );

  // Filter doctors by department and search text
  const filteredData = useMemo(() => {
    if (!doctors) return [];
    return doctors.filter((doc) => {
      const matchesDept =
        selectedDept === "all" ||
        (doc.department && String(doc.department.id) === selectedDept);
      return matchesDept;
    });
  }, [doctors, selectedDept]);

  // TanStack table columns
  const columns = useMemo<ColumnDef<DoctorProfile>[]>(
    () => [
      {
        accessorKey: "user.first_name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 text-xs font-bold text-slate-700 dark:text-slate-300"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Physician
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          const doc = row.original;
          const initials = `${doc.user.first_name?.[0] || ""}${
            doc.user.last_name?.[0] || ""
          }`.toUpperCase();
          return (
            <div className="flex items-center gap-3 py-1">
              <Avatar className="h-9 w-9 border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/50">
                <AvatarFallback className="text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  {initials || "DR"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Dr. {doc.user.first_name} {doc.user.last_name}
                  {doc.user.is_active ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Active" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Deactivated" />
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {doc.user.email}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "department.name",
        header: "Department",
        cell: ({ row }) => {
          const dept = row.original.department;
          return dept ? (
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 font-medium"
            >
              <Building2 className="h-3 w-3 mr-1" />
              {dept.name}
            </Badge>
          ) : (
            <span className="text-xs text-slate-400">General / None</span>
          );
        },
      },
      {
        accessorKey: "specialization",
        header: "Specialization & Credentials",
        cell: ({ row }) => {
          const doc = row.original;
          return (
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {doc.specialization || "General Practice"}
              </p>
              <p className="text-xs text-slate-500 truncate max-w-xs">
                {doc.qualification || "Licensed Physician"}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "experience_years",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 text-xs font-bold text-slate-700 dark:text-slate-300"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Experience
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {row.original.experience_years} years
          </span>
        ),
      },
      {
        id: "schedule_preview",
        header: "7-Day Schedule",
        cell: ({ row }) => {
          const sched = row.original.weekly_availability || {};
          const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
          const availableCount = days.filter((d) => sched[d]?.available).length;

          return (
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-xs font-normal">
                <Calendar className="h-3 w-3 mr-1 text-slate-400" />
                {availableCount} days / wk
              </Badge>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Action</div>,
        cell: ({ row }) => {
          const doc = row.original;
          return (
            <div className="text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDoctor(doc);
                  setIsSheetOpen(true);
                }}
                className="h-8 text-xs gap-1.5 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                View Profile
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Stethoscope className="h-5 w-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Doctor Directory
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Comprehensive physician registry, departmental allocations, and live weekly availability slots.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 self-start md:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Total Registered: <strong>{doctors?.length || 0}</strong>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white/70 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, email, or credentials..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 bg-white dark:bg-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            aria-label="Filter by medical department"
            className="h-9 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Departments</option>
            {departments?.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </select>

          {selectedDept !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDept("all")}
              className="text-xs text-slate-500 h-9"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <Table className="min-w-full">
            <TableHeader className="bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isDoctorsLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-36 text-center text-slate-500"
                  >
                    <Stethoscope className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    No doctors found matching the query.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Pagination Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 text-xs text-slate-500">
          <div>
            Showing{" "}
            <strong>
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}
            </strong>{" "}
            to{" "}
            <strong>
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </strong>{" "}
            of <strong>{table.getFilteredRowModel().rows.length}</strong> results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-2.5 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-2.5 text-xs"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Slide-out Sheet for Doctor Profile & 7-Day Schedule */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          {selectedDoctor && (
            <div className="space-y-6 pt-2">
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 border-2 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950">
                    <AvatarFallback className="text-emerald-700 dark:text-emerald-300 text-lg font-bold">
                      {`${selectedDoctor.user.first_name?.[0] || ""}${
                        selectedDoctor.user.last_name?.[0] || ""
                      }`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-xl font-bold flex items-center gap-2">
                      Dr. {selectedDoctor.user.first_name} {selectedDoctor.user.last_name}
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300">
                        Profile #{selectedDoctor.id}
                      </Badge>
                    </SheetTitle>
                    <SheetDescription className="text-xs text-slate-500">
                      {selectedDoctor.specialization || "General Medicine"} • {selectedDoctor.experience_years} years experience
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* Department & Contact Card */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Department</span>
                  <Badge variant="secondary" className="font-semibold">
                    <Building2 className="h-3 w-3 mr-1" />
                    {selectedDoctor.department?.name || "General Unit"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Email Address</span>
                  <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1 font-mono">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {selectedDoctor.user.email}
                  </span>
                </div>
                {selectedDoctor.user.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Contact Phone</span>
                    <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {selectedDoctor.user.phone}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Credentials</span>
                  <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-amber-500" />
                    {selectedDoctor.qualification || "MD, Board Certified"}
                  </span>
                </div>
              </div>

              {/* 7-Day Availability Schedule Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    Weekly Working Schedule (30-min Slots)
                  </h3>
                  <span className="text-xs text-slate-400">Automated slot generator</span>
                </div>

                <div className="space-y-2">
                  {[
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                  ].map((day) => {
                    const info = selectedDoctor.weekly_availability?.[day];
                    const isAvail = info?.available ?? false;

                    return (
                      <div
                        key={day}
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-colors ${
                          isAvail
                            ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
                            : "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/50 dark:border-slate-800/40 opacity-70"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isAvail ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-slate-400" />
                          )}
                          <span className="font-bold capitalize text-slate-800 dark:text-slate-200 w-24">
                            {day}
                          </span>
                        </div>

                        {isAvail ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {info?.start || "09:00"} – {info?.end || "17:00"}
                            </span>
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                              Active
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Off Duty</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function AdminDoctorsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      }
    >
      <AdminDoctorsContent />
    </Suspense>
  );
}
