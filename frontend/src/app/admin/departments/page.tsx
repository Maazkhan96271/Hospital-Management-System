"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2,
  Plus,
  Stethoscope,
  Search,
  Users,
  Activity,
  Layers,
  Sparkles,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Department {
  id: number;
  name: string;
  description: string | null;
  doctor_count?: number;
  created_at: string;
}

export default function AdminDepartmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SWR for data fetching from FastAPI backend
  const { data: departments, error, isLoading, mutate } = useSWR<Department[]>(
    "/api/departments/",
    () => apiFetch<Department[]>("/api/departments/")
  );

  const filteredDepartments = (departments || []).filter((dept) => {
    const term = searchTerm.toLowerCase();
    return (
      dept.name.toLowerCase().includes(term) ||
      (dept.description && dept.description.toLowerCase().includes(term))
    );
  });

  const totalDoctors = (departments || []).reduce(
    (acc, dept) => acc + (dept.doctor_count || 0),
    0
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a department name.");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiFetch<Department>("/api/departments/", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      toast.success(`Department "${name}" created successfully.`);
      setName("");
      setDescription("");
      setIsCreateOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to create department.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Building2 className="h-5 w-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Medical Departments
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Organize specialized hospital divisions, doctor assignments, and patient treatment centers.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Department
        </Button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Departments
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {isLoading ? <Skeleton className="h-8 w-16" /> : (departments?.length || 0)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Assigned Physicians
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {isLoading ? <Skeleton className="h-8 w-16" /> : totalDoctors}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Stethoscope className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Avg. Staff per Dept
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : departments && departments.length > 0 ? (
                  (totalDoctors / departments.length).toFixed(1)
                ) : (
                  "0.0"
                )}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Input Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Filter departments by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        />
      </div>

      {/* Grid of Department Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <Card key={idx} className="border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-start justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-12 w-full" />
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="p-12 text-center border rounded-xl bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40">
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load departments from FastAPI.</p>
          <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-3">
            Retry Connection
          </Button>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed rounded-xl border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
          <Building2 className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {searchTerm ? "No matching departments found" : "No departments added yet"}
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? `No division matches "${searchTerm}". Try a different search term.`
              : "Get started by creating your hospital's medical departments."}
          </p>
          <div className="mt-6">
            {searchTerm ? (
              <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            ) : (
              <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-600 text-white">
                <Plus className="h-4 w-4 mr-2" /> Create First Department
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((dept) => {
            const docCount = dept.doctor_count || 0;
            return (
              <Card
                key={dept.id}
                className="group border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between bg-white dark:bg-slate-900"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {dept.name}
                        </CardTitle>
                        <span className="text-xs text-slate-400">ID: #{dept.id}</span>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold border-emerald-200/60 dark:border-emerald-800"
                    >
                      {docCount} {docCount === 1 ? "Doctor" : "Doctors"}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm text-slate-600 dark:text-slate-400 pt-3 line-clamp-3 leading-relaxed">
                    {dept.description || "Specialized clinical division delivering standard healthcare and surgical procedures."}
                  </CardDescription>
                </CardHeader>

                <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    {docCount > 0 ? "Staff Allocated" : "No Assigned Staff"}
                  </span>
                  <Link
                    href={`/admin/doctors?dept=${dept.id}`}
                    className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    View Doctors <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Department Modal / Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-600">
                  <Building2 className="h-5 w-5" />
                </span>
                <DialogTitle className="text-xl">Add Medical Department</DialogTitle>
              </div>
              <DialogDescription>
                Create a specialized hospital unit to assign clinical practitioners and patient slots.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="dept-name">Department Name *</Label>
                <Input
                  id="dept-name"
                  placeholder="e.g. Cardiology, Neurology, Orthopedics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dept-desc">Description (Optional)</Label>
                <textarea
                  id="dept-desc"
                  rows={3}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Summarize key medical focus, specialties, and equipment available..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Create Department"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
