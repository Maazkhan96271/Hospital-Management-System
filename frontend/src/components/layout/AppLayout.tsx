"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallPWAButton } from "@/components/pwa/InstallPWAButton";
import { GlobalPatientSearch } from "@/components/search/GlobalPatientSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  HeartPulse,
  Bell,
  CalendarPlus,
  LogIn,
  Search,
  Command,
  User,
  LogOut,
  CalendarCheck,
  LayoutDashboard,
  Receipt,
  UserCheck,
  ShieldCheck,
  ChevronDown,
  FileText,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "hms_sidebar_collapsed";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, role, logout } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Restore sidebar collapsed preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {}
      return next;
    });
  };

  // Global Cmd+K / Ctrl+K keyboard shortcut listener for Admins & Doctors
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (role === "Admin" || role === "Doctor" || role === "Pharmacist" || role === "LabTechnician") {
          e.preventDefault();
          setIsSearchOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [role]);

  const canUsePatientSearch = role === "Admin" || role === "Doctor" || role === "Pharmacist" || role === "LabTechnician";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() ||
      user.username?.[0]?.toUpperCase() ||
      "U"
    : "G";

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex">
      {/* Persistent Enterprise Collapsible Sidebar */}
      <Sidebar
        onOpenSearch={() => setIsSearchOpen(true)}
        canSearch={canUsePatientSearch}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main Content Area dynamically padded for mobile bottom nav and desktop sidebar */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
          // Mobile (< 768px): Top bar is h-16, bottom nav is h-16 (padding pb-20 pt-16), pl-0 (no left sidebar)
          "pt-16 md:pt-0 pl-0 pb-20 md:pb-8",
          // Desktop (>= 768px): pl-64 when expanded, pl-20 when collapsed
          isCollapsed ? "md:pl-20" : "md:pl-64"
        )}
      >
        {/* Top Header Bar for Desktop (screens >= 768px) */}
        <header className="hidden md:flex h-16 px-6 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
          {/* Left: Global Search Input Front-and-Center */}
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            {canUsePatientSearch ? (
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="w-full max-w-md flex items-center justify-between px-3.5 py-2 text-xs font-medium rounded-xl text-slate-500 dark:text-slate-400 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/70 transition-all shadow-xs cursor-pointer group"
                title="Search patient database, appointments, and diagnostic records (⌘K)"
              >
                <span className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">
                    Global Patient & Record Search...
                  </span>
                </span>
                <kbd className="font-mono text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 text-slate-500 shadow-xs">
                  ⌘K
                </kbd>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  MediCare Hospital Network • Online
                </span>
              </div>
            )}
          </div>

          {/* Right: Hospital Health Status, Notifications, Theme, & User Profile Dropdown */}
          <div className="flex items-center gap-3">
            {/* Live Status indicator */}
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>FastAPI HIS Online</span>
            </div>

            {/* Quick Action for Patient */}
            {role === "Patient" && (
              <Button asChild size="sm" className="h-8 gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700">
                <Link href="/patient/book">
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Book Slot
                </Link>
              </Button>
            )}

            {/* Notifications Icon */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>

            {/* Global Install PWA App Button */}
            <InstallPWAButton />

            {/* Dark / Light Mode Toggle */}
            <ThemeToggle />

            {/* User Profile Dropdown Menu */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2.5 pl-2 pr-1.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-700 shadow-xs">
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left hidden sm:block">
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                      </p>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-semibold">
                        {role || "Staff"}
                      </span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      <div className="pt-1">
                        <Badge variant="outline" className="text-[10px] font-mono uppercase">
                          Role: {role}
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Navigation Shortcuts based on role */}
                  {role === "Admin" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/dashboard" className="flex items-center gap-2">
                          <LayoutDashboard className="h-3.5 w-3.5 text-blue-500" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/reception" className="flex items-center gap-2">
                          <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Live Reception Queue</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/billing" className="flex items-center gap-2">
                          <Receipt className="h-3.5 w-3.5 text-purple-500" />
                          <span>Billing & Accounts</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {role === "Doctor" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/doctor/agenda" className="flex items-center gap-2">
                          <LayoutDashboard className="h-3.5 w-3.5 text-blue-500" />
                          <span>Today&apos;s Agenda</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/doctor/availability" className="flex items-center gap-2">
                          <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                          <span>7-Day Schedule</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {role === "Patient" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/patient/dashboard" className="flex items-center gap-2">
                          <LayoutDashboard className="h-3.5 w-3.5 text-blue-500" />
                          <span>Patient Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/patient/records" className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Clinical Records</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-700 dark:text-red-400 flex items-center gap-2 cursor-pointer font-semibold"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="text-xs h-8">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="text-xs h-8 bg-blue-600 hover:bg-blue-700">
                  <Link href="/register">Register</Link>
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Fixed Apollo 24/7-style Bottom Navigation Bar for Mobile (< 768px) */}
      <BottomNav onOpenSearch={() => setIsSearchOpen(true)} />

      {/* Global Cmd+K Patient Search Modal */}
      {canUsePatientSearch && (
        <GlobalPatientSearch
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </div>
  );
}
