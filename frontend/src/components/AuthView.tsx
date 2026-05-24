import React, { useState } from "react";
import { motion } from "motion/react";

interface AuthViewProps {
  onAuthenticate: (company: string, email: string) => void;
}

export default function AuthView({ onAuthenticate }: AuthViewProps) {
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !email.trim() || !password) {
      setErrorMsg("All authentication credential parameters are required.");
      return;
    }
    
    setErrorMsg("");
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      onAuthenticate(company, email);
    }, 1500);
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center relative p-6 bg-[#faf9f6] overflow-hidden select-none">
      
      {/* Ambient background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.15, 0.92, 1],
            opacity: [0.35, 0.55, 0.4, 0.35],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-[700px] h-[700px] rounded-full blur-[110px] absolute"
          style={{
            background: "radial-gradient(circle, rgba(13, 110, 0, 0.08) 0%, rgba(218, 218, 215, 0.3) 50%, rgba(250, 249, 246, 0) 85%)"
          }}
        />
        
        <motion.div
          animate={{
            scale: [0.9, 1.05, 0.95, 0.9],
            opacity: [0.2, 0.3, 0.25, 0.2],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-[450px] h-[450px] rounded-full blur-[90px] absolute -translate-x-32 -translate-y-20"
          style={{
            background: "radial-gradient(circle, rgba(188, 203, 179, 0.2) 0%, rgba(250, 249, 246, 0) 70%)"
          }}
        />
      </div>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-2xl border border-[#dadad7]/60 bg-white p-7 shadow-[0_32px_64px_rgba(20,21,20,0.03),0_16px_32px_rgba(20,21,20,0.02)] border-t border-t-[#fff]/80 relative z-10 space-y-6"
      >
        
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#e2f3df] border border-[#bcdeb5] rounded-xl flex items-center justify-center text-[#0d6e00] mx-auto neon-glow-pulse">
            <span className="material-symbols-outlined text-2xl font-bold">shield_person</span>
          </div>
          <div className="space-y-0.5">
            <h3 className="font-display font-bold text-[#141514] tracking-tight text-lg">
              Secure Supplier Gateway
            </h3>
            <p className="text-[11px] text-[#585956] px-4 font-sans leading-relaxed">
              Authenticate your identity to synchronized node catalog registries and authorize CPQ proposal outputs.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {errorMsg && (
            <div className="p-2.5 rounded bg-[#faeae8] border border-[#eba1a1] text-[11px] font-semibold text-[#8a1a1a] flex items-center gap-2">
              <span className="material-symbols-outlined text-xs leading-none">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3.5 text-xs font-semibold text-[#585956]">
            {/* Supplier Company */}
            <div className="space-y-1">
              <label className="uppercase tracking-wider">Company Node Identifier</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[#878884] text-base leading-none">corporate_fare</span>
                </div>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Intel Corp Node 4"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#faf9f6] border border-[#dadad7] focus:border-[#0d6e00] rounded-lg outline-none text-xs font-semibold text-[#141514] transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="uppercase tracking-wider">L1 Administrator Email</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[#878884] text-base leading-none">mail</span>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. auth-admin@intel.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#faf9f6] border border-[#dadad7] focus:border-[#0d6e00] rounded-lg outline-none text-xs font-semibold text-[#141514] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="uppercase tracking-wider">Secure Access Key Code</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[#878884] text-base leading-none">lock</span>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#faf9f6] border border-[#dadad7] focus:border-[#0d6e00] rounded-lg outline-none text-xs font-semibold text-[#141514] transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-2.5 font-sans font-semibold text-xs text-[#faf9f6] bg-[#141514] hover:bg-black rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-75"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                <span>Authorizing Session Token...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm text-[#44d62c] group-hover:scale-110 transition-transform">verified_user</span>
                <span>Establish Secure Session</span>
              </>
            )}
          </button>
        </form>

        <div className="border-t border-[#dadad7] pt-3 text-center">
          <p className="text-[9px] font-mono text-[#878884] uppercase tracking-wider">
            Secured by SHA256 Encryption Protocols
          </p>
        </div>

      </motion.div>
    </div>
  );
}
