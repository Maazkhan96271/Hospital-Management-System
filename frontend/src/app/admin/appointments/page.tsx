"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  CalendarCheck,
  Search,
  Clock,
  User,
  Stethoscope,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_datetime: string;
  duration_minutes: number;
  status: "Booked" | "Completed" | "Cancelled";
  created_at: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  // SWR: fetch all appointments (FastAPI backend /api/appointments/)
  const {
    data: appointments,
    isLoading,
    error,
    mutate,
  } = useSWR<Appointment[]>("/api/appointments/", () =>
    apiFetch<Appointment[]>("/api/appointments/")
  );

  // Filter appointments by tab and search
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];

    return appointments.filter((appt) => {
      // Status filter
      if (activeTab === "UPCOMING" && appt.status !== "Booked") return false;
      if (activeTab === "COMPLETED" && appt.status !== "Completed") return false;
      if (activeTab === "CANCELLED" && appt.status !== "Cancelled") return false;

      // Text search
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const patientName = `${appt.patient?.first_name || ""} ${appt.patient?.last_name || ""}`.toLowerCase();
      const patientEmail = (appt.patient?.email || "").toLowerCase();
      const idMatch = String(appt.id).includes(term);
      const doctorIdMatch = String(appt.doctor_id).includes(term);
      const diagnosisMatch = (appt.treatment_record?.diagnosis || "").toLowerCase().includes(term);

      return (
        patientName.includes(term) ||
        patientEmail.includes(term) ||
        idMatch ||
        doctorIdMatch ||
        diagnosisMatch
      );
    });
  }, [appointments, activeTab, searchTerm]);

  // Status Counts
  const counts = useMemo(() => {
    const list = appointments || [];
    return {
      all: list.length,
      upcoming: list.filter((a) => a.status === "Booked").length,
      completed: list.filter((a) => a.status === "Completed").length,
      cancelled: list.filter((a) => a.status === "Cancelled").length,
    };
  }, [appointments]);

  // Cancel Appointment handler
  const handleCancel = async (apptId: number) => {
    if (!confirm(`Are you sure you want to cancel appointment #${apptId}?`)) return;

    try {
      setIsUpdating(apptId);
      await apiFetch<Appointment>(`/api/appointments/${apptId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Cancelled" }),
      });
      toast.success(`Appointment #${apptId} has been cancelled.`);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel appointment.");
    } finally {
      setIsUpdating(null);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: Appointment["status"]) => {
    switch (status) {
      case "Completed":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-semibold gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "Booked":
        return (
          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-semibold gap-1">
            <AlertTriangle className="h-3 w-3" />
            Upcoming
          </Badge>
        );
      case "Cancelled":
        return (
          <Badge className="bg-red-50 text-red-700 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800 font-semibold gap-1">
            <XCircle className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Hospital Appointments
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Unified view of all patient bookings, upcoming consultations, and completed medical treatment records.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          className="self-start md:self-auto gap-1.5 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Agenda
        </Button>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "ALL"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          All Consultations
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/50 dark:bg-slate-800">
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("UPCOMING")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "UPCOMING"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          Upcoming (Booked)
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200">
            {counts.upcoming}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("COMPLETED")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "COMPLETED"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          Completed Treatments
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
            {counts.completed}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("CANCELLED")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "CANCELLED"
              ? "bg-red-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <XCircle className="h-3.5 w-3.5 text-red-500" />
          Cancelled
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200">
            {counts.cancelled}
          </span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by patient, doctor ID, appointment #ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-white dark:bg-slate-900"
        />
      </div>

      {/* Appointments Unified Data Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
              <TableRow>
                <TableHead className="w-20 text-xs font-semibold">Appt ID</TableHead>
                <TableHead className="text-xs font-semibold">Patient</TableHead>
                <TableHead className="text-xs font-semibold">Attending Doctor</TableHead>
                <TableHead className="text-xs font-semibold">Date & Time</TableHead>
                <TableHead className="text-xs font-semibold">Duration</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Diagnosis / Notes</TableHead>
                <TableHead className="text-right text-xs font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.map((appt) => {
                  const dateObj = new Date(appt.appointment_datetime);
                  const formattedDate = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const formattedTime = dateObj.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <TableRow key={appt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <TableCell className="font-mono text-xs font-bold text-slate-500">
                        #{appt.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {appt.patient
                              ? `${appt.patient.first_name} ${appt.patient.last_name}`
                              : `Patient #${appt.patient_id}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                          <Stethoscope className="h-3.5 w-3.5 text-blue-500" />
                          <span>Physician #{appt.doctor_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {formattedDate}
                          </div>
                          <div className="text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {formattedTime}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {appt.duration_minutes || 30} mins
                      </TableCell>
                      <TableCell>{renderStatusBadge(appt.status)}</TableCell>
                      <TableCell className="max-w-xs">
                        {appt.treatment_record ? (
                          <div className="text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {appt.treatment_record.diagnosis}
                            </span>
                            {appt.treatment_record.prescription?.length > 0 && (
                              <span className="text-[11px] text-slate-500 block truncate">
                                Rx: {appt.treatment_record.prescription.join(", ")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">None recorded</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {appt.status === "Booked" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isUpdating === appt.id}
                            onClick={() => handleCancel(appt.id)}
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 border-red-200 dark:border-red-900/60"
                          >
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-36 text-center text-slate-500">
                    <CalendarCheck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    No appointments match the selected filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
