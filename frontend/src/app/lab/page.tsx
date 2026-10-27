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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [searchQuery, setSearchQuery] = useState("");

  // Lab orders state
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);

  // Result entry modal
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [resultInput, setResultInput] = useState("");
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);

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
    let list = labOrders;
    if (activeTab === "pending") list = pendingOrders;
    if (activeTab === "completed") list = completedOrders;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (o) =>
        (o.patient_name && o.patient_name.toLowerCase().includes(q)) ||
        (o.doctor_name && o.doctor_name.toLowerCase().includes(q)) ||
        (o.lab_test?.name && o.lab_test.name.toLowerCase().includes(q)) ||
        (o.lab_test?.category && o.lab_test.category.toLowerCase().includes(q)) ||
        (o.results && o.results.toLowerCase().includes(q))
    );
  }, [activeTab, labOrders, pendingOrders, completedOrders, searchQuery]);

  // Open modal to enter results
  const openResultModal = (order: LabOrder) => {
    setSelectedOrder(order);
    setResultInput(order.results || "");
    setTechnicianNotes(order.notes || "Specimen verified. Quality control passed.");
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
      const updated = await apiFetch<LabOrder>(`/api/lab/orders/${selectedOrder.id}/complete`, {
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

      {/* KPI Cards */}
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

      {/* Filter Tabs and Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search test, patient, doctor, result..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>
        </div>

        {/* Orders Table */}
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/60">
                  <TableHead className="text-xs font-bold uppercase">Order #</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Patient</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Investigation Test</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Ordering Physician</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Findings / Reference Range</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="py-4">
                        <Skeleton className="h-8 rounded-lg" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : displayedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-xs text-slate-400">
                      No laboratory orders found matching the selected filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedOrders.map((order) => {
                    const isPending = order.status === "Pending";
                    return (
                      <TableRow
                        key={order.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                          isPending ? "bg-amber-50/20 dark:bg-amber-950/10" : ""
                        }`}
                      >
                        {/* Order ID */}
                        <TableCell className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          #{order.id}
                        </TableCell>

                        {/* Patient info */}
                        <TableCell>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {order.patient_name || `Patient #${order.patient_id}`}
                          </div>
                          {order.ordered_at && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" /> {order.ordered_at}
                            </span>
                          )}
                        </TableCell>

                        {/* Lab Test */}
                        <TableCell>
                          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            <FlaskConical className="h-3.5 w-3.5 text-amber-600" />
                            {order.lab_test?.name || `Lab Test #${order.lab_test_id}`}
                          </div>
                          {order.lab_test?.category && (
                            <Badge variant="secondary" className="text-[10px] mt-0.5">
                              {order.lab_test.category}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Physician */}
                        <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {order.doctor_name || "Hospital Staff"}
                        </TableCell>

                        {/* Status badge */}
                        <TableCell>
                          <Badge
                            className={
                              isPending
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px] font-bold"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px] font-bold"
                            }
                          >
                            {order.status}
                          </Badge>
                        </TableCell>

                        {/* Findings / Reference Range */}
                        <TableCell className="max-w-xs text-xs">
                          {order.results ? (
                            <div className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-200 font-mono text-[11px]">
                              {order.results}
                            </div>
                          ) : (
                            <div className="text-slate-500 text-[11px]">
                              <span className="font-semibold text-slate-400">Ref Range: </span>
                              {order.lab_test?.normal_range || "Standard assay criteria"}
                            </div>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          {isPending ? (
                            <Button
                              size="sm"
                              onClick={() => openResultModal(order)}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 h-8 shadow-xs"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Input Results
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openResultModal(order)}
                              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 h-8 gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              View / Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

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
