"use client";
import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, Clock, CheckCircle2, Layers, GraduationCap, ArrowRight, FileText, } from "lucide-react";
function LibraryContent() {
    const { user, refreshUser } = useAuth();
    const searchParams = useSearchParams();
    const justPurchased = searchParams.get("purchased") === "true";
    const [libraryData, setLibraryData] = useState(null);
    const [activeTab, setActiveTab] = useState("PASSES");
    const [isLoading, setIsLoading] = useState(true);
    const fetchLibrary = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/student/library");
            if (res.ok) {
                const data = await res.json();
                setLibraryData(data);
            }
        }
        catch (err) {
            console.error("Failed to load library:", err);
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        if (user) {
            fetchLibrary();
            refreshUser();
        }
    }, [user]);
    if (!user) {
        return (<div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
          <BookOpen className="w-8 h-8"/>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Sign in to Access Your Library</h2>
        <p className="text-xs text-slate-500">
          Your purchased passes, subject packs, and chapter notes are synchronized to your account.
        </p>
        <div className="pt-2">
          <Link href="/login?redirect=/library" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs">
            Sign In Now
          </Link>
        </div>
      </div>);
    }
    const classes = libraryData?.classes || [];
    const subjects = libraryData?.subjects || [];
    const chapters = libraryData?.chapters || [];
    return (<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Just Purchased Celebration Banner */}
      {justPurchased && (<div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white"/>
            </div>
            <div>
              <h3 className="font-bold text-sm">Payment Confirmed & Entitlements Unlocked!</h3>
              <p className="text-xs text-emerald-100">
                Your content has been added to your library below. Happy learning!
              </p>
            </div>
          </div>
        </div>)}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-indigo-600"/>
            My Study Library
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access your active passes, owned subjects, and verified notes anytime.
          </p>
        </div>

        <Link href="/" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold self-start sm:self-auto transition shadow-xs flex items-center gap-1.5">
          <span>Browse More Material</span>
          <ArrowRight className="w-3.5 h-3.5"/>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button onClick={() => setActiveTab("PASSES")} className={`pb-3 transition flex items-center gap-2 relative ${activeTab === "PASSES"
            ? "text-indigo-600 border-b-2 border-indigo-600"
            : "text-slate-500 hover:text-slate-900"}`}>
          <GraduationCap className="w-4 h-4"/>
          <span>Active Passes ({classes.length})</span>
        </button>

        <button onClick={() => setActiveTab("SUBJECTS")} className={`pb-3 transition flex items-center gap-2 relative ${activeTab === "SUBJECTS"
            ? "text-indigo-600 border-b-2 border-indigo-600"
            : "text-slate-500 hover:text-slate-900"}`}>
          <Layers className="w-4 h-4"/>
          <span>Subject Packs ({subjects.length})</span>
        </button>

        <button onClick={() => setActiveTab("CHAPTERS")} className={`pb-3 transition flex items-center gap-2 relative ${activeTab === "CHAPTERS"
            ? "text-indigo-600 border-b-2 border-indigo-600"
            : "text-slate-500 hover:text-slate-900"}`}>
          <FileText className="w-4 h-4"/>
          <span>Individual Chapters ({chapters.length})</span>
        </button>
      </div>

      {/* Content By Tab */}
      {activeTab === "PASSES" && (<div className="space-y-6">
          {classes.length === 0 ? (<div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-500 space-y-3">
              <GraduationCap className="w-10 h-10 mx-auto text-slate-300"/>
              <h3 className="font-bold text-slate-900 text-base">No Active Class Passes</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Get an all-access monthly or annual pass to unlock every subject and chapter in your class.
              </p>
              <Link href="/" className="inline-block mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
                View Passes (from ₹299)
              </Link>
            </div>) : (classes.map((cls) => {
                const expiresDate = cls.validUntil ? new Date(cls.validUntil) : null;
                const isExpired = expiresDate && expiresDate < new Date();
                const daysLeft = expiresDate
                    ? Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                    : null;
                return (<div key={cls.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 overflow-hidden relative">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          ALL-ACCESS PASS
                        </span>
                        <span className="text-xs text-slate-500">Board: {cls.board.name}</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">{cls.name} All-Access Pass</h3>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-right">
                      <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 justify-end">
                        <Clock className="w-3.5 h-3.5 text-indigo-500"/>
                        Access Expiration:
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {expiresDate
                        ? expiresDate.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                        : "Lifetime Access"}
                      </div>
                      {daysLeft !== null && (<div className="text-[10px] font-semibold text-emerald-600">
                          {daysLeft} days remaining (Extends on renewal)
                        </div>)}
                    </div>
                  </div>

                  {/* List of subjects unlocked by pass */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Included Subjects & Materials in this Pass:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {cls.subjects?.map((sub) => (<div key={sub.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                          <h5 className="font-bold text-slate-900 text-sm">{sub.name}</h5>
                          <div className="text-xs text-slate-500">
                            {sub.chapters?.length || 0} Chapters Unlocked
                          </div>
                          <div className="space-y-1 pt-1">
                            {sub.chapters?.slice(0, 3).map((ch) => (<Link key={ch.id} href={`/materials/${ch.materials?.[0]?.id || ch.id}`} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium block truncate">
                                • Ch {ch.chapterNumber}: {ch.name}
                              </Link>))}
                            {sub.chapters?.length > 3 && (<span className="text-[11px] text-slate-400 block">
                                + {sub.chapters.length - 3} more chapters
                              </span>)}
                          </div>
                        </div>))}
                    </div>
                  </div>
                </div>);
            }))}
        </div>)}

      {activeTab === "SUBJECTS" && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.length === 0 ? (<div className="col-span-full bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-500 space-y-3">
              <Layers className="w-10 h-10 mx-auto text-slate-300"/>
              <h3 className="font-bold text-slate-900 text-base">No Subject Packs Owned</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Buy complete subject packs to get all chapters and lifetime updates.
              </p>
            </div>) : (subjects.map((sub) => (<div key={sub.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      LIFETIME SUBJECT PACK
                    </span>
                    <h3 className="font-bold text-slate-900 text-lg mt-1">{sub.name}</h3>
                    <p className="text-xs text-slate-500">{sub.class.name}</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 space-y-2 pt-2 border-t border-slate-100">
                  {sub.chapters?.map((ch) => (<div key={ch.id} className="pt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-700 truncate max-w-[200px]">
                        Ch {ch.chapterNumber}: {ch.name}
                      </span>
                      <Link href={`/materials/${ch.materials?.[0]?.id || ch.id}`} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold">
                        Read Notes
                      </Link>
                    </div>))}
                </div>
              </div>)))}
        </div>)}

      {activeTab === "CHAPTERS" && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapters.length === 0 ? (<div className="col-span-full bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-500 space-y-3">
              <FileText className="w-10 h-10 mx-auto text-slate-300"/>
              <h3 className="font-bold text-slate-900 text-base">No Individual Chapters Owned</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Any chapter notes you purchase individually will appear here with lifetime access.
              </p>
            </div>) : (chapters.map((ch) => (<div key={ch.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold mb-1">
                    {ch.subject.class.name} • {ch.subject.name}
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Ch {ch.chapterNumber}: {ch.name}
                  </h4>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-600 font-medium">Lifetime Access</span>
                  <Link href={`/materials/${ch.materials?.[0]?.id || ch.id}`} className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs">
                    Open Notes
                  </Link>
                </div>
              </div>)))}
        </div>)}
    </div>);
}
export default function LibraryPage() {
    return (<Suspense fallback={<div className="max-w-6xl mx-auto py-20 text-center text-xs text-slate-500">Loading study library...</div>}>
      <LibraryContent />
    </Suspense>);
}
