import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeartPulse, ArrowLeft, Home, Search, CalendarPlus } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto shadow-inner">
          <HeartPulse className="h-12 w-12 animate-pulse" />
        </div>
        <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500 text-white shadow-sm">
          404
        </span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
        Page Not Found
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-md mx-auto mb-8">
        The clinical route or resource you are looking for might have been moved, rescheduled, or is temporarily unavailable.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="outline" className="text-xs font-bold gap-2 h-10 px-5">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Go Home
          </Link>
        </Button>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-2 h-10 px-5 shadow-sm">
          <Link href="/directory">
            <Search className="h-4 w-4" />
            Browse Doctor Directory
          </Link>
        </Button>
        <Button asChild variant="secondary" className="text-xs font-bold gap-2 h-10 px-5">
          <Link href="/patient/book">
            <CalendarPlus className="h-4 w-4" />
            Book Consultation
          </Link>
        </Button>
      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 font-mono">
        Apollo Enterprise HMS • Route Fallback Protection Active
      </div>
    </div>
  );
}
