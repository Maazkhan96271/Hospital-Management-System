"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarPlus,
  CalendarCheck,
  FileText,
  Clock,
  ArrowRight,
  Stethoscope,
  HeartPulse,
} from "lucide-react";

export default function PatientDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Patient Health Portal
            </h1>
            <Badge variant="patient">Registered Patient</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, {user?.first_name || "Patient"}! Manage your medical consultations and treatment records.
          </p>
        </div>

        <Button asChild className="gap-2 font-bold shadow-md bg-blue-600 hover:bg-blue-700">
          <Link href="/patient/book">
            <CalendarPlus className="h-4 w-4" />
            Book New Appointment
          </Link>
        </Button>
      </div>

      {/* Active Consultation Spotlight */}
      <Card className="border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/40 dark:from-slate-900 dark:to-slate-900/60 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <HeartPulse className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Next Consultation: Dr. Alice Smith (Cardiologist)
                  </h3>
                  <Badge variant="default" className="text-[10px]">Upcoming</Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Scheduled for Monday at 09:30 AM • Department of Cardiovascular Medicine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline" className="text-xs">
                <Link href="/patient/appointments">View Full History</Link>
              </Button>
              <Button asChild size="sm" className="text-xs font-semibold">
                <Link href="/patient/book">Reschedule</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-blue-300 transition-all">
          <CardHeader>
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mb-1">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Slot Booking Engine</CardTitle>
            <CardDescription className="text-xs">
              Check 7-day doctor availability and select an open 30-minute consultation slot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="link" className="p-0 text-xs font-semibold text-blue-600 gap-1">
              <Link href="/patient/book">
                Book a Slot Now <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-300 transition-all">
          <CardHeader>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-1">
              <FileText className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Prescriptions & Diagnoses</CardTitle>
            <CardDescription className="text-xs">
              Access your medical treatment history and physician notes securely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="link" className="p-0 text-xs font-semibold text-emerald-600 gap-1">
              <Link href="/patient/records">
                View Medical Notes <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-purple-300 transition-all">
          <CardHeader>
            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center mb-1">
              <Stethoscope className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Hospital Medical Staff</CardTitle>
            <CardDescription className="text-xs">
              Explore doctors by clinical department, qualification, and experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="link" className="p-0 text-xs font-semibold text-purple-600 gap-1">
              <Link href="/doctors">
                Browse Directory <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
