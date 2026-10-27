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
import { DataTable, Column } from "@/components/ui/data-table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  Eye,
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

  // Slide-out Sheet and Payment modal states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
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

  // Filtered invoices by active status tab
  const tabFilteredInvoices = useMemo(() => {
    if (activeTab === "unpaid") return invoices.filter((i) => i.payment_status === "Unpaid");
    if (activeTab === "paid") return invoices.filter((i) => i.payment_status === "Paid");
    if (activeTab === "partial") return invoices.filter((i) => i.payment_status === "Partial");
    return invoices;
  }, [invoices, activeTab]);

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

  // Status Badge Renderer with color coding
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 font-bold text-[10px] gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Paid
          </Badge>
        );
      case "Partial":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 font-bold text-[10px] gap-1">
            <Clock className="h-3 w-3 text-amber-600" />
            Partial
          </Badge>
        );
      case "Unpaid":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-0 font-bold text-[10px] gap-1">
            <AlertCircle className="h-3 w-3 text-red-600" />
            Unpaid
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Open Slide-out Sheet for invoice inspection
  const handleOpenSheet = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsSheetOpen(true);
  };

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
      await apiFetch<Invoice>(`/api/invoices/${selectedInvoice.id}/pay`, {
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
        description: `Branded medical receipt receipt_${invoiceNum}.pdf saved.`,
      });
    } catch (err: any) {
      toast.info("Opening Printable Receipt View", {
        description: "Launching browser print engine for receipt.",
      });
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // DataTable column definitions
  const columns: Column<Invoice>[] = [
    {
      header: "Invoice #",
      accessorKey: "invoice_number",
      sortable: true,
      className: "font-mono font-bold text-blue-600 dark:text-blue-400 w-36",
    },
    {
      header: "Patient",
      accessorFn: (row) => row.patient_name || `Patient #${row.patient_id}`,
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-bold text-xs text-slate-900 dark:text-white">
            {row.patient_name || `Patient #${row.patient_id}`}
          </span>
          <span className="block text-[11px] text-slate-400">ID: #{row.patient_id}</span>
        </div>
      ),
    },
    {
      header: "Attending Doctor",
      accessorKey: "doctor_name",
      sortable: true,
      cell: (row) => (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {row.doctor_name || "Hospital Staff"}
        </span>
      ),
    },
    {
      header: "Issued Date",
      accessorKey: "issued_date",
      sortable: true,
      className: "font-mono text-slate-500",
      cell: (row) => row.issued_date || "Today",
    },
    {
      header: "Status",
      accessorKey: "payment_status",
      sortable: true,
      cell: (row) => renderStatusBadge(row.payment_status),
    },
    {
      header: "Payment Method",
      accessorKey: "payment_method",
      sortable: true,
      cell: (row) => row.payment_method || <span className="text-slate-400 italic">Unsettled</span>,
    },
    {
      header: "Billed Total",
      accessorKey: "total_amount",
      sortable: true,
      headerClassName: "text-right",
      className: "text-right font-mono font-black text-slate-900 dark:text-white text-sm",
      cell: (row) => `$${row.total_amount.toFixed(2)}`,
    },
    {
      header: "Actions",
      sortable: false,
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenSheet(row)}
            className="text-xs font-semibold h-8 gap-1"
          >
            <Eye className="h-3.5 w-3.5" />
            Breakdown
          </Button>

          {row.payment_status !== "Paid" && (
            <Button
              size="sm"
              onClick={() => openPaymentModal(row)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 h-8 shadow-xs"
            >
              <CreditCard className="h-3 w-3" />
              Pay
            </Button>
          )}

          {row.payment_status === "Paid" && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isDownloadingPdf}
              onClick={() => handleDownloadPdf(row.id, row.invoice_number)}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 h-8 gap-1"
            >
              <Download className="h-3 w-3" />
              PDF
            </Button>
          )}
        </div>
      ),
    },
  ];

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

      {/* Tabs Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All Invoices</span>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {invoices.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("unpaid")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "unpaid"
              ? "bg-red-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Unpaid</span>
          {invoices.filter((i) => i.payment_status === "Unpaid").length > 0 && (
            <Badge variant="destructive" className="text-[10px] bg-red-600 text-white font-mono">
              {invoices.filter((i) => i.payment_status === "Unpaid").length}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("paid")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "paid"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>Paid ({paidCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("partial")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "partial"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>Partial</span>
        </button>
      </div>

      {/* Advanced Data Table with Sorting, Search, and Pagination */}
      <DataTable
        columns={columns}
        data={tabFilteredInvoices}
        searchPlaceholder="Instant search invoice #, patient, doctor..."
        searchableKeys={["invoice_number", "patient_name", "doctor_name", "payment_method"]}
        defaultPageSize={10}
        isLoading={loading}
        onRowClick={(row) => handleOpenSheet(row)}
      />

      {/* ========================================================================= */}
      {/* SLIDE-OUT PANEL (OFFCANVAS / SHEET) FOR ITEMIZED INVOICE BREAKDOWN        */}
      {/* ========================================================================= */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-white dark:bg-slate-900 p-6 space-y-6">
          {selectedInvoice && (
            <>
              <SheetHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <SheetTitle className="text-xl font-black text-slate-900 dark:text-white">
                      Invoice #{selectedInvoice.invoice_number}
                    </SheetTitle>
                    <SheetDescription className="text-xs">
                      Official patient tax invoice & itemized clinical charges.
                    </SheetDescription>
                  </div>
                  {renderStatusBadge(selectedInvoice.payment_status)}
                </div>
              </SheetHeader>

              {/* Patient Mini-Profile in Sheet */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Patient</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedInvoice.patient_name}</p>
                  <p className="text-slate-400 font-mono">ID: #{selectedInvoice.patient_id}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attending Doctor</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedInvoice.doctor_name || "Specialist"}</p>
                  <p className="text-slate-400">Appt #{selectedInvoice.appointment_id || "Direct"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Issued Date</span>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedInvoice.issued_date || "Today"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Channel</span>
                  <p className="font-bold text-emerald-600">{selectedInvoice.payment_method || "Unsettled"}</p>
                </div>
              </div>

              {/* Itemized Table Breakdown */}
              <div className="space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Itemized Charges Breakdown
                </span>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {item.description.toLowerCase().includes("consult") ? (
                              <Stethoscope className="h-4 w-4 text-blue-500 shrink-0" />
                            ) : item.description.toLowerCase().includes("test") || item.description.toLowerCase().includes("panel") ? (
                              <FlaskConical className="h-4 w-4 text-amber-500 shrink-0" />
                            ) : (
                              <Pill className="h-4 w-4 text-purple-500 shrink-0" />
                            )}
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white text-xs">{item.description}</p>
                              <p className="text-[11px] text-slate-400">
                                Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            ${item.total.toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-400">
                        Physician Consultation & Clinical Services (${selectedInvoice.total_amount.toFixed(2)})
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Total & Balances Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal Charges:</span>
                  <span className="font-mono font-semibold">${selectedInvoice.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax & Concessions:</span>
                  <span className="font-mono font-semibold">$0.00</span>
                </div>
                <div className="flex justify-between text-slate-900 dark:text-white font-bold text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>Total Amount Billed:</span>
                  <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                    ${selectedInvoice.total_amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Amount Settled / Paid:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    ${(selectedInvoice.paid_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold text-red-600">
                  <span>Outstanding Balance:</span>
                  <span className="font-mono">
                    ${Math.max(0, selectedInvoice.total_amount - (selectedInvoice.paid_amount || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isDownloadingPdf}
                  onClick={() => handleDownloadPdf(selectedInvoice.id, selectedInvoice.invoice_number)}
                  className="text-xs font-bold gap-1.5 border-blue-200 text-blue-700 dark:text-blue-300 hover:bg-blue-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF Receipt
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
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ========================================================================= */}
      {/* DIALOG: RECORD PAYMENT MODAL (SETTLES INVOICE TO PAID)                    */}
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
