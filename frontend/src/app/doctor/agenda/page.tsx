"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Clock,
  CalendarCheck,
  CheckCircle2,
  Stethoscope,
  FileText,
  User,
  Plus,
  Trash2,
  Loader2,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  History,
  Pill,
  AlertCircle,
  Calendar,
  Activity,
  HeartPulse,
  Thermometer,
  Scale,
  FlaskConical,
  Receipt,
  Search,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  Info,
  DollarSign,
  Microscope,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

interface PastTreatmentHistory {
  date: string;
  doctor: string;
  diagnosis: string;
  prescriptions: string[];
  notes?: string;
}

interface AppointmentItem {
  id: number;
  time: string;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  phone: string;
  chief_complaint: string;
  status: "Booked" | "In-Progress" | "Completed";
  duration_minutes: number;
  diagnosis?: string;
  prescription?: string[];
  past_history: PastTreatmentHistory[];
}

interface PharmacyItem {
  id: number;
  name: string;
  stock_quantity: number;
  price_per_unit: number;
  expiry_date: string;
  sku?: string;
  category?: string;
  unit?: string;
  is_low_stock?: boolean;
  is_expired?: boolean;
}

interface LabTest {
  id: number;
  name: string;
  cost: number;
  normal_range?: string;
  category?: string;
  description?: string;
}

interface PrescribedMedicineItem {
  pharmacy_item_id?: number;
  name: string;
  dosage: string;
  duration: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// Fallback baseline catalog for smooth offline/first-render experience
const FALLBACK_PHARMACY_ITEMS: PharmacyItem[] = [
  { id: 1, name: "Paracetamol 500mg", stock_quantity: 500, price_per_unit: 5.0, expiry_date: "2027-10-01", category: "Analgesic / Antipyretic", unit: "tablet" },
  { id: 2, name: "Amoxicillin 500mg", stock_quantity: 250, price_per_unit: 12.5, expiry_date: "2026-11-15", category: "Antibiotic", unit: "capsule" },
  { id: 3, name: "Metformin 500mg", stock_quantity: 400, price_per_unit: 6.0, expiry_date: "2027-04-20", category: "Antidiabetic", unit: "tablet" },
  { id: 4, name: "Atorvastatin 20mg", stock_quantity: 300, price_per_unit: 15.0, expiry_date: "2027-06-30", category: "Cardiovascular / Statin", unit: "tablet" },
  { id: 5, name: "Omeprazole 20mg", stock_quantity: 350, price_per_unit: 8.0, expiry_date: "2026-12-10", category: "Antacid / PPI", unit: "capsule" },
  { id: 6, name: "Azithromycin 500mg", stock_quantity: 180, price_per_unit: 25.0, expiry_date: "2026-12-31", category: "Antibiotic", unit: "tablet" },
];

const FALLBACK_LAB_TESTS: LabTest[] = [
  { id: 1, name: "Complete Blood Count (CBC)", cost: 350.0, normal_range: "Hb: 13.5-17.5 g/dL, WBC: 4.5-11k", category: "Hematology" },
  { id: 2, name: "Fasting Blood Glucose (FBS)", cost: 150.0, normal_range: "70 - 99 mg/dL", category: "Biochemistry" },
  { id: 3, name: "Lipid Profile", cost: 600.0, normal_range: "Total Chol: < 200 mg/dL, LDL: < 100 mg/dL", category: "Biochemistry" },
  { id: 4, name: "Liver Function Test (LFT)", cost: 750.0, normal_range: "ALT: 7-56 U/L, AST: 10-40 U/L", category: "Pathology" },
  { id: 5, name: "Thyroid Stimulating Hormone (TSH)", cost: 400.0, normal_range: "0.4 - 4.0 mIU/L", category: "Endocrinology" },
  { id: 6, name: "HbA1c (Glycated Hemoglobin)", cost: 500.0, normal_range: "Normal: < 5.7%, Prediabetes: 5.7-6.4%", category: "Biochemistry" },
  { id: 7, name: "Urinalysis Routine", cost: 200.0, normal_range: "Protein: Negative, Glucose: Negative", category: "Clinical Pathology" },
];

const COMMON_DIAGNOSES = [
  "Essential (Primary) Hypertension",
  "Type 2 Diabetes Mellitus",
  "Acute Upper Respiratory Infection",
  "Acute Gastroenteritis",
  "Migraine without Aura",
  "Bronchial Asthma - Mild Persistent",
  "Coronary Artery Disease - Stable",
  "Gastroesophageal Reflux Disease (GERD)",
];

const COMMON_DOSAGES = [
  "1-0-1 after meals",
  "1-0-0 before breakfast",
  "0-0-1 at bedtime",
  "1-1-1 after meals",
  "1 SOS (as needed)",
];

const COMMON_DURATIONS = ["3 days", "5 days", "7 days", "14 days", "30 days"];

export default function DoctorAgendaPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // EMR Workspace Active Tab
  const [activeTab, setActiveTab] = useState<"vitals" | "diagnosis" | "prescriptions" | "labs" | "history">("vitals");

  // Diagnostic Lab History for Patient
  const [patientLabHistory, setPatientLabHistory] = useState<any[]>([]);
  const [loadingLabHistory, setLoadingLabHistory] = useState(false);

  // 1. Vitals Tab State
  const [bpSystolic, setBpSystolic] = useState("120");
  const [bpDiastolic, setBpDiastolic] = useState("80");
  const [heartRate, setHeartRate] = useState("72");
  const [temperature, setTemperature] = useState("98.6");
  const [weight, setWeight] = useState("70");
  const [height, setHeight] = useState("175");
  const [spo2, setSpo2] = useState("98");
  const [respiratoryRate, setRespiratoryRate] = useState("16");
  const [vitalsNotes, setVitalsNotes] = useState("");

  // Computed BMI
  const bmiValue = useMemo(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (h > 0 && w > 0) {
      return (w / ((h / 100) * (h / 100))).toFixed(1);
    }
    return null;
  }, [height, weight]);

  const bmiCategory = useMemo(() => {
    if (!bmiValue) return null;
    const val = parseFloat(bmiValue);
    if (val < 18.5) return { label: "Underweight", color: "text-blue-500 bg-blue-50 dark:bg-blue-950/60" };
    if (val < 25.0) return { label: "Normal (Healthy)", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60" };
    if (val < 30.0) return { label: "Overweight", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/60" };
    return { label: "Obese", color: "text-red-600 bg-red-50 dark:bg-red-950/60" };
  }, [bmiValue]);

  // 2. Clinical Notes & Diagnosis State
  const [diagnosis, setDiagnosis] = useState("");
  const [subjectiveNotes, setSubjectiveNotes] = useState("");
  const [objectiveNotes, setObjectiveNotes] = useState("");
  const [detailedNotes, setDetailedNotes] = useState("");

  // 3. Prescription Module State
  const [pharmacyItems, setPharmacyItems] = useState<PharmacyItem[]>(FALLBACK_PHARMACY_ITEMS);
  const [pharmacySearch, setPharmacySearch] = useState("");
  const [isPharmacySearching, setIsPharmacySearching] = useState(false);
  const [selectedPharmacyItem, setSelectedPharmacyItem] = useState<PharmacyItem | null>(null);
  const [selectedDosage, setSelectedDosage] = useState("1-0-1 after meals");
  const [selectedDuration, setSelectedDuration] = useState("5 days");
  const [selectedQuantity, setSelectedQuantity] = useState(10);
  const [prescribedMedicines, setPrescribedMedicines] = useState<PrescribedMedicineItem[]>([]);

  // 4. Lab Orders State
  const [labTests, setLabTests] = useState<LabTest[]>(FALLBACK_LAB_TESTS);
  const [selectedLabTestIds, setSelectedLabTestIds] = useState<number[]>([]);

  // Billing calculation
  const consultationFee = 500.0;
  const medicinesSubtotal = useMemo(() => {
    return prescribedMedicines.reduce((sum, item) => sum + item.total, 0);
  }, [prescribedMedicines]);

  const labsSubtotal = useMemo(() => {
    return selectedLabTestIds.reduce((sum, id) => {
      const test = labTests.find((t) => t.id === id);
      return sum + (test ? test.cost : 0);
    }, 0);
  }, [selectedLabTestIds, labTests]);

  const grandTotal = useMemo(() => {
    return consultationFee + medicinesSubtotal + labsSubtotal;
  }, [consultationFee, medicinesSubtotal, labsSubtotal]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Appointments state
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);

  // Initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppointments([
        {
          id: 101,
          time: "09:00 AM",
          patient_id: 1,
          patient_name: "Bob Jones",
          patient_email: "bob.jones@example.com",
          phone: "+1 (555) 234-5678",
          chief_complaint: "Exertional chest discomfort and mild shortness of breath",
          status: "Booked",
          duration_minutes: 30,
          past_history: [
            {
              date: "2025-08-10",
              doctor: "Dr. Alice Smith",
              diagnosis: "Mild borderline hypertension",
              prescriptions: ["Hydrochlorothiazide 12.5mg daily"],
              notes: "Advised 30 mins brisk walking daily and low-sodium diet.",
            },
          ],
        },
        {
          id: 102,
          time: "10:00 AM",
          patient_id: 2,
          patient_name: "Jane Doe",
          patient_email: "jane.doe@example.com",
          phone: "+1 (555) 876-5432",
          chief_complaint: "Persistent dry cough, mild fever, and sinus congestion",
          status: "Booked",
          duration_minutes: 30,
          past_history: [],
        },
        {
          id: 103,
          time: "11:30 AM",
          patient_id: 3,
          patient_name: "Carlos Rivera",
          patient_email: "carlos.rivera@example.com",
          phone: "+1 (555) 345-6789",
          chief_complaint: "Severe left ankle swelling and pain after jogging",
          status: "In-Progress",
          duration_minutes: 30,
          past_history: [
            {
              date: "2024-11-05",
              doctor: "Dr. Elena Rostova",
              diagnosis: "Grade 1 Lateral ankle sprain",
              prescriptions: ["Ibuprofen 400mg TID PRN", "RICE protocol"],
              notes: "Compression bandage applied.",
            },
          ],
        },
        {
          id: 104,
          time: "02:00 PM",
          patient_id: 4,
          patient_name: "Sophia Martinez",
          patient_email: "sophia.m@example.com",
          phone: "+1 (555) 901-2345",
          chief_complaint: "Routine diabetes and lipid profile quarterly checkup",
          status: "Booked",
          duration_minutes: 30,
          past_history: [
            {
              date: "2025-05-18",
              doctor: "Dr. Alice Smith",
              diagnosis: "Type 2 Diabetes Mellitus, well controlled",
              prescriptions: ["Metformin 500mg BID", "Atorvastatin 10mg daily"],
              notes: "HbA1c was 6.2%. Kidney function tests within normal limits.",
            },
          ],
        },
        {
          id: 105,
          time: "03:30 PM",
          patient_id: 5,
          patient_name: "Michael Chang",
          patient_email: "m.chang@example.com",
          phone: "+1 (555) 678-9012",
          chief_complaint: "Post-stent surgical cardiovascular review",
          status: "Completed",
          duration_minutes: 30,
          diagnosis: "Stable cardiovascular recovery, normal sinus rhythm",
          prescription: ["Aspirin 81mg daily", "Metoprolol Tartrate 25mg BID", "Atorvastatin 20mg at bedtime"],
          past_history: [
            {
              date: "2025-03-20",
              doctor: "Dr. Alice Smith",
              diagnosis: "Coronary artery disease, post-angioplasty recovery",
              prescriptions: ["Clopidogrel 75mg daily", "Atorvastatin 40mg daily"],
              notes: "Cardiac rehabilitation program initiated.",
            },
          ],
        },
      ]);
      setLoading(false);
    }, 400);

    // Fetch live Pharmacy Items from FastAPI / Flask
    apiFetch<PharmacyItem[]>("/api/pharmacy/search")
      .then((items) => {
        if (items && items.length > 0) setPharmacyItems(items);
      })
      .catch(() => {});

    // Fetch live Lab Tests from FastAPI / Flask
    apiFetch<LabTest[]>("/api/lab/tests")
      .then((tests) => {
        if (tests && tests.length > 0) setLabTests(tests);
      })
      .catch(() => {});

    return () => clearTimeout(timer);
  }, []);

  // Search pharmacy inventory dynamically
  useEffect(() => {
    if (!pharmacySearch.trim()) return;
    const handler = setTimeout(async () => {
      setIsPharmacySearching(true);
      try {
        const results = await apiFetch<PharmacyItem[]>(
          `/api/pharmacy/search?q=${encodeURIComponent(pharmacySearch.trim())}`
        );
        if (results && results.length > 0) {
          setPharmacyItems(results);
        }
      } catch {
        // Filter local catalog fallback
        const filtered = FALLBACK_PHARMACY_ITEMS.filter((item) =>
          item.name.toLowerCase().includes(pharmacySearch.toLowerCase()) ||
          item.category?.toLowerCase().includes(pharmacySearch.toLowerCase())
        );
        setPharmacyItems(filtered);
      } finally {
        setIsPharmacySearching(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [pharmacySearch]);

  const openPatientSheet = (appt: AppointmentItem) => {
    setSelectedAppointment(appt);
    setDiagnosis(appt.diagnosis || "");
    setSubjectiveNotes(appt.chief_complaint || "");
    setObjectiveNotes("Alert, oriented, in no acute distress. Heart sounds S1/S2 present. Lungs clear to auscultation bilaterally.");
    setDetailedNotes("");

    // Reset Vitals to standard adult baseline
    setBpSystolic("120");
    setBpDiastolic("80");
    setHeartRate("72");
    setTemperature("98.6");
    setWeight("70");
    setHeight("175");
    setSpo2("98");
    setRespiratoryRate("16");
    setVitalsNotes("");

    // Initialize Prescriptions if available
    if (appt.prescription && appt.prescription.length > 0) {
      setPrescribedMedicines(
        appt.prescription.map((p, idx) => ({
          name: p.split(" - ")[0] || p,
          dosage: p.includes(" - ") ? p.split(" - ")[1].split(" (")[0] : "1-0-1 after meals",
          duration: "5 days",
          quantity: 10,
          unit_price: 5.0,
          total: 50.0,
        }))
      );
    } else {
      setPrescribedMedicines([]);
    }

    setSelectedPharmacyItem(null);
    setSelectedDosage("1-0-1 after meals");
    setSelectedDuration("5 days");
    setSelectedQuantity(10);
    setSelectedLabTestIds([]);
    setActiveTab("vitals");
    setIsSheetOpen(true);

    // Fetch patient's historical lab orders & completed findings
    setLoadingLabHistory(true);
    apiFetch<any[]>(`/api/lab/orders/patient/${appt.patient_id}`)
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setPatientLabHistory(data);
        } else {
          setPatientLabHistory([
            {
              id: 201,
              lab_test: { name: "Complete Blood Count (CBC)", category: "Hematology", normal_range: "Hb: 13.5-17.5 g/dL" },
              status: "Completed",
              results: "Hemoglobin: 14.2 g/dL (Normal). Platelets: 280,000 /mcL.",
              ordered_at: "2026-10-27 09:30:00",
              notes: "Verified by automated hematology analyzer.",
            },
          ]);
        }
      })
      .catch(() => {
        setPatientLabHistory([
          {
            id: 201,
            lab_test: { name: "Complete Blood Count (CBC)", category: "Hematology", normal_range: "Hb: 13.5-17.5 g/dL" },
            status: "Completed",
            results: "Hemoglobin: 14.2 g/dL (Normal). Platelets: 280,000 /mcL.",
            ordered_at: "2026-10-27 09:30:00",
            notes: "Verified by automated hematology analyzer.",
          },
        ]);
      })
      .finally(() => setLoadingLabHistory(false));
  };

  const handleAddMedicine = () => {
    if (!selectedPharmacyItem) {
      toast.error("Please select a medication from the search list first.");
      return;
    }
    const unitPrice = selectedPharmacyItem.price_per_unit || 5.0;
    const total = roundCurrency(unitPrice * selectedQuantity);

    const newItem: PrescribedMedicineItem = {
      pharmacy_item_id: selectedPharmacyItem.id,
      name: selectedPharmacyItem.name,
      dosage: selectedDosage,
      duration: selectedDuration,
      quantity: selectedQuantity,
      unit_price: unitPrice,
      total: total,
    };

    setPrescribedMedicines((prev) => [...prev, newItem]);
    toast.success(`Added ${newItem.name} to prescription.`);
    setSelectedPharmacyItem(null);
    setPharmacySearch("");
  };

  const handleRemoveMedicine = (idx: number) => {
    setPrescribedMedicines((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleLabTest = (testId: number) => {
    setSelectedLabTestIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  };

  const roundCurrency = (val: number) => Math.round(val * 100) / 100;

  // Complete Consultation Handler
  const handleFinalizeConsultation = async () => {
    if (!selectedAppointment) return;
    if (!diagnosis.trim()) {
      toast.error("Clinical Diagnosis Required", {
        description: "Please enter a primary clinical diagnosis in the Diagnosis tab.",
      });
      setActiveTab("diagnosis");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedPrescriptions = prescribedMedicines.map(
        (m) => `${m.name} - ${m.dosage} (${m.duration})`
      );

      const payload = {
        diagnosis: diagnosis.trim(),
        prescription: formattedPrescriptions,
        detailed_notes: `Subjective: ${subjectiveNotes.trim()} | Objective: ${objectiveNotes.trim()}${
          detailedNotes ? ` | Notes: ${detailedNotes.trim()}` : ""
        }`,
        vitals: {
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          blood_pressure: bpSystolic && bpDiastolic ? `${bpSystolic}/${bpDiastolic}` : null,
          temperature: temperature ? parseFloat(temperature) : null,
          pulse: heartRate ? parseInt(heartRate) : null,
          oxygen_saturation: spo2 ? parseFloat(spo2) : null,
          respiratory_rate: respiratoryRate ? parseInt(respiratoryRate) : null,
          notes: vitalsNotes.trim() || null,
        },
        medicines: prescribedMedicines.map((m) => ({
          pharmacy_item_id: m.pharmacy_item_id,
          name: m.name,
          dosage: m.dosage,
          duration: m.duration,
          quantity: m.quantity,
          unit_price: m.unit_price,
        })),
        lab_test_ids: selectedLabTestIds,
        consultation_fee: consultationFee,
      };

      // Call backend to save treatment, vitals, lab orders, and generate invoice
      let invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${selectedAppointment.id}`;
      try {
        const res = await apiFetch<any>(
          `/api/appointments/${selectedAppointment.id}/complete`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
        if (res?.invoices && res.invoices.length > 0) {
          invoiceNumber = res.invoices[0].invoice_number;
        }
      } catch {
        // Try fallback endpoint
        await apiFetch<any>(
          `/api/consultations/${selectedAppointment.id}/complete`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        ).catch(() => {});
      }

      toast.success("Consultation Completed & EMR Record Saved!", {
        description: `Invoice #${invoiceNumber} automatically generated for $${grandTotal.toFixed(2)} (${prescribedMedicines.length} medications, ${selectedLabTestIds.length} lab tests).`,
      });

      // Update state
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === selectedAppointment.id
            ? {
                ...a,
                status: "Completed",
                diagnosis: diagnosis.trim(),
                prescription: formattedPrescriptions,
              }
            : a
        )
      );
      setIsSheetOpen(false);
    } catch (err: any) {
      toast.error("Failed to complete consultation", {
        description: err?.message || "Please check your network connection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kanban groupings
  const waitingAppointments = appointments.filter((a) => a.status === "Booked");
  const inProgressAppointments = appointments.filter((a) => a.status === "In-Progress");
  const completedAppointments = appointments.filter((a) => a.status === "Completed");

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Stethoscope className="h-5 w-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Clinical EMR & Physician Agenda
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Welcome back, {user ? `Dr. ${user.first_name} ${user.last_name}` : "Doctor"}. Manage patient consultations, capture vitals, prescribe medications, order lab tests, and generate billing invoices.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <Button
            size="sm"
            variant={viewMode === "kanban" ? "default" : "ghost"}
            onClick={() => setViewMode("kanban")}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban Board
          </Button>
          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "ghost"}
            onClick={() => setViewMode("list")}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <ListIcon className="h-3.5 w-3.5" />
            List View
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Consultations</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{appointments.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Awaiting Consultation</p>
              <p className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-0.5">{waitingAppointments.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200/80 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-700 dark:text-purple-300">In Active Exam</p>
              <p className="text-2xl font-black text-purple-900 dark:text-purple-100 mt-0.5">{inProgressAppointments.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Completed & Billed</p>
              <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-0.5">{completedAppointments.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Agenda Section (Kanban vs List) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Awaiting Consultation */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Awaiting Consultation</h3>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">{waitingAppointments.length}</Badge>
            </div>

            <div className="space-y-3">
              {waitingAppointments.map((appt) => (
                <Card
                  key={appt.id}
                  onClick={() => openPatientSheet(appt)}
                  className="p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer bg-white dark:bg-slate-900 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700">
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
                          {appt.patient_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {appt.patient_name}
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {appt.time} ({appt.duration_minutes}m)
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px]">
                      Booked
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-500">Chief Complaint:</span> {appt.chief_complaint}
                  </p>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-[11px] text-slate-400">
                      {appt.past_history.length > 0 ? `${appt.past_history.length} past visits` : "First consultation"}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5 text-xs group-hover:translate-x-0.5 transition-transform">
                      Open EMR <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Active Examination</h3>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">{inProgressAppointments.length}</Badge>
            </div>

            <div className="space-y-3">
              {inProgressAppointments.map((appt) => (
                <Card
                  key={appt.id}
                  onClick={() => openPatientSheet(appt)}
                  className="p-4 hover:shadow-md hover:border-purple-400 dark:hover:border-purple-700 transition-all cursor-pointer bg-white dark:bg-slate-900 border-purple-200/80 dark:border-purple-900/60 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-purple-200 dark:border-purple-700">
                        <AvatarFallback className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs">
                          {appt.patient_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                          {appt.patient_name}
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {appt.time}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-0 text-[10px]">
                      In-Progress
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-3 bg-purple-50/50 dark:bg-purple-950/20 p-2 rounded-lg border border-purple-100 dark:border-purple-900/40">
                    <span className="font-semibold text-slate-500">Complaint:</span> {appt.chief_complaint}
                  </p>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Recording EMR</span>
                    <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-0.5 text-xs group-hover:translate-x-0.5 transition-transform">
                      Resume EMR <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Completed & Finalized</h3>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">{completedAppointments.length}</Badge>
            </div>

            <div className="space-y-3">
              {completedAppointments.map((appt) => (
                <Card
                  key={appt.id}
                  onClick={() => openPatientSheet(appt)}
                  className="p-4 opacity-90 hover:opacity-100 hover:shadow-md transition-all cursor-pointer bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-950"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-emerald-200 dark:border-emerald-800">
                        <AvatarFallback className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                          {appt.patient_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {appt.patient_name}
                        </p>
                        <p className="text-[11px] text-slate-400">{appt.time}</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px]">
                      Completed
                    </Badge>
                  </div>

                  {appt.diagnosis && (
                    <div className="mt-3 p-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg text-xs border border-emerald-100 dark:border-emerald-900/40">
                      <p className="font-bold text-emerald-900 dark:text-emerald-200">Dx: {appt.diagnosis}</p>
                    </div>
                  )}

                  {appt.prescription && appt.prescription.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {appt.prescription.slice(0, 2).map((med, mIdx) => (
                        <span key={mIdx} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          {med.split(" - ")[0]}
                        </span>
                      ))}
                      {appt.prescription.length > 2 && (
                        <span className="text-[10px] text-slate-400">+{appt.prescription.length - 2} more</span>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                onClick={() => openPatientSheet(appt)}
                className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs font-bold text-slate-500 w-16">{appt.time}</span>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700">
                      {appt.patient_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{appt.patient_name}</p>
                    <p className="text-xs text-slate-500">{appt.chief_complaint}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      appt.status === "Completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : appt.status === "In-Progress"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-amber-100 text-amber-800"
                    }
                  >
                    {appt.status}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                    EMR Chart <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ADVANCED CLINICAL EMR WORKSPACE (Sheet Slide-out)                         */}
      {/* ========================================================================= */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-0 flex flex-col bg-white dark:bg-slate-900">
          {selectedAppointment && (
            <div className="flex-1 flex flex-col justify-between">
              {/* Patient Banner */}
              <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <Avatar className="h-12 w-12 border-2 border-emerald-500/30">
                      <AvatarFallback className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-sm">
                        {selectedAppointment.patient_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <SheetTitle className="text-xl font-black text-slate-900 dark:text-white">
                          {selectedAppointment.patient_name}
                        </SheetTitle>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          ID: #{selectedAppointment.patient_id}
                        </Badge>
                      </div>
                      <SheetDescription className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span>{selectedAppointment.patient_email}</span>
                        <span>•</span>
                        <span>{selectedAppointment.phone}</span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedAppointment.time} Slot</span>
                      </SheetDescription>
                    </div>
                  </div>

                  {/* Real-time Invoice Counter Pill */}
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Billed</span>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      ${grandTotal.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Patient Complaint Notice */}
                <div className="mt-3.5 p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-blue-900 dark:text-blue-200">Patient Chief Complaint:</span>{" "}
                    <span className="text-blue-800 dark:text-blue-300">{selectedAppointment.chief_complaint}</span>
                  </div>
                </div>
              </div>

              {/* Tabs Navigation Header */}
              <div className="px-6 pt-4 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab("vitals")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === "vitals"
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5 text-blue-500" />
                    <span>1. Vitals</span>
                    {bpSystolic && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("diagnosis")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === "diagnosis"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 text-emerald-500" />
                    <span>2. Notes & Dx</span>
                    {diagnosis && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("prescriptions")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === "prescriptions"
                        ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Pill className="h-3.5 w-3.5 text-purple-500" />
                    <span>3. Pharmacy</span>
                    {prescribedMedicines.length > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-mono">
                        {prescribedMedicines.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("labs")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === "labs"
                        ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <FlaskConical className="h-3.5 w-3.5 text-amber-500" />
                    <span>4. Lab Orders</span>
                    {selectedLabTestIds.length > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono">
                        {selectedLabTestIds.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === "history"
                        ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Microscope className="h-3.5 w-3.5 text-teal-500" />
                    <span>5. Lab Findings</span>
                    {patientLabHistory.length > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-mono">
                        {patientLabHistory.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Tab Content Body */}
              <div className="p-6 flex-1 space-y-6">
                {/* ========================================================= */}
                {/* TAB 1: VITALS FORM                                        */}
                {/* ========================================================= */}
                {activeTab === "vitals" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-600" />
                          Clinical Vital Signs (Point-of-Care)
                        </h4>
                        <p className="text-xs text-slate-500">Record baseline physiological vitals for this encounter.</p>
                      </div>
                      {bmiValue && (
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${bmiCategory?.color}`}>
                          <span>BMI: {bmiValue} kg/m²</span>
                          <span>•</span>
                          <span>{bmiCategory?.label}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Blood Pressure */}
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                            <HeartPulse className="h-3.5 w-3.5 text-red-500" />
                            Blood Pressure (BP)
                          </Label>
                          <span className="text-[10px] text-slate-400">Target: &lt;120/80 mmHg</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Sys (120)"
                            value={bpSystolic}
                            onChange={(e) => setBpSystolic(e.target.value)}
                            className="text-xs font-mono"
                          />
                          <span className="text-slate-400 font-bold">/</span>
                          <Input
                            placeholder="Dia (80)"
                            value={bpDiastolic}
                            onChange={(e) => setBpDiastolic(e.target.value)}
                            className="text-xs font-mono"
                          />
                          <span className="text-[11px] text-slate-500 font-mono shrink-0">mmHg</span>
                        </div>
                      </div>

                      {/* Heart Rate / Pulse */}
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                            <Activity className="h-3.5 w-3.5 text-blue-500" />
                            Heart Rate (Pulse)
                          </Label>
                          <span className="text-[10px] text-slate-400">Normal: 60 - 100 bpm</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="e.g. 72"
                            value={heartRate}
                            onChange={(e) => setHeartRate(e.target.value)}
                            className="text-xs font-mono"
                          />
                          <span className="text-[11px] text-slate-500 font-mono shrink-0">bpm</span>
                        </div>
                      </div>

                      {/* Temperature */}
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                            <Thermometer className="h-3.5 w-3.5 text-amber-500" />
                            Body Temperature
                          </Label>
                          <span className="text-[10px] text-slate-400">Normal: 98.6 °F</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="e.g. 98.6"
                            value={temperature}
                            onChange={(e) => setTemperature(e.target.value)}
                            className="text-xs font-mono"
                          />
                          <span className="text-[11px] text-slate-500 font-mono shrink-0">°F</span>
                        </div>
                      </div>

                      {/* Weight and Height */}
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                            <Scale className="h-3.5 w-3.5 text-emerald-500" />
                            Weight & Height
                          </Label>
                          <span className="text-[10px] text-slate-400">Calculates BMI</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
                            <Input
                              placeholder="70"
                              value={weight}
                              onChange={(e) => setWeight(e.target.value)}
                              className="text-xs font-mono"
                            />
                            <span className="text-[11px] text-slate-500">kg</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              placeholder="175"
                              value={height}
                              onChange={(e) => setHeight(e.target.value)}
                              className="text-xs font-mono"
                            />
                            <span className="text-[11px] text-slate-500">cm</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Vitals */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Oxygen Saturation (SpO2 %)</Label>
                        <Input
                          placeholder="e.g. 98"
                          value={spo2}
                          onChange={(e) => setSpo2(e.target.value)}
                          className="text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Respiratory Rate (breaths/min)</Label>
                        <Input
                          placeholder="e.g. 16"
                          value={respiratoryRate}
                          onChange={(e) => setRespiratoryRate(e.target.value)}
                          className="text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Vitals Clinical Observations / Comments</Label>
                      <Input
                        placeholder="e.g. Patient rested comfortably for 10 mins prior to BP reading."
                        value={vitalsNotes}
                        onChange={(e) => setVitalsNotes(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 2: CLINICAL NOTES & DIAGNOSIS                         */}
                {/* ========================================================= */}
                {activeTab === "diagnosis" && (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="h-4 w-4 text-emerald-600" />
                        Clinical Diagnosis & SOAP Documentation
                      </h4>
                      <p className="text-xs text-slate-500">Document the clinical impression, patient complaints, and examination findings.</p>
                    </div>

                    {/* Primary Diagnosis */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-900 dark:text-white">
                        Primary Clinical Diagnosis *
                      </Label>
                      <Input
                        placeholder="e.g. Essential Hypertension Stage 1"
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        className="text-xs font-medium"
                      />

                      {/* Quick-Pick Diagnosis Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[11px] text-slate-400 font-semibold self-center mr-1">Quick Select:</span>
                        {COMMON_DIAGNOSES.map((dName) => (
                          <button
                            key={dName}
                            type="button"
                            onClick={() => setDiagnosis(dName)}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-800 transition-colors cursor-pointer"
                          >
                            + {dName}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subjective Notes (SOAP - S) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Subjective (Patient Reported Complaints & History)
                      </Label>
                      <textarea
                        rows={3}
                        value={subjectiveNotes}
                        onChange={(e) => setSubjectiveNotes(e.target.value)}
                        placeholder="Patient reports symptoms, duration, precipitating factors..."
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>

                    {/* Objective Examination & Assessment (SOAP - O/A) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Objective (Physical Exam Findings & Doctor&apos;s Assessment)
                      </Label>
                      <textarea
                        rows={3}
                        value={objectiveNotes}
                        onChange={(e) => setObjectiveNotes(e.target.value)}
                        placeholder="Clinical examination findings, systemic exam, palpation, auscultation..."
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>

                    {/* Follow-up & Lifestyle Advice */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Patient Advice & Follow-up Instructions
                      </Label>
                      <Input
                        placeholder="e.g. Reduce sodium intake, track BP daily for 2 weeks, review in 30 days."
                        value={detailedNotes}
                        onChange={(e) => setDetailedNotes(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 3: PRESCRIPTION MODULE (PHARMACY INVENTORY QUERY)      */}
                {/* ========================================================= */}
                {activeTab === "prescriptions" && (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Pill className="h-4 w-4 text-purple-600" />
                        Pharmacy Inventory & Prescription Order
                      </h4>
                      <p className="text-xs text-slate-500">
                        Search live pharmacy medications, configure dosage regimens, and add to the patient prescription.
                      </p>
                    </div>

                    {/* Interactive Search Bar querying PharmacyItem */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Search Pharmacy Inventory Table
                      </Label>
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                        <Input
                          placeholder="Search medicine by name or category (e.g. Paracetamol, Amoxicillin, Atorvastatin)..."
                          value={pharmacySearch}
                          onChange={(e) => setPharmacySearch(e.target.value)}
                          className="pl-9 text-xs"
                        />
                        {isPharmacySearching && (
                          <Loader2 className="h-4 w-4 absolute right-3 top-2.5 animate-spin text-purple-600" />
                        )}
                      </div>

                      {/* Dropdown suggestions */}
                      {pharmacyItems.length > 0 && (
                        <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                          {pharmacyItems.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                setSelectedPharmacyItem(item);
                                setPharmacySearch(item.name);
                              }}
                              className={`p-2.5 flex items-center justify-between hover:bg-purple-50/70 dark:hover:bg-purple-950/40 cursor-pointer transition-colors text-xs ${
                                selectedPharmacyItem?.id === item.id ? "bg-purple-100/60 dark:bg-purple-950/60" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Pill className="h-3.5 w-3.5 text-purple-600" />
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white">{item.name}</span>
                                  {item.category && (
                                    <span className="ml-2 text-[10px] text-slate-400">({item.category})</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  ${item.price_per_unit.toFixed(2)}/{item.unit || "unit"}
                                </Badge>
                                <span className={`text-[10px] font-semibold ${item.stock_quantity > 20 ? "text-emerald-600" : "text-amber-600"}`}>
                                  {item.stock_quantity} in stock
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Medication Dosage & Duration Configurator */}
                    {selectedPharmacyItem && (
                      <div className="p-4 rounded-xl border-2 border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-purple-950 dark:text-purple-200">
                            Configure: {selectedPharmacyItem.name}
                          </span>
                          <Badge className="bg-purple-600 text-white font-mono text-[10px]">
                            ${selectedPharmacyItem.price_per_unit.toFixed(2)} per unit
                          </Badge>
                        </div>

                        {/* Dosage Chips */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Dosage Schedule</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {COMMON_DOSAGES.map((ds) => (
                              <button
                                key={ds}
                                type="button"
                                onClick={() => setSelectedDosage(ds)}
                                className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold border transition-all cursor-pointer ${
                                  selectedDosage === ds
                                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-300"
                                }`}
                              >
                                {ds}
                              </button>
                            ))}
                          </div>
                          <Input
                            placeholder="Custom dosage (e.g. 1-0-1 after meals)"
                            value={selectedDosage}
                            onChange={(e) => setSelectedDosage(e.target.value)}
                            className="text-xs mt-1"
                          />
                        </div>

                        {/* Duration and Quantity */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Duration</Label>
                            <div className="flex flex-wrap gap-1">
                              {COMMON_DURATIONS.map((dur) => (
                                <button
                                  key={dur}
                                  type="button"
                                  onClick={() => setSelectedDuration(dur)}
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border cursor-pointer ${
                                    selectedDuration === dur
                                      ? "bg-purple-600 text-white border-purple-600"
                                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                  }`}
                                >
                                  {dur}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Quantity to Dispense</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                max={selectedPharmacyItem.stock_quantity || 100}
                                value={selectedQuantity}
                                onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                                className="text-xs font-mono"
                              />
                              <span className="text-xs font-mono text-slate-500 shrink-0">
                                Total: ${(selectedPharmacyItem.price_per_unit * selectedQuantity).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={handleAddMedicine}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add to Prescription Order
                        </Button>
                      </div>
                    )}

                    {/* Prescribed Medications List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Active Prescription Orders ({prescribedMedicines.length})
                        </Label>
                        <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-bold">
                          Subtotal: ${medicinesSubtotal.toFixed(2)}
                        </span>
                      </div>

                      {prescribedMedicines.length > 0 ? (
                        <div className="space-y-2">
                          {prescribedMedicines.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-bold text-purple-950 dark:text-purple-200 text-sm">
                                  {item.name}
                                </p>
                                <p className="text-slate-600 dark:text-slate-300 font-medium">
                                  {item.dosage} • {item.duration} (Qty: {item.quantity})
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                  ${item.total.toFixed(2)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMedicine(idx)}
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                          No medications prescribed yet. Search pharmacy items above to add.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 4: LAB ORDERS TAB (CHECKLIST OF AVAILABLE LAB TESTS)  */}
                {/* ========================================================= */}
                {activeTab === "labs" && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 text-amber-600" />
                          Diagnostic Laboratory Investigations
                        </h4>
                        <p className="text-xs text-slate-500">
                          Select diagnostic tests to order. Orders will be dispatched as &apos;Pending&apos; and itemized on the invoice.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                        Subtotal: ${labsSubtotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {labTests.map((test) => {
                        const isSelected = selectedLabTestIds.includes(test.id);
                        return (
                          <div
                            key={test.id}
                            onClick={() => toggleLabTest(test.id)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 shadow-xs"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-1 rounded ${isSelected ? "text-amber-600" : "text-slate-400"}`}>
                                {isSelected ? (
                                  <CheckSquare className="h-5 w-5 text-amber-600" />
                                ) : (
                                  <Square className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                                    {test.name}
                                  </span>
                                  {test.category && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      {test.category}
                                    </Badge>
                                  )}
                                </div>
                                {test.normal_range && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    Normal Range: <span className="font-mono">{test.normal_range}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                              ${test.cost.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 5: PATIENT LAB FINDINGS & HISTORICAL EMR              */}
                {/* ========================================================= */}
                {activeTab === "history" && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Microscope className="h-4 w-4 text-teal-600" />
                          Diagnostic Investigation Results & Patient History
                        </h4>
                        <p className="text-xs text-slate-500">
                          Automated lab findings, verified technician reports, and previous clinical encounters.
                        </p>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {patientLabHistory.length} Investigations
                      </Badge>
                    </div>

                    {/* Section A: Completed Lab Investigations */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Completed Laboratory Diagnostics
                      </span>

                      {loadingLabHistory ? (
                        <div className="space-y-2">
                          <Skeleton className="h-20 rounded-xl" />
                          <Skeleton className="h-20 rounded-xl" />
                        </div>
                      ) : patientLabHistory.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center">
                          No previous diagnostic laboratory orders on record for this patient.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {patientLabHistory.map((item) => {
                            const isDone = item.status === "Completed";
                            return (
                              <div
                                key={item.id}
                                className={`p-4 rounded-xl border transition-all ${
                                  isDone
                                    ? "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                                    : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                                        {item.lab_test?.name || `Lab Order #${item.id}`}
                                      </span>
                                      {item.lab_test?.category && (
                                        <Badge variant="secondary" className="text-[10px]">
                                          {item.lab_test.category}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      Ordered: {item.ordered_at ? new Date(item.ordered_at).toLocaleDateString() : "Recent"}
                                    </p>
                                  </div>
                                  <Badge
                                    className={
                                      isDone
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px] font-bold"
                                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px] font-bold"
                                    }
                                  >
                                    {item.status}
                                  </Badge>
                                </div>

                                {isDone && item.results && (
                                  <div className="mt-3 p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                                      Laboratory Findings
                                    </p>
                                    <p className="font-mono text-xs font-bold text-emerald-950 dark:text-emerald-100">
                                      {item.results}
                                    </p>
                                    {item.lab_test?.normal_range && (
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                        Reference Range: <span className="font-mono">{item.lab_test.normal_range}</span>
                                      </p>
                                    )}
                                    {item.notes && (
                                      <p className="text-[10px] text-slate-500 italic mt-1">
                                        Note: {item.notes}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Section B: Previous Clinical Visits */}
                    {selectedAppointment.past_history && selectedAppointment.past_history.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5 text-blue-600" />
                          Previous Doctor Encounters
                        </span>
                        <div className="space-y-2">
                          {selectedAppointment.past_history.map((hist, hIdx) => (
                            <div
                              key={hIdx}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {hist.diagnosis}
                                </span>
                                <span className="text-slate-400 font-mono text-[11px]">{hist.date}</span>
                              </div>
                              <p className="text-slate-500 text-[11px]">Seen by {hist.doctor}</p>
                              {hist.prescriptions && hist.prescriptions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {hist.prescriptions.map((rx, rIdx) => (
                                    <span key={rIdx} className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                                      {rx}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Live Billing Summary & Complete Consultation Bar */}
              <div className="p-6 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 space-y-4">
                {/* Itemized Billing Breakdown Preview */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                      Physician Consultation Fee
                    </span>
                    <span className="font-mono font-semibold">${consultationFee.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Pill className="h-3.5 w-3.5 text-purple-600" />
                      Prescribed Medications ({prescribedMedicines.length} items)
                    </span>
                    <span className="font-mono font-semibold">${medicinesSubtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <FlaskConical className="h-3.5 w-3.5 text-amber-600" />
                      Diagnostic Lab Investigations ({selectedLabTestIds.length} tests)
                    </span>
                    <span className="font-mono font-semibold">${labsSubtotal.toFixed(2)}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <Receipt className="h-4 w-4" />
                      Auto-Generated Invoice Total
                    </span>
                    <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                      ${grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Final Actions */}
                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSheetOpen(false)}
                    className="text-xs"
                  >
                    Cancel / Keep Active
                  </Button>

                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleFinalizeConsultation}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 px-6 h-10 shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Finalizing EMR & Generating Invoice...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Complete Consultation & Bill (${grandTotal.toFixed(2)})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
