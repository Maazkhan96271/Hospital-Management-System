"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarCheck,
  Clock,
  Video,
  Building2,
  ChevronRight,
  Stethoscope,
  Filter,
} from "lucide-react";
import { VideoCallModal } from "@/components/telemedicine/VideoCallModal";

export default function DoctorAppointmentsPage() {
  const [loading, setLoading] = useState(true);
  const [videoAppt, setVideoAppt] = useState<any | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  const appointments = [
    { id: 101, patient: "Bob Jones", time: "09:00 AM", type: "Video", status: "Booked", complaint: "Chest discomfort and mild palpitations" },
    { id: 102, patient: "Jane Doe", time: "10:00 AM", type: "In-Person", status: "Booked", complaint: "Persistent cough and sinus congestion" },
    { id: 103, patient: "Carlos Rivera", time: "11:30 AM", type: "Video", status: "In-Progress", complaint: "Ankle swelling and pain after jogging" },
    { id: 104, patient: "Sophia Martinez", time: "02:00 PM", type: "In-Person", status: "Booked", complaint: "Routine quarterly diabetes review" },
    { id: 105, patient: "Michael Chang", time: "03:30 PM", type: "Video", status: "Completed", complaint: "Post-stent surgical cardiovascular review" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Physician Appointments
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            View patient roster, launch telemedicine video rooms, and record EMR clinical charts.
          </p>
        </div>

        <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm">
          <Link href="/doctor/agenda">
            <Stethoscope className="h-3.5 w-3.5" />
            Open Active EMR Agenda
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : (
        <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs font-bold text-slate-500 w-16">{appt.time}</span>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700">
                      {appt.patient.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{appt.patient}</p>
                    <p className="text-xs text-slate-500">{appt.complaint}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
                  {appt.type === "Video" ? (
                    <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-0 text-xs gap-1">
                      <Video className="h-3 w-3" /> Video
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs gap-1 text-slate-500">
                      <Building2 className="h-3 w-3" /> Clinic
                    </Badge>
                  )}

                  <Badge
                    className={
                      appt.status === "Completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : appt.status === "In-Progress"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-amber-100 text-amber-800"
                    }
                  >
                    {appt.status}
                  </Badge>

                  {appt.type === "Video" && appt.status !== "Completed" && (
                    <Button
                      size="sm"
                      onClick={() => setVideoAppt(appt)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 gap-1.5 animate-pulse ring-2 ring-emerald-400 shadow-sm"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Join Video Call
                    </Button>
                  )}

                  <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                    <Link href="/doctor/agenda">
                      EMR Chart <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {videoAppt && (
        <VideoCallModal
          isOpen={videoAppt !== null}
          onClose={() => setVideoAppt(null)}
          appointmentId={videoAppt.id}
          participantName={videoAppt.patient}
          participantRole="Patient"
          consultationDate="Today"
          consultationTime={videoAppt.time}
          department="Clinical Practice"
        />
      )}
    </div>
  );
}
