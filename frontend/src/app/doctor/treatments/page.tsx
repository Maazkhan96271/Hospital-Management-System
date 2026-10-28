"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  User,
  Stethoscope,
  Pill,
  Search,
} from "lucide-react";

interface DoctorTreatment {
  id: number;
  date: string;
  patient_name: string;
  patient_id: number;
  diagnosis: string;
  prescriptions: string[];
  notes: string;
}

const TREATMENTS_DATA: DoctorTreatment[] = [
  {
    id: 1,
    date: "2025-08-10",
    patient_name: "Bob Jones",
    patient_id: 1,
    diagnosis: "Mild borderline hypertension",
    prescriptions: ["Hydrochlorothiazide 12.5mg daily"],
    notes: "Advised 30 mins brisk walking daily and low-sodium diet.",
  },
  {
    id: 2,
    date: "2025-05-18",
    patient_name: "Sophia Martinez",
    patient_id: 4,
    diagnosis: "Type 2 Diabetes Mellitus, well controlled",
    prescriptions: ["Metformin 500mg BID", "Atorvastatin 10mg daily"],
    notes: "HbA1c was 6.2%. Kidney function tests within normal limits.",
  },
  {
    id: 3,
    date: "2025-03-20",
    patient_name: "Michael Chang",
    patient_id: 5,
    diagnosis: "Coronary artery disease, post-angioplasty recovery",
    prescriptions: ["Clopidogrel 75mg daily", "Atorvastatin 40mg daily"],
    notes: "Cardiac rehabilitation program initiated.",
  },
];

export default function DoctorTreatmentsPage() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  const filtered = TREATMENTS_DATA.filter((t) =>
    t.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText className="h-5 w-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Clinical Treatment Records
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Archived medical diagnoses, therapeutic interventions, and issued e-prescriptions.
          </p>
        </div>

        <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm">
          <Link href="/doctor/agenda">
            <Stethoscope className="h-3.5 w-3.5" />
            Active EMR Agenda
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter treatments by patient name or diagnosis..."
          className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className="border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-all bg-white dark:bg-slate-900 overflow-hidden"
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2.5">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.patient_name}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      #{item.patient_id}
                    </Badge>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs self-start sm:self-auto">
                    {item.date}
                  </Badge>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Diagnosis</span>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                    {item.diagnosis}
                  </p>
                </div>

                {item.prescriptions && item.prescriptions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.prescriptions.map((rx, rIdx) => (
                      <Badge key={rIdx} variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Pill className="h-3 w-3 mr-1 text-purple-600" />
                        {rx}
                      </Badge>
                    ))}
                  </div>
                )}

                {item.notes && (
                  <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    Clinical Notes: {item.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
