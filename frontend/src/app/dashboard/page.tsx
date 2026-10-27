"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function DashboardRedirect() {
  const router = useRouter();
  const { role, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (role === "Admin") {
        router.push("/admin/dashboard");
      } else if (role === "Doctor") {
        router.push("/doctor/agenda");
      } else {
        router.push("/patient/dashboard");
      }
    }
  }, [role, isAuthenticated, isLoading, router]);

  return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-sm font-medium">Navigating to your portal dashboard...</p>
    </div>
  );
}
