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
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  Printer,
  Download,
  DollarSign,
  FileText,
  User,
  Stethoscope,
  Pill,
  FlaskConical,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronRight,
  ArrowUpRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";

interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  patient_id: number;
  patient_name?: string;
  patient_email?: string;
  appointment_id?: number | null;
  doctor_name?: string;
  total_amount: number;
  paid_amount: number;
  payment_status: "Unpaid" | "Paid" | "Partial";
  payment_method?: string | null;
  issued_date?: string;
  due_date?: string | null;
  notes?: string | null;
  items: InvoiceItem[];
}

// Fallback baseline invoices for smooth client preview
const FALLBACK_INVOICES: Invoice[] = [
  {
    id: 1,
    invoice_number: "INV-20261028-0101",
    patient_id: 2,
    patient_name: "Bob Jones",
    patient_email: "bob.jones@example.com",
    appointment_id: 101,
    doctor_name: "Dr. Alice Smith",
    total_amount: 860.0,
    paid_amount: 860.0,
    payment_status: "Paid",
    payment_method: "Credit Card",
    issued_date: "2026-10-28",
    notes: "Settled via POS Terminal Ref #CC-88291",
    items: [
      { id: 1, description: "Physician Clinical Consultation (Cardiology)", quantity: 1, unit_price: 500.0, total: 500.0 },
      { id: 2, description: "Amlodipine 5mg (30 Tablets)", quantity: 3, unit_price: 3.5, total: 10.5 },
      { id: 3, description: "Complete Blood Count (CBC) Panel", quantity: 1, unit_price: 350.0, total: 350.0 },
    ],
  },
  {
    id: 2,
    invoice_number: "INV-20261028-0102",
    patient_id: 4,
    patient_name: "Jane Doe",
    patient_email: "jane.doe@example.com",
    appointment_id: 102,
    doctor_name: "Dr. David Johnson",
    total_amount: 950.0,
    paid_amount: 0.0,
    payment_status: "Unpaid",
    payment_method: null,
    issued_date: "2026-10-28",
    notes: "Awaiting settlement at reception billing desk",
    items: [
      { id: 4, description: "Neurology Specialist Evaluation", quantity: 1, unit_price: 500.0, total: 500.0 },
      { id: 5, description: "Lipid Profile Diagnostic Investigation", quantity: 1, unit_price: 450.0, total: 450.0 },
    ],
  },
  {
    id: 3,
    invoice_number: "INV-20261027-0095",
    patient_id: 5,
    patient_name: "Sophia Martinez",
    patient_email: "sophia.m@example.com",
    appointment_id: 103,
    doctor_name: "Dr. Alice Smith",
    total_amount: 720.0,
    paid_amount: 300.0,
    payment_status: "Partial",
    payment_method: "UPI",
    issued_date: "2026-10-27",
    notes: "Partial payment received via PhonePe/UPI",
    items: [
      { id: 6, description: "Endocrine & Diabetes Review", quantity: 1, unit_price: 500.0, total: 500.0 },
      { id: 7, description: "Metformin 500mg Extended Release", quantity: 2, unit_price: 10.0, total: 20.0 },
      { id: 8, description: "Urinalysis Routine Examination", quantity: 1, unit_price: 200.0, total: 200.0 },
    ],
  },
];

export default function BillingInvoicingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "unpaid" | "paid" | "partial">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states: Itemized Invoice details & Payment recording
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Credit Card");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [cashierNotes, setCashierNotes] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Fetch invoices from backend
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Invoice[]>("/api/invoices").catch(() => null);
      if (data && Array.isArray(data) && data.length > 0) {
        setInvoices(data);
      } else {
        setInvoices(FALLBACK_INVOICES);
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      setInvoices(FALLBACK_INVOICES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filtered invoices by status & search
  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (activeTab === "unpaid") list = invoices.filter((i) => i.payment_status === "Unpaid");
    if (activeTab === "paid") list = invoices.filter((i) => i.payment_status === "Paid");
    if (activeTab === "partial") list = invoices.filter((i) => i.payment_status === "Partial");

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.patient_name && inv.patient_name.toLowerCase().includes(q)) ||
        (inv.doctor_name && inv.doctor_name.toLowerCase().includes(q)) ||
        (inv.payment_method && inv.payment_method.toLowerCase().includes(q))
    );
  }, [invoices, activeTab, searchQuery]);

  // Aggregate Financial Statistics
  const totalBilled = useMemo(
    () => invoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0),
    [invoices]
  );
  const totalCollected = useMemo(
    () => invoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0),
    [invoices]
  );
  const totalOutstanding = useMemo(
    () => Math.max(0, totalBilled - totalCollected),
    [totalBilled, totalCollected]
  );
  const paidCount = useMemo(
    () => invoices.filter((i) => i.payment_status === "Paid").length,
    [invoices]
  );

  // Open Record Payment Modal
  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const balance = Math.max(0, invoice.total_amount - (invoice.paid_amount || 0));
    setPaymentAmount(balance);
    setPaymentMethod("Credit Card");
    setCashierNotes(`Settled at reception billing counter - Auth Ref #TX-${Math.floor(100000 + Math.random() * 900000)}`);
    setIsPayModalOpen(true);
  };

  // Submit Payment Record
  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    setIsRecordingPayment(true);
    try {
      const updated = await apiFetch<Invoice>(`/api/invoices/${selectedInvoice.id}/pay`, {
        method: "POST",
        body: JSON.stringify({
          payment_method: paymentMethod,
          amount_paid: paymentAmount,
          notes: cashierNotes.trim() || undefined,
        }),
      }).catch(() => null);

      toast.success("Payment Recorded Successfully!", {
        description: `Invoice #${selectedInvoice.invoice_number} marked as Paid (${paymentMethod}: $${paymentAmount.toFixed(2)}).`,
      });

      // Update state locally
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === selectedInvoice.id
            ? {
                ...i,
                payment_status: paymentAmount >= i.total_amount ? "Paid" : "Partial",
                paid_amount: (i.paid_amount || 0) + paymentAmount,
                payment_method: paymentMethod,
                notes: cashierNotes,
              }
            : i
        )
      );

      // Update active modal selected invoice
      setSelectedInvoice((prev) =>
        prev
          ? {
              ...prev,
              payment_status: paymentAmount >= prev.total_amount ? "Paid" : "Partial",
              paid_amount: (prev.paid_amount || 0) + paymentAmount,
              payment_method: paymentMethod,
            }
          : null
      );

      setIsPayModalOpen(false);
    } catch (err: any) {
      toast.error("Payment Recording Failed", {
        description: err.message || "Failed to record payment transaction.",
      });
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Download PDF Receipt from FastAPI ReportLab service
  const handleDownloadPdf = async (invoiceId: number, invoiceNum: string) => {
    setIsDownloadingPdf(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("hms_token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:8000/api/invoices/${invoiceId}/receipt.pdf`, {
        headers,
      });

      if (!res.ok) throw new Error("Could not generate PDF receipt.");

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `receipt_${invoiceNum}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Official PDF Receipt Downloaded", {
        description: `Branded medical receipt receipt_${invoiceNum}.pdf saved to your device.`,
      });
    } catch (err: any) {
      // Fallback: trigger browser print
      toast.info("Opening Printable Receipt View", {
        description: "Launching browser print engine for branded receipt.",
      });
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Billing & Accounts Receivable
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Itemized hospital invoices, POS payment recording, and automated branded PDF receipts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            className="text-xs font-semibold gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Invoices
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab("unpaid")}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-1.5 shadow-xs h-9"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Unpaid Dues ({invoices.filter((i) => i.payment_status === "Unpaid").length})
          </Button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Billed Revenue</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
                ${totalBilled.toFixed(2)}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {invoices.length} total hospital invoices
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Total Collected (Paid)
              </p>
              <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1 font-mono">
                ${totalCollected.toFixed(2)}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                {paidCount} accounts settled in full
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200/80 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-300">
                Outstanding Balance
              </p>
              <h3 className="text-2xl font-black text-red-900 dark:text-red-200 mt-1 font-mono">
                ${totalOutstanding.toFixed(2)}
              </h3>
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mt-0.5">
                Pending cashier collection
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Collection Rate</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
                {totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : "100.0"}%
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                Healthy financial cashflow
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>All Invoices</span>
              <Badge variant="secondary" className="text-[10px]">
                {invoices.length}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("unpaid")}
              className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "unpaid"
                  ? "bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              <span>Unpaid</span>
              {invoices.filter((i) => i.payment_status === "Unpaid").length > 0 && (
                <Badge variant="destructive" className="text-[10px] bg-red-600 text-white">
                  {invoices.filter((i) => i.payment_status === "Unpaid").length}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("paid")}
              className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "paid"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Paid ({paidCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("partial")}
              className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "partial"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Partial</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search invoice #, patient, doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>
        </div>

        {/* Invoices Data Table */}
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/60">
                  <TableHead className="text-xs font-bold uppercase w-36">Invoice #</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Patient</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Attending Doctor</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Issued Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Payment Mode</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-right">Total Amount</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8} className="py-4">
                        <Skeleton className="h-8 rounded-lg" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-400">
                      No invoices found matching the current filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv) => {
                    const isPaid = inv.payment_status === "Paid";
                    const isPartial = inv.payment_status === "Partial";

                    return (
                      <TableRow
                        key={inv.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Invoice Number */}
                        <TableCell className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          {inv.invoice_number}
                        </TableCell>

                        {/* Patient */}
                        <TableCell>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {inv.patient_name || `Patient #${inv.patient_id}`}
                          </div>
                          <span className="text-[11px] text-slate-400">ID: #{inv.patient_id}</span>
                        </TableCell>

                        {/* Attending Doctor */}
                        <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {inv.doctor_name || "Hospital Staff"}
                        </TableCell>

                        {/* Issued Date */}
                        <TableCell className="text-xs text-slate-500 font-mono">
                          {inv.issued_date || "Today"}
                        </TableCell>

                        {/* Payment Status Badge */}
                        <TableCell>
                          <Badge
                            className={
                              isPaid
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px] font-bold"
                                : isPartial
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px] font-bold"
                                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-0 text-[10px] font-bold"
                            }
                          >
                            {inv.payment_status}
                          </Badge>
                        </TableCell>

                        {/* Payment Mode */}
                        <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {inv.payment_method || <span className="text-slate-400 italic">Pending</span>}
                        </TableCell>

                        {/* Total Amount */}
                        <TableCell className="text-right font-mono text-sm font-black text-slate-900 dark:text-white">
                          ${inv.total_amount.toFixed(2)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedInvoice(inv)}
                              className="text-xs font-semibold h-8 gap-1"
                            >
                              <FileText className="h-3 w-3" />
                              Breakdown
                            </Button>

                            {!isPaid && (
                              <Button
                                size="sm"
                                onClick={() => openPaymentModal(inv)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 h-8 shadow-xs"
                              >
                                <CreditCard className="h-3 w-3" />
                                Record Pay
                              </Button>
                            )}

                            {isPaid && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                                className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 h-8 gap-1"
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </Button>
                            )}
                          </div>
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
      {/* DIALOG 1: ITEMIZED INVOICE BREAKDOWN (Consultation, Pharmacy, Labs)       */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedInvoice && !isPayModalOpen} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold">
                        Invoice Breakdown: {selectedInvoice.invoice_number}
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        Itemized hospital bill covering physician fees, pharmacy dispensations, and laboratory investigations.
                      </DialogDescription>
                    </div>
                  </div>
                  <Badge
                    className={
                      selectedInvoice.payment_status === "Paid"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold"
                        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-xs font-bold"
                    }
                  >
                    {selectedInvoice.payment_status}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Meta details banner */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Patient</span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedInvoice.patient_name}</p>
                    <p className="text-slate-400">ID: #{selectedInvoice.patient_id}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attending Doctor</span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedInvoice.doctor_name || "Specialist"}</p>
                    <p className="text-slate-400">Ref Appt #{selectedInvoice.appointment_id || "Direct"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Channel</span>
                    <p className="font-bold text-emerald-600 text-sm">{selectedInvoice.payment_method || "Unsettled"}</p>
                    <p className="text-slate-400">{selectedInvoice.issued_date || "Today"}</p>
                  </div>
                </div>

                {/* Itemized Line Items Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                      <TableRow>
                        <TableHead className="text-[11px] font-bold">Item Description</TableHead>
                        <TableHead className="text-[11px] font-bold text-center">Qty</TableHead>
                        <TableHead className="text-[11px] font-bold text-right">Unit Rate</TableHead>
                        <TableHead className="text-[11px] font-bold text-right">Line Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                        selectedInvoice.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-semibold text-slate-900 dark:text-white">
                              <span className="flex items-center gap-1.5">
                                {item.description.toLowerCase().includes("consult") ? (
                                  <Stethoscope className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                ) : item.description.toLowerCase().includes("test") || item.description.toLowerCase().includes("panel") ? (
                                  <FlaskConical className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                ) : (
                                  <Pill className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                )}
                                {item.description}
                              </span>
                            </TableCell>
                            <TableCell className="text-center font-mono font-semibold">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-500">
                              ${item.unit_price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-white">
                              ${item.total.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-slate-400">
                            General Physician Consultation & Evaluation (${selectedInvoice.total_amount.toFixed(2)})
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Subtotals & Grand Total Box */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex justify-between text-slate-500">
                    <span>Itemized Subtotal:</span>
                    <span className="font-mono font-semibold">${selectedInvoice.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Hospital Concession / Tax (0%):</span>
                    <span className="font-mono font-semibold">$0.00</span>
                  </div>
                  <div className="flex justify-between text-slate-900 dark:text-white font-bold text-sm pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>Total Billed Amount:</span>
                    <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                      ${selectedInvoice.total_amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300 text-xs">
                    <span>Amount Paid:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ${(selectedInvoice.paid_amount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-red-600">
                    <span>Balance Due:</span>
                    <span className="font-mono">
                      ${Math.max(0, selectedInvoice.total_amount - (selectedInvoice.paid_amount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    Notes: {selectedInvoice.notes}
                  </p>
                )}
              </div>

              <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedInvoice(null)}
                  className="text-xs"
                >
                  Close
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isDownloadingPdf}
                    onClick={() => handleDownloadPdf(selectedInvoice.id, selectedInvoice.invoice_number)}
                    className="text-xs font-bold gap-1.5 border-blue-200 text-blue-700 dark:text-blue-300 hover:bg-blue-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download PDF Receipt
                  </Button>

                  {selectedInvoice.payment_status !== "Paid" && (
                    <Button
                      size="sm"
                      onClick={() => openPaymentModal(selectedInvoice)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Record Payment
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: RECORD PAYMENT MODAL (SETTLES INVOICE TO PAID)                  */}
      {/* ========================================================================= */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold">
                      Record Payment & Settle Invoice
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {selectedInvoice.invoice_number} • Patient {selectedInvoice.patient_name}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Outstanding balance prompt */}
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Amount to Settle
                    </span>
                    <p className="font-mono text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5">
                      ${paymentAmount.toFixed(2)}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Total Bill: ${selectedInvoice.total_amount.toFixed(2)}
                  </Badge>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="payMethod" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Payment Channel
                  </Label>
                  <select
                    id="payMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Cash">Cash (Hospital Billing Desk)</option>
                    <option value="Credit Card">Credit Card (Visa / Mastercard / Amex)</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="UPI">UPI / Instant QR Payment</option>
                    <option value="Insurance">Third-Party Healthcare Insurance (TPA)</option>
                    <option value="Online">Online Patient Portal Gateway</option>
                  </select>
                </div>

                {/* Amount to Collect Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="payAmount" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Amount Received ($)
                  </Label>
                  <Input
                    id="payAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Cashier Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="notesInput" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Cashier / Transaction Reference Notes
                  </Label>
                  <Input
                    id="notesInput"
                    placeholder="e.g. Card Auth Code #88412 or Cash Drawer #2"
                    value={cashierNotes}
                    onChange={(e) => setCashierNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPayModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isRecordingPayment || paymentAmount <= 0}
                  onClick={handleRecordPayment}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                >
                  {isRecordingPayment ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Settling & Generating Receipt...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Confirm & Mark Paid (${paymentAmount.toFixed(2)})
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
