"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Receipt,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Printer,
} from "lucide-react";

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/student/orders");
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchOrders();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <Receipt className="w-12 h-12 mx-auto text-slate-300" />
        <h2 className="text-xl font-bold text-slate-900">Sign In to View Orders</h2>
        <Link
          href="/login?redirect=/orders"
          className="inline-block px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Order History & Tax Invoices
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track past transactions, verify payment statuses, and download official 18% GST tax invoices.
          </p>
        </div>

        <Link
          href="/"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-500">Loading your orders...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500 space-y-3">
          <Receipt className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="font-bold text-slate-900 text-base">No Orders Placed Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Once you make a purchase via Razorpay, your order summary and downloadable GST tax invoice will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isPaid = order.status === "PAID";
            const isFailed = order.status === "FAILED";
            const isPending = order.status === "CREATED" || order.status === "PENDING";
            const payment = order.payments?.[0];

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-800"
                            : isFailed
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isPaid && <CheckCircle2 className="w-3 h-3" />}
                        {isFailed && <XCircle className="w-3 h-3" />}
                        {isPending && <Clock className="w-3 h-3" />}
                        {order.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="text-right flex items-center sm:flex-col sm:items-end justify-between">
                    <div className="text-lg font-black text-slate-900">
                      ₹{(order.totalPaise / 100).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Incl. 18% GST (₹{(order.taxPaise / 100).toFixed(2)})
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                    Purchased Items:
                  </div>
                  <div className="divide-y divide-slate-50">
                    {order.orderItems?.map((item: any) => (
                      <div key={item.id} className="py-1.5 flex justify-between text-xs">
                        <span className="text-slate-800 font-medium">{item.title}</span>
                        <span className="text-slate-600 font-bold">
                          ₹{(item.finalPricePaise / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Controls & Invoice CTA */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500 text-[11px]">
                    {payment?.razorpayPaymentId ? (
                      <span>Razorpay ID: <code className="font-mono text-slate-700">{payment.razorpayPaymentId}</code> ({payment.paymentMethod || "online"})</span>
                    ) : order.razorpayOrderId ? (
                      <span>Razorpay Order: <code className="font-mono text-slate-700">{order.razorpayOrderId}</code></span>
                    ) : null}
                  </div>

                  {isPaid ? (
                    <a
                      href={`/api/student/orders/${order.id}/invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition border border-indigo-200 shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Download / Print GST Invoice</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  ) : isFailed ? (
                    <Link
                      href="/cart"
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Retry Payment in Cart
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
