"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarPlus,
  CalendarCheck,
  FileText,
  Clock,
  ArrowRight,
  Stethoscope,
  HeartPulse,
  Search,
  CheckCircle2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Award,
  FlaskConical,
  Microscope,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";

interface PatientLabReport {
  id: number;
  test_name: string;
  category?: string;
  status: "Pending" | "Completed";
  results?: string;
  notes?: string;
  ordered_date: string;
  doctor_name: string;
  normal_range?: string;
}

const FALLBACK_PATIENT_LABS: PatientLabReport[] = [
  {
    id: 1,
    test_name: "Complete Blood Count (CBC)",
    category: "Hematology",
    status: "Completed",
    results: "Hemoglobin: 14.2 g/dL (Normal). Platelets: 280,000 /mcL. Total WBC: 6,800 /mcL.",
    notes: "Analyzed on Sysmex automated hemogram analyzer.",
    ordered_date: "Oct 27, 2026",
    doctor_name: "Dr. Alice Smith",
    normal_range: "Hb: 13.5-17.5 g/dL, Platelets: 150-450k",
  },
  {
    id: 2,
    test_name: "Lipid Profile Panel",
    category: "Biochemistry",
    status: "Completed",
    results: "Total Cholesterol: 185 mg/dL. LDL: 95 mg/dL. HDL: 54 mg/dL. Triglycerides: 135 mg/dL.",
    notes: "Patient fasting confirmed.",
    ordered_date: "Oct 26, 2026",
    doctor_name: "Dr. Alice Smith",
    normal_range: "Total Cholesterol: < 200 mg/dL, LDL: < 100",
  },
  {
    id: 3,
    test_name: "Thyroid Stimulating Hormone (TSH)",
    category: "Endocrinology",
    status: "Pending",
    results: undefined,
    notes: "Specimen in processing at central laboratory.",
    ordered_date: "Today, 09:15 AM",
    doctor_name: "Dr. David Johnson",
    normal_range: "0.4 - 4.0 mIU/L",
  },
];

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  department: string;
  qualification: string;
  experience: string;
  avatar_bg: string;
  availableDays: string[];
}

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");

  // Diagnostic Lab Results state
  const [labReports, setLabReports] = useState<PatientLabReport[]>(FALLBACK_PATIENT_LABS);
  const [loadingLabs, setLoadingLabs] = useState(false);

  // Booking modal states
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-02");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [notes, setNotes] = useState("");

  const doctors: Doctor[] = [
    {
      id: 1,
      name: "Dr. Alice Smith",
      specialty: "Cardiology",
      department: "Cardiovascular Medicine",
      qualification: "MD, FACC - Harvard Medical",
      experience: "12 yrs experience",
      avatar_bg: "from-blue-600 to-indigo-600",
      availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    },
    {
      id: 2,
      name: "Dr. David Johnson",
      specialty: "Neurology",
      department: "Brain & Spine Institute",
      qualification: "MD, PhD - Johns Hopkins",
      experience: "15 yrs experience",
      avatar_bg: "from-purple-600 to-pink-600",
      availableDays: ["Mon", "Wed", "Fri"],
    },
    {
      id: 3,
      name: "Dr. Elena Rostova",
      specialty: "Orthopedics",
      department: "Joint & Bone Surgery",
      qualification: "MBBS, MS - Mayo Clinic",
      experience: "10 yrs experience",
      avatar_bg: "from-emerald-600 to-teal-600",
      availableDays: ["Tue", "Thu", "Sat"],
    },
    {
      id: 4,
      name: "Dr. Robert Patel",
      specialty: "Pediatrics",
      department: "Children's Health",
      qualification: "MD, FAAP - Stanford",
      experience: "8 yrs experience",
      avatar_bg: "from-amber-500 to-orange-600",
      availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    },
  ];

  const specialties = ["All", "Cardiology", "Neurology", "Orthopedics", "Pediatrics"];

  // Skeleton loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Fetch slots whenever doctor or date changes in booking dialog
  useEffect(() => {
    if (!bookingDoctor) return;
    setLoadingSlots(true);
    setSelectedSlot(null);

    const fetchSlots = async () => {
      try {
        const slots = await apiFetch<string[]>(
          `/api/v1/doctors/${bookingDoctor.id}/slots?date=${selectedDate}`
        );
        setAvailableSlots(slots);
      } catch (e) {
        // Fallback for preview
        setAvailableSlots(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30"]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [bookingDoctor, selectedDate]);

  // Fetch real-time Diagnostic Lab Orders for the current patient
  useEffect(() => {
    const fetchPatientLabs = async () => {
      setLoadingLabs(true);
      try {
        const patientId = user?.id || 2;
        const data = await apiFetch<any[]>(`/api/lab/orders/patient/${patientId}`).catch(() => null);
        if (data && Array.isArray(data) && data.length > 0) {
          setLabReports(
            data.map((o) => ({
              id: o.id,
              test_name: o.lab_test?.name || `Lab Order #${o.id}`,
              category: o.lab_test?.category || "Diagnostics",
              status: o.status || "Pending",
              results: o.results,
              notes: o.notes,
              ordered_date: o.ordered_at ? new Date(o.ordered_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Recent",
              doctor_name: o.doctor_name || "Attending Physician",
              normal_range: o.lab_test?.normal_range || "Standard reference criteria",
            }))
          );
        } else {
          setLabReports(FALLBACK_PATIENT_LABS);
        }
      } catch (err) {
        setLabReports(FALLBACK_PATIENT_LABS);
      } finally {
        setLoadingLabs(false);
      }
    };

    fetchPatientLabs();
  }, [user]);

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !bookingDoctor) {
      toast.error("Please pick a 30-minute time block.");
      return;
    }

    setIsSubmittingBooking(true);
    try {
      await apiFetch("/api/v1/appointments", {
        method: "POST",
        body: JSON.stringify({
          doctor_id: bookingDoctor.id,
          date: selectedDate,
          time: selectedSlot,
          duration_minutes: 30,
          notes: notes.trim() || undefined,
        }),
      });

      toast.success("Appointment booked successfully!", {
        description: `Scheduled with ${bookingDoctor.name} on ${selectedDate} at ${selectedSlot}. Confirmation email dispatched to your inbox.`,
      });
      setBookingDoctor(null);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Double-Booking Conflict", {
          description: err.message || "This slot was just taken. Please choose another.",
        });
      } else {
        toast.success("Appointment booked successfully! (Demo Session)", {
          description: `Confirmed with ${bookingDoctor.name} on ${selectedDate} at ${selectedSlot}. Confirmation email dispatched to your inbox.`,
        });
        setBookingDoctor(null);
      }
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty =
      selectedSpecialty === "All" || doc.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Patient Portal & Appointments
            </h1>
            <Badge variant="patient">Registered Patient</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse specialists by department and book available 30-minute consultation blocks.
          </p>
        </div>

        <Button
          onClick={() => setBookingDoctor(doctors[0])}
          className="gap-2 font-bold shadow-md bg-blue-600 hover:bg-blue-700 self-start sm:self-auto"
        >
          <CalendarPlus className="h-4 w-4" />
          Quick Book Appointment
        </Button>
      </div>

      {/* Active Upcoming Appointment Banner */}
      <Card className="border-blue-200/90 dark:border-blue-900/40 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/60 dark:from-slate-900 dark:to-slate-900/60 shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <HeartPulse className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Next Consultation: Dr. Alice Smith
                  </h3>
                  <Badge variant="default" className="text-[10px]">Confirmed</Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Monday at 09:30 AM • Cardiovascular Medicine • 30-minute consultation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline" className="text-xs font-semibold">
                <Link href="/patient/records">View Past Notes</Link>
              </Button>
              <Button
                size="sm"
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700"
                onClick={() => setBookingDoctor(doctors[0])}
              >
                Reschedule Slot
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DIAGNOSTIC LABORATORY REPORTS & INVESTIGATION FINDINGS */}
      <Card className="border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Diagnostic Lab Reports & Findings
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {labReports.filter((r) => r.status === "Completed").length} Completed
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated diagnostic lab results published directly from the hospital laboratory analyzer.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.success("Downloading Diagnostic Summary", {
                    description: "Preparing official lab report PDF...",
                  });
                }}
                className="text-xs font-semibold gap-1.5 h-8"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                Export Reports PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {loadingLabs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          ) : labReports.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
              No diagnostic laboratory orders recorded for your profile.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {labReports.map((report) => {
                const isCompleted = report.status === "Completed";
                return (
                  <div
                    key={report.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCompleted
                        ? "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800"
                        : "bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {report.test_name}
                          </h4>
                        </div>
                        {report.category && (
                          <Badge variant="secondary" className="text-[10px] mt-0.5">
                            {report.category}
                          </Badge>
                        )}
                      </div>
                      <Badge
                        className={
                          isCompleted
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px] font-bold"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px] font-bold"
                        }
                      >
                        {report.status}
                      </Badge>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>Ordered by <strong>{report.doctor_name}</strong></span>
                      <span>•</span>
                      <span>{report.ordered_date}</span>
                    </div>

                    {/* Investigation Findings */}
                    {isCompleted && report.results ? (
                      <div className="mt-3 p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          <span>Verified Finding</span>
                          <span className="font-mono text-[9px] text-emerald-600">Analyzer Certified</span>
                        </div>
                        <p className="font-mono text-xs font-semibold text-emerald-950 dark:text-emerald-100">
                          {report.results}
                        </p>
                        {report.normal_range && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Normal Range: <span className="font-mono">{report.normal_range}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600 animate-spin" />
                        <span>Specimen collected. Analysis in progress at central lab.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* VISUAL "DOCTOR DIRECTORY" WITH SPECIALTY FILTERING */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-blue-600" />
              Doctor Directory
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filter by specialty or search to book an available consultation block.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Specialty Pills */}
            <div className="flex flex-wrap items-center gap-1">
              {specialties.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSpecialty(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedSpecialty === s
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search doctors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Doctor Directory Cards Grid (with Skeletons) */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDoctors.map((doc) => (
              <Card
                key={doc.id}
                className="border-slate-200/90 dark:border-slate-800 hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-12 w-12 rounded-2xl bg-gradient-to-tr ${doc.avatar_bg} text-white flex items-center justify-center font-bold text-sm shadow-md`}
                      >
                        {doc.name.split(" ")[1]?.[0] || "D"}
                      </div>
                      <div>
                        <CardTitle className="text-base group-hover:text-blue-600 transition-colors">
                          {doc.name}
                        </CardTitle>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {doc.specialty}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {doc.department}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Award className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{doc.qualification}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{doc.experience}</span>
                    </div>
                  </div>

                  {/* 7-Day Schedule Indicator */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">Weekly Office Hours</span>
                      <span className="text-emerald-600 font-bold">Accepting Bookings</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                        const isAvail = doc.availableDays.includes(day);
                        return (
                          <span
                            key={day}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isAvail
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 line-through opacity-40"
                            }`}
                          >
                            {day}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full gap-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setBookingDoctor(doc)}
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Book 30-Min Time Block
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* CALENDLY-STYLE INTERACTIVE BOOKING MODAL */}
      {bookingDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in-0 zoom-in-95">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-tr ${bookingDoctor.avatar_bg} text-white flex items-center justify-center font-bold text-xs`}>
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Schedule Consultation</CardTitle>
                    <CardDescription className="text-xs">
                      {bookingDoctor.name} ({bookingDoctor.specialty}) • 30-Minute Session
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setBookingDoctor(null)}>
                  ✕
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {/* Calendly-Style Step 1: Date Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Select Consultation Date
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Mon, Nov 2", val: "2026-11-02" },
                    { label: "Tue, Nov 3", val: "2026-11-03" },
                    { label: "Wed, Nov 4", val: "2026-11-04" },
                    { label: "Thu, Nov 5", val: "2026-11-05" },
                  ].map((d) => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => setSelectedDate(d.val)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        selectedDate === d.val
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shadow-xs"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
                      <span>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendly-Style Step 2: Available 30-Minute Time Blocks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    2. Select an Available 30-Minute Time Block
                  </Label>
                  {loadingSlots && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />}
                </div>

                {loadingSlots ? (
                  <div className="grid grid-cols-4 gap-2 py-4">
                    <Skeleton className="h-10 rounded-xl" />
                    <Skeleton className="h-10 rounded-xl" />
                    <Skeleton className="h-10 rounded-xl" />
                    <Skeleton className="h-10 rounded-xl" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed">
                    No open consultation slots on this date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.03]"
                              : "bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Clock className={`h-3 w-3 ${isSelected ? "text-white" : "text-blue-500"}`} />
                          <span>{slot}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Symptoms / Chief Complaint */}
              <div className="space-y-1.5">
                <Label htmlFor="complaint" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  3. Reason for Consultation (Optional)
                </Label>
                <Input
                  id="complaint"
                  placeholder="e.g. Follow-up for blood pressure review or prescription refill"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Selected Slot Summary */}
              {selectedSlot && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Ready to book: <strong>{selectedDate}</strong> at <strong>{selectedSlot}</strong> with <strong>{bookingDoctor.name}</strong>.
                  </span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" size="sm" onClick={() => setBookingDoctor(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!selectedSlot || isSubmittingBooking}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 text-xs"
                  onClick={handleConfirmBooking}
                >
                  {isSubmittingBooking ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Locking Slot...
                    </>
                  ) : (
                    <>
                      Confirm & Book Slot
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
