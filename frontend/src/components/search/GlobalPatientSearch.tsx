"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import {
  Search,
  User,
  Calendar,
  Phone,
  Mail,
  X,
  Clock,
  ArrowRight,
  Stethoscope,
  Copy,
  Check,
  CalendarPlus,
  FileText,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import Link from "next/link";

export interface PatientSearchResult {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone?: string;
  is_active: boolean;
  role?: { name: string };
  department?: string;
  blood_group?: string;
  last_visit?: string;
  next_appointment?: string;
}

// Fallback patient records for instant query response and demo data
const SAMPLE_PATIENTS: PatientSearchResult[] = [
  {
    id: 101,
    first_name: "Robert",
    last_name: "Taylor",
    username: "rtaylor",
    email: "robert.taylor@medicare.io",
    phone: "+1 (555) 349-2041",
    is_active: true,
    department: "Cardiology",
    blood_group: "O+",
    last_visit: "Oct 20, 2026",
    next_appointment: "Nov 02, 2026 (09:30 AM)",
  },
  {
    id: 102,
    first_name: "Sarah",
    last_name: "Connor",
    username: "sconnor",
    email: "sarah.connor@medicare.io",
    phone: "+1 (555) 482-1920",
    is_active: true,
    department: "Neurology",
    blood_group: "A-",
    last_visit: "Oct 15, 2026",
    next_appointment: "Nov 04, 2026 (11:00 AM)",
  },
  {
    id: 103,
    first_name: "Michael",
    last_name: "Chang",
    username: "mchang",
    email: "michael.chang@medicare.io",
    phone: "+1 (555) 839-4412",
    is_active: true,
    department: "Orthopedics",
    blood_group: "B+",
    last_visit: "Oct 25, 2026",
  },
  {
    id: 104,
    first_name: "Emily",
    last_name: "Watson",
    username: "ewatson",
    email: "emily.watson@medicare.io",
    phone: "+1 (555) 923-8819",
    is_active: true,
    department: "Pediatrics",
    blood_group: "AB+",
    last_visit: "Sep 28, 2026",
    next_appointment: "Nov 03, 2026 (02:30 PM)",
  },
  {
    id: 105,
    first_name: "David",
    last_name: "Miller",
    username: "dmiller",
    email: "david.miller@medicare.io",
    phone: "+1 (555) 714-3320",
    is_active: false,
    department: "General Medicine",
    blood_group: "O-",
    last_visit: "Aug 12, 2026",
  },
];

interface GlobalPatientSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalPatientSearch({ isOpen, onClose }: GlobalPatientSearchProps) {
  const { role, token } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PatientSearchResult[]>(SAMPLE_PATIENTS);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on dialog open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      setSelectedPatient(null);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle live search
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setResults(SAMPLE_PATIENTS);
      setLoading(false);
      return;
    }

    setLoading(true);
    const debounceTimer = setTimeout(async () => {
      try {
        if (token) {
          const apiData = await apiFetch<PatientSearchResult[]>(
            `/api/v1/users/patients/search?q=${encodeURIComponent(trimmed)}`
          );
          if (apiData && apiData.length > 0) {
            setResults(apiData);
            setSelectedIndex(0);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        // Fallback to local filtering
      }

      // Filter local sample patients
      const filtered = SAMPLE_PATIENTS.filter((p) => {
        const idMatch = p.id.toString().includes(trimmed.replace("#", ""));
        const nameMatch = `${p.first_name} ${p.last_name}`.toLowerCase().includes(trimmed);
        const emailMatch = p.email.toLowerCase().includes(trimmed);
        const phoneMatch = p.phone ? p.phone.includes(trimmed) : false;
        return idMatch || nameMatch || emailMatch || phoneMatch;
      });

      setResults(filtered);
      setSelectedIndex(0);
      setLoading(false);
    }, 150);

    return () => clearTimeout(debounceTimer);
  }, [query, isOpen, token]);

  // Keyboard navigation within search
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedPatient) {
          setSelectedPatient(null);
        } else {
          onClose();
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        setSelectedPatient(results[selectedIndex]);
      }
    },
    [results, selectedIndex, selectedPatient, onClose]
  );

  const copyPatientInfo = (patient: PatientSearchResult) => {
    navigator.clipboard.writeText(
      `Patient #${patient.id} - ${patient.first_name} ${patient.last_name} (${patient.email})`
    );
    setCopiedId(true);
    toast.success("Patient details copied to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80">
          <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients by name, email, or ID (e.g. #101, Sarah)..."
            className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mr-2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Modal Body: Either Patient Details or Search Results */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
          {selectedPatient ? (
            /* Selected Patient Detail Card */
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 ring-2 ring-blue-500/20">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-lg">
                      {selectedPatient.first_name[0]}
                      {selectedPatient.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </h3>
                      <Badge variant="outline" className="font-mono text-xs">
                        #{selectedPatient.id}
                      </Badge>
                      <Badge
                        variant={selectedPatient.is_active ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {selectedPatient.is_active ? "Active Patient" : "Suspended"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Username: @{selectedPatient.username} • Department:{" "}
                      {selectedPatient.department || "General"}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyPatientInfo(selectedPatient)}
                  className="gap-1.5 text-xs h-8"
                >
                  {copiedId ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Info
                    </>
                  )}
                </Button>
              </div>

              {/* Patient Meta Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
                  <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                  <div className="truncate">
                    <p className="text-[11px] font-medium text-slate-400">Email Address</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {selectedPatient.email}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
                  <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-[11px] font-medium text-slate-400">Phone</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      {selectedPatient.phone || "Not recorded"}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-[11px] font-medium text-slate-400">Last Consultation</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      {selectedPatient.last_visit || "None recorded"}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-purple-500 shrink-0" />
                  <div>
                    <p className="text-[11px] font-medium text-slate-400">Next Upcoming</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      {selectedPatient.next_appointment || "No upcoming slot"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  ← Back to results
                </Button>

                <div className="flex items-center gap-2">
                  {role === "Doctor" ? (
                    <Button
                      asChild
                      size="sm"
                      className="gap-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700"
                      onClick={onClose}
                    >
                      <Link href="/doctor/agenda">
                        <Stethoscope className="h-3.5 w-3.5" />
                        Open in Agenda
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="sm"
                      className="gap-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700"
                      onClick={onClose}
                    >
                      <Link href={`/admin/dashboard`}>
                        <FileText className="h-3.5 w-3.5" />
                        Manage in Admin
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Results List */
            <>
              {loading && (
                <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
                  Searching database...
                </div>
              )}

              {!loading && results.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <AlertCircle className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No matching patients found
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Try searching with another keyword or patient ID.
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>
                      {query.trim() ? "Search Results" : "Quick Access Patients"}
                    </span>
                    <span>{results.length} found</span>
                  </div>

                  {results.map((patient, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <div
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback
                              className={`text-xs font-bold ${
                                isSelected
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {patient.first_name[0]}
                              {patient.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold truncate">
                                {patient.first_name} {patient.last_name}
                              </span>
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px] py-0 px-1.5"
                              >
                                #{patient.id}
                              </Badge>
                              {patient.next_appointment && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-0">
                                  Upcoming
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                              {patient.email} {patient.phone ? `• ${patient.phone}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs shrink-0 ml-3">
                          <span className="hidden sm:inline-block text-[11px] text-slate-400">
                            {patient.department || "General"}
                          </span>
                          <ArrowRight
                            className={`h-4 w-4 transition-transform ${
                              isSelected
                                ? "text-blue-600 dark:text-blue-400 translate-x-0.5"
                                : "text-slate-300 dark:text-slate-600"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Keybinding Helper Footer */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                ↓
              </kbd>
              to navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                ↵
              </kbd>
              to inspect
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Instant Patient Search</span>
          </div>
        </div>
      </div>
    </div>
  );
}
