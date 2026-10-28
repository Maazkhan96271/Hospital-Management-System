"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Stethoscope,
  CalendarCheck,
  Star,
  Clock,
  MapPin,
  Award,
  Video,
  Building2,
  ChevronLeft,
  CalendarPlus,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

interface DoctorData {
  id: number;
  name: string;
  specialty: string;
  department: string;
  qualification: string;
  experience: string;
  rating: number;
  reviewsCount: number;
  consultationFee: number;
  availableDays: string[];
  slots: string[];
  bio: string;
  symptoms: string[];
}

const DOCTORS_DATABASE: Record<string, DoctorData> = {
  "1": {
    id: 1,
    name: "Dr. Alice Smith",
    specialty: "Cardiovascular Medicine",
    department: "Cardiology",
    qualification: "MD, FACC - Harvard Medical School",
    experience: "14+ Years Experience",
    rating: 4.9,
    reviewsCount: 342,
    consultationFee: 500,
    availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    slots: ["09:00 AM", "10:30 AM", "01:00 PM", "03:30 PM", "05:00 PM"],
    bio: "Senior Consultant Cardiologist specializing in preventive cardiology, coronary interventions, complex hypertension management, and heart failure therapies.",
    symptoms: ["Chest Pain", "Palpitations", "Shortness of Breath", "High Blood Pressure", "Dizziness"],
  },
  "2": {
    id: 2,
    name: "Dr. Robert Chen",
    specialty: "Neurology & Stroke Care",
    department: "Neurology",
    qualification: "MD, DM Neurology - Johns Hopkins",
    experience: "11+ Years Experience",
    rating: 4.8,
    reviewsCount: 215,
    consultationFee: 650,
    availableDays: ["Monday", "Wednesday", "Friday"],
    slots: ["10:00 AM", "11:30 AM", "02:00 PM", "04:00 PM"],
    bio: "Leading Neurologist with dedicated expertise in migraine management, neurovascular disorders, epilepsy, neuromuscular conditions, and clinical neurophysiology.",
    symptoms: ["Severe Headache", "Migraines", "Tremors", "Numbness", "Sleep Disorders"],
  },
  "3": {
    id: 3,
    name: "Dr. Sarah Patel",
    specialty: "Orthopedic Surgery & Sports Injuries",
    department: "Orthopedics",
    qualification: "MS Ortho, MCh Orth - Stanford University",
    experience: "16+ Years Experience",
    rating: 4.9,
    reviewsCount: 420,
    consultationFee: 550,
    availableDays: ["Tuesday", "Thursday", "Saturday"],
    slots: ["08:30 AM", "10:00 AM", "01:30 PM", "03:00 PM"],
    bio: "Specialist in robotic joint replacements, sports ligament reconstructions, degenerative arthritis care, and minimally invasive spine interventions.",
    symptoms: ["Joint Pain", "Back Pain", "Knee Swelling", "Sports Injury", "Fractures"],
  },
  "4": {
    id: 4,
    name: "Dr. Emily Taylor",
    specialty: "Pediatric Medicine & Child Health",
    department: "Pediatrics",
    qualification: "MD Pediatrics, DCH - Oxford University",
    experience: "9+ Years Experience",
    rating: 4.9,
    reviewsCount: 189,
    consultationFee: 450,
    availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"],
    slots: ["09:30 AM", "11:00 AM", "02:30 PM", "04:30 PM"],
    bio: "Compassionate pediatrician devoted to newborn care, childhood immunizations, pediatric nutrition, developmental milestones, and acute pediatric infections.",
    symptoms: ["Fever in Children", "Cough & Cold", "Growth Milestones", "Skin Rashes", "Allergies"],
  },
  "5": {
    id: 5,
    name: "Dr. Marcus Vance",
    specialty: "Internal Medicine & Metabolic Health",
    department: "General Medicine",
    qualification: "MD Internal Medicine - Columbia University",
    experience: "12+ Years Experience",
    rating: 4.7,
    reviewsCount: 164,
    consultationFee: 400,
    availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    slots: ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"],
    bio: "Comprehensive general physician focusing on adult preventive wellness, Type 2 diabetes remission, thyroid disorders, and acute medical illnesses.",
    symptoms: ["General Fatigue", "Unexplained Fever", "Diabetes Control", "Thyroid Issues", "Digestive Upsets"],
  },
};

function DoctorDetailContent() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<DoctorData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const docId = params?.id ? String(params.id) : "1";

  useEffect(() => {
    // Simulate data resolution with fallback to ensure page refresh never throws 404
    const timer = setTimeout(() => {
      const found = DOCTORS_DATABASE[docId] || {
        id: Number(docId) || 1,
        name: `Dr. Specialist #${docId}`,
        specialty: "Medical Specialist",
        department: "Clinical Department",
        qualification: "MBBS, MD - Accredited Medical Center",
        experience: "10+ Years Experience",
        rating: 4.8,
        reviewsCount: 120,
        consultationFee: 500,
        availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        slots: ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM"],
        bio: "Experienced clinical specialist delivering evidence-based patient-centric healthcare and telemedicine consultations.",
        symptoms: ["General Consultation", "Health Review", "Second Opinion"],
      };
      setDoctor(found);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [docId]);

  if (loading || !doctor) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-20 w-20 rounded-2xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-56 rounded-md" />
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-4 w-64 rounded-md" />
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-2xl md:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const initials = doctor.name
    .replace("Dr. ", "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="text-xs font-semibold gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white -ml-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Directory
      </Button>

      {/* Hero Doctor Profile Banner */}
      <Card className="border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/60 dark:from-slate-900 dark:to-slate-900/60 shadow-sm overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-24 w-24 rounded-2xl border-2 border-blue-500/30 shadow-md">
              <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl rounded-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {doctor.name}
                </h1>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-0 text-xs gap-1 font-bold">
                  <ShieldCheck className="h-3 w-3 text-blue-600" />
                  Verified Specialist
                </Badge>
              </div>

              <p className="text-base font-semibold text-blue-600 dark:text-blue-400">
                {doctor.specialty} • {doctor.department}
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>{doctor.qualification}</span>
                <span>•</span>
                <span>{doctor.experience}</span>
              </p>

              <div className="flex items-center gap-3 pt-1 text-xs">
                <div className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-900/40">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  {doctor.rating}
                  <span className="font-normal text-slate-400">({doctor.reviewsCount} reviews)</span>
                </div>
                <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 font-bold">
                  ${doctor.consultationFee} Consultation
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 cols: Bio & Clinical Expertise */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Award className="h-4 w-4 text-blue-600" />
                About Physician
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>{doctor.bio}</p>

              <div className="pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
                  Symptoms & Conditions Treated
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {doctor.symptoms.map((symptom, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      {symptom}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Clock className="h-4 w-4 text-emerald-600" />
                7-Day Consultation Availability
              </CardTitle>
              <CardDescription className="text-xs">
                Physician active OPD and Telemedicine schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {doctor.availableDays.map((day, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right col: Instant Booking Widget */}
        <div className="space-y-6">
          <Card className="border-blue-200/80 dark:border-blue-900/60 bg-white dark:bg-slate-900 shadow-sm sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Book Consultation
              </CardTitle>
              <CardDescription className="text-xs">
                Select your preferred mode and appointment slot
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl border border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-center text-xs font-bold text-blue-700 dark:text-blue-300 flex flex-col items-center gap-1">
                  <Video className="h-4 w-4 text-blue-600" />
                  Video Telemed
                </div>
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 flex flex-col items-center gap-1">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  Clinic Visit
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Available Slots Today
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {doctor.slots.map((slot, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        selectedSlot === slot
                          ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Consultation Fee</span>
                <span className="font-black text-sm text-slate-900 dark:text-white font-mono">
                  ${doctor.consultationFee}.00
                </span>
              </div>

              <Button
                asChild
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 shadow-sm"
              >
                <Link href={`/patient/book?doctor_id=${doctor.id}${selectedSlot ? `&slot=${encodeURIComponent(selectedSlot)}` : ""}`}>
                  <CalendarPlus className="h-4 w-4 mr-1.5" />
                  Proceed to Book Appointment
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DoctorDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 animate-pulse">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      }
    >
      <DoctorDetailContent />
    </Suspense>
  );
}
