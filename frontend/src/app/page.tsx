"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  HeartPulse,
  CalendarCheck,
  Stethoscope,
  ShieldCheck,
  Users,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  const { user, isAuthenticated, role } = useAuth();

  return (
    <div className="space-y-10 py-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white p-8 sm:p-12 shadow-xl shadow-blue-600/20">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-blue-200" />
            <span>Next.js App Router + FastAPI & PostgreSQL</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Modern Healthcare, <br />
            Seamless Hospital Care.
          </h1>

          <p className="text-base sm:text-lg text-blue-100 max-w-2xl leading-relaxed">
            Experience role-based clinical excellence for Hospital Administrators, Attending Physicians, and Registered Patients with automated 30-minute booking and conflict prevention.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {isAuthenticated ? (
              <Button asChild size="lg" className="bg-white text-blue-800 hover:bg-blue-50 font-bold shadow-lg">
                <Link href={role === "Admin" ? "/admin/dashboard" : role === "Doctor" ? "/doctor/agenda" : "/patient/dashboard"}>
                  Go to {role} Dashboard
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="bg-white text-blue-800 hover:bg-blue-50 font-bold shadow-lg">
                  <Link href="/login">
                    Sign In to Portal
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/30 backdrop-blur-sm font-semibold">
                  <Link href="/register">
                    New Patient Registration
                  </Link>
                </Button>
              </>
            )}
            <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10">
              <Link href="/doctors">
                Browse Specialists
              </Link>
            </Button>
          </div>
        </div>

        {/* Decorative background pulse icon */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
          <HeartPulse className="w-96 h-96 text-white" />
        </div>
      </div>

      {/* Role Portals Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Role-Based Portals
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Dedicated workflows designed for every hospital stakeholder
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Patient Portal Card */}
          <Card className="border-emerald-200/60 dark:border-emerald-900/40 hover:shadow-lg hover:border-emerald-300 transition-all group">
            <CardHeader>
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-2 shadow-xs group-hover:scale-110 transition-transform">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Patient Portal</CardTitle>
                <Badge variant="patient">Self-Service</Badge>
              </div>
              <CardDescription>
                Find specialists by department and book available 30-minute slots without double-booking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Real-time 7-day slot availability engine</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Personal appointment history & statuses</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Diagnosis reports and prescriptions</span>
              </div>
            </CardContent>
          </Card>

          {/* Doctor Portal Card */}
          <Card className="border-blue-200/60 dark:border-blue-900/40 hover:shadow-lg hover:border-blue-300 transition-all group">
            <CardHeader>
              <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center mb-2 shadow-xs group-hover:scale-110 transition-transform">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Physician Portal</CardTitle>
                <Badge variant="doctor">Clinical</Badge>
              </div>
              <CardDescription>
                Manage your daily agenda, record consultation diagnoses, and configure weekly working hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Live daily agenda with patient count</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                <span>JSONB 7-day weekly schedule editor</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Treatment records with prescription arrays</span>
              </div>
            </CardContent>
          </Card>

          {/* Admin Portal Card */}
          <Card className="border-purple-200/60 dark:border-purple-900/40 hover:shadow-lg hover:border-purple-300 transition-all group">
            <CardHeader>
              <div className="h-12 w-12 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center mb-2 shadow-xs group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Admin Portal</CardTitle>
                <Badge variant="admin">Operations</Badge>
              </div>
              <CardDescription>
                Hospital oversight, doctor provisioning, department management, and user activity control.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0" />
                <span>Aggregate hospital metrics & analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0" />
                <span>Doctor account and profile provisioning</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0" />
                <span>Patient blacklist / account toggle</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
