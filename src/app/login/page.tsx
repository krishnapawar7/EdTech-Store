"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { GraduationCap, ArrowRight, ShieldCheck, User } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";
  const { login, switchToRole } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const success = await login(email, password);
    if (success) {
      router.push(redirectUrl);
    } else {
      setError("Invalid email or password. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (role: "STUDENT" | "ADMIN") => {
    await switchToRole(role);
    router.push(role === "ADMIN" ? "/admin" : redirectUrl);
  };

  return (
    <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Welcome Back</h2>
        <p className="text-xs text-slate-500">Sign in to access your study library and passes</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@edstore.com"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
        >
          {isSubmitting ? "Signing in..." : "Sign In to Account"}
        </button>
      </form>

      {/* Quick Demo Sign-In Buttons */}
      <div className="pt-4 border-t border-slate-100 space-y-2.5">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
          One-Click Test Accounts:
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin("STUDENT")}
            className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70 text-indigo-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <User className="w-3.5 h-3.5 text-indigo-600" />
            <span>Student Demo</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("ADMIN")}
            className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-amber-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Admin Demo</span>
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500 pt-2">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-indigo-600 hover:underline">
          Sign up here
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-center text-xs text-slate-500">Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
