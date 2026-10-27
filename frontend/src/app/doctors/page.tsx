"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Stethoscope,
  Building2,
  CalendarCheck,
  Search,
  Award,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function DoctorsDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("All");

  const doctors = [
    {
      id: 1,
      name: "Dr. Alice Smith",
      specialization: "Cardiologist",
      department: "Cardiology",
      qualification: "MD, FACC - Harvard Medical School",
      experience: "12 years experience",
      availability: "Mon – Fri (09:00 – 17:00)",
      availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    },
    {
      id: 2,
      name: "Dr. David Johnson",
      specialization: "Neurologist",
      department: "Neurology",
      qualification: "MD, PhD - Johns Hopkins",
      experience: "15 years experience",
      availability: "Mon, Wed, Fri (08:30 – 16:30)",
      availableDays: ["Mon", "Wed", "Fri"],
    },
    {
      id: 3,
      name: "Dr. Elena Rostova",
      specialization: "Orthopedic Surgeon",
      department: "Orthopedics",
      qualification: "MBBS, MS (Ortho) - Mayo Clinic",
      experience: "10 years experience",
      availability: "Tue, Thu, Sat (10:00 – 15:00)",
      availableDays: ["Tue", "Thu", "Sat"],
    },
    {
      id: 4,
      name: "Dr. Robert Patel",
      specialization: "Pediatrician",
      department: "Pediatrics",
      qualification: "MD, FAAP - Stanford University",
      experience: "8 years experience",
      availability: "Mon – Fri (09:00 – 14:00)",
      availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    },
  ];

  const departments = ["All", "Cardiology", "Neurology", "Orthopedics", "Pediatrics"];

  const filtered = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === "All" || doc.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Specialist Directory
          </h1>
          <Badge variant="doctor">Medical Staff</Badge>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Explore hospital physicians, qualifications, and live weekly availability.
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Department Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {departments.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedDept === dept
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search doctor or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Doctor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((doc) => (
          <Card key={doc.id} className="border-slate-200/90 dark:border-slate-800 hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{doc.name}</CardTitle>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{doc.specialization}</p>
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

              {/* 7-Day Availability Indicator */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">7-Day Schedule</span>
                  <span className="text-slate-400">{doc.availability}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                    const isAvailable = doc.availableDays.includes(day);
                    return (
                      <span
                        key={day}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isAvailable
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 line-through opacity-50"
                        }`}
                      >
                        {day}
                      </span>
                    );
                  })}
                </div>
              </div>

              <Button asChild size="sm" className="w-full gap-2 text-xs font-bold">
                <Link href={`/patient/book?doctor_id=${doc.id}`}>
                  Book 30-Min Consultation <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
