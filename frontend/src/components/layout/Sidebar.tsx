"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InstallPWAButton } from "@/components/pwa/InstallPWAButton";
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
  ChevronRight,
  ChevronLeft,
  LogIn,
  UserPlus,
  Search,
  Pill,
  FlaskConical,
  UserCheck,
  Receipt,
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
  Shield,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface SidebarProps {
  onOpenSearch?: () => void;
  canSearch?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  onOpenSearch,
  canSearch,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Dynamic Navigation Sections by Role
  const getNavSections = (): { section: string; items: NavItem[] }[] => {
    if (!isAuthenticated) {
      return [
        {
          section: "Welcome",
          items: [
            { title: "Home / Overview", href: "/", icon: LayoutDashboard },
            { title: "Doctor Directory", href: "/doctors", icon: Stethoscope },
            { title: "Sign In", href: "/login", icon: LogIn },
            { title: "Register Patient", href: "/register", icon: UserPlus },
          ],
        },
      ];
    }

    if (role === "Admin") {
      return [
        {
          section: "Clinical Administration",
          items: [
            { title: "Executive Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
            { title: "Live Reception Queue", href: "/admin/reception", icon: UserCheck, badge: "Live" },
            { title: "Billing & Invoicing", href: "/admin/billing", icon: Receipt },
            { title: "Doctor Directory", href: "/admin/doctors", icon: Stethoscope },
            { title: "Manage Patients", href: "/admin/patients", icon: Users },
            { title: "All Appointments", href: "/admin/appointments", icon: CalendarCheck },
            { title: "Hospital Departments", href: "/admin/departments", icon: Building2 },
          ],
        },
        {
          section: "Healthcare Operations",
          items: [
            { title: "Pharmacy POS", href: "/pharmacy", icon: Pill, badge: "POS" },
            { title: "Laboratory Portal", href: "/lab", icon: FlaskConical },
          ],
        },
        {
          section: "Public Portals",
          items: [
            { title: "Hospital Directory", href: "/directory", icon: Stethoscope },
          ],
        },
      ];
    }

    if (role === "Doctor") {
      return [
        {
          section: "Physician EMR",
          items: [
            { title: "Today's Agenda", href: "/doctor/agenda", icon: Clock },
            { title: "My Appointments", href: "/doctor/appointments", icon: CalendarCheck },
            { title: "7-Day Availability", href: "/doctor/availability", icon: CalendarPlus },
            { title: "Past Treatments", href: "/doctor/treatments", icon: FileText },
          ],
        },
        {
          section: "Clinical Operations",
          items: [
            { title: "Pharmacy POS", href: "/pharmacy", icon: Pill },
            { title: "Laboratory Portal", href: "/lab", icon: FlaskConical },
          ],
        },
        {
          section: "Directory",
          items: [
            { title: "Medical Staff", href: "/doctors", icon: Stethoscope },
          ],
        },
      ];
    }

    if (role === "Pharmacist") {
      return [
        {
          section: "Pharmacy & Dispensary",
          items: [
            { title: "Pharmacy POS", href: "/pharmacy", icon: Pill, badge: "Active" },
            { title: "Laboratory Portal", href: "/lab", icon: FlaskConical },
          ],
        },
        {
          section: "Hospital",
          items: [
            { title: "Staff Directory", href: "/directory", icon: Stethoscope },
          ],
        },
      ];
    }

    if (role === "LabTechnician") {
      return [
        {
          section: "Diagnostic Laboratory",
          items: [
            { title: "Laboratory Portal", href: "/lab", icon: FlaskConical, badge: "Active" },
            { title: "Pharmacy Inventory", href: "/pharmacy", icon: Pill },
          ],
        },
        {
          section: "Hospital",
          items: [
            { title: "Staff Directory", href: "/directory", icon: Stethoscope },
          ],
        },
      ];
    }

    // Default: Patient Services
    return [
      {
        section: "Patient Portal",
        items: [
          { title: "Patient Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
          { title: "Book Consultation", href: "/patient/book", icon: CalendarPlus, badge: "Book" },
          { title: "My Appointments", href: "/patient/appointments", icon: CalendarCheck },
          { title: "Medical Records", href: "/patient/records", icon: FileText },
        ],
      },
      {
        section: "Explore Specialists",
        items: [
          { title: "Find Doctors", href: "/doctors", icon: Stethoscope },
        ],
      },
    ];
  };

  const navSections = getNavSections();

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
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0b132b] text-white border-b border-slate-800 z-40 px-4 flex items-center justify-between shadow-md">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
            <HeartPulse className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">MediCare HMS</span>
        </Link>
        <div className="flex items-center gap-2">
          <InstallPWAButton className="h-7 text-[11px] px-2 py-0.5" />
          {canSearch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSearch}
              className="text-slate-300 hover:text-white hover:bg-slate-800"
              aria-label="Search patients"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Persistent Enterprise Dark Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out shadow-2xl",
          // Dark Enterprise Mocdoc-like Theme
          "bg-[#0b132b] text-slate-300 border-r border-[#1e293b]",
          // Desktop Collapsible Width vs Mobile Slide-over
          isCollapsed ? "lg:w-20" : "lg:w-68",
          mobileOpen ? "w-72 translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#1e293b]">
          {!isCollapsed ? (
            <Link href="/" className="flex items-center gap-3 group min-w-0">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0 group-hover:scale-105 transition-transform">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-base text-white tracking-tight flex items-center gap-1.5 truncate">
                  MediCare
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-900/80 text-blue-300 border border-blue-700/60 font-mono">
                    EMR
                  </span>
                </span>
                <p className="text-[10px] text-slate-400 font-medium truncate">Enterprise HIS Platform</p>
              </div>
            </Link>
          ) : (
            <Link href="/" className="mx-auto" title="MediCare Enterprise HIS">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                <HeartPulse className="h-5 w-5" />
              </div>
            </Link>
          )}

          {/* Collapse/Expand Toggle Button (Desktop only) */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          {/* Close for mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden h-7 w-7 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Search Trigger inside sidebar (when expanded) */}
        {!isCollapsed && canSearch && (
          <div className="px-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenSearch?.();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl text-slate-400 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 transition-colors shadow-xs"
            >
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-slate-300 font-medium">Search Patients...</span>
              </span>
              <kbd className="font-mono text-[10px] bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-slate-400">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {section.section}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={isCollapsed ? item.title : undefined}
                      className={cn(
                        "group flex items-center rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer",
                        isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
                        isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-bold"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                            isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400"
                          )}
                        />
                        {!isCollapsed && <span className="truncate">{item.title}</span>}
                      </div>

                      {!isCollapsed && item.badge && (
                        <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-white font-mono uppercase">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Identity Chip & Footer (Bottom) */}
        {isAuthenticated && user && (
          <div className="p-3 border-t border-[#1e293b] bg-[#070d1e]/80">
            <div className={cn("flex items-center gap-2.5", isCollapsed && "justify-center")}>
              <Avatar className="h-8 w-8 border border-slate-700 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                  </p>
                  <p className="text-[10px] text-blue-400 font-mono font-medium truncate">
                    @{user.username} • {user.role}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
