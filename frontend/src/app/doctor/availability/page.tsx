"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarPlus,
  Clock,
  CheckCircle2,
  Save,
  Plus,
  Trash2,
  Video,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

interface DaySchedule {
  day: string;
  enabled: boolean;
  slots: string[];
  mode: "Both" | "Video" | "Clinic";
}

const INITIAL_SCHEDULE: DaySchedule[] = [
  { day: "Monday", enabled: true, slots: ["09:00 AM", "10:30 AM", "01:00 PM", "03:30 PM", "05:00 PM"], mode: "Both" },
  { day: "Tuesday", enabled: true, slots: ["09:00 AM", "10:30 AM", "01:00 PM", "03:30 PM"], mode: "Both" },
  { day: "Wednesday", enabled: true, slots: ["09:00 AM", "10:30 AM", "02:00 PM", "04:30 PM"], mode: "Video" },
  { day: "Thursday", enabled: true, slots: ["09:00 AM", "10:30 AM", "01:00 PM", "03:30 PM", "05:00 PM"], mode: "Both" },
  { day: "Friday", enabled: true, slots: ["09:00 AM", "11:00 AM", "02:00 PM"], mode: "Clinic" },
  { day: "Saturday", enabled: false, slots: ["10:00 AM", "12:00 PM"], mode: "Video" },
  { day: "Sunday", enabled: false, slots: [], mode: "Both" },
];

export default function DoctorAvailabilityPage() {
  const [schedule, setSchedule] = useState<DaySchedule[]>(INITIAL_SCHEDULE);
  const [isSaving, setIsSaving] = useState(false);

  const toggleDay = (index: number) => {
    setSchedule((prev) =>
      prev.map((s, i) => (i === index ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Schedule Updated Successfully", {
        description: "Your 7-day consultation roster is synchronized with the hospital booking system.",
      });
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CalendarPlus className="h-5 w-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              7-Day Availability Roster
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Define recurring consultation hours, switch between in-person and telemedicine blocks, and manage patient capacity.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 h-10 px-5 shadow-sm"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving Roster..." : "Save Availability"}
        </Button>
      </div>

      <div className="space-y-4">
        {schedule.map((item, idx) => (
          <Card
            key={item.day}
            className={`border transition-all ${
              item.enabled
                ? "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
                : "border-slate-200/40 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/20 opacity-70"
            }`}
          >
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={() => toggleDay(idx)}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    {item.day}
                    {item.enabled ? (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]">
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Off Duty
                      </Badge>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mode: {item.mode === "Both" ? "Clinic + Video Telemed" : item.mode}
                  </p>
                </div>
              </div>

              {item.enabled ? (
                <div className="flex flex-wrap gap-1.5 items-center">
                  {item.slots.map((slot, sIdx) => (
                    <Badge
                      key={sIdx}
                      variant="outline"
                      className="font-mono text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-1 px-2"
                    >
                      <Clock className="h-3 w-3 mr-1 text-slate-400" />
                      {slot}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">No consultation slots allocated</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
