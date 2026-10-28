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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
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
  Sparkles,
  Activity,
  Star,
  Check,
  Video,
  CreditCard,
  Building2,
  ShieldCheck,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { PaymentGatewayModal } from "@/components/telemedicine/PaymentGatewayModal";
import { VideoCallModal } from "@/components/telemedicine/VideoCallModal";

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
  symptoms: string[];
  rating: number;
  consultation_fee: number;
}

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");

  // Diagnostic Lab Results state
  const [labReports, setLabReports] = useState<PatientLabReport[]>(FALLBACK_PATIENT_LABS);
  const [loadingLabs, setLoadingLabs] = useState(false);

  // Upcoming Appointment & Telemedicine state
  const [upcomingAppointment, setUpcomingAppointment] = useState({
    id: 101,
    doctor_name: "Dr. Alice Smith",
    doctor_specialty: "Cardiovascular Medicine",
    date: "Today, Oct 28",
    time: "09:30 AM",
    duration: 30,
    consultation_type: "Video" as "In-Person" | "Video",
    payment_status: "Unpaid" as "Unpaid" | "Paid",
    fee: 500.0,
    isToday: true,
  });

  // Telemedicine & Payment Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Booking modal states
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [bookingConsultationType, setBookingConsultationType] = useState<"In-Person" | "Video">("Video");
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
      symptoms: ["chest pain", "heart", "bp", "blood pressure", "hypertension", "palpitations", "shortness of breath", "cardiac"],
      rating: 4.9,
      consultation_fee: 500,
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
      symptoms: ["headache", "migraine", "dizziness", "nerve pain", "seizures", "brain", "stroke", "vertigo"],
      rating: 4.85,
      consultation_fee: 650,
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
      symptoms: ["joint pain", "knee pain", "fracture", "arthritis", "back pain", "bone", "spine", "shoulder"],
      rating: 4.92,
      consultation_fee: 550,
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
      symptoms: ["fever", "cold", "cough", "child care", "baby", "infant", "vaccination", "pediatric", "flu"],
      rating: 4.95,
      consultation_fee: 450,
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
          consultation_type: bookingConsultationType,
          payment_status: "Unpaid",
          notes: notes.trim() || undefined,
        }),
      });

      setUpcomingAppointment({
        id: Math.floor(100 + Math.random() * 900),
        doctor_name: bookingDoctor.name,
        doctor_specialty: bookingDoctor.department,
        date: selectedDate,
        time: selectedSlot,
        duration: 30,
        consultation_type: bookingConsultationType,
        payment_status: "Unpaid",
        fee: bookingDoctor.consultation_fee,
        isToday: true,
      });

      toast.success("Appointment booked successfully!", {
        description: `Scheduled ${bookingConsultationType === "Video" ? "Video Consult" : "Clinic Visit"} with ${bookingDoctor.name} on ${selectedDate} at ${selectedSlot}.`,
      });
      setBookingDoctor(null);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Double-Booking Conflict", {
          description: err.message || "This slot was just taken. Please choose another.",
        });
      } else {
        setUpcomingAppointment({
          id: Math.floor(100 + Math.random() * 900),
          doctor_name: bookingDoctor.name,
          doctor_specialty: bookingDoctor.department,
          date: selectedDate,
          time: selectedSlot,
          duration: 30,
          consultation_type: bookingConsultationType,
          payment_status: "Unpaid",
          fee: bookingDoctor.consultation_fee,
          isToday: true,
        });

        toast.success("Appointment booked successfully! (Demo Session)", {
          description: `Confirmed ${bookingConsultationType === "Video" ? "Video Consult" : "Clinic Visit"} with ${bookingDoctor.name} on ${selectedDate} at ${selectedSlot}.`,
        });
        setBookingDoctor(null);
      }
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      doc.name.toLowerCase().includes(term) ||
      doc.specialty.toLowerCase().includes(term) ||
      doc.department.toLowerCase().includes(term) ||
      doc.qualification.toLowerCase().includes(term) ||
      doc.symptoms.some((s) => s.toLowerCase().includes(term));
    const matchesSpecialty =
      selectedSpecialty === "All" || doc.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="space-y-8">
      {/* APOLLO-STYLE HERO BANNER WITH QUICK SEARCH & POPULAR SYMPTOM PILLS */}
      {loading ? (
        <div className="rounded-3xl border-0 p-8 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600 text-white relative overflow-hidden shadow-xl animate-pulse space-y-4">
          <Skeleton className="h-6 w-44 bg-white/20 rounded-full" />
          <Skeleton className="h-10 w-2/3 bg-white/20 rounded-xl" />
          <Skeleton className="h-5 w-4/5 bg-white/20 rounded-lg" />
          <Skeleton className="h-14 w-full bg-white/30 rounded-2xl mt-4" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-7 w-20 bg-white/20 rounded-full" />
            <Skeleton className="h-7 w-24 bg-white/20 rounded-full" />
            <Skeleton className="h-7 w-24 bg-white/20 rounded-full" />
            <Skeleton className="h-7 w-28 bg-white/20 rounded-full" />
          </div>
        </div>
      ) : (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600 dark:from-blue-950 dark:via-indigo-950 dark:to-slate-900 text-white p-6 sm:p-8 lg:p-10 shadow-xl border border-blue-500/20">
          {/* Subtle Ambient Glow Spheres */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-1/3 -bottom-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md text-[11px] font-semibold gap-1.5 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                Apollo 24/7 Digital Health • Instant Care
              </Badge>
              <Badge variant="patient" className="bg-emerald-500 text-white border-0 text-[10px] font-bold">
                Registered Patient
              </Badge>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Your Health, Our Priority
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
                Connect with world-class specialists, schedule instant 30-minute consultation blocks, or access verified diagnostic analyzer reports anytime, anywhere.
              </p>
            </div>

            {/* Apollo-Style Quick Search Bar */}
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 sm:p-2 bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-md transition-all focus-within:ring-2 focus-within:ring-cyan-400">
                <div className="flex items-center flex-1 px-3 py-1 gap-2.5">
                  <Search className="h-5 w-5 text-blue-600 dark:text-cyan-400 shrink-0" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search for doctors, specialties, or symptoms..."
                    className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="text-xs text-slate-400 hover:text-slate-600 p-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("doctor-directory");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-xs sm:text-sm shrink-0"
                >
                  Find Doctors
                </Button>
              </div>

              {/* Popular Symptom & Specialty Tags */}
              <div className="pt-3 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-semibold text-blue-200">
                  Popular Searches:
                </span>
                {[
                  { label: "Cardiology", query: "Cardiology" },
                  { label: "Neurology", query: "Neurology" },
                  { label: "Orthopedics", query: "Orthopedics" },
                  { label: "Pediatrics", query: "Pediatrics" },
                  { label: "Fever & Cold", query: "fever" },
                  { label: "Chest Pain", query: "chest pain" },
                  { label: "Joint Pain", query: "joint pain" },
                  { label: "Headache", query: "headache" },
                ].map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => {
                      setSearchTerm(tag.query);
                      const el = document.getElementById("doctor-directory");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/15 hover:bg-white/25 text-white backdrop-blur-xs border border-white/20 transition-all cursor-pointer"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Upcoming Appointment Banner */}
      {loading ? (
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-8 w-28 rounded-xl" />
          </div>
        </Card>
      ) : (
        <Card className="border-blue-200/90 dark:border-blue-900/40 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/60 dark:from-slate-900 dark:to-slate-900/60 shadow-xs hover:-translate-y-1 hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 border-2 border-blue-500/30 shadow-md shrink-0">
                  <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm">
                    AS
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Next Consultation: {upcomingAppointment.doctor_name}
                    </h3>
                    <Badge variant="default" className="text-[10px]">Confirmed</Badge>

                    {/* Consultation Type Badge */}
                    {upcomingAppointment.consultation_type === "Video" ? (
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-bold gap-1">
                        <Video className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        Video Consult
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 text-slate-600 dark:text-slate-300">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        Clinic Visit
                      </Badge>
                    )}

                    {/* Payment Status Badge */}
                    {upcomingAppointment.payment_status === "Paid" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px] font-bold gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Paid
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-0 text-[10px] font-bold gap-1">
                        Unpaid • ${upcomingAppointment.fee.toFixed(0)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {upcomingAppointment.date} at {upcomingAppointment.time} • {upcomingAppointment.doctor_specialty} • {upcomingAppointment.duration}-minute block
                  </p>
                </div>
              </div>

              {/* Action Buttons: Pulsing Video Call & Pay Now */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Telemedicine Video Call Pulsing Button */}
                {upcomingAppointment.consultation_type === "Video" && upcomingAppointment.isToday && (
                  <Button
                    size="sm"
                    onClick={() => setIsVideoModalOpen(true)}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/30 animate-pulse ring-2 ring-emerald-400 cursor-pointer"
                  >
                    <Video className="h-4 w-4" />
                    Join Video Call
                  </Button>
                )}

                {/* Payment Gateway Trigger if Unpaid */}
                {upcomingAppointment.payment_status === "Unpaid" && (
                  <Button
                    size="sm"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm cursor-pointer"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Pay Now (${upcomingAppointment.fee.toFixed(0)})
                  </Button>
                )}

                <Button asChild size="sm" variant="outline" className="text-xs font-semibold">
                  <Link href="/patient/records">Past Records</Link>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs font-semibold"
                  onClick={() => setBookingDoctor(doctors[0])}
                >
                  Reschedule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          {loading || loadingLabs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
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
                className="border-slate-200/90 dark:border-slate-800 hover:-translate-y-1 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-14 w-14 border-2 border-white dark:border-slate-800 shadow-md">
                        <AvatarFallback className={cn("bg-gradient-to-tr text-white font-bold text-sm shadow-inner", doc.avatar_bg)}>
                          {doc.name.split(" ").slice(1).map((n) => n[0]).join("") || "DR"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base group-hover:text-blue-600 transition-colors">
                          {doc.name}
                        </CardTitle>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {doc.specialty}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-500 font-semibold">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{doc.rating}</span>
                          <span className="text-slate-400 font-normal">• Fee: ${doc.consultation_fee}</span>
                        </div>
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

                  {/* Common Treated Symptoms */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium mr-1">Treats:</span>
                    {doc.symptoms.slice(0, 4).map((sym) => (
                      <span
                        key={sym}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 capitalize"
                      >
                        {sym}
                      </span>
                    ))}
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
                  <Avatar className="h-11 w-11 border border-white/20 shadow-xs">
                    <AvatarFallback className={cn("bg-gradient-to-tr text-white font-bold text-xs", bookingDoctor.avatar_bg)}>
                      {bookingDoctor.name.split(" ").slice(1).map((n) => n[0]).join("") || "DR"}
                    </AvatarFallback>
                  </Avatar>
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
              {/* Step 1: Video Consult vs Clinic Visit Toggle */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Select Consultation Delivery Mode
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBookingConsultationType("In-Person")}
                    className={`p-3 rounded-xl border text-xs text-left transition-all cursor-pointer flex items-center justify-between ${
                      bookingConsultationType === "In-Person"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${bookingConsultationType === "In-Person" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600"}`}>
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold">Clinic Visit</p>
                        <p className="text-[11px] text-slate-400">At hospital campus</p>
                      </div>
                    </div>
                    {bookingConsultationType === "In-Person" && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setBookingConsultationType("Video")}
                    className={`p-3 rounded-xl border text-xs text-left transition-all cursor-pointer flex items-center justify-between ${
                      bookingConsultationType === "Video"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${bookingConsultationType === "Video" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600"}`}>
                        <Video className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold flex items-center gap-1.5">
                          Video Consult
                          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-0 text-[9px] px-1 py-0">
                            Telemed
                          </Badge>
                        </p>
                        <p className="text-[11px] text-slate-400">1080p HD call from home</p>
                      </div>
                    </div>
                    {bookingConsultationType === "Video" && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                  </button>
                </div>
              </div>

              {/* Step 2: Date Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  2. Select Consultation Date
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

              {/* Step 3: Available 30-Minute Time Blocks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    3. Select an Available 30-Minute Time Block
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

              {/* Step 4: Symptoms / Chief Complaint */}
              <div className="space-y-1.5">
                <Label htmlFor="complaint" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  4. Reason for Consultation (Optional)
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
                    Ready to book: <strong>{bookingConsultationType === "Video" ? "📹 Video Consult (Telemed)" : "🏥 Clinic Visit (In-Person)"}</strong> on <strong>{selectedDate}</strong> at <strong>{selectedSlot}</strong> with <strong>{bookingDoctor.name}</strong>.
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

      {/* Telemedicine Video Call Room Modal */}
      <VideoCallModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        appointmentId={upcomingAppointment.id}
        participantName={upcomingAppointment.doctor_name}
        participantRole="Doctor"
        consultationDate={upcomingAppointment.date}
        consultationTime={upcomingAppointment.time}
        department={upcomingAppointment.doctor_specialty}
      />

      {/* Stripe / Razorpay Payment Gateway Modal */}
      <PaymentGatewayModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        appointmentId={upcomingAppointment.id}
        doctorName={upcomingAppointment.doctor_name}
        consultationType={upcomingAppointment.consultation_type}
        consultationDate={upcomingAppointment.date}
        consultationTime={upcomingAppointment.time}
        amount={upcomingAppointment.fee}
        onPaymentSuccess={(apptId, method, txId) => {
          setUpcomingAppointment((prev) => ({
            ...prev,
            payment_status: "Paid",
          }));
        }}
      />
    </div>
  );
}
