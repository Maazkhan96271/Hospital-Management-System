"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Activity,
  Calendar,
  Stethoscope,
  Pill,
  FlaskConical,
  ChevronRight,
  Download,
  Receipt,
  HeartPulse,
} from "lucide-react";
import { toast } from "sonner";

interface RecordItem {
  id: number;
  date: string;
  doctor: string;
  specialty: string;
  diagnosis: string;
  medicines: string[];
  labs: string[];
  notes: string;
  status: "Finalized" | "Reviewed";
}

const PAST_RECORDS: RecordItem[] = [
  {
    id: 1,
    date: "Oct 15, 2026",
    doctor: "Dr. Alice Smith",
    specialty: "Cardiology",
    diagnosis: "Stage 1 Essential Hypertension - Normalized",
    medicines: ["Telmisartan 40mg daily", "Amlodipine 5mg OD"],
    labs: ["Lipid Profile", "Serum Creatinine"],
    notes: "BP controlled at 122/80 mmHg. Exercise regime adhered to. Continue maintenance therapy.",
    status: "Finalized",
  },
  {
    id: 2,
    date: "Aug 20, 2026",
    doctor: "Dr. Marcus Vance",
    specialty: "Internal Medicine",
    diagnosis: "Upper Respiratory Tract Viral Infection",
    medicines: ["Paracetamol 650mg TDS", "Cetirizine 10mg HS", "Vitamin C 500mg"],
    labs: ["Complete Blood Count (CBC)"],
    notes: "Rest and hydration recommended. Patient recovered fully within 4 days.",
    status: "Finalized",
  },
  {
    id: 3,
    date: "May 12, 2026",
    doctor: "Dr. Sarah Patel",
    specialty: "Orthopedics",
    diagnosis: "Patellofemoral Pain Syndrome (Left Knee)",
    medicines: ["Aceclofenac + Paracetamol 100/325mg BD", "Calcium + Vit D3"],
    labs: ["Knee X-Ray AP/Lateral"],
    notes: "Quadriceps strengthening physiotherapy exercises prescribed. Avoid stair climbing for 2 weeks.",
    status: "Finalized",
  },
];

export default function PatientRecordsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  const handleDownload = (rec: RecordItem) => {
    toast.success("Medical Record Downloaded", {
      description: `E-Prescription & summary for ${rec.diagnosis} saved.`,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText className="h-5 w-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Medical Health Records
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            View, download, and track your clinical diagnoses, historical treatment encounters, and digital prescriptions.
          </p>
        </div>

        <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm">
          <Link href="/patient/book">
            <Stethoscope className="h-3.5 w-3.5" />
            Book Follow-up
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {PAST_RECORDS.map((rec) => (
            <Card
              key={rec.id}
              className="border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-all bg-white dark:bg-slate-900 overflow-hidden"
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {rec.diagnosis}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {rec.doctor} • {rec.specialty}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Badge variant="outline" className="font-mono text-xs">
                      {rec.date}
                    </Badge>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]">
                      {rec.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Prescribed Medications */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] flex items-center gap-1">
                      <Pill className="h-3 w-3 text-purple-600" />
                      Prescriptions ({rec.medicines.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {rec.medicines.map((med, mIdx) => (
                        <span key={mIdx} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border text-[11px] font-medium">
                          {med}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Lab Investigations */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] flex items-center gap-1">
                      <FlaskConical className="h-3 w-3 text-amber-600" />
                      Diagnostics ({rec.labs.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {rec.labs.map((lab, lIdx) => (
                        <span key={lIdx} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border text-[11px] font-medium">
                          {lab}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <p className="text-slate-500 italic max-w-lg truncate">
                    Notes: {rec.notes}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(rec)}
                    className="h-8 gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    E-Prescription PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
