"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Stethoscope,
  Building2,
  CalendarCheck,
  Search,
  Award,
  Clock,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  ShieldCheck,
  HeartPulse,
} from "lucide-react";

interface Department {
  id: number;
  name: string;
  description: string | null;
  doctor_count?: number;
}

interface DoctorProfile {
  id: number;
  user_id: number;
  specialization: string | null;
  qualification: string | null;
  experience_years: number;
  weekly_availability: Record<
    string,
    { start: string; end: string; available: boolean }
  >;
  user: {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    is_active: boolean;
  };
  department: {
    id: number;
    name: string;
    description: string | null;
  } | null;
}

export default function PublicDirectoryPage() {
  const { isAuthenticated, role } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("ALL");

  // SWR: Fetch departments
  const { data: departments, isLoading: isDeptLoading } = useSWR<Department[]>(
    "/api/departments/",
    () => apiFetch<Department[]>("/api/departments/")
  );

  // SWR: Fetch active doctors
  const { data: doctors, isLoading: isDoctorsLoading } = useSWR<DoctorProfile[]>(
    "/api/doctors/",
    () => apiFetch<DoctorProfile[]>("/api/doctors/")
  );

  // Filter doctors based on search term and selected department
  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];

    return doctors.filter((doc) => {
      // Department filter
      if (selectedDeptId !== "ALL") {
        if (!doc.department || String(doc.department.id) !== selectedDeptId) {
          return false;
        }
      }

      // Search term
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const fullName = `${doc.user.first_name} ${doc.user.last_name}`.toLowerCase();
      const spec = (doc.specialization || "").toLowerCase();
      const qual = (doc.qualification || "").toLowerCase();
      const deptName = (doc.department?.name || "").toLowerCase();

      return (
        fullName.includes(term) ||
        spec.includes(term) ||
        qual.includes(term) ||
        deptName.includes(term)
      );
    });
  }, [doctors, selectedDeptId, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      {/* Enterprise Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-900 text-white py-14 px-6 md:px-12 rounded-b-3xl shadow-md">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-4 border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Verified Medical Specialists & Departments
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Find the Right Doctor, Book with Confidence
          </h1>
          <p className="mt-3 text-emerald-100 text-sm md:text-base max-w-2xl leading-relaxed">
            Browse our accredited clinical departments, board-certified physicians, and real-time appointment availability. Publicly accessible healthcare index.
          </p>

          {/* Quick Stats in Hero */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl">
            <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
              <span className="text-2xl font-bold block">{doctors ? doctors.length : "—"}</span>
              <span className="text-xs text-emerald-100">Specialist Doctors</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
              <span className="text-2xl font-bold block">{departments ? departments.length : "—"}</span>
              <span className="text-xs text-emerald-100">Clinical Divisions</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
              <span className="text-2xl font-bold block">30 mins</span>
              <span className="text-xs text-emerald-100">Slot Intervals</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
              <span className="text-2xl font-bold block">100%</span>
              <span className="text-xs text-emerald-100">Verified Credentials</span>
            </div>
          </div>
        </div>

        {/* Ambient background blur elements */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-teal-400/20 blur-3xl pointer-events-none" />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Search and Filters Bar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by physician name, clinical specialty (e.g. Cardiology), or credentials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
            />
          </div>

          {/* Department Chips */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Filter by Department
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setSelectedDeptId("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedDeptId === "ALL"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                All Departments ({doctors?.length || 0})
              </button>
              {departments?.map((dept) => {
                const count = (doctors || []).filter(
                  (d) => d.department?.id === dept.id
                ).length;
                return (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDeptId(String(dept.id))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedDeptId === String(dept.id)
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    <span>{dept.name}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Doctor Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
              Available Practitioners ({filteredDoctors.length})
            </h2>
            {searchTerm && (
              <span className="text-xs text-slate-500">
                Filtered by &quot;{searchTerm}&quot;
              </span>
            )}
          </div>

          {isDoctorsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <Card key={idx} className="border-slate-200 dark:border-slate-800 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </Card>
              ))}
            </div>
          ) : filteredDoctors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map((doc) => {
                const initials = `${doc.user.first_name?.[0] || ""}${
                  doc.user.last_name?.[0] || ""
                }`.toUpperCase();

                const sched = doc.weekly_availability || {};
                const availableDays = [
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                  "sunday",
                ].filter((d) => sched[d]?.available);

                return (
                  <Card
                    key={doc.id}
                    className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3.5">
                        <Avatar className="h-14 w-14 border-2 border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950 group-hover:scale-105 transition-transform">
                          <AvatarFallback className="text-emerald-700 dark:text-emerald-300 font-bold text-base">
                            {initials || "DR"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                            Dr. {doc.user.first_name} {doc.user.last_name}
                          </CardTitle>
                          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {doc.specialization || "General Medicine"}
                          </p>
                          {doc.department && (
                            <Badge
                              variant="outline"
                              className="mt-1.5 text-[10px] bg-slate-50 dark:bg-slate-950 border-slate-200"
                            >
                              <Building2 className="h-2.5 w-2.5 mr-1 text-slate-400" />
                              {doc.department.name}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <CardDescription className="text-xs text-slate-500 pt-3 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{doc.qualification || "Board Certified"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{doc.experience_years} years clinical experience</span>
                        </div>
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="py-2 text-xs">
                      {/* Weekly Availability Chips */}
                      <div className="space-y-1 bg-slate-50/80 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Available Days
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((shortDay) => {
                            const fullDay = {
                              Mon: "monday",
                              Tue: "tuesday",
                              Wed: "wednesday",
                              Thu: "thursday",
                              Fri: "friday",
                              Sat: "saturday",
                              Sun: "sunday",
                            }[shortDay]!;
                            const isAvail = sched[fullDay]?.available;

                            return (
                              <span
                                key={shortDay}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  isAvail
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold"
                                    : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                                }`}
                              >
                                {shortDay}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      {isAuthenticated && role === "Patient" ? (
                        <Link
                          href={`/patient/book?doctor_id=${doc.id}`}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                        >
                          <CalendarCheck className="h-3.5 w-3.5" />
                          Book Appointment
                        </Link>
                      ) : (
                        <Link
                          href={`/login?redirect=/patient/book?doctor_id=${doc.id}`}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold transition-colors"
                        >
                          Sign In to Book <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center border border-dashed rounded-2xl border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
              <Stethoscope className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-800 dark:text-slate-200">
                No doctors match your query
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try clearing search terms or selecting another department.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedDeptId("ALL");
                }}
                className="mt-4 text-xs"
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
