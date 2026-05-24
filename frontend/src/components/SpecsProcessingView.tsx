import React, { useEffect, useState } from "react";

export default function SpecsProcessingView() {
  const [statusIdx, setStatusIdx] = useState(0);
  const loadingTexts = [
    "Reading requirements...",
    "Searching live component catalog...",
    "Validating engineering compatibility rules...",
    "Adjusting within proposed budget threshold...",
    "Synthesizing optimal hardware specifications...",
    "Constructing custom AI rationales..."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % loadingTexts.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [loadingTexts.length]);

  return (
    <div className="blueprint-grid min-h-[500px] w-full rounded-2xl border border-[#dadad7] bg-[#fbfbfa] flex flex-col justify-between p-6 relative overflow-hidden shadow-[inset_0_2px_15px_rgba(0,0,0,0.02)]">
      {/* Top Left Status Metadata */}
      <div className="flex flex-col gap-0.5 font-mono text-[9px] uppercase tracking-wider text-[#0d6e00]">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0d6e00] animate-ping"></span>
          <span>SYS_INIT: OK</span>
        </div>
        <div>AUTH_LEVEL: SUPPLIER_SECURE</div>
        <div>CORE_MODULE: CPQ_SYNTHESIZER_V4.2</div>
      </div>

      {/* Orbiting Ring graphic inside center */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 my-12 relative z-10">
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#0d6e00]/20 animate-spin" style={{ animationDuration: "12s" }} />

          {/* Middle rotating ring */}
          <div className="absolute inset-2 rounded-full border border-double border-[#0d6e00]/30 animate-spin-reverse" style={{ animationDuration: "8s" }} />

          {/* Inner ring pulse */}
          <div className="absolute inset-6 rounded-full bg-[#e2f3df]/50 border border-[#0d6e00]/25 flex items-center justify-center neon-glow-pulse">
            <span className="material-symbols-outlined text-[#0d6e00] text-3xl font-semibold select-none">
              memory
            </span>
          </div>
        </div>

        {/* Dynamic loading label */}
        <div className="text-center space-y-2 max-w-sm">
          <div className="h-6 flex items-center justify-center">
            <p className="font-display font-bold text-sm text-[#141514] tracking-tight">
              {loadingTexts[statusIdx]}
            </p>
          </div>
          
          {/* Progress bar container */}
          <div className="w-56 h-1.5 rounded-full bg-[#dadad7]/60 overflow-hidden relative mx-auto border border-[#dadad7]/30">
            <div className="progress-neon-line absolute top-0 bottom-0 left-0 right-0 rounded-full"></div>
          </div>
          
          <p className="text-[10px] font-mono text-[#585956] uppercase tracking-widest pt-1">
            Establishing Device Parameters
          </p>
        </div>
      </div>

      {/* Detail Footer row */}
      <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-2 border-t border-[#dadad7] pt-4 font-mono text-[9px] text-[#585956]">
        <div>
          <span>Agent ID: <span className="font-bold text-[#141514]">CMP-7X-NEON</span></span>
          <span className="mx-2">·</span>
          <span>Channel: <span className="text-[#0d6e00] font-bold">SECURE_WEBSOCKET</span></span>
        </div>
        <div className="text-right">
          <span>LATENCY: 14ms</span>
          <span className="mx-2">·</span>
          <span>TOKENS: 4,096/s</span>
          <span className="mx-2">·</span>
          <span>MODEL: GEMINI-3.5-FLASH</span>
        </div>
      </div>
    </div>
  );
}
