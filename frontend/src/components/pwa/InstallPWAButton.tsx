"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Download,
  Smartphone,
  CheckCircle2,
  PlusSquare,
  Sparkles,
  Laptop,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type DeviceOS = "ios" | "android" | "desktop";

/**
 * Custom Apple iOS Share Icon (rectangle with upward arrow)
 */
function AppleShareIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Apple Share Icon"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

/**
 * Custom Desktop URL Address Bar Install Icon (monitor with downward arrow)
 */
function BrowserUrlInstallIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Browser Install Icon"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <path d="M12 7v5" />
      <path d="m9 10 3 3 3-3" />
    </svg>
  );
}

export function InstallPWAButton({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [detectedOS, setDetectedOS] = useState<DeviceOS>("desktop");
  const [activeTab, setActiveTab] = useState<DeviceOS>("desktop");
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 1. Detect if app is running in standalone / installed PWA mode
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandaloneMode) {
      setIsInstalled(true);
    }

    // 2. Detect User Device OS
    const ua = window.navigator.userAgent.toLowerCase();
    const platform =
      (window.navigator as any).userAgentData?.platform?.toLowerCase() ||
      window.navigator.platform?.toLowerCase() ||
      "";

    let os: DeviceOS = "desktop";
    if (/iphone|ipad|ipod/.test(ua) || (platform.includes("mac") && navigator.maxTouchPoints > 1)) {
      os = "ios";
    } else if (/android/.test(ua)) {
      os = "android";
    } else {
      os = "desktop";
    }

    setDetectedOS(os);
    setActiveTab(os);

    // 3. Listen for native beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent automatic browser mini-infobar prompt
      e.preventDefault();
      // Stash event so it can be triggered seamlessly via button
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Listen for successful install event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowModal(false);
      toast.success("Apollo HMS Installed Successfully!", {
        description: "The application is now installed on your device for rapid offline access.",
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) {
      toast.info("Already Installed", {
        description: "Apollo HMS is already installed and running on this device.",
      });
      return;
    }

    // 1. If native beforeinstallprompt is ready, trigger native browser prompt
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === "accepted") {
          setIsInstalled(true);
          toast.success("Installing Apollo HMS...", {
            description: "Adding application icon to your device home screen / desktop.",
          });
        } else {
          toast.info("Installation postponed", {
            description: "You can install Apollo HMS anytime from this button.",
          });
        }
      } catch (err) {
        console.error("[PWA] Prompt error:", err);
        setShowModal(true);
      } finally {
        setDeferredPrompt(null);
      }
      return;
    }

    // 2. If native prompt is not available (e.g. iOS Safari, Firefox, or desktop browser before prompt fires),
    // open the beautifully styled instructions dialog
    setShowModal(true);
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      toast.success("Link Copied", {
        description: "Apollo HMS web app address copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        <span>App Installed</span>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        onClick={handleInstallClick}
        size="sm"
        className={`h-8 gap-1.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs transition-all cursor-pointer ${className}`}
        title="Download and install Apollo HMS as a native standalone app"
      >
        <Download className="h-3.5 w-3.5 animate-bounce" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </Button>

      {/* Enterprise Installation Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    Install Apollo HMS
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Standalone app with offline caching & instant access
                  </DialogDescription>
                </div>
              </div>

              <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold tracking-wider">
                {detectedOS === "ios" ? "iOS Detected" : detectedOS === "android" ? "Android" : "Desktop"}
              </Badge>
            </div>
          </DialogHeader>

          {/* OS Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("ios")}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "ios"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Apple iOS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("desktop")}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "desktop"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Laptop className="h-3.5 w-3.5" />
              <span>Desktop / Mac</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("android")}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "android"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Android</span>
            </button>
          </div>

          {/* 1. iOS Instructions */}
          {activeTab === "ios" && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Highlighted Primary Instruction Box */}
              <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-slate-800 dark:text-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-wide">
                  <AppleShareIcon className="h-4 w-4" />
                  <span>Single-Step iOS Installation</span>
                </div>
                <p className="font-semibold text-sm leading-snug text-slate-900 dark:text-white">
                  Tap the <strong className="text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">Share icon <AppleShareIcon className="inline h-3.5 w-3.5" /></strong> at the bottom of your screen, then select <strong className="text-blue-600 dark:text-blue-400">&apos;Add to Home Screen&apos;</strong>.
                </p>
              </div>

              {/* Step Detail Badges */}
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                    <AppleShareIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      1. Open Share Menu in Safari
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Tap the square Share icon with upward arrow on the Safari toolbar at the bottom of your iPhone (or top right on iPad).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                    <PlusSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      2. Tap &apos;Add to Home Screen&apos;
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Scroll down the options list and tap &quot;Add to Home Screen&quot;. Then tap &quot;Add&quot; in the top-right corner.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Desktop Instructions */}
          {activeTab === "desktop" && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Highlighted Primary Instruction Box */}
              <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-slate-800 dark:text-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-wide">
                  <BrowserUrlInstallIcon className="h-4 w-4" />
                  <span>Single-Step Desktop Installation</span>
                </div>
                <p className="font-semibold text-sm leading-snug text-slate-900 dark:text-white">
                  Click the <strong className="text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">install icon <BrowserUrlInstallIcon className="inline h-3.5 w-3.5" /></strong> located on the right side of your browser&apos;s URL address bar.
                </p>
              </div>

              {/* Visual Address Bar Mockup */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Browser Address Bar Location
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                  <span className="text-slate-400 truncate">https://apollo-hms.org</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px] animate-pulse">
                      <BrowserUrlInstallIcon className="h-3 w-3" />
                      Install
                    </span>
                    <span className="text-slate-400 text-xs">★</span>
                  </div>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  In Chrome, Edge, or Brave, an install button (monitor icon with arrow or a circle &apos;+&apos; symbol) appears right inside the address bar.
                </p>
              </div>
            </div>
          )}

          {/* 3. Android Instructions */}
          {activeTab === "android" && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Highlighted Primary Instruction Box */}
              <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-slate-800 dark:text-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-wide">
                  <Smartphone className="h-4 w-4" />
                  <span>Single-Step Android Installation</span>
                </div>
                <p className="font-semibold text-sm leading-snug text-slate-900 dark:text-white">
                  Click the <strong className="text-blue-600 dark:text-blue-400">install icon</strong> located on the right side of your browser&apos;s URL address bar, or tap the <strong className="text-blue-600 dark:text-blue-400">menu (⋮)</strong> and select <strong className="text-blue-600 dark:text-blue-400">&apos;Install app&apos;</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Chrome & Samsung Internet
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Tap the three dots (⋮) in the top right corner of Chrome and choose &quot;Install app&quot; or &quot;Add to Home screen&quot;.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Benefits strip */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Secure Offline Access
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Zero Address Bar Clutter
            </span>
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="text-xs font-semibold gap-1.5 h-9"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Link Copied!" : "Copy App Link"}
            </Button>

            <Button
              type="button"
              onClick={() => setShowModal(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9 px-5 shadow-xs"
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
