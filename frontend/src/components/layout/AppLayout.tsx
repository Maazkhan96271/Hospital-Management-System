"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalPatientSearch } from "@/components/search/GlobalPatientSearch";
import Link from "next/link";
import {
  HeartPulse,
  Bell,
  CalendarPlus,
  LogIn,
  Search,
  Command,
} from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, role } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener for Admins & Doctors
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (role === "Admin" || role === "Doctor") {
          e.preventDefault();
          setIsSearchOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [role]);

  const canUsePatientSearch = role === "Admin" || role === "Doctor";

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 flex">
      {/* Persistent / Responsive Sidebar */}
      <Sidebar onOpenSearch={() => setIsSearchOpen(true)} canSearch={canUsePatientSearch} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 pt-16 lg:pt-0">
        {/* Top Header Bar for Desktop */}
        <header className="hidden lg:flex h-18 px-8 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Hospital Management System
            </h1>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                FastAPI Engine Online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Cmd+K Global Search Trigger for Admins & Doctors */}
            {canUsePatientSearch && (
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg border border-slate-200/70 dark:border-slate-700/60 transition-colors shadow-xs"
                title="Quick patient lookup (⌘K)"
              >
                <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Search patients...
                </span>
                <kbd className="ml-1.5 font-mono text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-400 shadow-xs">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <ThemeToggle />

            {isAuthenticated ? (
              <>
                {role === "Patient" && (
                  <Button asChild size="sm" className="gap-2 text-xs font-semibold">
                    <Link href="/patient/book">
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Book Appointment
                    </Link>
                  </Button>
                )}
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{user?.role}</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="text-xs">
                  <Link href="/register">Register Patient</Link>
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
