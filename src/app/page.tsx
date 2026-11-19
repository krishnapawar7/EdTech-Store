"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import {
  BookOpen,
  Search,
  CheckCircle,
  Zap,
  Tag,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileText,
  Lock,
  Unlock,
  GraduationCap,
} from "lucide-react";

export default function HomePage() {
  const { user, ownership } = useAuth();
  const { addToCart, isInCart } = useCart();

  const [catalogue, setCatalogue] = useState<any>(null);
  const [selectedClassIndex, setSelectedClassIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCatalogue = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/catalogue");
      if (res.ok) {
        const data = await res.json();
        setCatalogue(data);
      }
    } catch (err) {
      console.error("Failed to load catalogue:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogue();
  }, [user]);

  // Handle Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const res = await fetch(`/api/catalogue?search=${encodeURIComponent(searchQuery.trim())}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.results);
          }
        } catch {}
      } else {
        setSearchResults(null);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeBoard = catalogue?.boards?.[0];
  const activeClasses = activeBoard?.classes || [];
  const selectedClass = activeClasses[selectedClassIndex] || activeClasses[0];

  // Check if student owns class pass
  const hasClassPass = selectedClass && ownership.ownedClassIds.includes(selectedClass.id);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-indigo-900 via-indigo-800 to-slate-900 text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 shadow-inner">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Curated CBSE Notes & Practice Materials
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Learn Smarter. Score Higher.
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto font-normal">
            Buy individual chapters, complete subject packs with free updates, or an all-access monthly & annual pass.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto pt-4 relative">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any chapter, subject, or formula sheet (e.g. Electric Charges, Matrices)..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/95 text-slate-900 placeholder:text-slate-400 text-sm font-medium shadow-xl focus:outline-hidden focus:ring-3 focus:ring-indigo-400 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Search Results Display if active */}
        {searchResults ? (
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Search Results for &ldquo;{searchQuery}&rdquo;
              </h2>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-indigo-600 hover:underline font-medium"
              >
                Back to All Catalogue
              </button>
            </div>

            {searchResults.chapters.length === 0 && searchResults.subjects.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                No matching study materials found. Try searching for &quot;Physics&quot;, &quot;Electric&quot;, or &quot;Matrices&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.chapters.map((ch: any) => {
                  const chProduct = ch.products?.[0];
                  const pricePaise = chProduct?.prices?.[0]?.amountPaise || 4900;
                  const isOwned =
                    ownership.ownedChapterIds.includes(ch.id) ||
                    ownership.ownedSubjectIds.includes(ch.subjectId) ||
                    ownership.ownedClassIds.includes(ch.subject.classId);

                  return (
                    <div
                      key={ch.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>{ch.subject.class.name} • {ch.subject.name}</span>
                          {ch.isFree ? (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                              FREE SAMPLE
                            </span>
                          ) : (
                            <span className="font-bold text-slate-900">₹{(pricePaise / 100).toFixed(0)}</span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Ch {ch.chapterNumber}: {ch.name}
                        </h4>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                        {ch.isFree ? (
                          <Link
                            href={`/materials/${ch.materials?.[0]?.id || ch.id}`}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <Unlock className="w-3.5 h-3.5" /> Read Free Sample
                          </Link>
                        ) : isOwned ? (
                          <Link
                            href={`/materials/${ch.materials?.[0]?.id || ch.id}`}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            <BookOpen className="w-3.5 h-3.5" /> Read Notes
                          </Link>
                        ) : (
                          <button
                            onClick={() => chProduct && addToCart(chProduct.id)}
                            disabled={isInCart(chProduct?.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                              isInCart(chProduct?.id)
                                ? "bg-slate-100 text-slate-500"
                                : "bg-indigo-600 text-white hover:bg-indigo-700"
                            }`}
                          >
                            {isInCart(chProduct?.id) ? "In Cart" : "Add (₹49)"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Class Tabs */}
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 flex justify-center gap-2">
              {activeClasses.map((cls: any, idx: number) => {
                const isSelected = selectedClassIndex === idx;
                const hasPass = ownership.ownedClassIds.includes(cls.id);
                return (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClassIndex(idx)}
                    className={`flex-1 sm:flex-initial sm:px-8 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>{cls.name}</span>
                    {hasPass && (
                      <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        PASS ACTIVE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Passes & All-Access Banner */}
            {selectedClass && (
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/60">
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                  <div className="lg:col-span-1 space-y-2">
                    <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full">
                      BEST VALUE FOR STUDENTS
                    </span>
                    <h3 className="text-2xl font-black text-white">
                      {selectedClass.name} All-Access Passes
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Instant complete unlock across all subjects, every chapter notes, and all revisions for {selectedClass.name}.
                    </p>
                    {hasClassPass && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-medium">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>You currently have an active pass! Everything in this class is unlocked.</span>
                      </div>
                    )}
                  </div>

                  {/* Pass Cards */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Monthly Pass */}
                    {selectedClass.products
                      ?.filter((p: any) => p.type === "MONTHLY_PASS")
                      .map((prod: any) => {
                        const pricePaise = prod.prices?.[0]?.amountPaise || 29900;
                        const inCart = isInCart(prod.id);
                        return (
                          <div
                            key={prod.id}
                            className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-indigo-400/50 transition flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                                  30-Day Access
                                </span>
                                <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                  Monthly
                                </span>
                              </div>
                              <h4 className="text-lg font-bold text-white mb-1">{prod.title}</h4>
                              <p className="text-xs text-slate-300 line-clamp-2">{prod.description}</p>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                              <div>
                                <span className="text-2xl font-black text-white">
                                  ₹{(pricePaise / 100).toFixed(0)}
                                </span>
                                <span className="text-[10px] text-slate-400 block">incl. 18% GST</span>
                              </div>
                              <button
                                onClick={() => addToCart(prod.id)}
                                disabled={inCart}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                                  inCart
                                    ? "bg-slate-700 text-slate-400"
                                    : "bg-indigo-500 hover:bg-indigo-400 text-white"
                                }`}
                              >
                                {hasClassPass ? "Extend Pass" : inCart ? "In Cart" : "Buy Monthly Pass"}
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    {/* Annual Pass */}
                    {selectedClass.products
                      ?.filter((p: any) => p.type === "ANNUAL_PASS")
                      .map((prod: any) => {
                        const pricePaise = prod.prices?.[0]?.amountPaise || 249900;
                        const inCart = isInCart(prod.id);
                        return (
                          <div
                            key={prod.id}
                            className="bg-gradient-to-br from-indigo-600/40 to-purple-600/30 backdrop-blur-md rounded-2xl p-5 border border-indigo-400/40 hover:border-amber-400/50 transition flex flex-col justify-between relative"
                          >
                            <span className="absolute -top-2.5 right-4 bg-amber-400 text-slate-950 font-black text-[9px] uppercase px-2 py-0.5 rounded-full shadow-sm">
                              SAVE 30%
                            </span>
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                                  365-Day Access
                                </span>
                                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                                  Full Year
                                </span>
                              </div>
                              <h4 className="text-lg font-bold text-white mb-1">{prod.title}</h4>
                              <p className="text-xs text-slate-300 line-clamp-2">{prod.description}</p>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                              <div>
                                <span className="text-2xl font-black text-white">
                                  ₹{(pricePaise / 100).toLocaleString("en-IN")}
                                </span>
                                <span className="text-[10px] text-slate-400 block">incl. 18% GST</span>
                              </div>
                              <button
                                onClick={() => addToCart(prod.id)}
                                disabled={inCart}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                                  inCart
                                    ? "bg-slate-700 text-slate-400"
                                    : "bg-amber-400 hover:bg-amber-300 text-slate-950"
                                }`}
                              >
                                {hasClassPass ? "Extend 1 Year" : inCart ? "In Cart" : "Buy Annual Pass"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* Subjects and Chapters Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedClass?.name} Subjects & Chapters
                  </h2>
                  <p className="text-xs text-slate-500">
                    Buy by chapter (₹49) or get the whole subject pack with lifetime updates.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {selectedClass?.subjects?.map((subject: any) => {
                  const subjectPack = subject.products?.find((p: any) => p.type === "SUBJECT_PACK");
                  const basePackPricePaise = subjectPack?.prices?.[0]?.amountPaise || 49900;
                  const ownsSubjectPack = ownership.ownedSubjectIds.includes(subject.id);
                  const isSubjectUnlocked = hasClassPass || ownsSubjectPack;

                  // Calculate how many chapters the student owns in this subject
                  const chaptersInSubject = subject.chapters || [];
                  const ownedChaptersCount = chaptersInSubject.filter((ch: any) =>
                    ownership.ownedChapterIds.includes(ch.id)
                  ).length;

                  // Upgrade calculation preview: student paid ₹49 * ownedChaptersCount
                  const upgradeCreditPaise = ownedChaptersCount * 4900;
                  const discountedPackPricePaise = Math.max(0, basePackPricePaise - upgradeCreditPaise);
                  const hasUpgradeDiscount = !isSubjectUnlocked && upgradeCreditPaise > 0;

                  return (
                    <div
                      key={subject.id}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col"
                    >
                      {/* Subject Header Card */}
                      <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                            Subject
                          </span>
                          {isSubjectUnlocked ? (
                            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {hasClassPass ? "Unlocked via Pass" : "Pack Owned"}
                            </span>
                          ) : hasUpgradeDiscount ? (
                            <span className="bg-amber-400 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded">
                              UPGRADE AVAILABLE
                            </span>
                          ) : null}
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">{subject.name}</h3>

                        {/* Subject Pack Buy/Upgrade Box */}
                        <div className="bg-white/10 rounded-xl p-3 border border-white/10 flex items-center justify-between">
                          <div>
                            <div className="text-[11px] text-indigo-200 font-medium">Complete Subject Pack</div>
                            <div className="flex items-baseline gap-1.5">
                              {hasUpgradeDiscount ? (
                                <>
                                  <span className="text-base font-extrabold text-amber-300">
                                    ₹{(discountedPackPricePaise / 100).toFixed(0)}
                                  </span>
                                  <span className="text-xs text-slate-400 line-through">
                                    ₹{(basePackPricePaise / 100).toFixed(0)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-base font-extrabold text-white">
                                  ₹{(basePackPricePaise / 100).toFixed(0)}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-300">Lifetime</span>
                            </div>
                            {hasUpgradeDiscount && (
                              <div className="text-[10px] text-emerald-300 mt-0.5">
                                Includes ₹{(upgradeCreditPaise / 100).toFixed(0)} credit for owned chapters!
                              </div>
                            )}
                          </div>

                          {!isSubjectUnlocked && subjectPack && (
                            <button
                              onClick={() => addToCart(subjectPack.id)}
                              disabled={isInCart(subjectPack.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                                isInCart(subjectPack.id)
                                  ? "bg-slate-700 text-slate-300"
                                  : hasUpgradeDiscount
                                  ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
                                  : "bg-indigo-500 text-white hover:bg-indigo-400"
                              }`}
                            >
                              {isInCart(subjectPack.id) ? "In Cart" : hasUpgradeDiscount ? "Upgrade Pack" : "Get Pack"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Chapters List */}
                      <div className="p-4 flex-grow divide-y divide-slate-100 space-y-2">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Chapters ({chaptersInSubject.length})
                        </div>

                        {chaptersInSubject.map((chapter: any) => {
                          const chProduct = chapter.products?.[0];
                          const chPricePaise = chProduct?.prices?.[0]?.amountPaise || 4900;
                          const ownsChapter = ownership.ownedChapterIds.includes(chapter.id);
                          const isUnlocked = isSubjectUnlocked || ownsChapter;
                          const inCart = chProduct ? isInCart(chProduct.id) : false;

                          return (
                            <div key={chapter.id} className="pt-2.5 pb-2 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-indigo-600 shrink-0">
                                    Ch {chapter.chapterNumber}.
                                  </span>
                                  <span className="text-xs font-semibold text-slate-900 truncate">
                                    {chapter.name}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  {chapter.isFree ? (
                                    <span className="text-emerald-600 font-bold">Free Sample</span>
                                  ) : isUnlocked ? (
                                    <span className="text-indigo-600 font-medium">Unlocked</span>
                                  ) : (
                                    <span>₹{(chPricePaise / 100).toFixed(0)} • Lifetime</span>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0">
                                {chapter.isFree ? (
                                  <Link
                                    href={`/materials/${chapter.materials?.[0]?.id || chapter.id}`}
                                    className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold border border-emerald-200 transition inline-block"
                                  >
                                    Read Free
                                  </Link>
                                ) : isUnlocked ? (
                                  <Link
                                    href={`/materials/${chapter.materials?.[0]?.id || chapter.id}`}
                                    className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold border border-indigo-200 transition inline-block"
                                  >
                                    Read Notes
                                  </Link>
                                ) : (
                                  <button
                                    onClick={() => chProduct && addToCart(chProduct.id)}
                                    disabled={inCart}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                                      inCart
                                        ? "bg-slate-100 text-slate-400"
                                        : "bg-slate-900 text-white hover:bg-indigo-600"
                                    }`}
                                  >
                                    {inCart ? "In Cart" : "Buy ₹49"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bundles Section */}
            {catalogue?.bundles?.length > 0 && (
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-purple-800/40 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <span className="bg-purple-500/30 text-purple-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-purple-400/30">
                      Curated Bundle
                    </span>
                    <h3 className="text-2xl font-bold text-white">
                      {catalogue.bundles[0].title}
                    </h3>
                    <p className="text-xs text-slate-300">
                      {catalogue.bundles[0].description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-3xl font-extrabold text-amber-300">
                        ₹{(catalogue.bundles[0].prices?.[0]?.amountPaise / 100).toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-slate-400">Lifetime access • incl. 18% GST</div>
                    </div>

                    <button
                      onClick={() => addToCart(catalogue.bundles[0].id)}
                      disabled={isInCart(catalogue.bundles[0].id)}
                      className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wide transition shadow-md ${
                        isInCart(catalogue.bundles[0].id)
                          ? "bg-slate-700 text-slate-400"
                          : "bg-amber-400 hover:bg-amber-300 text-slate-950"
                      }`}
                    >
                      {isInCart(catalogue.bundles[0].id) ? "Bundle in Cart" : "Add Bundle to Cart"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
