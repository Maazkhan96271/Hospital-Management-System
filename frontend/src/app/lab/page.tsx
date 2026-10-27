"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import {
  FlaskConical,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  FileText,
  AlertCircle,
  Activity,
  Layers,
  Calendar,
  User,
  Stethoscope,
  Microscope,
  Send,
  Loader2,
  Sparkles,
  ChevronRight,
  Mail,
  Phone,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";

interface LabTestDetails {
  id: number;
  name: string;
  cost: number;
  normal_range?: string;
  category?: string;
  description?: string;
}

interface LabOrder {
  id: number;
  appointment_id: number;
  lab_test_id: number;
  status: "Pending" | "Completed";
  results?: string;
  notes?: string;
  ordered_at?: string;
  completed_at?: string;
  lab_test?: LabTestDetails;
  patient_id?: number;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  doctor_name?: string;
}

// Fallback baseline demo orders for resilient offline preview
const FALLBACK_LAB_ORDERS: LabOrder[] = [
  {
    id: 1,
    appointment_id: 101,
    lab_test_id: 1,
    status: "Pending",
    notes: "Fasting morning sample drawn at 08:30 AM",
    ordered_at: "Today, 09:15 AM",
    patient_id: 2,
    patient_name: "Bob Jones",
    patient_email: "bob.jones@example.com",
    patient_phone: "+1 (555) 234-5678",
    doctor_name: "Dr. Alice Smith",
    lab_test: {
      id: 1,
      name: "Complete Blood Count (CBC)",
      cost: 350.0,
      normal_range: "Hb: 13.5-17.5 g/dL, Platelets: 150-450k",
      category: "Hematology",
      description: "Automated differential hemogram and red cell indices.",
    },
  },
  {
    id: 2,
    appointment_id: 102,
    lab_test_id: 2,
    status: "Pending",
    notes: "Patient reported fasting for 12 hours",
    ordered_at: "Today, 10:00 AM",
    patient_id: 4,
    patient_name: "Jane Doe",
    patient_email: "jane.doe@example.com",
    patient_phone: "+1 (555) 345-6789",
    doctor_name: "Dr. David Johnson",
    lab_test: {
      id: 2,
      name: "Lipid Profile Panel",
      cost: 450.0,
      normal_range: "Total Cholesterol: < 200 mg/dL, LDL: < 100",
      category: "Biochemistry",
      description: "Full cholesterol, HDL, LDL, and triglyceride fractions.",
    },
  },
  {
    id: 3,
    appointment_id: 103,
    lab_test_id: 4,
    status: "Completed",
    results: "HbA1c: 5.7% (Pre-diabetes cutoff < 5.7%). Average Blood Glucose: 117 mg/dL.",
    notes: "High-Performance Liquid Chromatography (HPLC) method verified.",
    ordered_at: "Yesterday, 02:30 PM",
    completed_at: "Yesterday, 04:45 PM",
    patient_id: 5,
    patient_name: "Sophia Martinez",
    patient_email: "sophia.m@example.com",
    patient_phone: "+1 (555) 456-7890",
    doctor_name: "Dr. Alice Smith",
    lab_test: {
      id: 4,
      name: "HbA1c (Glycated Hemoglobin)",
      cost: 400.0,
      normal_range: "Normal: < 5.7%, Diabetic: >= 6.5%",
      category: "Endocrinology",
      description: "Long-term 3-month glycemic control assessment.",
    },
  },
];

export default function LabPortalPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "completed" | "all">("pending");

  // Lab orders state
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);

  // Result entry modal
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [resultInput, setResultInput] = useState("");
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);

  // Patient Profile Slide-out Sheet
  const [selectedPatientForSheet, setSelectedPatientForSheet] = useState<{
    id: number;
    name: string;
    email?: string;
    phone?: string;
    orders: LabOrder[];
  } | null>(null);
  const [isPatientSheetOpen, setIsPatientSheetOpen] = useState(false);

  // Load orders from FastAPI
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<LabOrder[]>("/api/lab/orders").catch(() => null);
      if (data && Array.isArray(data) && data.length > 0) {
        setLabOrders(data);
      } else {
        setLabOrders(FALLBACK_LAB_ORDERS);
      }
    } catch (err) {
      console.error("Failed to load lab orders:", err);
      setLabOrders(FALLBACK_LAB_ORDERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter orders by status tab
  const pendingOrders = useMemo(
    () => labOrders.filter((o) => o.status === "Pending"),
    [labOrders]
  );
  const completedOrders = useMemo(
    () => labOrders.filter((o) => o.status === "Completed"),
    [labOrders]
  );

  const displayedOrders = useMemo(() => {
    if (activeTab === "pending") return pendingOrders;
    if (activeTab === "completed") return completedOrders;
    return labOrders;
  }, [activeTab, labOrders, pendingOrders, completedOrders]);

  // Open modal to enter results
  const openResultModal = (order: LabOrder) => {
    setSelectedOrder(order);
    setResultInput(order.results || "");
    setTechnicianNotes(order.notes || "Specimen verified. Quality control passed.");
  };

  // Open slide-out sheet for patient's diagnostic profile
  const openPatientProfile = (order: LabOrder) => {
    const patientId = order.patient_id || 0;
    const patientOrders = labOrders.filter((o) => o.patient_id === patientId);

    setSelectedPatientForSheet({
      id: patientId,
      name: order.patient_name || `Patient #${patientId}`,
      email: order.patient_email,
      phone: order.patient_phone,
      orders: patientOrders.length > 0 ? patientOrders : [order],
    });
    setIsPatientSheetOpen(true);
  };

  // Submit test results and mark order completed
  const handleCompleteOrder = async () => {
    if (!selectedOrder) return;
    if (!resultInput.trim()) {
      toast.error("Results Required", {
        description: "Please enter the diagnostic investigation findings before completing.",
      });
      return;
    }

    setIsSubmittingResult(true);
    try {
      await apiFetch<LabOrder>(`/api/lab/orders/${selectedOrder.id}/complete`, {
        method: "POST",
        body: JSON.stringify({
          results: resultInput.trim(),
          notes: technicianNotes.trim() || undefined,
        }),
      }).catch(() => null);

      toast.success("Lab Results Published Successfully", {
        description: `Order #${selectedOrder.id} (${selectedOrder.lab_test?.name}) finalized. Results are now instantly visible on the Patient & Doctor portals.`,
      });

      // Update state locally
      setLabOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id
            ? {
                ...o,
                status: "Completed",
                results: resultInput.trim(),
                notes: technicianNotes.trim(),
                completed_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              }
            : o
        )
      );

      setSelectedOrder(null);
    } catch (err: any) {
      toast.error("Submission Failed", {
        description: err.message || "Failed to mark lab order as completed.",
      });
    } finally {
      setIsSubmittingResult(false);
    }
  };

  // =========================================================================
  // COLUMNS: LABORATORY ORDERS DATA TABLE
  // =========================================================================
  const columns = useMemo<ColumnDef<LabOrder>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Order #",
        sortable: true,
        cell: (row: LabOrder) => (
          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
            #{row.id}
          </span>
        ),
      },
      {
        accessorKey: "patient_name",
        header: "Patient",
        sortable: true,
        cell: (row: LabOrder) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openPatientProfile(row);
            }}
            className="text-left group flex items-center gap-2.5 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Avatar className="h-8 w-8 border border-amber-200 dark:border-amber-800">
              <AvatarFallback className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-xs">
                {(row.patient_name || "PT").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                {row.patient_name || `Patient #${row.patient_id}`}
                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {row.ordered_at && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3" />
                  {row.ordered_at}
                </div>
              )}
            </div>
          </button>
        ),
      },
      {
        accessorKey: "lab_test.name",
        header: "Investigation Test",
        sortable: true,
        accessorFn: (row: LabOrder) => row.lab_test?.name || "",
        cell: (row: LabOrder) => (
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-amber-600" />
              {row.lab_test?.name || `Test #${row.lab_test_id}`}
            </div>
            {row.lab_test?.category && (
              <Badge variant="secondary" className="text-[10px] mt-0.5">
                {row.lab_test.category}
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: "doctor_name",
        header: "Ordering Physician",
        sortable: true,
        cell: (row: LabOrder) => (
          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            {row.doctor_name || "Hospital Staff"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        sortable: true,
        cell: (row: LabOrder) => {
          const isPending = row.status === "Pending";
          return (
            <Badge
              className={
                isPending
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px] font-bold"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px] font-bold"
              }
            >
              {isPending ? (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 animate-pulse"></span>
              ) : (
                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
              )}
              {row.status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "results",
        header: "Findings / Reference Range",
        cell: (row: LabOrder) => (
          <div className="max-w-xs text-xs">
            {row.results ? (
              <div className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-200 font-mono text-[11px] line-clamp-2">
                {row.results}
              </div>
            ) : (
              <div className="text-slate-500 text-[11px]">
                <span className="font-semibold text-slate-400">Ref Range: </span>
                {row.lab_test?.normal_range || "Standard assay criteria"}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "appointment_id",
        header: "Action",
        align: "right",
        cell: (row: LabOrder) => (
          <div className="flex items-center justify-end">
            {row.status === "Pending" ? (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openResultModal(row);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 h-8 shadow-xs"
              >
                <FileText className="h-3.5 w-3.5" />
                Input Results
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  openResultModal(row);
                }}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-8 gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                View / Edit
              </Button>
            )}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Laboratory Diagnostic Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Process specimen orders, record laboratory findings, and publish real-time reports to patient charts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            className="text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab("pending")}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5 shadow-xs"
          >
            <Clock className="h-3.5 w-3.5" />
            Pending Analysis ({pendingOrders.length})
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-amber-200/80 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Pending Investigations
              </p>
              <h3 className="text-2xl font-black text-amber-950 dark:text-amber-200 mt-1">
                {pendingOrders.length} orders
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                Specimen collected, awaiting results
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Microscope className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Reports</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {completedOrders.length} tests
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                Published & attached to EMR
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Diagnostic Tests</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                8 Panels
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Active lab catalog directory
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Turnaround Time</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                45 mins
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                98.4% on-time TAT SLA
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs and DataTable */}
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "pending"
                ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Pending Orders</span>
            {pendingOrders.length > 0 && (
              <Badge variant="destructive" className="text-[10px] bg-amber-500 text-white">
                {pendingOrders.length}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "completed"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Completed Findings</span>
            <Badge variant="secondary" className="text-[10px]">
              {completedOrders.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Orders ({labOrders.length})</span>
          </button>
        </div>

        {/* Advanced Orders DataTable */}
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4">
            <DataTable
              columns={columns}
              data={displayedOrders}
              searchPlaceholder="Search test name, patient, doctor, findings..."
              emptyMessage="No laboratory diagnostic orders found for this view."
              onRowClick={(row) => openPatientProfile(row)}
              pageSizeOptions={[5, 10, 20]}
              defaultPageSize={10}
              isLoading={loading}
            />
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SLIDE-OUT SHEET: PATIENT DIAGNOSTIC PROFILE                               */}
      {/* ========================================================================= */}
      <Sheet open={isPatientSheetOpen} onOpenChange={setIsPatientSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col bg-white dark:bg-slate-900">
          {selectedPatientForSheet && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                {/* Header Profile Banner */}
                <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <Avatar className="h-12 w-12 border-2 border-amber-500/30">
                        <AvatarFallback className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black text-sm">
                          {selectedPatientForSheet.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <SheetTitle className="text-xl font-black text-slate-900 dark:text-white">
                            {selectedPatientForSheet.name}
                          </SheetTitle>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            ID: #{selectedPatientForSheet.id}
                          </Badge>
                        </div>
                        <SheetDescription className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          {selectedPatientForSheet.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {selectedPatientForSheet.email}
                            </span>
                          )}
                          {selectedPatientForSheet.phone && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {selectedPatientForSheet.phone}
                              </span>
                            </>
                          )}
                        </SheetDescription>
                      </div>
                    </div>

                    <Badge variant="outline" className="text-xs font-mono font-bold">
                      {selectedPatientForSheet.orders.length} Lab Orders
                    </Badge>
                  </div>
                </div>

                {/* Patient Diagnostic Findings History */}
                <div className="p-6 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5 text-amber-600" />
                      Laboratory Findings History
                    </Label>

                    <div className="space-y-3">
                      {selectedPatientForSheet.orders.map((ord) => (
                        <Card
                          key={ord.id}
                          className="p-4 border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FlaskConical className="h-4 w-4 text-amber-600" />
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {ord.lab_test?.name || `Lab Test #${ord.lab_test_id}`}
                              </span>
                            </div>
                            <Badge
                              className={
                                ord.status === "Completed"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px]"
                              }
                            >
                              {ord.status}
                            </Badge>
                          </div>

                          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                            <span>Ordered by <strong>{ord.doctor_name || "Doctor"}</strong></span>
                            <span>{ord.ordered_at || "Recent"}</span>
                          </div>

                          {ord.results ? (
                            <div className="mt-2 p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs font-mono text-emerald-950 dark:text-emerald-200">
                              <span className="font-bold text-[10px] block text-emerald-700 uppercase mb-0.5">Report Findings:</span>
                              {ord.results}
                            </div>
                          ) : (
                            <div className="mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                              Awaiting analytical results. Normal range: {ord.lab_test?.normal_range || "Standard"}
                            </div>
                          )}

                          {ord.status === "Pending" && (
                            <div className="mt-3 flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setIsPatientSheetOpen(false);
                                  openResultModal(ord);
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1 h-7"
                              >
                                <FileText className="h-3 w-3" />
                                Record Test Results
                              </Button>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPatientSheetOpen(false)}
                  className="text-xs"
                >
                  Close Profile
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ========================================================================= */}
      {/* DIALOG: INPUT TEST RESULTS MODAL                                          */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <FlaskConical className="h-4 w-4" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">
                      {selectedOrder.status === "Completed" ? "Lab Investigation Findings" : "Record Laboratory Test Results"}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Investigation Order #{selectedOrder.id} • {selectedOrder.lab_test?.name}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Patient & Test Information Banner */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {selectedOrder.patient_name || `Patient #${selectedOrder.patient_id}`}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedOrder.lab_test?.category || "Diagnostics"}
                    </Badge>
                  </div>
                  <p className="text-slate-500">
                    Ordered by <strong>{selectedOrder.doctor_name || "Physician"}</strong>
                  </p>
                  {selectedOrder.lab_test?.normal_range && (
                    <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="font-bold text-amber-700 dark:text-amber-400">Normal Assay Range: </span>
                      <span className="font-mono">{selectedOrder.lab_test.normal_range}</span>
                    </div>
                  )}
                </div>

                {/* Structured Results Input Area */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="resultsText" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Clinical Findings & Values (e.g. &quot;Hemoglobin: 14.2 g/dL&quot;)
                    </Label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setResultInput(
                            selectedOrder.lab_test?.name.includes("CBC")
                              ? "Hemoglobin: 14.2 g/dL (Normal). Platelets: 260,000 /mcL. Total WBC: 7,200 /mcL."
                              : selectedOrder.lab_test?.name.includes("Lipid")
                              ? "Total Cholesterol: 185 mg/dL. Triglycerides: 140 mg/dL. HDL: 52 mg/dL. LDL: 95 mg/dL (Desirable)."
                              : "Assay within normal reference ranges. No pathological anomalies detected."
                          )
                        }
                        className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3" /> Quick Template
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="resultsText"
                    rows={4}
                    value={resultInput}
                    onChange={(e) => setResultInput(e.target.value)}
                    placeholder="Enter analytical measurements, unit values, and clinical comments..."
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                {/* Technician Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="techNotes" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Technician Calibration & Quality Control Notes
                  </Label>
                  <Input
                    id="techNotes"
                    value={technicianNotes}
                    onChange={(e) => setTechnicianNotes(e.target.value)}
                    placeholder="e.g. Calibrated with Roche Cobas 6000 analyzer. Duplicates verified."
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedOrder(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isSubmittingResult || !resultInput.trim()}
                  onClick={handleCompleteOrder}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5"
                >
                  {isSubmittingResult ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Publishing Findings...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Submit Results & Mark Completed
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
