"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  CalendarCheck,
  Stethoscope,
  Clock,
  FileText,
  Building2,
  Users,
  LogOut,
  Menu,
  X,
  HeartPulse,
  CalendarPlus,
  ShieldAlert,
  ChevronRight,
  LogIn,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Role-based dynamic navigation links
  const getNavItems = (): { section: string; items: NavItem[] }[] => {
    if (!isAuthenticated) {
      return [
        {
          section: "Welcome",
          items: [
            { title: "Home / Overview", href: "/", icon: LayoutDashboard },
            { title: "Browse Doctors", href: "/doctors", icon: Stethoscope },
            { title: "Sign In", href: "/login", icon: LogIn },
            { title: "Register Patient", href: "/register", icon: UserPlus },
          ],
        },
      ];
    }

    if (role === "Admin") {
      return [
        {
          section: "Administration",
          items: [
            { title: "Admin Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
            { title: "Doctor Directory", href: "/admin/doctors", icon: Stethoscope },
            { title: "Manage Patients", href: "/admin/patients", icon: Users },
            { title: "All Appointments", href: "/admin/appointments", icon: CalendarCheck },
            { title: "Departments", href: "/admin/departments", icon: Building2 },
          ],
        },
        {
          section: "Shortcuts",
          items: [
            { title: "Public Directory", href: "/doctors", icon: Stethoscope },
          ],
        },
      ];
    }

    if (role === "Doctor") {
      return [
        {
          section: "Physician Portal",
          items: [
            { title: "Today's Agenda", href: "/doctor/agenda", icon: Clock },
            { title: "My Appointments", href: "/doctor/appointments", icon: CalendarCheck },
            { title: "7-Day Schedule", href: "/doctor/availability", icon: CalendarPlus },
            { title: "Past Treatments", href: "/doctor/treatments", icon: FileText },
          ],
        },
        {
          section: "Hospital",
          items: [
            { title: "Doctors Directory", href: "/doctors", icon: Stethoscope },
          ],
        },
      ];
    }

    // Default: Patient
    return [
      {
        section: "Patient Services",
        items: [
          { title: "Patient Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
          { title: "Book Appointment", href: "/patient/book", icon: CalendarPlus, badge: "New" },
          { title: "Appointment History", href: "/patient/appointments", icon: CalendarCheck },
          { title: "Prescriptions & Notes", href: "/patient/records", icon: FileText },
        ],
      },
      {
        section: "Explore",
        items: [
          { title: "Find Doctors", href: "/doctors", icon: Stethoscope },
        ],
      },
    ];
  };

  const navSections = getNavItems();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const roleBadgeVariant = (r: string | null) => {
    switch (r) {
      case "Admin":
        return "admin";
      case "Doctor":
        return "doctor";
      case "Patient":
        return "patient";
      default:
        return "secondary";
    }
  };

  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || user.username?.[0]?.toUpperCase() || "U"
    : "G";

  return (
    <>
      {/* Mobile Top Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-40 px-4 flex items-center justify-between shadow-xs">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <HeartPulse className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white">MediCare HMS</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Responsive Sidebar (Persistent on lg screens, Slide-over on mobile) */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out shadow-xs",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="h-18 px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-600/25 group-hover:scale-105 transition-transform">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                MediCare
                <span className="text-blue-600 dark:text-blue-400 font-medium text-xs px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 border border-blue-200/60 dark:border-blue-900">
                  HMS
                </span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Hospital Management</p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 text-slate-500"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User Identity Chip (When Logged In) */}
        {isAuthenticated && user && (
          <div className="p-4 mx-3 my-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-white dark:border-slate-700 shadow-xs">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={roleBadgeVariant(role) as any} className="text-[10px] px-1.5 py-0 uppercase tracking-wider font-bold">
                    {role}
                  </Badge>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    @{user.username}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1.5">
              <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {section.section}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 font-semibold"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                            isActive ? "text-white" : "text-slate-400 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                          )}
                        />
                        <span className="truncate">{item.title}</span>
                      </div>
                      {item.badge && (
                        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500 text-white">
                          {item.badge}
                        </span>
                      )}
                      {!isActive && (
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          {isAuthenticated ? (
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50 gap-2.5 text-xs font-semibold"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  Sign In
                </Link>
              </Button>
              <Button asChild size="sm" className="text-xs">
                <Link href="/register" onClick={() => setIsOpen(false)}>
                  Register
                </Link>
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
