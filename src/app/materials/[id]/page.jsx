"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Lock, ArrowLeft, Printer, AlertTriangle, ShoppingCart, } from "lucide-react";
export default function MaterialReaderPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { addToCart } = useCart();
    const id = params.id;
    const [data, setData] = useState(null);
    const [errorStatus, setErrorStatus] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [chapterId, setChapterId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const fetchMaterial = async () => {
            setIsLoading(true);
            setErrorStatus(null);
            setErrorMessage("");
            try {
                const res = await fetch(`/api/materials/${id}/view`);
                if (res.ok) {
                    const resData = await res.json();
                    setData(resData);
                }
                else {
                    setErrorStatus(res.status);
                    const errData = await res.json();
                    setErrorMessage(errData.message || "Failed to load study notes");
                    if (errData.chapterId)
                        setChapterId(errData.chapterId);
                }
            }
            catch (err) {
                setErrorStatus(500);
                setErrorMessage("Network error fetching material");
            }
            finally {
                setIsLoading(false);
            }
        };
        if (id) {
            fetchMaterial();
        }
    }, [id, user]);
    if (isLoading) {
        return (<div className="max-w-4xl mx-auto py-24 px-4 text-center space-y-3">
        <div className="w-10 h-10 mx-auto border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium">Verifying access entitlements with server...</p>
      </div>);
    }
    // 403 Forbidden / Locked Content Screen (S7 Compliance)
    if (errorStatus === 403 || errorStatus === 401) {
        return (<div className="max-w-2xl mx-auto py-16 px-4">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
            <Lock className="w-8 h-8"/>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
              Server Access Refused • HTTP 403
            </span>
            <h2 className="text-2xl font-black text-slate-900">This Content is Locked</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              {errorMessage}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600"/>
              How to unlock this content:
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li><strong>Buy Chapter Notes (₹49):</strong> Lifetime access to this chapter.</li>
              <li><strong>Buy Subject Pack (₹499):</strong> All chapters in this subject + lifetime updates.</li>
              <li><strong>Buy Class Pass (₹299/mo or ₹2,499/yr):</strong> Unrestricted access to everything in this class.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/" className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2">
              <ShoppingCart className="w-4 h-4"/>
              <span>Browse Products & Unlock</span>
            </Link>

            <button onClick={() => router.back()} className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition">
              Go Back
            </button>
          </div>
        </div>
      </div>);
    }
    const material = data?.material;
    const access = data?.access;
    return (<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link href="/library" className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4"/>
          <span>Back to Library</span>
        </Link>

        <div className="flex items-center gap-2">
          {access?.source === "FREE" && (<span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
              Free Sample Reader
            </span>)}
          {access?.source === "CLASS_PASS" && (<span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
              Unlocked via Class Pass
            </span>)}
          {access?.source === "SUBJECT_PACK" && (<span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
              Subject Pack Owner
            </span>)}

          <button onClick={() => window.print()} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition" title="Print Notes">
            <Printer className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {/* Reader Paper Card */}
      <article className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-12 space-y-8">
        <header className="border-b border-slate-100 pb-6 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {material?.className} • {material?.subjectName}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            {material?.title}
          </h1>
          <div className="text-xs text-slate-500 flex items-center gap-3">
            <span>Chapter: {material?.chapterName}</span>
            <span>•</span>
            <span>Digital Study Notes & Cheat Sheet</span>
          </div>
        </header>

        {/* Content Body */}
        <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed space-y-4 text-sm sm:text-base">
          {material?.content?.split("\n\n").map((para, idx) => {
            if (para.startsWith("# ")) {
                return (<h1 key={idx} className="text-2xl font-black text-slate-900 pt-4">
                  {para.replace("# ", "")}
                </h1>);
            }
            if (para.startsWith("## ")) {
                return (<h2 key={idx} className="text-xl font-bold text-slate-900 pt-3 border-b border-slate-100 pb-1">
                  {para.replace("## ", "")}
                </h2>);
            }
            if (para.startsWith("### ")) {
                return (<h3 key={idx} className="text-base font-bold text-indigo-950 pt-2">
                  {para.replace("### ", "")}
                </h3>);
            }
            return <p key={idx} className="whitespace-pre-line">{para}</p>;
        })}
        </div>

        {/* Footer Note */}
        <footer className="pt-8 border-t border-slate-100 text-xs text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>Official CBSE Curriculum Revision Guide • EdTech Store</span>
          <span>Verified Student Entitlement Token Valid</span>
        </footer>
      </article>
    </div>);
}
