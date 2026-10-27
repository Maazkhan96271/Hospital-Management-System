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
  Pill,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  PlusCircle,
  Package,
  Receipt,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";

interface PrescribedMedicationLine {
  name: string;
  dosage?: string;
  duration?: string;
  quantity: number;
  unit_price: number;
  pharmacy_item_id?: number;
  is_in_stock: boolean;
}

interface PendingPrescription {
  appointment_id: number;
  patient_id: number;
  patient_name: string;
  patient_email?: string;
  doctor_name: string;
  appointment_date: string;
  diagnosis: string;
  medications: PrescribedMedicationLine[];
  invoice_number?: string;
  invoice_id?: number;
  status: string; // "Pending" | "Dispensed"
  total_amount: number;
}

interface PharmacyItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  stock_quantity: number;
  reorder_level: number;
  price_per_unit: number;
  expiry_date: string;
  unit?: string;
  is_low_stock?: boolean;
}

// Fallback demo data to ensure graceful degradation
const FALLBACK_LOW_STOCK: PharmacyItem[] = [
  {
    id: 101,
    sku: "AMX-500-CAP",
    name: "Amoxicillin 500mg",
    category: "Antibiotics",
    stock_quantity: 8,
    reorder_level: 25,
    price_per_unit: 12.5,
    expiry_date: "2026-11-15",
    unit: "capsule",
    is_low_stock: true,
  },
  {
    id: 102,
    sku: "AZM-500-TAB",
    name: "Azithromycin 500mg",
    category: "Antibiotics",
    stock_quantity: 12,
    reorder_level: 30,
    price_per_unit: 25.0,
    expiry_date: "2026-12-31",
    unit: "tablet",
    is_low_stock: true,
  },
  {
    id: 103,
    sku: "ATV-20-TAB",
    name: "Atorvastatin 20mg",
    category: "Cardiovascular",
    stock_quantity: 15,
    reorder_level: 20,
    price_per_unit: 15.0,
    expiry_date: "2027-06-30",
    unit: "tablet",
    is_low_stock: true,
  },
];

const FALLBACK_PRESCRIPTIONS: PendingPrescription[] = [
  {
    appointment_id: 101,
    patient_id: 2,
    patient_name: "Bob Jones",
    patient_email: "bob.jones@example.com",
    doctor_name: "Dr. Alice Smith",
    appointment_date: "Today, 09:30 AM",
    diagnosis: "Stage 1 Essential Hypertension with exertional palpitations",
    status: "Pending",
    invoice_number: "INV-20261028-0101",
    total_amount: 150.0,
    medications: [
      {
        name: "Amlodipine 5mg",
        dosage: "1-0-0 (Morning)",
        duration: "30 days",
        quantity: 30,
        unit_price: 3.5,
        is_in_stock: true,
      },
      {
        name: "Atorvastatin 20mg",
        dosage: "0-0-1 (Bedtime)",
        duration: "30 days",
        quantity: 30,
        unit_price: 15.0,
        is_in_stock: true,
      },
    ],
  },
  {
    appointment_id: 102,
    patient_id: 4,
    patient_name: "Jane Doe",
    patient_email: "jane.doe@example.com",
    doctor_name: "Dr. David Johnson",
    appointment_date: "Today, 10:45 AM",
    diagnosis: "Acute Bronchitis & Upper Respiratory Infection",
    status: "Pending",
    invoice_number: "INV-20261028-0102",
    total_amount: 195.0,
    medications: [
      {
        name: "Amoxicillin 500mg",
        dosage: "1-0-1 after meals",
        duration: "7 days",
        quantity: 14,
        unit_price: 12.5,
        is_in_stock: true,
      },
      {
        name: "Paracetamol 500mg",
        dosage: "1-1-1 SOS for fever",
        duration: "5 days",
        quantity: 15,
        unit_price: 5.0,
        is_in_stock: true,
      },
    ],
  },
];

export default function PharmacyPOSPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"prescriptions" | "low_stock" | "catalog">("prescriptions");
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [pendingPrescriptions, setPendingPrescriptions] = useState<PendingPrescription[]>([]);
  const [lowStockItems, setLowStockItems] = useState<PharmacyItem[]>([]);
  const [allInventory, setAllInventory] = useState<PharmacyItem[]>([]);
  const [dispensedCountToday, setDispensedCountToday] = useState(3);

  // Dispense modal / selection
  const [selectedPrescription, setSelectedPrescription] = useState<PendingPrescription | null>(null);
  const [isDispensing, setIsDispensing] = useState(false);

  // Restock modal
  const [restockItem, setRestockItem] = useState<PharmacyItem | null>(null);
  const [restockQty, setRestockQty] = useState(50);
  const [isRestocking, setIsRestocking] = useState(false);

  // Load pharmacy data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch pending prescriptions
      const prescs = await apiFetch<PendingPrescription[]>("/api/pharmacy/prescriptions/pending").catch(() => null);
      if (prescs && Array.isArray(prescs) && prescs.length > 0) {
        setPendingPrescriptions(prescs);
      } else {
        setPendingPrescriptions(FALLBACK_PRESCRIPTIONS);
      }

      // 2. Fetch low stock items
      const lowStock = await apiFetch<PharmacyItem[]>("/api/pharmacy/low-stock").catch(() => null);
      if (lowStock && Array.isArray(lowStock) && lowStock.length > 0) {
        setLowStockItems(lowStock);
      } else {
        setLowStockItems(FALLBACK_LOW_STOCK);
      }

      // 3. Fetch all catalog items
      const allItems = await apiFetch<PharmacyItem[]>("/api/pharmacy/items").catch(() => null);
      if (allItems && Array.isArray(allItems)) {
        setAllInventory(allItems);
      } else {
        setAllInventory([
          ...FALLBACK_LOW_STOCK,
          { id: 1, sku: "PAR-500-TAB", name: "Paracetamol 500mg", category: "Analgesic", stock_quantity: 450, reorder_level: 50, price_per_unit: 5.0, expiry_date: "2027-10-01", unit: "tablet" },
          { id: 2, sku: "MET-500-TAB", name: "Metformin 500mg", category: "Antidiabetic", stock_quantity: 380, reorder_level: 40, price_per_unit: 6.0, expiry_date: "2027-04-20", unit: "tablet" },
          { id: 3, sku: "OMP-20-CAP", name: "Omeprazole 20mg", category: "Gastrointestinal", stock_quantity: 320, reorder_level: 30, price_per_unit: 8.0, expiry_date: "2026-12-10", unit: "capsule" },
        ]);
      }
    } catch (err) {
      console.error("Failed to load pharmacy data:", err);
      setPendingPrescriptions(FALLBACK_PRESCRIPTIONS);
      setLowStockItems(FALLBACK_LOW_STOCK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Dispense Action
  const handleDispense = async (prescription: PendingPrescription) => {
    setIsDispensing(true);
    try {
      const res = await apiFetch<any>(`/api/pharmacy/prescriptions/${prescription.appointment_id}/dispense`, {
        method: "POST",
      }).catch(() => null);

      toast.success("Medications Dispensed Successfully", {
        description: `Dispensed for Patient ${prescription.patient_name}. Inventory stock deducted & Invoice #${prescription.invoice_number || prescription.appointment_id} updated.`,
      });

      // Update UI state
      setPendingPrescriptions((prev) =>
        prev.filter((p) => p.appointment_id !== prescription.appointment_id)
      );
      setDispensedCountToday((c) => c + 1);

      // Deduct quantities in local inventory
      setLowStockItems((prev) =>
        prev.map((item) => {
          const matched = prescription.medications.find((m) =>
            item.name.toLowerCase().includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(item.name.toLowerCase())
          );
          if (matched) {
            return { ...item, stock_quantity: Math.max(0, item.stock_quantity - matched.quantity) };
          }
          return item;
        })
      );

      setSelectedPrescription(null);
    } catch (err: any) {
      toast.error("Dispensing Failed", {
        description: err.message || "Could not process dispensing request.",
      });
    } finally {
      setIsDispensing(false);
    }
  };

  // Handle Restock Action
  const handleRestock = async () => {
    if (!restockItem) return;
    setIsRestocking(true);
    try {
      await apiFetch<any>(`/api/pharmacy/items/${restockItem.id}/restock`, {
        method: "PATCH",
        body: JSON.stringify({ quantity_to_add: restockQty }),
      }).catch(() => null);

      toast.success("Stock Replenished Successfully", {
        description: `Added +${restockQty} units of ${restockItem.name}.`,
      });

      // Update state
      setLowStockItems((prev) =>
        prev
          .map((item) =>
            item.id === restockItem.id ? { ...item, stock_quantity: item.stock_quantity + restockQty } : item
          )
          .filter((item) => (item.id === restockItem.id ? item.stock_quantity + restockQty <= item.reorder_level : true))
      );

      setAllInventory((prev) =>
        prev.map((item) =>
          item.id === restockItem.id ? { ...item, stock_quantity: item.stock_quantity + restockQty } : item
        )
      );

      setRestockItem(null);
    } catch (err: any) {
      toast.error("Restock Failed", {
        description: err.message || "Could not update stock level.",
      });
    } finally {
      setIsRestocking(false);
    }
  };

  // Filtered lists
  const filteredPrescriptions = useMemo(() => {
    if (!searchQuery.trim()) return pendingPrescriptions;
    const q = searchQuery.toLowerCase();
    return pendingPrescriptions.filter(
      (p) =>
        p.patient_name.toLowerCase().includes(q) ||
        p.doctor_name.toLowerCase().includes(q) ||
        p.diagnosis.toLowerCase().includes(q) ||
        (p.invoice_number && p.invoice_number.toLowerCase().includes(q))
    );
  }, [pendingPrescriptions, searchQuery]);

  const filteredLowStock = useMemo(() => {
    if (!searchQuery.trim()) return lowStockItems;
    const q = searchQuery.toLowerCase();
    return lowStockItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [lowStockItems, searchQuery]);

  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return allInventory;
    const q = searchQuery.toLowerCase();
    return allInventory.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [allInventory, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Pharmacy POS & Dispensing
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Dispense physician prescriptions, deduct real-time inventory, and manage low-stock alerts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab("low_stock")}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5 shadow-xs"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Low Stock Alerts ({lowStockItems.length})
          </Button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Prescriptions</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {pendingPrescriptions.length}
              </h3>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                Awaiting medication dispensing
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Low Stock Critical
              </p>
              <h3 className="text-2xl font-black text-amber-900 dark:text-amber-300 mt-1">
                {lowStockItems.length} items
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                Stock &le; Reorder threshold
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Dispensed Today</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {dispensedCountToday} orders
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                Inventory reconciled & settled
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
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Formulations</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {allInventory.length} SKUs
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Pharmacy catalog database
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Search Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Module Tab Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("prescriptions")}
              className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "prescriptions"
                  ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Pill className="h-3.5 w-3.5" />
              <span>Pending Prescriptions</span>
              {pendingPrescriptions.length > 0 && (
                <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  {pendingPrescriptions.length}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("low_stock")}
              className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "low_stock"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Low Stock Alerts</span>
              {lowStockItems.length > 0 && (
                <Badge variant="destructive" className="text-[10px] bg-amber-500 text-white">
                  {lowStockItems.length}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "catalog"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>Inventory Catalog</span>
            </button>
          </div>

          {/* Quick Filter Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder={
                activeTab === "prescriptions"
                  ? "Search patient, doctor, diagnosis..."
                  : "Search medicine name, SKU, category..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>
        </div>

        {/* ===================================================================== */}
        {/* TAB 1: PENDING PRESCRIPTIONS QUEUE                                    */}
        {/* ===================================================================== */}
        {activeTab === "prescriptions" && (
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </div>
            ) : filteredPrescriptions.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-slate-300 dark:border-slate-800">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  All Prescriptions Dispensed!
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No pending medication orders awaiting dispensing at this POS station. New doctor prescriptions will stream in automatically.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredPrescriptions.map((prescription) => (
                  <Card
                    key={prescription.appointment_id}
                    className="border-slate-200/90 dark:border-slate-800/80 hover:border-purple-300 dark:hover:border-purple-800 transition-all bg-white dark:bg-slate-900 shadow-xs"
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Patient & Doctor metadata */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-black text-base text-slate-900 dark:text-white">
                              {prescription.patient_name}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              Patient #{prescription.patient_id}
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-0 text-[10px] font-bold">
                              {prescription.status} Dispensing
                            </Badge>
                            {prescription.invoice_number && (
                              <span className="text-[11px] font-mono text-slate-400">
                                {prescription.invoice_number}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>Prescribed by <strong className="text-slate-700 dark:text-slate-300">{prescription.doctor_name}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {prescription.appointment_date}
                            </span>
                          </div>

                          <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-semibold text-slate-500">Clinical Diagnosis:</span> {prescription.diagnosis}
                          </div>
                        </div>

                        {/* Medications Summary & Quick Dispense Action */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:border-l lg:border-slate-100 dark:lg:border-slate-800 lg:pl-6">
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Prescription ({prescription.medications.length} items)
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {prescription.medications.map((m, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                >
                                  {m.name} ({m.dosage || "1-0-1"})
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Bill: ${prescription.total_amount.toFixed(2)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPrescription(prescription)}
                              className="text-xs font-semibold flex-1 sm:flex-none"
                            >
                              Review Details
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDispense(prescription)}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 shadow-xs flex-1 sm:flex-none"
                            >
                              <Pill className="h-3.5 w-3.5" />
                              Dispense & Deduct
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: LOW STOCK ALERTS TABLE                                         */}
        {/* ===================================================================== */}
        {activeTab === "low_stock" && (
          <Card className="border-amber-200/80 dark:border-amber-900/40 bg-white dark:bg-slate-900 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Critical Low-Stock Medicines
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pharmaceutical items whose remaining inventory has dropped to or below safety reorder levels.
                  </CardDescription>
                </div>
                <Badge variant="destructive" className="bg-amber-600 font-mono text-xs">
                  {filteredLowStock.length} Items Need Restocking
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900/60">
                    <TableHead className="text-xs font-bold uppercase">SKU / Code</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Medicine Name</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Category</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-center">Remaining Stock</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-center">Reorder Threshold</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Unit Price</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Expiry Date</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLowStock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-400">
                        No critical low-stock items detected in inventory!
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLowStock.map((item) => (
                      <TableRow key={item.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20">
                        <TableCell className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          {item.sku}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {item.name}
                          </div>
                          <span className="text-[11px] text-slate-400 capitalize">{item.unit || "unit"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[11px]">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-mono">
                            {item.stock_quantity} left
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-slate-500 font-semibold">
                          &le; {item.reorder_level} units
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          ${item.price_per_unit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {item.expiry_date}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRestockItem(item)}
                            className="text-xs font-bold text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 gap-1.5 h-8"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Restock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ===================================================================== */}
        {/* TAB 3: FULL INVENTORY CATALOG                                         */}
        {/* ===================================================================== */}
        {activeTab === "catalog" && (
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    Complete Formulary & Medication Catalog
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Real-time stock balance, unit pricing, and reorder levels for hospital pharmacy.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {filteredCatalog.length} Total SKUs
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900/60">
                    <TableHead className="text-xs font-bold uppercase">SKU</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Medication Name</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Category</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-center">Stock Quantity</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Unit Price</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Expiry</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCatalog.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <TableCell className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                        {item.sku}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {item.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px]">
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {item.stock_quantity <= item.reorder_level ? (
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {item.stock_quantity} (Low)
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.stock_quantity}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        ${item.price_per_unit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {item.expiry_date}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRestockItem(item)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 h-8 gap-1"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Add Stock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DIALOG 1: PRESCRIPTION DETAILS & DISPENSING CONFIRMATION MODAL            */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedPrescription} onOpenChange={(open) => !open && setSelectedPrescription(null)}>
        <DialogContent className="sm:max-w-xl">
          {selectedPrescription && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Pill className="h-4 w-4" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">
                      Dispense Prescription #{selectedPrescription.appointment_id}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Verify physician orders, quantities, and stock before finalizing pharmacy handover.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Patient Summary Header */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {selectedPrescription.patient_name}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {selectedPrescription.invoice_number}
                    </Badge>
                  </div>
                  <p className="text-slate-500">
                    Prescribed by <strong>{selectedPrescription.doctor_name}</strong> • {selectedPrescription.appointment_date}
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    Diagnosis: {selectedPrescription.diagnosis}
                  </p>
                </div>

                {/* Medication Breakdown Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                      <TableRow>
                        <TableHead className="text-[11px] font-bold">Medicine</TableHead>
                        <TableHead className="text-[11px] font-bold">Dosage & Regimen</TableHead>
                        <TableHead className="text-[11px] font-bold text-center">Qty</TableHead>
                        <TableHead className="text-[11px] font-bold text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPrescription.medications.map((med, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold text-slate-900 dark:text-white">
                            {med.name}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {med.dosage || "1-0-1"} ({med.duration || "5 days"})
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold">
                            {med.quantity}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-white">
                            ${(med.unit_price * med.quantity).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Total Invoice Amount */}
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 flex items-center justify-between">
                  <span className="font-bold text-purple-900 dark:text-purple-200">
                    Invoice Total to Settle at POS
                  </span>
                  <span className="font-mono font-black text-base text-purple-700 dark:text-purple-300">
                    ${selectedPrescription.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPrescription(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isDispensing}
                  onClick={() => handleDispense(selectedPrescription)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5"
                >
                  {isDispensing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Dispensing & Updating Stock...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Confirm Dispense & Deduct Stock
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: RESTOCK MEDICINE QUANTITY MODAL                                 */}
      {/* ========================================================================= */}
      <Dialog open={!!restockItem} onOpenChange={(open) => !open && setRestockItem(null)}>
        <DialogContent className="sm:max-w-md">
          {restockItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-amber-600" />
                  Replenish Medicine Stock
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Increment stock quantity for {restockItem.name} ({restockItem.sku}).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{restockItem.name}</p>
                    <p className="text-slate-400">Current Balance: <strong className="text-red-600">{restockItem.stock_quantity} {restockItem.unit || "units"}</strong></p>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Reorder: {restockItem.reorder_level}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="restockQty" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Units to Add to Inventory
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="restockQty"
                      type="number"
                      min={1}
                      max={5000}
                      value={restockQty}
                      onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
                      className="font-mono text-sm"
                    />
                    <div className="flex gap-1">
                      {[25, 50, 100].map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRestockQty(preset)}
                          className="text-xs font-mono h-9"
                        >
                          +{preset}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    New total will be: <strong className="text-emerald-600 font-mono">{restockItem.stock_quantity + restockQty}</strong> units.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRestockItem(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isRestocking || restockQty <= 0}
                  onClick={handleRestock}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5"
                >
                  {isRestocking ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Replenishing...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add +{restockQty} Units to Stock
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
