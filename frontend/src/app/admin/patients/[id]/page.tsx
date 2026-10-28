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
  FileText,
  ChevronLeft,
  Mail,
  Phone,
  Calendar,
  Pill,
  Stethoscope,
} from "lucide-react";

interface TreatmentRecord {
  id: number;
  date: string;
  doctor_name: string;
  diagnosis: string;
  prescriptions: string[];
  notes?: string;
  vitals?: {
    bp: string;
    hr: string;
    temp: string;
    weight: string;
  };
}

interface PatientDetails {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  blood_group?: string;
  dob?: string;
  allergies?: string[];
  records: TreatmentRecord[];
}

function AdminPatientDetailContent() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientDetails | null>(null);

  const patientId = params?.id ? String(params.id) : "1";

  useEffect(() => {
    // Fallback simulation so page refresh on Vercel never returns 404
    const timer = setTimeout(() => {
      setPatient({
        id: Number(patientId) || 1,
        first_name: Number(patientId) === 2 ? "Jane" : Number(patientId) === 3 ? "Carlos" : "Bob",
        last_name: Number(patientId) === 2 ? "Doe" : Number(patientId) === 3 ? "Rivera" : "Jones",
        email: `patient${patientId}@example.com`,
        phone: "+1 (555) 234-5678",
        blood_group: "O+",
        dob: "1988-06-14",
        allergies: ["Penicillin", "Sulfa drugs"],
        records: [
          {
            id: 101,
            date: "2025-08-10",
            doctor_name: "Dr. Alice Smith",
            diagnosis: "Mild borderline hypertension",
            prescriptions: ["Hydrochlorothiazide 12.5mg daily", "Amlodipine 5mg OD"],
            notes: "Advised 30 mins brisk walking daily and low-sodium DASH diet. Blood pressure regularized.",
            vitals: { bp: "128/84", hr: "74", temp: "98.4", weight: "72 kg" },
          },
          {
            id: 88,
            date: "2025-03-15",
            doctor_name: "Dr. Marcus Vance",
            diagnosis: "Seasonal Allergic Rhinitis",
            prescriptions: ["Cetirizine 10mg HS", "Fluticasone nasal spray"],
            notes: "Symptoms improved post antihistamine therapy. No secondary sinus infection noted.",
            vitals: { bp: "122/80", hr: "70", temp: "98.6", weight: "71.5 kg" },
          },
        ],
      });
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [patientId]);

  if (loading || !patient) {
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
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const initials = `${patient.first_name[0] || ""}${patient.last_name[0] || ""}`.toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="text-xs font-semibold gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white -ml-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Patients
      </Button>

      {/* Patient Header Banner */}
      <Card className="border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-blue-50/70 via-white to-sky-50/60 dark:from-slate-900 dark:to-slate-900/60 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-blue-500/30">
                <AvatarFallback className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                    {patient.first_name} {patient.last_name}
                  </h1>
                  <Badge variant="outline" className="font-mono text-xs">
                    Patient #{patient.id}
                  </Badge>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]">
                    Active EMR
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-400" /> {patient.email}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" /> {patient.phone}</span>
                  <span>•</span>
                  <span>Blood: <strong className="text-slate-700 dark:text-slate-200">{patient.blood_group}</strong></span>
                </div>
              </div>
            </div>

            <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm">
              <Link href={`/patient/book?patient_id=${patient.id}`}>
                <Calendar className="h-3.5 w-3.5" />
                Schedule Consultation
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Timeline */}
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <FileText className="h-4 w-4 text-blue-600" />
            Clinical Treatment Records & Diagnoses Timeline
          </CardTitle>
          <CardDescription className="text-xs">
            Historical diagnoses, prescriptions, and vital statistics recorded by attending physicians.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {patient.records.map((rec) => (
            <div
              key={rec.id}
              className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-emerald-600" />
                    {rec.diagnosis}
                  </h3>
                  <p className="text-xs text-slate-500">Recorded by {rec.doctor_name}</p>
                </div>
                <Badge variant="outline" className="font-mono text-xs self-start sm:self-auto">
                  {rec.date}
                </Badge>
              </div>

              {rec.vitals && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">BP</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">{rec.vitals.bp} mmHg</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Pulse</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">{rec.vitals.hr} bpm</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Temp</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">{rec.vitals.temp} °F</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Weight</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">{rec.vitals.weight}</strong>
                  </div>
                </div>
              )}

              {rec.prescriptions && rec.prescriptions.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Prescribed Medications
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.prescriptions.map((p, pIdx) => (
                      <Badge key={pIdx} variant="secondary" className="text-xs bg-white dark:bg-slate-800 border text-slate-800 dark:text-slate-200 gap-1 font-medium">
                        <Pill className="h-3 w-3 text-purple-600" />
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {rec.notes && (
                <p className="text-xs text-slate-600 dark:text-slate-400 italic pt-1 bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  Notes: {rec.notes}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPatientDetailPage() {
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
      <AdminPatientDetailContent />
    </Suspense>
  );
}
