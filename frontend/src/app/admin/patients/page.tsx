"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
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
  Users,
  Search,
  Calendar,
  FileText,
  Pill,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Activity,
  ClipboardList,
  AlertCircle,
  Eye,
  CheckCircle,
} from "lucide-react";

interface PatientUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean;
  role?: { id: number; name: string };
  created_at?: string;
}

interface TreatmentRecord {
  id: number;
  appointment_id: number;
  diagnosis: string;
  prescription: string[];
  detailed_notes: string | null;
  created_at: string;
  updated_at?: string;
}

export default function AdminPatientsPage() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientUser | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // SWR: Fetch patients list
  const {
    data: patients,
    isLoading: isPatientsLoading,
    error: patientsError,
  } = useSWR<PatientUser[]>("/api/users/patients/search?limit=100", () =>
    apiFetch<PatientUser[]>("/api/users/patients/search?limit=100")
  );

  // SWR: Fetch treatment records for selected patient when sheet is opened
  const {
    data: treatments,
    isLoading: isTreatmentsLoading,
    error: treatmentsError,
  } = useSWR<TreatmentRecord[]>(
    selectedPatient ? `/api/treatments/patient/${selectedPatient.id}` : null,
    (url: string) => apiFetch<TreatmentRecord[]>(url)
  );

  const columns = useMemo<ColumnDef<PatientUser>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-slate-500">
            #{row.original.id}
          </span>
        ),
      },
      {
        accessorKey: "first_name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 text-xs font-bold text-slate-700 dark:text-slate-300"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Patient Name
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          const patient = row.original;
          const initials = `${patient.first_name?.[0] || ""}${
            patient.last_name?.[0] || ""
          }`.toUpperCase();
          return (
            <div className="flex items-center gap-3 py-1">
              <Avatar className="h-9 w-9 border border-blue-500/20 bg-blue-50 dark:bg-blue-950/50">
                <AvatarFallback className="text-blue-700 dark:text-blue-300 text-xs font-bold">
                  {initials || "PT"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  {patient.first_name} {patient.last_name}
                  {patient.is_active ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Active Account" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Suspended" />
                  )}
                </p>
                <p className="text-xs text-slate-500 font-mono">@{patient.username}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Contact",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Mail className="h-3 w-3 text-slate-400" />
                <span>{p.email}</span>
              </div>
              {p.phone && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span>{p.phone}</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={
              row.original.is_active
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }
          >
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Medical History</div>,
        cell: ({ row }) => {
          const patient = row.original;
          return (
            <div className="text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPatient(patient);
                  setIsSheetOpen(true);
                }}
                className="h-8 text-xs gap-1.5 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" />
                Treatment Timeline
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: patients || [],
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
              <Users className="h-5 w-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Patient Management
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Search registered hospital patients and review clinical treatment timelines, prescriptions, and past diagnoses.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 self-start md:self-auto">
          <Activity className="h-3.5 w-3.5 text-blue-500" />
          Active Records: <strong>{patients?.length || 0}</strong>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white/70 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by patient name, email, username, or #ID..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 bg-white dark:bg-slate-900"
          />
        </div>
        <span className="text-xs text-slate-400 hidden sm:inline">
          Click &quot;Treatment Timeline&quot; to inspect full clinical notes
        </span>
      </div>

      {/* TanStack Data Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
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
              {isPatientsLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
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
                    <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    No patients match your search criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
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
            of <strong>{table.getFilteredRowModel().rows.length}</strong> patients
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

      {/* Sliding Sheet for Patient Clinical & Treatment Timeline */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          {selectedPatient && (
            <div className="space-y-6 pt-2">
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 border-2 border-blue-500/30 bg-blue-50 dark:bg-blue-950">
                    <AvatarFallback className="text-blue-700 dark:text-blue-300 text-lg font-bold">
                      {`${selectedPatient.first_name?.[0] || ""}${
                        selectedPatient.last_name?.[0] || ""
                      }`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-xl font-bold flex items-center gap-2">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                        Patient #{selectedPatient.id}
                      </Badge>
                    </SheetTitle>
                    <SheetDescription className="text-xs text-slate-500">
                      Username: @{selectedPatient.username} • {selectedPatient.email}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* Patient Meta Box */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Account Status</span>
                  <Badge variant="secondary" className="font-semibold">
                    {selectedPatient.is_active ? "Active Registered" : "Deactivated"}
                  </Badge>
                </div>
                {selectedPatient.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phone Contact</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {selectedPatient.phone}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Total Consultations</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">
                    {treatments ? treatments.length : 0} recorded
                  </span>
                </div>
              </div>

              {/* Treatment Records Timeline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-emerald-600" />
                    Medical Treatment Records
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">
                    Chronological Timeline
                  </Badge>
                </div>

                {isTreatmentsLoading ? (
                  <div className="space-y-3 py-4">
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
                ) : treatments && treatments.length > 0 ? (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {treatments.map((treatment, idx) => {
                      const formattedDate = treatment.created_at
                        ? new Date(treatment.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "Recent Consultation";

                      return (
                        <div key={treatment.id} className="relative group">
                          {/* Dot indicator */}
                          <div className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 shadow-xs" />

                          <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/40 transition-colors">
                            <CardHeader className="p-4 pb-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formattedDate}
                                </span>
                                <Badge variant="outline" className="text-[10px] text-slate-400">
                                  Appt #{treatment.appointment_id}
                                </Badge>
                              </div>
                              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                                {treatment.diagnosis}
                              </CardTitle>
                            </CardHeader>

                            <CardContent className="p-4 pt-2 space-y-3 text-xs">
                              {/* Prescriptions Array */}
                              {treatment.prescription && treatment.prescription.length > 0 && (
                                <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                    <Pill className="h-3.5 w-3.5 text-blue-500" />
                                    Prescribed Medications:
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {treatment.prescription.map((med, mIdx) => (
                                      <span
                                        key={mIdx}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                                      >
                                        {med}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Clinical Notes */}
                              {treatment.detailed_notes && (
                                <div className="space-y-1">
                                  <span className="text-[11px] font-medium text-slate-500">
                                    Physician Notes:
                                  </span>
                                  <p className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                                    &ldquo;{treatment.detailed_notes}&rdquo;
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                    <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No treatment history yet
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Clinical diagnoses and prescriptions will appear here once the attending doctor completes a consultation.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
