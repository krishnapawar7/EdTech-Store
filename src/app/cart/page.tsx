"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { RazorpayModal } from "@/components/RazorpayModal";
import {
  ShoppingCart,
  Trash2,
  Tag,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  CreditCard,
  Check,
} from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    productIds,
    calculation,
    couponCode,
    isCalculating,
    removeFromCart,
    clearCart,
    setCoupon,
  } = useCart();

  const [inputCoupon, setInputCoupon] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [razorpayOrder, setRazorpayOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCoupon.trim()) {
      setCoupon(inputCoupon.trim().toUpperCase());
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon("");
    setInputCoupon("");
  };

  const handleCheckout = async () => {
    if (!user) {
      router.push("/login?redirect=/cart");
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError("");

    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds,
          couponCode: couponCode || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCheckoutError(data.error || "Failed to create order");
        setIsCheckingOut(false);
        return;
      }

      setRazorpayOrder(data);
      setIsModalOpen(true);
    } catch (err: any) {
      setCheckoutError(err.message || "Checkout network error");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePaymentSuccess = (orderId: string) => {
    clearCart();
    setIsModalOpen(false);
    router.push("/library?purchased=true");
  };

  const handlePaymentFailure = (reason: string) => {
    setCheckoutError(`Payment failed or cancelled: ${reason}. You can retry.`);
  };

  if (productIds.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400">
          <ShoppingCart className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Your Cart is Empty</h2>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Explore our CBSE study material catalogue to add individual chapters, subject packs, or class passes.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-sm"
          >
            <span>Browse Catalogue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const items = calculation?.items || [];
  const removedItems = calculation?.removedOrOverlappingItems || [];
  const gst = calculation?.gstBreakdown;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
        <ShoppingCart className="w-7 h-7 text-indigo-600" />
        Checkout Cart ({items.length} {items.length === 1 ? "item" : "items"})
      </h1>

      {checkoutError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Checkout notice:</span> {checkoutError}
          </div>
        </div>
      )}

      {/* Overlapping Purchases Notice if applicable */}
      {removedItems.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-amber-800">
            <AlertCircle className="w-4 h-4" />
            Overlapping Items Auto-Removed from Cart:
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs text-amber-900/90 pl-1">
            {removedItems.map((rem, i) => (
              <li key={i}>
                <strong>{rem.title}</strong>: {rem.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {items.map((item) => (
              <div key={item.productId} className="p-5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {item.type.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-400">
                      {item.accessLengthDays ? `${item.accessLengthDays} Days` : "Lifetime Access"}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{item.title}</h3>

                  {item.upgradeCreditPaise && item.upgradeCreditPaise > 0 ? (
                    <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      ₹{(item.upgradeCreditPaise / 100).toFixed(0)} upgrade credit applied for owned chapters!
                    </div>
                  ) : null}
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-slate-900">
                    ₹{((item.finalPricePaise ?? item.unitPricePaise) / 100).toFixed(0)}
                  </div>
                  {item.upgradeCreditPaise && item.upgradeCreditPaise > 0 ? (
                    <div className="text-xs text-slate-400 line-through">
                      ₹{(item.unitPricePaise / 100).toFixed(0)}
                    </div>
                  ) : null}

                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="mt-2 text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1 ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Add Coupon Hints */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-950 flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-indigo-600" />
              Available Promo Codes:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCoupon("WELCOME50")}
                className="bg-white border border-indigo-200 text-indigo-700 px-2 py-1 rounded font-mono font-bold hover:bg-indigo-100"
              >
                WELCOME50 (₹50 off)
              </button>
              <button
                onClick={() => setCoupon("EDTECH20")}
                className="bg-white border border-indigo-200 text-indigo-700 px-2 py-1 rounded font-mono font-bold hover:bg-indigo-100"
              >
                EDTECH20 (20% off)
              </button>
              <button
                onClick={() => setCoupon("PASS500")}
                className="bg-white border border-indigo-200 text-indigo-700 px-2 py-1 rounded font-mono font-bold hover:bg-indigo-100"
              >
                PASS500 (₹500 off)
              </button>
            </div>
          </div>
        </div>

        {/* Order Summary & GST Split Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
              Order Summary
            </h3>

            {/* Coupon Box */}
            <div>
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={inputCoupon || couponCode}
                  onChange={(e) => setInputCoupon(e.target.value)}
                  placeholder="Enter coupon code"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs uppercase font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
                >
                  Apply
                </button>
              </form>

              {calculation?.coupon && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                  <span className="font-semibold">Coupon &apos;{calculation.coupon.code}&apos; Applied!</span>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
                  >
                    Remove
                  </button>
                </div>
              )}

              {calculation?.couponError && (
                <div className="mt-2 text-xs text-rose-600 font-medium">
                  {calculation.couponError}
                </div>
              )}
            </div>

            {/* Itemized Price Breakdown with 18% GST */}
            <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-4">
              <div className="flex justify-between">
                <span>Catalogue Gross Subtotal:</span>
                <span className="font-semibold text-slate-900">
                  ₹{((calculation?.subtotalPaise || 0) / 100).toFixed(2)}
                </span>
              </div>

              {calculation?.upgradeCreditPaise ? (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Upgrade Credit (Owned Chapters):</span>
                  <span>- ₹{(calculation.upgradeCreditPaise / 100).toFixed(2)}</span>
                </div>
              ) : null}

              {calculation?.discountPaise ? (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount:</span>
                  <span>- ₹{(calculation.discountPaise / 100).toFixed(2)}</span>
                </div>
              ) : null}

              {/* 18% GST Split Breakdown */}
              {gst && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                  <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                    GST Split (Inclusive 18% GST):
                  </div>
                  <div className="flex justify-between">
                    <span>Taxable Base Value:</span>
                    <span>₹{(gst.basePaise / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Central GST (CGST 9%):</span>
                    <span>₹{(gst.cgstPaise / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>State GST (SGST 9%):</span>
                    <span>₹{(gst.sgstPaise / 100).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-3 border-t border-slate-200">
                <div>
                  <span className="text-sm font-bold text-slate-900">Total Payable:</span>
                  <span className="block text-[10px] text-slate-400">Inclusive of all taxes</span>
                </div>
                <span className="text-2xl font-black text-indigo-600">
                  ₹{((calculation?.totalPaise || 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Checkout CTA */}
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut || isCalculating}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-md shadow-indigo-200 disabled:opacity-50"
            >
              {isCheckingOut ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay with Razorpay (UPI / Card)</span>
                </>
              )}
            </button>

            <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Razorpay Test Mode 256-bit encrypted checkout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Razorpay Modal */}
      <RazorpayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orderData={razorpayOrder}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
      />
    </div>
  );
}
