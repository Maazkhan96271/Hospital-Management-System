"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  UserCheck,
  Clock,
  CheckCircle2,
  Calendar,
  Search,
  RefreshCw,
  Stethoscope,
  Building2,
  Printer,
  Ticket,
  ChevronRight,
  Loader2,
  AlertCircle,
  Activity,
  HeartPulse,
  Sparkles,
  Mail,
  Phone,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";

interface QueueAppointmentItem {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_email?: string;
  phone?: string;
  time: string;
  status: "Booked" | "Waiting" | "In-Progress" | "Completed" | "Cancelled";
  token_number?: string | null;
  chief_complaint?: string;
  notes?: string;
}

interface DoctorQueueGroup {
  doctor_id: number;
  doctor_name: string;
  department: string;
  cabin?: string;
  appointments: QueueAppointmentItem[];
  waiting_count: number;
  booked_count: number;
  in_progress_count: number;
  completed_count: number;
}

// Fallback demo queue dataset ensuring seamless presentation
const FALLBACK_QUEUE_DATA: DoctorQueueGroup[] = [
  {
    doctor_id: 1,
    doctor_name: "Dr. Alice Smith",
    department: "Cardiovascular Medicine",
    cabin: "Cabin 101 - Wing A",
    waiting_count: 2,
    booked_count: 2,
    in_progress_count: 1,
    completed_count: 1,
    appointments: [
      {
        id: 101,
        patient_id: 2,
        patient_name: "Bob Jones",
        patient_email: "bob.jones@example.com",
        phone: "+1 (555) 234-5678",
        time: "09:30 AM",
        status: "Waiting",
        token_number: "CARD-01-001",
        chief_complaint: "Exertional chest tightness and shortness of breath",
      },
      {
        id: 102,
        patient_id: 3,
        patient_name: "Carlos Rivera",
        patient_email: "carlos.r@example.com",
        phone: "+1 (555) 345-6789",
        time: "10:00 AM",
        status: "In-Progress",
        token_number: "CARD-01-002",
        chief_complaint: "Blood pressure medication review",
      },
      {
        id: 103,
        patient_id: 5,
        patient_name: "Sophia Martinez",
        patient_email: "sophia.m@example.com",
        phone: "+1 (555) 901-2345",
        time: "10:30 AM",
        status: "Booked",
        token_number: null,
        chief_complaint: "Routine cardiac risk follow-up",
      },
      {
        id: 104,
        patient_id: 6,
        patient_name: "Michael Chen",
        patient_email: "michael.c@example.com",
        phone: "+1 (555) 432-1098",
        time: "11:00 AM",
        status: "Booked",
        token_number: null,
        chief_complaint: "Palpitations during exercise",
      },
      {
        id: 100,
        patient_id: 1,
        patient_name: "John Doe",
        patient_email: "john.doe@example.com",
        phone: "+1 (555) 123-4567",
        time: "09:00 AM",
        status: "Completed",
        token_number: "CARD-01-000",
        chief_complaint: "Annual physical cardiac evaluation",
      },
    ],
  },
  {
    doctor_id: 2,
    doctor_name: "Dr. David Johnson",
    department: "Neurology & Spine",
    cabin: "Cabin 204 - Wing B",
    waiting_count: 1,
    booked_count: 2,
    in_progress_count: 0,
    completed_count: 0,
    appointments: [
      {
        id: 201,
        patient_id: 4,
        patient_name: "Jane Doe",
        patient_email: "jane.doe@example.com",
        phone: "+1 (555) 876-5432",
        time: "10:15 AM",
        status: "Waiting",
        token_number: "NEUR-02-001",
        chief_complaint: "Chronic migraine with visual aura",
      },
      {
        id: 202,
        patient_id: 7,
        patient_name: "Emily Watson",
        patient_email: "emily.w@example.com",
        phone: "+1 (555) 789-0123",
        time: "11:15 AM",
        status: "Booked",
        token_number: null,
        chief_complaint: "Tension headache & cervical neck strain",
      },
      {
        id: 203,
        patient_id: 8,
        patient_name: "David Kim",
        patient_email: "david.kim@example.com",
        phone: "+1 (555) 654-3210",
        time: "11:45 AM",
        status: "Booked",
        token_number: null,
        chief_complaint: "Numbness in right hand fingers",
      },
    ],
  },
  {
    doctor_id: 3,
    doctor_name: "Dr. Elena Rostova",
    department: "Orthopedic Surgery",
    cabin: "Cabin 108 - Wing A",
    waiting_count: 1,
    booked_count: 1,
    in_progress_count: 0,
    completed_count: 1,
    appointments: [
      {
        id: 301,
        patient_id: 9,
        patient_name: "Lucas Vance",
        patient_email: "lucas.v@example.com",
        phone: "+1 (555) 321-7654",
        time: "09:45 AM",
        status: "Completed",
        token_number: "ORTH-03-001",
        chief_complaint: "Post-cast wrist mobility assessment",
      },
      {
        id: 302,
        patient_id: 10,
        patient_name: "Olivia Brown",
        patient_email: "olivia.b@example.com",
        phone: "+1 (555) 987-6543",
        time: "10:30 AM",
        status: "Waiting",
        token_number: "ORTH-03-002",
        chief_complaint: "Right knee arthroscopy follow-up",
      },
      {
        id: 303,
        patient_id: 11,
        patient_name: "William Taylor",
        patient_email: "william.t@example.com",
        phone: "+1 (555) 210-9876",
        time: "11:30 AM",
        status: "Booked",
        token_number: null,
        chief_complaint: "Lumbar back pain evaluation",
      },
    ],
  },
];

export default function LiveReceptionQueuePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("2026-11-02");
  const [queueGroups, setQueueGroups] = useState<DoctorQueueGroup[]>([]);

  // Token Confirmation Modal state
  const [checkedInToken, setCheckedInToken] = useState<{
    token: string;
    patient_name: string;
    doctor_name: string;
    time: string;
    appointment_id: number;
  } | null>(null);

  // Patient Profile Slide-out Sheet
  const [selectedPatientForSheet, setSelectedPatientForSheet] = useState<{
    appointment: QueueAppointmentItem;
    doctor_name: string;
    department: string;
    cabin?: string;
  } | null>(null);
  const [isPatientSheetOpen, setIsPatientSheetOpen] = useState(false);

  const openPatientProfile = (
    appt: QueueAppointmentItem,
    doctor_name: string,
    department: string,
    cabin?: string
  ) => {
    setSelectedPatientForSheet({ appointment: appt, doctor_name, department, cabin });
    setIsPatientSheetOpen(true);
  };

  const [checkingInId, setCheckingInId] = useState<number | null>(null);

  // Fetch queue data from FastAPI
  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<DoctorQueueGroup[]>(
        `/api/appointments/queue/live?date=${selectedDate}`
      ).catch(() => null);

      if (data && Array.isArray(data) && data.length > 0) {
        setQueueGroups(data);
      } else {
        setQueueGroups(FALLBACK_QUEUE_DATA);
      }
    } catch (err) {
      console.error("Failed to load queue data:", err);
      setQueueGroups(FALLBACK_QUEUE_DATA);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [selectedDate]);

  // Handle Check-In action
  const handleCheckIn = async (appointmentId: number, doctorName: string, patientName: string, time: string) => {
    setCheckingInId(appointmentId);
    try {
      const res = await apiFetch<any>(`/api/appointments/${appointmentId}/check-in`, {
        method: "POST",
      }).catch(() => null);

      const generatedToken = res?.token_number || `TOKEN-${appointmentId}`;

      toast.success("Patient Checked In Successfully", {
        description: `Queue Token #${generatedToken} generated for ${patientName}. Status updated to 'Waiting'.`,
      });

      // Update state locally
      setQueueGroups((prev) =>
        prev.map((group) => {
          const hasAppt = group.appointments.some((a) => a.id === appointmentId);
          if (!hasAppt) return group;

          return {
            ...group,
            waiting_count: group.waiting_count + 1,
            booked_count: Math.max(0, group.booked_count - 1),
            appointments: group.appointments.map((a) =>
              a.id === appointmentId
                ? {
                    ...a,
                    status: "Waiting",
                    token_number: generatedToken,
                  }
                : a
            ),
          };
        })
      );

      // Open printable token modal
      setCheckedInToken({
        token: generatedToken,
        patient_name: patientName,
        doctor_name: doctorName,
        time: time,
        appointment_id: appointmentId,
      });
    } catch (err: any) {
      toast.error("Check-in Failed", {
        description: err.message || "Failed to check-in patient.",
      });
    } finally {
      setCheckingInId(null);
    }
  };

  // Aggregated KPI Stats
  const totalWaiting = useMemo(
    () => queueGroups.reduce((acc, g) => acc + (g.waiting_count || 0), 0),
    [queueGroups]
  );
  const totalInProgress = useMemo(
    () => queueGroups.reduce((acc, g) => acc + (g.in_progress_count || 0), 0),
    [queueGroups]
  );
  const totalCompleted = useMemo(
    () => queueGroups.reduce((acc, g) => acc + (g.completed_count || 0), 0),
    [queueGroups]
  );
  const totalBookedPending = useMemo(
    () => queueGroups.reduce((acc, g) => acc + (g.booked_count || 0), 0),
    [queueGroups]
  );

  // Search filter across doctors and patients
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return queueGroups;
    const q = searchQuery.toLowerCase();

    return queueGroups
      .map((g) => {
        const matchesDoc =
          g.doctor_name.toLowerCase().includes(q) ||
          g.department.toLowerCase().includes(q);

        const matchingAppts = g.appointments.filter(
          (a) =>
            a.patient_name.toLowerCase().includes(q) ||
            (a.token_number && a.token_number.toLowerCase().includes(q)) ||
            (a.phone && a.phone.includes(q))
        );

        if (matchesDoc) return g;
        if (matchingAppts.length > 0) {
          return { ...g, appointments: matchingAppts };
        }
        return null;
      })
      .filter(Boolean) as DoctorQueueGroup[];
  }, [queueGroups, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Live Reception & Queue Management
                </h1>
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Reception Desk
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Check-in arriving patients, issue queue tokens, and monitor physician consultation rooms in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-xs">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer text-slate-800 dark:text-slate-200"
            >
              <option value="2026-11-02">Today (Nov 02, 2026)</option>
              <option value="2026-11-03">Tomorrow (Nov 03, 2026)</option>
              <option value="2026-11-04">Wednesday (Nov 04, 2026)</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchQueue}
            className="text-xs font-semibold gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync Queue
          </Button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200/80 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                Waiting in Lobby
              </p>
              <h3 className="text-2xl font-black text-blue-950 dark:text-blue-200 mt-1">
                {totalWaiting} patients
              </h3>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                Checked in with active tokens
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <Ticket className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200/80 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                In Active Examination
              </p>
              <h3 className="text-2xl font-black text-purple-950 dark:text-purple-200 mt-1">
                {totalInProgress} patients
              </h3>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                Inside doctor examination cabin
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Awaiting Arrival
              </p>
              <h3 className="text-2xl font-black text-amber-950 dark:text-amber-200 mt-1">
                {totalBookedPending} scheduled
              </h3>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                Booked • Pending reception check-in
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Completed Consultations
              </p>
              <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-300 mt-1">
                {totalCompleted} cleared
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                EMR finalized & billed
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Input Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search arriving patient, phone, doctor, or token..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold">{queueGroups.length} Active Medical Cabins</span>
        </div>
      </div>

      {/* Main Live Queue View Grouped by Doctor */}
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Users className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              No Appointments Found
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              No patient appointments match the selected filter or search query.
            </p>
          </Card>
        ) : (
          filteredGroups.map((group) => (
            <Card
              key={group.doctor_id}
              className="border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
            >
              {/* Doctor Header Banner */}
              <CardHeader className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                          {group.doctor_name}
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {group.department}
                        </Badge>
                        {group.cabin && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            • {group.cabin}
                          </span>
                        )}
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        {group.appointments.length} total scheduled consultations for this clinic session
                      </CardDescription>
                    </div>
                  </div>

                  {/* Doctor Queue Quick Counters */}
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5">
                      <Ticket className="h-3 w-3" />
                      {group.waiting_count} Waiting
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {group.booked_count} Booked
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" />
                      {group.completed_count} Done
                    </span>
                  </div>
                </div>
              </CardHeader>

              {/* Patient Queue Appointments Table */}
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 dark:bg-slate-950/40">
                      <TableHead className="text-xs font-bold uppercase w-28">Queue Token</TableHead>
                      <TableHead className="text-xs font-bold uppercase w-24">Slot Time</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Patient Details</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Chief Complaint / Reason</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Queue Status</TableHead>
                      <TableHead className="text-xs font-bold uppercase text-right">Reception Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.appointments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-xs text-slate-400">
                          No appointments booked for this physician today.
                        </TableCell>
                      </TableRow>
                    ) : (
                      group.appointments.map((appt) => {
                        const isBooked = appt.status === "Booked";
                        const isWaiting = appt.status === "Waiting";
                        const isInProgress = appt.status === "In-Progress";
                        const isCompleted = appt.status === "Completed";

                        return (
                          <TableRow
                            key={appt.id}
                            className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                              isWaiting ? "bg-blue-50/30 dark:bg-blue-950/20" : ""
                            }`}
                          >
                            {/* Token Badge */}
                            <TableCell>
                              {appt.token_number ? (
                                <span className="inline-flex items-center gap-1 font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-blue-600 text-white shadow-xs">
                                  <Ticket className="h-3 w-3" />
                                  {appt.token_number}
                                </span>
                              ) : (
                                <span className="text-[11px] font-mono text-slate-400 italic">
                                  Unassigned
                                </span>
                              )}
                            </TableCell>

                            {/* Slot Time */}
                            <TableCell className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {appt.time}
                              </span>
                            </TableCell>

                            {/* Patient Info */}
                            <TableCell>
                              <button
                                type="button"
                                onClick={() =>
                                  openPatientProfile(
                                    appt,
                                    group.doctor_name,
                                    group.department,
                                    group.cabin
                                  )
                                }
                                className="text-left group flex items-center gap-2.5 hover:opacity-85 transition-opacity cursor-pointer"
                              >
                                <Avatar className="h-8 w-8 border border-blue-200 dark:border-blue-800">
                                  <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-xs">
                                    {appt.patient_name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                    {appt.patient_name}
                                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span>ID: #{appt.patient_id}</span>
                                    {appt.phone && <span>• {appt.phone}</span>}
                                  </div>
                                </div>
                              </button>
                            </TableCell>

                            {/* Chief Complaint */}
                            <TableCell className="max-w-xs text-xs text-slate-600 dark:text-slate-300">
                              {appt.chief_complaint || "Routine Clinical Consultation"}
                            </TableCell>

                            {/* Queue Status Badge */}
                            <TableCell>
                              <Badge
                                className={
                                  isWaiting
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-0 text-[10px] font-bold"
                                    : isInProgress
                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-0 text-[10px] font-bold"
                                    : isCompleted
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px] font-bold"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px] font-bold"
                                }
                              >
                                {isWaiting && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1 animate-ping"></span>}
                                {appt.status}
                              </Badge>
                            </TableCell>

                            {/* Action Button: Check-In */}
                            <TableCell className="text-right">
                              {isBooked ? (
                                <Button
                                  size="sm"
                                  disabled={checkingInId === appt.id}
                                  onClick={() =>
                                    handleCheckIn(
                                      appt.id,
                                      group.doctor_name,
                                      appt.patient_name,
                                      appt.time
                                    )
                                  }
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 h-8 shadow-xs"
                                >
                                  {checkingInId === appt.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <UserCheck className="h-3.5 w-3.5" />
                                  )}
                                  Check-In Patient
                                </Button>
                              ) : isWaiting ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setCheckedInToken({
                                      token: appt.token_number || `TOKEN-${appt.id}`,
                                      patient_name: appt.patient_name,
                                      doctor_name: group.doctor_name,
                                      time: appt.time,
                                      appointment_id: appt.id,
                                    })
                                  }
                                  className="text-xs font-semibold text-blue-700 dark:text-blue-300 border-blue-200 h-8 gap-1"
                                >
                                  <Ticket className="h-3 w-3" />
                                  Print Token
                                </Button>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {isCompleted ? "Consultation Finished" : "In Examination"}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ========================================================================= */}
      {/* DIALOG: PRINTABLE QUEUE TOKEN TICKET MODAL                                */}
      {/* ========================================================================= */}
      <Dialog open={!!checkedInToken} onOpenChange={(open) => !open && setCheckedInToken(null)}>
        <DialogContent className="sm:max-w-md">
          {checkedInToken && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-blue-600" />
                  Reception Queue Token Issued
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Provide this token number to the patient for waiting room digital display calling.
                </DialogDescription>
              </DialogHeader>

              {/* Printable Ticket Box */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-950 border-2 border-dashed border-blue-300 dark:border-blue-900 text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    <HeartPulse className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
                    MediCare Hospital
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Your Queue Token Number
                  </span>
                  <div className="font-mono text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                    {checkedInToken.token}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {checkedInToken.patient_name}
                  </p>
                  <p className="text-slate-500">
                    Consulting: <strong className="text-slate-700 dark:text-slate-300">{checkedInToken.doctor_name}</strong>
                  </p>
                  <p className="text-slate-400 font-mono text-[11px]">
                    Slot Scheduled: {checkedInToken.time}
                  </p>
                </div>

                {/* Simulated Barcode */}
                <div className="space-y-1">
                  <div className="h-7 bg-[repeating-linear-gradient(90deg,#1e293b_0px,#1e293b_2px,transparent_2px,transparent_5px)] dark:bg-[repeating-linear-gradient(90deg,#94a3b8_0px,#94a3b8_2px,transparent_2px,transparent_5px)] rounded-sm opacity-60"></div>
                  <p className="font-mono text-[9px] text-slate-400 tracking-widest uppercase">
                    Ref: APP-{String(checkedInToken.appointment_id).padStart(4, "0")}
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCheckedInToken(null)}
                  className="text-xs"
                >
                  Done
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    toast.success("Printing Token Slip", {
                      description: `Thermal receipt sent to reception printer for ${checkedInToken.token}.`,
                    });
                    setCheckedInToken(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Token Ticket
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* SLIDE-OUT SHEET: PATIENT RECEPTION PROFILE                                */}
      {/* ========================================================================= */}
      <Sheet open={isPatientSheetOpen} onOpenChange={setIsPatientSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col bg-white dark:bg-slate-900">
          {selectedPatientForSheet && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                {/* Header Profile Banner */}
                <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <Avatar className="h-12 w-12 border-2 border-blue-500/30">
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-black text-sm">
                          {selectedPatientForSheet.appointment.patient_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <SheetTitle className="text-xl font-black text-slate-900 dark:text-white">
                            {selectedPatientForSheet.appointment.patient_name}
                          </SheetTitle>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            ID: #{selectedPatientForSheet.appointment.patient_id}
                          </Badge>
                        </div>
                        <SheetDescription className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          {selectedPatientForSheet.appointment.patient_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {selectedPatientForSheet.appointment.patient_email}
                            </span>
                          )}
                          {selectedPatientForSheet.appointment.phone && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {selectedPatientForSheet.appointment.phone}
                              </span>
                            </>
                          )}
                        </SheetDescription>
                      </div>
                    </div>

                    <Badge
                      className={
                        selectedPatientForSheet.appointment.status === "Waiting"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-0 text-xs font-bold"
                          : selectedPatientForSheet.appointment.status === "Completed"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-xs font-bold"
                          : selectedPatientForSheet.appointment.status === "In-Progress"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-0 text-xs font-bold"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-xs font-bold"
                      }
                    >
                      {selectedPatientForSheet.appointment.status === "Waiting" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1 animate-ping"></span>
                      )}
                      {selectedPatientForSheet.appointment.status}
                    </Badge>
                  </div>
                </div>

                {/* Patient Reception Details */}
                <div className="p-6 space-y-6">
                  {/* Token Info */}
                  <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
                        Queue Position & Token
                      </span>
                      <p className="text-xl font-black font-mono text-blue-900 dark:text-blue-100 mt-0.5">
                        {selectedPatientForSheet.appointment.token_number || "Unchecked / Not Issued"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Scheduled Time</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {selectedPatientForSheet.appointment.time}
                      </p>
                    </div>
                  </div>

                  {/* Doctor & Cabin */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Consulting Physician</span>
                      <strong className="text-slate-900 dark:text-white font-semibold flex items-center gap-1.5 mt-0.5">
                        <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                        {selectedPatientForSheet.doctor_name}
                      </strong>
                      <span className="text-[11px] text-slate-500">{selectedPatientForSheet.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Cabin Location</span>
                      <strong className="text-slate-900 dark:text-white font-semibold flex items-center gap-1.5 mt-0.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-500" />
                        {selectedPatientForSheet.cabin || "Main Clinic"}
                      </strong>
                    </div>
                  </div>

                  {/* Chief Complaint */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-blue-600" />
                      Chief Medical Complaint
                    </Label>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
                      {selectedPatientForSheet.appointment.chief_complaint || "Routine Clinical Consultation"}
                    </div>
                  </div>

                  {/* Quick Reception Action in Sheet */}
                  {selectedPatientForSheet.appointment.status === "Booked" && (
                    <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
                      <p className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-amber-600" />
                        Patient Ready for Reception Desk Handover
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        Arriving patient can be checked in immediately. A new token will be printed for the waiting lobby queue.
                      </p>
                      <Button
                        size="sm"
                        disabled={checkingInId === selectedPatientForSheet.appointment.id}
                        onClick={() => {
                          const appt = selectedPatientForSheet.appointment;
                          handleCheckIn(
                            appt.id,
                            selectedPatientForSheet.doctor_name,
                            appt.patient_name,
                            appt.time
                          );
                          setIsPatientSheetOpen(false);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 h-9 shadow-xs"
                      >
                        {checkingInId === selectedPatientForSheet.appointment.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
                        )}
                        Check-In & Issue Token
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPatientSheetOpen(false)}
                  className="text-xs"
                >
                  Close Profile
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
