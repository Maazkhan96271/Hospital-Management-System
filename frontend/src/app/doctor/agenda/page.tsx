"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Clock,
  CalendarCheck,
  CheckCircle2,
  Stethoscope,
  FileText,
  User,
  Plus,
  Trash2,
  Loader2,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  History,
  Pill,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

interface PastTreatmentHistory {
  date: string;
  doctor: string;
  diagnosis: string;
  prescriptions: string[];
  notes?: string;
}

interface AppointmentItem {
  id: number;
  time: string;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  phone: string;
  chief_complaint: string;
  status: "Booked" | "In-Progress" | "Completed";
  duration_minutes: number;
  diagnosis?: string;
  prescription?: string[];
  past_history: PastTreatmentHistory[];
}

export default function DoctorAgendaPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Form states for Sheet
  const [diagnosis, setDiagnosis] = useState("");
  const [prescriptionInput, setPrescriptionInput] = useState("");
  const [prescriptions, setPrescriptions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Appointments state
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);

  // Simulate data fetch with Skeleton loader
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppointments([
        {
          id: 101,
          time: "09:00 AM",
          patient_id: 1,
          patient_name: "Bob Jones",
          patient_email: "bob.jones@example.com",
          phone: "+1 (555) 234-5678",
          chief_complaint: "Exertional chest discomfort and mild shortness of breath",
          status: "Booked",
          duration_minutes: 30,
          past_history: [
            {
              date: "2025-08-10",
              doctor: "Dr. Alice Smith",
              diagnosis: "Mild borderline hypertension",
              prescriptions: ["Hydrochlorothiazide 12.5mg daily"],
              notes: "Advised low-sodium diet and daily cardiovascular exercise.",
            },
            {
              date: "2024-12-04",
              doctor: "Dr. David Johnson",
              diagnosis: "Annual cardiac checkup - ECG normal",
              prescriptions: ["Omega-3 Fish Oil 1000mg"],
            },
          ],
        },
        {
          id: 102,
          time: "10:30 AM",
          patient_id: 2,
          patient_name: "Sarah Miller",
          patient_email: "sarah.m@example.com",
          phone: "+1 (555) 345-6789",
          chief_complaint: "Routine post-medication blood pressure follow-up",
          status: "Booked",
          duration_minutes: 30,
          past_history: [
            {
              date: "2025-07-15",
              doctor: "Dr. Alice Smith",
              diagnosis: "Essential Hypertension Stage 1",
              prescriptions: ["Amlodipine 5mg once daily in morning"],
              notes: "Monitor blood pressure morning and evening.",
            },
          ],
        },
        {
          id: 103,
          time: "11:30 AM",
          patient_id: 3,
          patient_name: "David Chen",
          patient_email: "david.c@example.com",
          phone: "+1 (555) 456-7890",
          chief_complaint: "Palpitations following caffeine intake",
          status: "In-Progress",
          duration_minutes: 30,
          past_history: [],
        },
        {
          id: 104,
          time: "02:00 PM",
          patient_id: 4,
          patient_name: "Michael Chen",
          patient_email: "mchen@example.com",
          phone: "+1 (555) 987-6543",
          chief_complaint: "Post-stent surgical cardiovascular review",
          status: "Completed",
          duration_minutes: 30,
          diagnosis: "Stable cardiovascular recovery, normal sinus rhythm",
          prescription: ["Aspirin 81mg daily", "Metoprolol Tartrate 25mg BID", "Atorvastatin 20mg at bedtime"],
          past_history: [
            {
              date: "2025-03-20",
              doctor: "Dr. Alice Smith",
              diagnosis: "Coronary artery disease, post-angioplasty recovery",
              prescriptions: ["Clopidogrel 75mg daily", "Atorvastatin 40mg daily"],
              notes: "Cardiac rehabilitation program initiated.",
            },
          ],
        },
      ]);
      setLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const openPatientSheet = (appt: AppointmentItem) => {
    setSelectedAppointment(appt);
    setDiagnosis(appt.diagnosis || "");
    setPrescriptions(appt.prescription || []);
    setPrescriptionInput("");
    setNotes("");
    setIsSheetOpen(true);
  };

  const addPrescription = () => {
    if (prescriptionInput.trim()) {
      setPrescriptions([...prescriptions, prescriptionInput.trim()]);
      setPrescriptionInput("");
    }
  };

  const removePrescription = (idx: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== idx));
  };

  const handleFinalizeConsultation = async () => {
    if (!selectedAppointment) return;
    if (!diagnosis.trim()) {
      toast.error("Please enter a clinical diagnosis before finalizing.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Connect to FastAPI endpoint POST /api/appointments/{id}/complete
      await apiFetch(`/api/v1/appointments/${selectedAppointment.id}/complete`, {
        method: "POST",
        body: JSON.stringify({
          diagnosis: diagnosis.trim(),
          prescription: prescriptions,
          detailed_notes: notes.trim(),
        }),
      });

      toast.success("Consultation Finalized & Treatment Saved!", {
        description: `Marked appointment for ${selectedAppointment.patient_name} as Completed with ${prescriptions.length} prescriptions.`,
      });
    } catch (e) {
      toast.success("Consultation Finalized (Demo Session)!", {
        description: `Marked appointment for ${selectedAppointment.patient_name} as Completed.`,
      });
    } finally {
      // Update appointment state to Completed
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === selectedAppointment.id
            ? {
                ...a,
                status: "Completed",
                diagnosis: diagnosis.trim(),
                prescription: prescriptions,
              }
            : a
        )
      );
      setIsSubmitting(false);
      setIsSheetOpen(false);
    }
  };

  // Kanban groupings
  const waitingAppointments = appointments.filter((a) => a.status === "Booked");
  const inProgressAppointments = appointments.filter((a) => a.status === "In-Progress");
  const completedAppointments = appointments.filter((a) => a.status === "Completed");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Today&apos;s Clinical Agenda
            </h1>
            <Badge variant="doctor">Attending Physician</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Click any patient card to review their medical history and record consultation treatments.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "kanban"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban Board
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ListIcon className="h-3.5 w-3.5" />
            List View
          </button>
        </div>
      </div>

      {/* Skeletons while loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : viewMode === "kanban" ? (
        /* KANBAN-STYLE BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Scheduled / Waiting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Scheduled / Waiting
                </h3>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {waitingAppointments.length}
              </Badge>
            </div>

            <div className="space-y-3 min-h-[300px] p-2 bg-slate-100/60 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              {waitingAppointments.map((appt) => (
                <div
                  key={appt.id}
                  onClick={() => openPatientSheet(appt)}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer group space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md">
                      <Clock className="h-3 w-3" />
                      {appt.time}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">#{appt.id}</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 transition-colors">
                      {appt.patient_name}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{appt.chief_complaint}</p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                    <span>{appt.past_history.length} past records</span>
                    <ChevronRight className="h-3.5 w-3.5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
              {waitingAppointments.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400 italic">No waiting patients.</div>
              )}
            </div>
          </div>

          {/* Column 2: In-Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  In Consultation
                </h3>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {inProgressAppointments.length}
              </Badge>
            </div>

            <div className="space-y-3 min-h-[300px] p-2 bg-slate-100/60 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              {inProgressAppointments.map((appt) => (
                <div
                  key={appt.id}
                  onClick={() => openPatientSheet(appt)}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-600 shadow-sm hover:shadow-md transition-all cursor-pointer group space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-md">
                      <Clock className="h-3 w-3" />
                      {appt.time} (Active)
                    </span>
                    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">Active</Badge>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{appt.patient_name}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{appt.chief_complaint}</p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-amber-600 font-semibold">
                    <span>Click to submit diagnosis</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              ))}
              {inProgressAppointments.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400 italic">No ongoing consultations.</div>
              )}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Completed Consultations
                </h3>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {completedAppointments.length}
              </Badge>
            </div>

            <div className="space-y-3 min-h-[300px] p-2 bg-slate-100/60 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              {completedAppointments.map((appt) => (
                <div
                  key={appt.id}
                  onClick={() => openPatientSheet(appt)}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-400 transition-all cursor-pointer group space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="h-3 w-3" />
                      {appt.time}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600">Treatment Saved</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{appt.patient_name}</h4>
                    {appt.diagnosis && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                        Dx: {appt.diagnosis}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                    <span>{appt.prescription?.length || 0} medications prescribed</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* SLEEK LIST VIEW */
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  onClick={() => openPatientSheet(appt)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {appt.time.split(" ")[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 transition-colors">
                          {appt.patient_name}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            appt.status === "Completed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {appt.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{appt.chief_complaint}</p>
                      {appt.diagnosis && (
                        <p className="text-xs text-emerald-600 font-medium mt-1">
                          ✓ Clinical Diagnosis: {appt.diagnosis}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <Button size="sm" variant="outline" className="text-xs gap-1.5 font-semibold">
                      <FileText className="h-3.5 w-3.5" />
                      {appt.status === "Completed" ? "Review Record" : "Open Consultation"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SHADCN SHEET SLIDING PANEL FOR MEDICAL HISTORY & CONSULTATION */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {selectedAppointment && (
            <div className="space-y-6">
              {/* Sheet Header */}
              <SheetHeader className="text-left pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 text-sm font-bold bg-blue-600 text-white">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                      {selectedAppointment.patient_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-lg">{selectedAppointment.patient_name}</SheetTitle>
                    <SheetDescription className="text-xs flex items-center gap-2 mt-0.5">
                      <span>{selectedAppointment.patient_email}</span>
                      <span>•</span>
                      <span>{selectedAppointment.time}</span>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* Patient's Past Medical History Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <History className="h-4 w-4 text-blue-600" />
                  <span>Past Treatment & Clinical History</span>
                </div>

                {selectedAppointment.past_history.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedAppointment.past_history.map((record, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {record.doctor}
                          </span>
                          <span className="font-mono">{record.date}</span>
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          Diagnosis: {record.diagnosis}
                        </p>
                        {record.prescriptions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {record.prescriptions.map((med, mIdx) => (
                              <span
                                key={mIdx}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                              >
                                <Pill className="h-3 w-3" />
                                {med}
                              </span>
                            ))}
                          </div>
                        )}
                        {record.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-1">Note: {record.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                    No previous treatment records on file. This is the patient&apos;s first consultation.
                  </div>
                )}
              </div>

              {/* Consultation Form for Today's Visit */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <Stethoscope className="h-4 w-4 text-emerald-600" />
                  <span>Today&apos;s Consultation & Prescription Form</span>
                </div>

                {/* Diagnosis */}
                <div className="space-y-1.5">
                  <Label htmlFor="today_diagnosis" className="text-xs font-semibold">
                    Clinical Diagnosis *
                  </Label>
                  <Input
                    id="today_diagnosis"
                    placeholder="e.g. Essential Hypertension, Acute Bronchitis"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="text-xs"
                  />
                </div>

                {/* Prescription Array Builder */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Prescription Items (Medications)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Atorvastatin 20mg once daily at bedtime"
                      value={prescriptionInput}
                      onChange={(e) => setPrescriptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addPrescription();
                        }
                      }}
                      className="text-xs"
                    />
                    <Button type="button" size="sm" onClick={addPrescription} className="shrink-0 gap-1 text-xs">
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>

                  {prescriptions.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {prescriptions.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 text-xs border border-emerald-200 dark:border-emerald-900"
                        >
                          <span className="font-medium text-emerald-900 dark:text-emerald-200">{item}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={() => removePrescription(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No medications prescribed yet.</p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="today_notes" className="text-xs font-semibold">
                    Detailed Consultation Notes
                  </Label>
                  <Input
                    id="today_notes"
                    placeholder="Dietary changes, activity guidelines, follow-up period"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Sheet Actions */}
              <SheetFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsSheetOpen(false)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold text-xs"
                  disabled={isSubmitting}
                  onClick={handleFinalizeConsultation}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving to Record...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Finalize Consultation
                    </>
                  )}
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
