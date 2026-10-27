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
} from "@/components/ui/dialog";
import {
  Download,
  Smartphone,
  CheckCircle2,
  Share,
  PlusSquare,
  Sparkles,
  Laptop,
} from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPWAButton({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Detect if app is already running in standalone / installed mode
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandaloneMode) {
      setIsInstalled(true);
    }

    // 2. Detect iOS device (Safari does not fire beforeinstallprompt)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Listen for the native PWA install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Listen for successful installation event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
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
        description: "Apollo HMS is already installed on this device.",
      });
      return;
    }

    // iOS Safari instructions
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // Chrome / Edge / Android / Desktop prompt
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === "accepted") {
          toast.success("Installing Apollo HMS...", {
            description: "Adding application icon to your home screen / desktop.",
          });
          setIsInstalled(true);
        } else {
          toast.info("Installation postponed", {
            description: "You can install Apollo HMS anytime from the top navigation bar.",
          });
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      } finally {
        setDeferredPrompt(null);
      }
    } else {
      // If triggered before prompt event or in non-supporting browser
      toast.info("Install Application", {
        description:
          "Click the install icon in your browser's address bar (or menu) to install Apollo HMS.",
      });
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
        className={`h-8 gap-1.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs transition-all ${className}`}
        title="Download and install Apollo HMS as a native desktop or mobile app"
      >
        <Download className="h-3.5 w-3.5 animate-bounce" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </Button>

      {/* iOS Instructions Modal */}
      <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Install Apollo HMS on iOS
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Follow these 2 simple steps in Safari to add to your Home Screen.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                1
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Tap the Share Button
                  <Share className="h-3.5 w-3.5 text-blue-600" />
                </p>
                <p className="text-slate-500 text-[11px]">
                  Located in Safari toolbar at the bottom of your iPhone or top of your iPad.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                2
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Select &quot;Add to Home Screen&quot;
                  <PlusSquare className="h-3.5 w-3.5 text-blue-600" />
                </p>
                <p className="text-slate-500 text-[11px]">
                  Scroll down the share sheet and tap &quot;Add to Home Screen&quot; to launch in standalone mode.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
