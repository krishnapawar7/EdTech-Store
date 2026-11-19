"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, User } from "lucide-react";
export function DemoSwitcher() {
    if (process.env.NODE_ENV === "production") {
        return null;
    }

    const { user, switchToRole, logout } = useAuth();
    return (<div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white text-xs py-2 px-4 border-b border-indigo-900/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-indigo-200">Razorpay Test Mode Active:</span>
          <span className="text-slate-300 hidden sm:inline">
            Use UPI ID <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300 font-mono">success@razorpay</code> or <code className="bg-slate-800 px-1.5 py-0.5 rounded text-rose-300 font-mono">failure@razorpay</code>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span>Signed in as:</span>
            {user ? (<span className="font-medium text-white bg-indigo-800/80 px-2 py-0.5 rounded border border-indigo-600/50 flex items-center gap-1">
                {user.role === "ADMIN" ? <ShieldCheck className="w-3 h-3 text-amber-400"/> : <User className="w-3 h-3 text-indigo-300"/>}
                {user.name} ({user.role})
              </span>) : (<span className="text-slate-400 italic">Guest (Not signed in)</span>)}
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => switchToRole("STUDENT")} className={`px-2.5 py-1 rounded font-medium transition ${user?.role === "STUDENT"
            ? "bg-indigo-600 text-white shadow-sm"
            : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"}`}>
              🧑‍🎓 Student Mode
            </button>
            <button onClick={() => switchToRole("ADMIN")} className={`px-2.5 py-1 rounded font-medium transition ${user?.role === "ADMIN"
            ? "bg-amber-600 text-white shadow-sm"
            : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"}`}>
              👑 Admin Mode
            </button>
            {user && (<button onClick={logout} className="text-slate-400 hover:text-rose-300 px-2 py-1 transition">
                Sign Out
              </button>)}
          </div>
        </div>
      </div>
    </div>);
}
