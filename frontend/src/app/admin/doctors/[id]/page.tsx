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
  ChevronLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Star,
} from "lucide-react";

function AdminDoctorDetailContent() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<any | null>(null);

  const docId = params?.id ? String(params.id) : "1";

  useEffect(() => {
    // Fallback simulation so page refresh on Vercel never returns 404
    const timer = setTimeout(() => {
      setDoctor({
        id: Number(docId) || 1,
        name: Number(docId) === 2 ? "Dr. Robert Chen" : Number(docId) === 3 ? "Dr. Sarah Patel" : "Dr. Alice Smith",
        specialty: Number(docId) === 2 ? "Neurology" : Number(docId) === 3 ? "Orthopedics" : "Cardiology",
        department: Number(docId) === 2 ? "Neurology & Brain Sciences" : Number(docId) === 3 ? "Orthopedic Surgery" : "Cardiovascular Medicine",
        qualification: "MD, Board Certified Specialist",
        experience: "12+ Years Experience",
        email: `doctor${docId}@apollo-hospital.org`,
        phone: "+1 (555) 456-7890",
        rating: 4.9,
        reviewsCount: 310,
        availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        slots: ["09:00 AM", "10:30 AM", "01:00 PM", "03:30 PM", "05:00 PM"],
      });
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [docId]);

  if (loading || !doctor) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-4 w-64 rounded" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const initials = doctor.name.replace("Dr. ", "").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="text-xs font-semibold gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white -ml-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Doctors
      </Button>

      {/* Doctor Header Banner */}
      <Card className="border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-blue-50/70 via-white to-sky-50/60 dark:from-slate-900 dark:to-slate-900/60 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-emerald-500/30">
                <AvatarFallback className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                    {doctor.name}
                  </h1>
                  <Badge variant="outline" className="font-mono text-xs">
                    Doctor #{doctor.id}
                  </Badge>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]">
                    Active Faculty
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                  {doctor.specialty} • {doctor.department}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-400" /> {doctor.email}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" /> {doctor.phone}</span>
                </div>
              </div>
            </div>

            <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm">
              <Link href={`/admin/appointments`}>
                <Calendar className="h-3.5 w-3.5" />
                View Doctor Schedule
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Doctor Availability Schedule */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Clock className="h-4 w-4 text-emerald-600" />
            Active 7-Day Availability Roster
          </CardTitle>
          <CardDescription className="text-xs">
            Assigned consultation shifts and daily outpatient capacity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {doctor.availability.map((day: string, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">{day}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Daily OPD Consultation Slots
            </span>
            <div className="flex flex-wrap gap-1.5">
              {doctor.slots.map((slot: string, sIdx: number) => (
                <Badge key={sIdx} variant="secondary" className="font-mono text-xs bg-slate-100 dark:bg-slate-800">
                  {slot}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDoctorDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 animate-pulse">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      }
    >
      <AdminDoctorDetailContent />
    </Suspense>
  );
}
