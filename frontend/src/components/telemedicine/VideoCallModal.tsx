"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MonitorUp,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  HeartPulse,
  Settings,
  Users,
  Maximize2,
  Minimize2,
  Stethoscope,
  Activity,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: number;
  participantName: string;
  participantRole: "Doctor" | "Patient";
  consultationDate: string;
  consultationTime: string;
  department?: string;
}

export function VideoCallModal({
  isOpen,
  onClose,
  appointmentId,
  participantName,
  participantRole,
  consultationDate,
  consultationTime,
  department = "Telemedicine Consultation",
}: VideoCallModalProps) {
  // Call controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { sender: string; text: string; time: string }[]
  >([
    {
      sender: participantRole === "Doctor" ? "Dr. Alice Smith" : "Patient Care",
      text: "Hello! Welcome to the secure telemedicine room. Audio and video are operational.",
      time: "Just now",
    },
  ]);
  const [newMsg, setNewMsg] = useState("");

  // Live Consultation Timer
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      toast.info(next ? "Microphone Muted" : "Microphone Active");
      return next;
    });
  };

  const handleToggleVideo = () => {
    setIsVideoOff((prev) => {
      const next = !prev;
      toast.info(next ? "Camera Disabled" : "Camera Enabled");
      return next;
    });
  };

  const handleToggleScreenShare = () => {
    setIsScreenSharing((prev) => {
      const next = !prev;
      toast.success(next ? "Screen sharing started" : "Screen sharing stopped");
      return next;
    });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        sender: "You",
        text: newMsg.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setNewMsg("");
  };

  const handleEndCall = () => {
    toast.success("Telemedicine Consultation Concluded", {
      description: `Session with ${participantName} ended after ${formatTimer(seconds)}. Clinical records updated.`,
    });
    onClose();
  };

  const participantInitials = participantName
    .replace("Dr.", "")
    .trim()
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "MD";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleEndCall()}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl h-[90vh] max-h-[850px] p-0 overflow-hidden border-slate-800 bg-[#090d16] text-white flex flex-col shadow-2xl">
        {/* Top Header Bar */}
        <div className="h-14 px-5 border-b border-slate-800/80 bg-[#0b132b]/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Video className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm font-bold text-white tracking-tight">
                  Apollo Telemedicine Room
                </DialogTitle>
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live • 1080p WebRTC
                </Badge>
              </div>
              <DialogDescription className="text-[11px] text-slate-400">
                {participantName} • {department} • Appt #{appointmentId}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Call Duration Clock */}
            <div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 font-mono text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span>{formatTimer(seconds)}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-700/50">
              <Lock className="h-3 w-3 text-cyan-400" />
              <span>HIPAA Compliant E2EE</span>
            </div>
          </div>
        </div>

        {/* Main Stage Video Area */}
        <div className="flex-1 relative bg-gradient-to-b from-[#090d16] to-[#04060a] flex items-center justify-center overflow-hidden">
          {/* Main Remote Feed (Simulated Video) */}
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col items-center justify-center shadow-inner group">
              {/* Animated Background Gradient representing HD Video Stream */}
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-blue-950/40 to-slate-900 opacity-90" />
              <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Active Speaker Holographic Avatar */}
              <div className="relative z-10 flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-32 w-32 border-4 border-blue-500/40 shadow-2xl ring-8 ring-blue-500/10 animate-pulse">
                    <AvatarFallback className="bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 text-white font-extrabold text-3xl">
                      {participantInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white">
                    <Activity className="h-3 w-3" />
                  </span>
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black text-white tracking-tight">
                    {participantName}
                  </h3>
                  <p className="text-xs text-blue-300 font-medium">
                    {participantRole === "Doctor" ? "Attending Physician" : "Connected Patient"} • {department}
                  </p>
                </div>

                {/* Simulated Audio Spectrum Wave */}
                <div className="flex items-center gap-1.5 h-6">
                  {[4, 12, 18, 24, 16, 22, 10, 18, 24, 14, 8, 20, 12].map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h}px` }}
                      className="w-1 bg-cyan-400/80 rounded-full animate-pulse transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Top Left Feed Tag */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-white">{participantName}</span>
                <span className="text-slate-400 text-[10px]">• Remote Feed</span>
              </div>

              {/* Picture-in-Picture: Self-View Camera Window */}
              <div className="absolute bottom-4 right-4 z-20 w-44 sm:w-56 h-32 sm:h-36 rounded-xl overflow-hidden bg-slate-950/90 border-2 border-slate-700/80 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center">
                {isVideoOff ? (
                  <div className="text-center space-y-1">
                    <VideoOff className="h-6 w-6 text-slate-500 mx-auto" />
                    <span className="text-[10px] text-slate-400 block font-medium">Camera Off</span>
                  </div>
                ) : (
                  <div className="relative w-full h-full bg-gradient-to-br from-indigo-950 to-slate-900 flex flex-col items-center justify-center">
                    <Avatar className="h-12 w-12 border border-cyan-400/30">
                      <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
                        YOU
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-semibold text-cyan-300 mt-1">You (Self View)</span>
                    {isMuted && (
                      <span className="absolute top-2 right-2 p-1 rounded-md bg-red-600/80 text-white">
                        <MicOff className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Slide-out In-Call Chat Drawer */}
          {isChatOpen && (
            <div className="absolute top-0 right-0 bottom-0 w-80 bg-slate-900/95 border-l border-slate-800 z-30 flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                  Telemedicine Chat
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsChatOpen(false)}
                  className="h-6 w-6 text-slate-400 hover:text-white p-0"
                >
                  ✕
                </Button>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl ${
                      msg.sender === "You"
                        ? "bg-blue-600/30 border border-blue-500/40 ml-4 text-white"
                        : "bg-slate-800/80 border border-slate-700/60 mr-4 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                      <span className="font-bold text-cyan-300">{msg.sender}</span>
                      <span>{msg.time}</span>
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Send a private message..."
                  className="flex-1 bg-slate-800 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                />
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 px-3 text-xs font-bold">
                  Send
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Call Control Action Bar */}
        <div className="h-20 px-6 bg-[#0b132b] border-t border-slate-800/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Encrypted Session
            </span>
          </div>

          {/* Core Telemedicine Controls */}
          <div className="flex items-center gap-3">
            {/* Mic Toggle */}
            <Button
              type="button"
              size="icon"
              variant={isMuted ? "destructive" : "secondary"}
              onClick={handleToggleMute}
              className={cn(
                "h-12 w-12 rounded-2xl transition-all shadow-md cursor-pointer",
                isMuted
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200"
              )}
              title={isMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            {/* Camera Toggle */}
            <Button
              type="button"
              size="icon"
              variant={isVideoOff ? "destructive" : "secondary"}
              onClick={handleToggleVideo}
              className={cn(
                "h-12 w-12 rounded-2xl transition-all shadow-md cursor-pointer",
                isVideoOff
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200"
              )}
              title={isVideoOff ? "Start camera" : "Stop camera"}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>

            {/* Screen Share Toggle */}
            <Button
              type="button"
              size="icon"
              variant={isScreenSharing ? "default" : "secondary"}
              onClick={handleToggleScreenShare}
              className={cn(
                "h-12 w-12 rounded-2xl transition-all shadow-md cursor-pointer hidden sm:flex",
                isScreenSharing
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200"
              )}
              title="Share desktop screen"
            >
              <MonitorUp className="h-5 w-5" />
            </Button>

            {/* Chat Drawer Toggle */}
            <Button
              type="button"
              size="icon"
              variant={isChatOpen ? "default" : "secondary"}
              onClick={() => setIsChatOpen((prev) => !prev)}
              className={cn(
                "h-12 w-12 rounded-2xl transition-all shadow-md cursor-pointer",
                isChatOpen
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200"
              )}
              title="Toggle chat panel"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>

            {/* Disconnect / End Call Button */}
            <Button
              type="button"
              onClick={handleEndCall}
              className="h-12 px-5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
            >
              <PhoneOff className="h-5 w-5" />
              <span>End Call</span>
            </Button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-mono">
              WebRTC v2.4
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
