"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Stethoscope,
  CalendarCheck,
  Building2,
  Search,
  Plus,
  ShieldCheck,
  UserX,
  UserCheck,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [usersList, setUsersList] = useState([
    { id: 1, name: "Dr. Alice Smith", email: "doctor@test.com", role: "Doctor", status: "Active", dept: "Cardiology" },
    { id: 2, name: "Dr. David Johnson", email: "david@test.com", role: "Doctor", status: "Active", dept: "Neurology" },
    { id: 3, name: "Bob Jones", email: "patient@test.com", role: "Patient", status: "Active", dept: "N/A" },
    { id: 4, name: "Emma Watson", email: "emma@test.com", role: "Patient", status: "Active", dept: "N/A" },
    { id: 5, name: "Marcus Wright", email: "marcus@test.com", role: "Patient", status: "Deactivated", dept: "N/A" },
  ]);

  const toggleUserStatus = (id: number) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextStatus = u.status === "Active" ? "Deactivated" : "Active";
          if (nextStatus === "Deactivated") {
            toast.warning(`User ${u.name} has been blacklisted / deactivated.`);
          } else {
            toast.success(`User ${u.name} has been restored to active status.`);
          }
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  const filtered = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.dept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Hospital Admin Oversight
            </h1>
            <Badge variant="admin">Administrator</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            System administration, staff provisioning, and user activity controls.
          </p>
        </div>
      </div>

      {/* Aggregate Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-100 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Doctors</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">14</h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">Across 8 departments</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <Stethoscope className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Patients</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">128</h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">+12 new this week</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-100 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Appointments</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">42</h3>
              <p className="text-[11px] text-purple-600 font-medium mt-1">18 completed today</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
              <CalendarCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Departments</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">8</h3>
              <p className="text-[11px] text-amber-600 font-medium mt-1">Cardio, Neuro, Ortho & more</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <Building2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management Section */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle>Staff & Patient Directory</CardTitle>
            <CardDescription>Search users by name, specialization, or department.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search staff or patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                      <p className="text-[11px] text-slate-500">{u.email}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.role === "Doctor" ? "doctor" : "patient"}>{u.role}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                      {u.dept}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === "Active"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant={u.status === "Active" ? "destructive" : "outline"}
                        size="sm"
                        className="h-8 text-xs font-semibold gap-1.5"
                        onClick={() => toggleUserStatus(u.id)}
                      >
                        {u.status === "Active" ? (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            Blacklist
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                            Re-activate
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
