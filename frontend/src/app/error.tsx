"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Clinical app error caught:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="h-16 w-16 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8" />
      </div>

      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
        Clinical Interface Exception
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">
        An unexpected error occurred during page rendering. Your medical records and session remain safe.
      </p>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => reset()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 h-10 px-5 shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Button asChild variant="outline" className="text-xs font-bold gap-1.5 h-10 px-5">
          <Link href="/">
            <Home className="h-4 w-4" />
            Return Home
          </Link>
        </Button>
      </div>

      {error?.digest && (
        <p className="mt-8 text-[11px] font-mono text-slate-400">
          Diagnostic ID: {error.digest}
        </p>
      )}
    </div>
  );
}
