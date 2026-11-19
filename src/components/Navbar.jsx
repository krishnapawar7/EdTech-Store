"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { BookOpen, GraduationCap, ShoppingCart, Receipt, ShieldAlert, LogOut, } from "lucide-react";
export function Navbar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { productIds } = useCart();
    return (<nav className="bg-white border-b border-slate-200 sticky top-9 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                <GraduationCap className="w-6 h-6"/>
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  EdTech Store
                </span>
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-indigo-600">
                  CBSE Curriculum & Notes
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link href="/" className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${pathname === "/"
            ? "bg-indigo-50 text-indigo-700 font-semibold"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}>
                Browse Catalogue
              </Link>

              {user && (<>
                  <Link href="/library" className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${pathname === "/library"
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}>
                    <BookOpen className="w-4 h-4 text-indigo-500"/>
                    My Library
                  </Link>

                  <Link href="/orders" className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${pathname === "/orders"
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}>
                    <Receipt className="w-4 h-4 text-slate-500"/>
                    Orders & Invoices
                  </Link>
                </>)}

              {user?.role === "ADMIN" && (<Link href="/admin" className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${pathname.startsWith("/admin")
                ? "bg-amber-100 text-amber-900 font-semibold"
                : "text-amber-700 hover:bg-amber-50"}`}>
                  <ShieldAlert className="w-4 h-4 text-amber-600"/>
                  Admin Console
                </Link>)}
            </div>
          </div>

          {/* Right Controls: Cart & Profile */}
          <div className="flex items-center gap-3">
            <Link href="/cart" className="relative p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition flex items-center gap-2 group">
              <ShoppingCart className="w-5 h-5 text-slate-700 group-hover:text-indigo-600 transition"/>
              <span className="hidden sm:inline text-xs font-semibold text-slate-700">Cart</span>
              {productIds.length > 0 && (<span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {productIds.length}
                </span>)}
            </Link>

            {user ? (<div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900">{user.name}</div>
                  <div className="text-[11px] text-slate-500">{user.email}</div>
                </div>
                <button onClick={logout} title="Sign Out" className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                  <LogOut className="w-4 h-4"/>
                </button>
              </div>) : (<div className="flex items-center gap-2">
                <Link href="/login" className="px-3.5 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                  Sign In
                </Link>
                <Link href="/register" className="px-3.5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs">
                  Get Started
                </Link>
              </div>)}
          </div>
        </div>
      </div>
    </nav>);
}
