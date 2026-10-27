"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Stethoscope,
  CalendarCheck,
  Building2,
  Search,
  UserX,
  UserCheck,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  PieChart as PieIcon,
  RefreshCw,
  Mail,
  Phone,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

// Types
export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: "Doctor" | "Patient";
  department: string;
  joined_date: string;
  status: "Active" | "Blacklisted";
}

// 7-Day Appointment Data for Recharts AreaChart
const appointments7DaysData = [
  { day: "Mon", appointments: 18, completed: 15, cancelled: 2 },
  { day: "Tue", appointments: 24, completed: 21, cancelled: 3 },
  { day: "Wed", appointments: 22, completed: 19, cancelled: 1 },
  { day: "Thu", appointments: 30, completed: 27, cancelled: 2 },
  { day: "Fri", appointments: 28, completed: 25, cancelled: 1 },
  { day: "Sat", appointments: 14, completed: 12, cancelled: 2 },
  { day: "Sun", appointments: 8, completed: 7, cancelled: 1 },
];

// Department Distribution Data for Recharts PieChart
const departmentDistributionData = [
  { name: "Cardiology", patients: 42, color: "#2563eb" },
  { name: "Neurology", patients: 28, color: "#8b5cf6" },
  { name: "Orthopedics", patients: 24, color: "#10b981" },
  { name: "Pediatrics", patients: 20, color: "#f59e0b" },
  { name: "General Medicine", patients: 14, color: "#06b6d4" },
];

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ManagedUser[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedUserForSheet, setSelectedUserForSheet] = useState<ManagedUser | null>(null);
  const [isUserSheetOpen, setIsUserSheetOpen] = useState(false);

  // Simulate data fetch with skeleton loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setData([
        { id: 1, name: "Dr. Alice Smith", email: "doctor@hospital.com", role: "Doctor", department: "Cardiology", joined_date: "2025-01-15", status: "Active" },
        { id: 2, name: "Dr. David Johnson", email: "david@hospital.com", role: "Doctor", department: "Neurology", joined_date: "2025-02-10", status: "Active" },
        { id: 3, name: "Dr. Elena Rostova", email: "elena@hospital.com", role: "Doctor", department: "Orthopedics", joined_date: "2025-03-01", status: "Active" },
        { id: 4, name: "Dr. Robert Patel", email: "robert@hospital.com", role: "Doctor", department: "Pediatrics", joined_date: "2025-04-12", status: "Active" },
        { id: 5, name: "Bob Jones", email: "patient@example.com", role: "Patient", department: "Cardiology", joined_date: "2025-05-18", status: "Active" },
        { id: 6, name: "Emma Watson", email: "emma@example.com", role: "Patient", department: "Neurology", joined_date: "2025-06-22", status: "Active" },
        { id: 7, name: "Marcus Wright", email: "marcus@example.com", role: "Patient", department: "Orthopedics", joined_date: "2025-07-05", status: "Blacklisted" },
        { id: 8, name: "Sophia Davis", email: "sophia@example.com", role: "Patient", department: "Pediatrics", joined_date: "2025-08-14", status: "Active" },
        { id: 9, name: "Liam Miller", email: "liam@example.com", role: "Patient", department: "General Medicine", joined_date: "2025-09-02", status: "Active" },
        { id: 10, name: "Olivia Brown", email: "olivia@example.com", role: "Patient", department: "Cardiology", joined_date: "2025-10-11", status: "Active" },
      ]);
      setLoading(false);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  const toggleStatus = (id: number) => {
    setData((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const newStatus = u.status === "Active" ? "Blacklisted" : "Active";
          if (newStatus === "Blacklisted") {
            toast.warning(`User ${u.name} has been blacklisted.`);
          } else {
            toast.success(`User ${u.name} has been restored to active status.`);
          }
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  // Filter by role
  const filteredData = useMemo(() => {
    if (roleFilter === "All") return data;
    return data.filter((item) => item.role === roleFilter);
  }, [data, roleFilter]);

  // TanStack Table Column Definitions
  const columns = useMemo<ColumnDef<ManagedUser>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent font-semibold text-xs"
          >
            User Details
            <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          const user = row.original;
          const initials = user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2);
          return (
            <button
              type="button"
              onClick={() => {
                setSelectedUserForSheet(user);
                setIsUserSheetOpen(true);
              }}
              className="flex items-center gap-3 text-left group hover:opacity-85 transition-opacity cursor-pointer"
            >
              <Avatar className="h-8 w-8 text-xs font-bold border border-slate-200 dark:border-slate-700">
                <AvatarFallback className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-slate-900 dark:text-white leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1">
                  {user.name}
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-[11px] text-slate-400 mt-1">{user.email}</p>
              </div>
            </button>
          );
        },
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <Badge variant={row.original.role === "Doctor" ? "doctor" : "patient"} className="text-[10px]">
            {row.original.role}
          </Badge>
        ),
      },
      {
        accessorKey: "department",
        header: "Department",
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            {row.original.department}
          </span>
        ),
      },
      {
        accessorKey: "joined_date",
        header: "Joined Date",
        cell: ({ row }) => (
          <span className="text-slate-400 font-mono text-[11px]">{row.original.joined_date}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Account Status",
        cell: ({ row }) => {
          const isAct = row.original.status === "Active";
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isAct
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
              }`}
            >
              {row.original.status}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const u = row.original;
          const isAct = u.status === "Active";
          return (
            <div className="text-right">
              <Button
                variant={isAct ? "destructive" : "outline"}
                size="sm"
                className="h-7 text-[11px] font-semibold gap-1"
                onClick={() => toggleStatus(u.id)}
              >
                {isAct ? (
                  <>
                    <UserX className="h-3 w-3" />
                    Blacklist
                  </>
                ) : (
                  <>
                    <UserCheck className="h-3 w-3 text-emerald-600" />
                    Restore
                  </>
                )}
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  // TanStack Table Instance
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
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Admin Analytics & Oversight
            </h1>
            <Badge variant="admin">System Operations</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visual metrics, clinical workload trends, and staff/patient management.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              toast.success("Dashboard metrics refreshed");
            }, 500);
          }}
          className="gap-2 text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Stats
        </Button>
      </div>

      {/* Aggregate KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </>
        ) : (
          <>
            <Card className="border-blue-100 dark:border-slate-800">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff Doctors</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">14</h3>
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">+2 hired this month</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <Stethoscope className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-100 dark:border-slate-800">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Patients</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">128</h3>
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">98% active status</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-100 dark:border-slate-800">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">7-Day Appointments</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">144</h3>
                  <p className="text-[11px] text-purple-600 font-medium mt-1">126 completed</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                  <CalendarCheck className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-100 dark:border-slate-800">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital Departments</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">8</h3>
                  <p className="text-[11px] text-amber-600 font-medium mt-1">100% operational</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <Building2 className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Visual Overview Charts: Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Appointments over the last 7 days (2 cols) */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Appointments Over the Last 7 Days
              </CardTitle>
              <CardDescription className="text-xs">
                Total scheduled, completed consultations, and cancellations per day.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px]">Real-Time</Badge>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <Skeleton className="h-72 w-full rounded-xl" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={appointments7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAppts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <Area
                      type="monotone"
                      dataKey="appointments"
                      name="Total Booked"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorAppts)"
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      name="Completed"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorComp)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Patient distribution by Department (1 col) */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-purple-600" />
              Patient Distribution by Department
            </CardTitle>
            <CardDescription className="text-xs">Active caseload breakdown across specialties.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <Skeleton className="h-72 w-full rounded-xl" />
            ) : (
              <div className="h-72 w-full flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={departmentDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="patients"
                    >
                      {departmentDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} Patients`, name]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Compact Legend */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full text-[11px] pt-2">
                  {departmentDistributionData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 truncate">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600 dark:text-slate-300 truncate">{d.name}</span>
                      <span className="font-bold ml-auto text-slate-900 dark:text-white">{d.patients}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TanStack Table: Paginated, Filterable User Directory */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-base">Staff & Patient Directory (TanStack Table)</CardTitle>
            <CardDescription className="text-xs">
              Search, filter by role, sort columns, and toggle active / blacklist privileges.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
              {["All", "Doctor", "Patient"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    roleFilter === r
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {r === "All" ? "All Users" : `${r}s`}
                </button>
              ))}
            </div>

            {/* Global Search Bar */}
            <div className="relative w-48 sm:w-60">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name, email, dept..."
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto w-full scrollbar-thin">
                <Table className="min-w-full">
                  <TableHeader className="bg-slate-50/70 dark:bg-slate-800/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length > 0 ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center text-slate-400 text-xs">
                          No matching records found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* TanStack Table Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 text-xs text-slate-500">
                <div>
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    filteredData.length
                  )}{" "}
                  of {filteredData.length} entries
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="h-8 gap-1 text-xs"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SLIDE-OUT SHEET: USER MINI-PROFILE                                        */}
      {/* ========================================================================= */}
      <Sheet open={isUserSheetOpen} onOpenChange={setIsUserSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0 flex flex-col bg-white dark:bg-slate-900">
          {selectedUserForSheet && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                {/* Header Banner */}
                <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <Avatar className="h-12 w-12 border-2 border-blue-500/30">
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-black text-sm">
                          {selectedUserForSheet.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <SheetTitle className="text-xl font-black text-slate-900 dark:text-white">
                            {selectedUserForSheet.name}
                          </SheetTitle>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            #{selectedUserForSheet.id}
                          </Badge>
                        </div>
                        <SheetDescription className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Mail className="h-3 w-3" />
                          {selectedUserForSheet.email}
                        </SheetDescription>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        selectedUserForSheet.status === "Active"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {selectedUserForSheet.status}
                    </span>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="p-6 space-y-5 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Role</span>
                      <strong className="text-slate-900 dark:text-white font-semibold">
                        {selectedUserForSheet.role}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Clinical Department</span>
                      <strong className="text-slate-900 dark:text-white font-semibold">
                        {selectedUserForSheet.department}
                      </strong>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Registration Date</span>
                    <p className="font-mono text-slate-700 dark:text-slate-300">
                      Member since {selectedUserForSheet.joined_date}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-1.5">
                    <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                      Administrative Control
                    </span>
                    <p className="text-blue-700 dark:text-blue-300 text-[11px]">
                      Admins can toggle access permissions, investigate security flags, or blacklist accounts from the hospital registry.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUserSheetOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  variant={selectedUserForSheet.status === "Active" ? "destructive" : "default"}
                  onClick={() => {
                    toggleStatus(selectedUserForSheet.id);
                    setSelectedUserForSheet((prev) =>
                      prev
                        ? { ...prev, status: prev.status === "Active" ? "Blacklisted" : "Active" }
                        : null
                    );
                  }}
                  className="text-xs font-bold gap-1.5"
                >
                  {selectedUserForSheet.status === "Active" ? (
                    <>
                      <UserX className="h-3.5 w-3.5" />
                      Blacklist Account
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      Restore Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
