"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  CalendarCheck,
  Search,
  Clock,
  User,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Layers,
  FileText,
  Pill,
  RefreshCw,
  Phone,
  Mail,
  Receipt,
  Eye,
  Check,
  Video,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_datetime: string;
  duration_minutes: number;
  status: "Booked" | "Waiting" | "In-Progress" | "Completed" | "Cancelled";
  consultation_type?: "In-Person" | "Video";
  payment_status?: "Unpaid" | "Paid" | "Partial" | "Refunded";
  notes?: string;
  created_at: string;
  doctor?: {
    id: number;
    specialization?: string;
    user?: {
      first_name: string;
      last_name: string;
      email?: string;
    };
  } | null;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    phone?: string;
  };
  treatment_record?: {
    id: number;
    diagnosis: string;
    prescription: string[];
    detailed_notes?: string;
  } | null;
}

export default function AdminAppointmentsPage() {
  const [activeTab, setActiveTab] = useState<"ALL" | "UPCOMING" | "COMPLETED" | "CANCELLED">("ALL");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  // SWR: fetch all appointments (FastAPI backend /api/appointments/)
  const {
    data: appointments,
    isLoading,
    mutate,
  } = useSWR<Appointment[]>("/api/appointments/", () =>
    apiFetch<Appointment[]>("/api/appointments/")
  );

  // Filter appointments by active status tab
  const tabFilteredAppointments = useMemo(() => {
    if (!appointments) return [];

    return appointments.filter((appt) => {
      if (activeTab === "UPCOMING" && appt.status !== "Booked" && appt.status !== "Waiting") return false;
      if (activeTab === "COMPLETED" && appt.status !== "Completed") return false;
      if (activeTab === "CANCELLED" && appt.status !== "Cancelled") return false;
      return true;
    });
  }, [appointments, activeTab]);

  // Status Counts
  const counts = useMemo(() => {
    const list = appointments || [];
    return {
      all: list.length,
      upcoming: list.filter((a) => a.status === "Booked" || a.status === "Waiting").length,
      completed: list.filter((a) => a.status === "Completed").length,
      cancelled: list.filter((a) => a.status === "Cancelled").length,
    };
  }, [appointments]);

  // Cancel Appointment handler
  const handleCancel = async (apptId: number) => {
    if (!confirm(`Are you sure you want to cancel appointment #${apptId}?`)) return;

    try {
      setIsUpdating(apptId);
      await apiFetch(`/api/appointments/${apptId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Cancelled" }),
      });

      toast.success("Appointment Cancelled", {
        description: `Appointment #${apptId} has been successfully cancelled.`,
      });

      mutate();
      if (selectedAppointment?.id === apptId) {
        setSelectedAppointment((prev) => (prev ? { ...prev, status: "Cancelled" } : null));
      }
    } catch (err: any) {
      toast.error("Cancellation Failed", {
        description: err.message || "Failed to cancel appointment.",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  // Status Badge Renderer with consistent enterprise color-coding
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 font-bold text-[10px] gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Completed
          </Badge>
        );
      case "Waiting":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-0 font-bold text-[10px] gap-1">
            <Clock className="h-3 w-3 text-blue-600 animate-pulse" />
            Waiting in Lobby
          </Badge>
        );
      case "In-Progress":
        return (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-0 font-bold text-[10px] gap-1">
            <Clock className="h-3 w-3 text-purple-600" />
            In-Progress
          </Badge>
        );
      case "Booked":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 font-bold text-[10px] gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            Booked
          </Badge>
        );
      case "Cancelled":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-0 font-bold text-[10px] gap-1">
            <XCircle className="h-3 w-3 text-red-600" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Open Slide-out Sheet for appointment
  const handleOpenSheet = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setIsSheetOpen(true);
  };

  // DataTable column definitions
  const columns: Column<Appointment>[] = [
    {
      header: "Appt #",
      accessorKey: "id",
      sortable: true,
      className: "font-mono font-bold text-slate-500 w-24",
      cell: (row) => `#${row.id}`,
    },
    {
      header: "Patient Name",
      accessorFn: (row) =>
        row.patient ? `${row.patient.first_name} ${row.patient.last_name}` : `Patient #${row.patient_id}`,
      sortable: true,
      cell: (row) => {
        const name = row.patient
          ? `${row.patient.first_name} ${row.patient.last_name}`
          : `Patient #${row.patient_id}`;
        const initials = row.patient
          ? `${row.patient.first_name?.[0] || ""}${row.patient.last_name?.[0] || ""}`.toUpperCase()
          : "PT";
        return (
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 border border-blue-500/20 bg-blue-50 dark:bg-blue-950/50">
              <AvatarFallback className="text-blue-700 dark:text-blue-300 font-bold text-xs">
                {initials || "PT"}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                {name}
              </span>
              <span className="block text-[11px] text-slate-400">ID: #{row.patient_id}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: "Attending Doctor",
      accessorKey: "doctor_id",
      sortable: true,
      cell: (row) => {
        const docName = row.doctor ? `Dr. ${row.doctor.user?.first_name || ""} ${row.doctor.user?.last_name || ""}`.trim() : `Dr. #${row.doctor_id}`;
        const docInitials = row.doctor?.user ? `${row.doctor.user.first_name?.[0] || ""}${row.doctor.user.last_name?.[0] || ""}`.toUpperCase() : "DR";
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/50">
              <AvatarFallback className="text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                {docInitials || "DR"}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
              {docName}
            </span>
          </div>
        );
      },
    },
    {
      header: "Date & Time",
      accessorKey: "appointment_datetime",
      sortable: true,
      cell: (row) => {
        const d = new Date(row.appointment_datetime);
        return (
          <div className="space-y-0.5">
            <span className="font-medium text-slate-900 dark:text-white flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              {d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="text-slate-500 flex items-center gap-1 text-[11px]">
              <Clock className="h-3 w-3 text-slate-400" />
              {d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      sortable: true,
      cell: (row) => renderStatusBadge(row.status),
    },
    {
      header: "Mode & Payment",
      accessorKey: "consultation_type",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col gap-1 items-start">
          {row.consultation_type === "Video" ? (
            <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-0 text-[10px] gap-1">
              <Video className="h-2.5 w-2.5" /> Video
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] gap-1 text-slate-500">
              <Building2 className="h-2.5 w-2.5" /> In-Person
            </Badge>
          )}
          <Badge
            className={
              row.payment_status === "Paid"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px]"
            }
          >
            {row.payment_status || "Unpaid"}
          </Badge>
        </div>
      ),
    },
    {
      header: "Diagnosis / Notes",
      accessorKey: "treatment_record.diagnosis",
      sortable: false,
      className: "max-w-xs",
      cell: (row) => (
        <span className="text-slate-600 dark:text-slate-300 line-clamp-1">
          {row.treatment_record?.diagnosis || row.notes || "Standard clinical consultation"}
        </span>
      ),
    },
    {
      header: "Action",
      sortable: false,
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenSheet(row);
          }}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 h-8 gap-1"
        >
          <Eye className="h-3.5 w-3.5" />
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Hospital Appointments
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Enterprise appointments directory with instant search, sorting, and offcanvas clinical sheets.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          className="self-start md:self-auto gap-1.5 text-xs font-semibold h-9"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Agenda
        </Button>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "ALL"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          All Consultations
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/60 dark:bg-slate-800 font-mono">
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("UPCOMING")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "UPCOMING"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-amber-50 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          Upcoming (Booked)
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-mono">
            {counts.upcoming}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("COMPLETED")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "COMPLETED"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          Completed Treatments
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-mono">
            {counts.completed}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("CANCELLED")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "CANCELLED"
              ? "bg-red-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-red-50 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <XCircle className="h-3.5 w-3.5 text-red-500" />
          Cancelled
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 font-mono">
            {counts.cancelled}
          </span>
        </button>
      </div>

      {/* Advanced Data Table with Sorting, Search, and Pagination */}
      <DataTable
        columns={columns}
        data={tabFilteredAppointments}
        searchPlaceholder="Instant search patient, doctor, diagnosis..."
        searchableKeys={["id", "doctor_id", "status", "notes"]}
        defaultPageSize={10}
        isLoading={isLoading}
        onRowClick={(row) => handleOpenSheet(row)}
      />

      {/* ========================================================================= */}
      {/* SLIDE-OUT PANEL (OFFCANVAS / SHEET) FOR CLINICAL & PATIENT ENCOUNTER      */}
      {/* ========================================================================= */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-white dark:bg-slate-900 p-6 space-y-6">
          {selectedAppointment && (
            <>
              <SheetHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <SheetTitle className="text-xl font-black text-slate-900 dark:text-white">
                      Encounter #{selectedAppointment.id}
                    </SheetTitle>
                    <SheetDescription className="text-xs">
                      Consultation details and patient clinical record.
                    </SheetDescription>
                  </div>
                  {renderStatusBadge(selectedAppointment.status)}
                </div>
              </SheetHeader>

              {/* Patient Profile Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Patient Mini-Profile
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-sm flex items-center justify-center">
                    {(selectedAppointment.patient?.first_name?.[0] || "P").toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedAppointment.patient
                        ? `${selectedAppointment.patient.first_name} ${selectedAppointment.patient.last_name}`
                        : `Patient #${selectedAppointment.patient_id}`}
                    </h3>
                    <p className="text-slate-500 font-mono text-[11px]">
                      Patient ID: #{selectedAppointment.patient_id}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Mail className="h-3 w-3 text-slate-400" />
                    <span className="truncate">{selectedAppointment.patient?.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <span>{selectedAppointment.patient?.phone || "+1 (555) 000-0000"}</span>
                  </div>
                </div>
              </div>

              {/* Appointment Schedule Info */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Schedule Details
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-400 text-[11px]">Attending Physician</p>
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                      <Stethoscope className="h-3.5 w-3.5 text-blue-500" />
                      Doctor #{selectedAppointment.doctor_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[11px]">Duration</p>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedAppointment.duration_minutes || 30} Minutes
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[11px]">Consultation Date</p>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {new Date(selectedAppointment.appointment_datetime).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[11px]">Scheduled Time</p>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {new Date(selectedAppointment.appointment_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[11px]">Consultation Mode</p>
                    <div className="mt-0.5">
                      {selectedAppointment.consultation_type === "Video" ? (
                        <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-0 text-[10px] gap-1">
                          <Video className="h-3 w-3" /> Video Consult
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1 text-slate-500">
                          <Building2 className="h-3 w-3" /> Clinic Visit
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[11px]">Payment Status</p>
                    <div className="mt-0.5">
                      <Badge
                        className={
                          selectedAppointment.payment_status === "Paid"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px]"
                        }
                      >
                        {selectedAppointment.payment_status || "Unpaid"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Treatment & Clinical Record */}
              <div className="space-y-3 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Clinical Examination & Findings
                </span>
                {selectedAppointment.treatment_record ? (
                  <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">Diagnosis</p>
                      <p className="font-bold text-sm text-emerald-950 dark:text-emerald-100 mt-0.5">
                        {selectedAppointment.treatment_record.diagnosis}
                      </p>
                    </div>

                    {selectedAppointment.treatment_record.prescription && selectedAppointment.treatment_record.prescription.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 mb-1">
                          Prescription Formulations
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedAppointment.treatment_record.prescription.map((rx, rIdx) => (
                            <Badge key={rIdx} variant="secondary" className="text-[10px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                              <Pill className="h-3 w-3 mr-1 text-purple-500" />
                              {rx}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedAppointment.treatment_record.detailed_notes && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                        Notes: {selectedAppointment.treatment_record.detailed_notes}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed text-slate-400 text-center">
                    No clinical treatment record submitted yet.
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setIsSheetOpen(false)}>
                  Close Panel
                </Button>

                {selectedAppointment.status === "Booked" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isUpdating === selectedAppointment.id}
                    onClick={() => handleCancel(selectedAppointment.id)}
                    className="text-xs font-bold"
                  >
                    Cancel Appointment
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
