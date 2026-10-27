"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Home,
  CalendarCheck,
  Search,
  User,
  LogOut,
  LayoutDashboard,
  Stethoscope,
  Pill,
  FlaskConical,
  Receipt,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  CalendarPlus,
  FileText,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onOpenSearch?: () => void;
}

export function BottomNav({ onOpenSearch }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, role, logout } = useAuth();
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);

  // Determine home path by role
  const getHomePath = () => {
    if (!isAuthenticated) return "/";
    if (role === "Admin") return "/admin/dashboard";
    if (role === "Doctor") return "/doctor/agenda";
    if (role === "Pharmacist") return "/pharmacy";
    if (role === "LabTechnician") return "/lab";
    if (role === "Patient") return "/patient/dashboard";
    return "/";
  };

  // Determine appointments path by role
  const getAppointmentsPath = () => {
    if (!isAuthenticated) return "/directory";
    if (role === "Admin") return "/admin/appointments";
    if (role === "Doctor") return "/doctor/agenda";
    if (role === "Patient") return "/patient/book";
    return "/admin/appointments";
  };

  const homePath = getHomePath();
  const appointmentsPath = getAppointmentsPath();

  const isHomeActive =
    pathname === "/" ||
    pathname === homePath ||
    (homePath !== "/" && pathname.startsWith(homePath));

  const isAppointmentsActive =
    pathname.includes("appointment") ||
    pathname.includes("agenda") ||
    pathname.includes("book") ||
    pathname === appointmentsPath;

  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() ||
      user.username?.[0]?.toUpperCase() ||
      "U"
    : "G";

  const handleLogout = () => {
    setIsProfileSheetOpen(false);
    logout();
    router.push("/login");
  };

  return (
    <>
      {/* Fixed Bottom Navigation Bar on Mobile (screens < 768px, like Apollo 24/7) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-[#0b132b]/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2 flex items-center justify-around safe-area-inset-bottom"
      >
        {/* Tab 1: Home */}
        <Link
          href={homePath}
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors select-none",
            isHomeActive
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <div className="relative">
            <Home className={cn("h-5 w-5", isHomeActive && "stroke-[2.5px]")} />
            {isHomeActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Home</span>
        </Link>

        {/* Tab 2: Appointments */}
        <Link
          href={appointmentsPath}
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors select-none",
            isAppointmentsActive
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <div className="relative">
            <CalendarCheck
              className={cn("h-5 w-5", isAppointmentsActive && "stroke-[2.5px]")}
            />
            {isAppointmentsActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Appointments</span>
        </Link>

        {/* Tab 3: Search */}
        <button
          type="button"
          onClick={() => {
            if (onOpenSearch) {
              onOpenSearch();
            } else {
              router.push("/directory");
            }
          }}
          className="flex flex-col items-center justify-center flex-1 py-1 text-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none cursor-pointer"
        >
          <Search className="h-5 w-5" />
          <span className="text-[10px] mt-1 tracking-tight">Search</span>
        </button>

        {/* Tab 4: Profile */}
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => setIsProfileSheetOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors select-none cursor-pointer",
              isProfileSheetOpen
                ? "text-blue-600 dark:text-blue-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <div className="relative">
              <Avatar className="h-5 w-5 border border-slate-300 dark:border-slate-700">
                <AvatarFallback className="text-[9px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Profile</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="flex flex-col items-center justify-center flex-1 py-1 text-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none"
          >
            <User className="h-5 w-5" />
            <span className="text-[10px] mt-1 tracking-tight">Sign In</span>
          </Link>
        )}
      </nav>

      {/* Slide-out Bottom Sheet: User Profile & Quick Menu (Mobile) */}
      <Sheet open={isProfileSheetOpen} onOpenChange={setIsProfileSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto p-0 bg-white dark:bg-[#0b132b]">
          {user && (
            <div className="flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-blue-600 shadow-md">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-base">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-lg font-black text-slate-900 dark:text-white truncate">
                      {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-slate-500 truncate">
                      {user.email}
                    </SheetDescription>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] font-mono uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                        Role: {role}
                      </Badge>
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Shortcuts based on role */}
              <div className="p-4 space-y-1 text-xs">
                {role === "Admin" && (
                  <>
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setIsProfileSheetOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <LayoutDashboard className="h-4 w-4 text-blue-600" />
                        <span>Executive Dashboard</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </Link>

                    <Link
                      href="/admin/reception"
                      onClick={() => setIsProfileSheetOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <UserCheck className="h-4 w-4 text-emerald-600" />
                        <span>Live Reception Desk</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </Link>

                    <Link
                      href="/admin/billing"
                      onClick={() => setIsProfileSheetOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <Receipt className="h-4 w-4 text-purple-600" />
                        <span>Billing & Invoices</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </Link>
                  </>
                )}

                {role === "Doctor" && (
                  <>
                    <Link
                      href="/doctor/agenda"
                      onClick={() => setIsProfileSheetOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <Stethoscope className="h-4 w-4 text-emerald-600" />
                        <span>Physician EMR Agenda</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </Link>
                  </>
                )}

                {role === "Patient" && (
                  <>
                    <Link
                      href="/patient/dashboard"
                      onClick={() => setIsProfileSheetOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <LayoutDashboard className="h-4 w-4 text-blue-600" />
                        <span>Patient Portal</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </Link>

                    <Link
                      href="/patient/book"
                      onClick={() => setIsProfileSheetOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarPlus className="h-4 w-4 text-emerald-600" />
                        <span>Book Doctor Appointment</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </Link>
                  </>
                )}

                <Link
                  href="/directory"
                  onClick={() => setIsProfileSheetOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold text-slate-800 dark:text-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <Stethoscope className="h-4 w-4 text-slate-500" />
                    <span>Hospital Directory & Staff</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              </div>

              {/* Logout Button */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full h-10 gap-2 font-bold text-xs"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out of Apollo HMS
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
