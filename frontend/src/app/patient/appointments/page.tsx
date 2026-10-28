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
  CalendarPlus,
  Video,
  Building2,
  CreditCard,
} from "lucide-react";
import { PaymentGatewayModal } from "@/components/telemedicine/PaymentGatewayModal";
import { VideoCallModal } from "@/components/telemedicine/VideoCallModal";

interface PatientAppointment {
  id: number;
  doctor_name: string;
  specialty: string;
  date: string;
  time: string;
  duration: number;
  consultation_type: "In-Person" | "Video";
  payment_status: "Unpaid" | "Paid";
  status: "Booked" | "Completed" | "Cancelled";
  fee: number;
  isToday?: boolean;
}

const APPOINTMENTS_DATA: PatientAppointment[] = [
  {
    id: 101,
    doctor_name: "Dr. Alice Smith",
    specialty: "Cardiology",
    date: "Today, Oct 28",
    time: "09:30 AM",
    duration: 30,
    consultation_type: "Video",
    payment_status: "Paid",
    status: "Booked",
    fee: 500,
    isToday: true,
  },
  {
    id: 98,
    doctor_name: "Dr. Robert Chen",
    specialty: "Neurology",
    date: "Nov 04, 2026",
    time: "02:00 PM",
    duration: 30,
    consultation_type: "In-Person",
    payment_status: "Unpaid",
    status: "Booked",
    fee: 650,
    isToday: false,
  },
  {
    id: 85,
    doctor_name: "Dr. Sarah Patel",
    specialty: "Orthopedics",
    date: "Sep 18, 2026",
    time: "11:00 AM",
    duration: 30,
    consultation_type: "In-Person",
    payment_status: "Paid",
    status: "Completed",
    fee: 550,
    isToday: false,
  },
];

export default function PatientAppointmentsPage() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<PatientAppointment[]>(APPOINTMENTS_DATA);
  const [payAppt, setPayAppt] = useState<PatientAppointment | null>(null);
  const [videoAppt, setVideoAppt] = useState<PatientAppointment | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              My Appointments
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your active bookings, join telemedicine video consultations, and settle pending fees.
          </p>
        </div>

        <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm">
          <Link href="/patient/book">
            <CalendarPlus className="h-3.5 w-3.5" />
            Book New Appointment
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <Card
              key={appt.id}
              className="border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-all bg-white dark:bg-slate-900 overflow-hidden"
            >
              <CardContent className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border-2 border-blue-500/30">
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-sm">
                      {appt.doctor_name.replace("Dr. ", "").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {appt.doctor_name}
                      </h3>
                      <Badge
                        className={
                          appt.status === "Completed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px]"
                        }
                      >
                        {appt.status}
                      </Badge>
                      {appt.consultation_type === "Video" ? (
                        <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-0 text-[10px] gap-1">
                          <Video className="h-2.5 w-2.5" /> Video Telemed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1 text-slate-500">
                          <Building2 className="h-2.5 w-2.5" /> Clinic Visit
                        </Badge>
                      )}
                      <Badge
                        className={
                          appt.payment_status === "Paid"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]"
                            : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-0 text-[10px]"
                        }
                      >
                        {appt.payment_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {appt.specialty} • {appt.date} at {appt.time} ({appt.duration} mins)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
                  {/* Pulsing Video Call Button */}
                  {appt.consultation_type === "Video" && appt.status === "Booked" && (
                    <Button
                      size="sm"
                      onClick={() => setVideoAppt(appt)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 gap-1.5 animate-pulse ring-2 ring-emerald-400 shadow-sm"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Join Video Call
                    </Button>
                  )}

                  {/* Pay Now Button */}
                  {appt.payment_status === "Unpaid" && (
                    <Button
                      size="sm"
                      onClick={() => setPayAppt(appt)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 gap-1.5 shadow-sm"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Pay (${appt.fee})
                    </Button>
                  )}

                  <Button asChild variant="outline" size="sm" className="text-xs font-semibold h-9">
                    <Link href={`/doctors/${appt.id % 5 || 1}`}>
                      Doctor Profile
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Telemedicine Video Conference Modal */}
      {videoAppt && (
        <VideoCallModal
          isOpen={videoAppt !== null}
          onClose={() => setVideoAppt(null)}
          appointmentId={videoAppt.id}
          participantName={videoAppt.doctor_name}
          participantRole="Doctor"
          consultationDate={videoAppt.date}
          consultationTime={videoAppt.time}
          department={videoAppt.specialty}
        />
      )}

      {/* Payment Gateway Modal */}
      {payAppt && (
        <PaymentGatewayModal
          isOpen={payAppt !== null}
          onClose={() => setPayAppt(null)}
          appointmentId={payAppt.id}
          doctorName={payAppt.doctor_name}
          consultationType={payAppt.consultation_type}
          consultationDate={payAppt.date}
          consultationTime={payAppt.time}
          amount={payAppt.fee}
          onPaymentSuccess={(apptId) => {
            setAppointments((prev) =>
              prev.map((a) => (a.id === apptId ? { ...a, payment_status: "Paid" } : a))
            );
            setPayAppt(null);
          }}
        />
      )}
    </div>
  );
}
