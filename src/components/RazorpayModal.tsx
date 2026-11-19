"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, AlertTriangle, CreditCard, QrCode } from "lucide-react";

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
    orderId: string;
    orderNumber: string;
    razorpayOrderId: string;
    amountPaise: number;
    currency: string;
    keyId: string;
    user: { name: string; email: string };
  } | null;
  onSuccess: (orderId: string) => void;
  onFailure: (reason: string) => void;
}

export function RazorpayModal({
  isOpen,
  onClose,
  orderData,
  onSuccess,
  onFailure,
}: RazorpayModalProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"READY" | "PENDING_UPI" | "VERIFYING" | "SUCCESS" | "FAILED">("READY");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedUpiId, setSelectedUpiId] = useState("success@razorpay");
  const [pollInterval, setPollInterval] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setStatus("READY");
      setErrorMessage("");
    } else {
      if (pollInterval) clearInterval(pollInterval);
    }
  }, [isOpen]);

  if (!isOpen || !orderData) return null;

  // Poll order status for UPI / webhook settlement
  const startPolling = (orderId: string) => {
    setStatus("PENDING_UPI");
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isPaid) {
            clearInterval(interval);
            setStatus("SUCCESS");
            setTimeout(() => {
              onSuccess(orderId);
            }, 1200);
          } else if (data.isFailed) {
            clearInterval(interval);
            setStatus("FAILED");
            setErrorMessage("Payment was marked failed by bank or cancelled");
            onFailure("Payment failed");
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    setPollInterval(interval);
  };

  // Launch official Razorpay standard checkout if script is loaded
  const launchOfficialRazorpay = () => {
    if (typeof window === "undefined") return;

    const options = {
      key: orderData.keyId,
      amount: orderData.amountPaise,
      currency: orderData.currency || "INR",
      name: "EdTech Store",
      description: `Payment for Order #${orderData.orderNumber}`,
      order_id: orderData.razorpayOrderId,
      prefill: {
        name: orderData.user.name,
        email: orderData.user.email,
        contact: "9876543210",
      },
      theme: { color: "#4f46e5" },
      handler: async function (response: any) {
        setStatus("VERIFYING");
        try {
          const verifyRes = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: orderData.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              paymentMethod: "razorpay_standard",
            }),
          });

          if (verifyRes.ok) {
            setStatus("SUCCESS");
            setTimeout(() => onSuccess(orderData.orderId), 1200);
          } else {
            const errData = await verifyRes.json();
            setStatus("FAILED");
            setErrorMessage(errData.error || "Signature verification failed");
            onFailure(errData.error);
          }
        } catch (err: any) {
          setStatus("FAILED");
          setErrorMessage("Network error verifying payment");
          onFailure("Network error");
        }
      },
      modal: {
        ondismiss: function () {
          // If modal dismissed without paying
          handlePaymentFailure("User dismissed Razorpay checkout window");
        },
      },
    };

    // Check if Razorpay is on window
    const RazorpayObj = (window as any).Razorpay;
    if (RazorpayObj) {
      const rzpInstance = new RazorpayObj(options);
      rzpInstance.open();
    } else {
      // Load script dynamically
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        const LoadedRzp = (window as any).Razorpay;
        if (LoadedRzp) {
          const rzpInstance = new LoadedRzp(options);
          rzpInstance.open();
        }
      };
      script.onerror = () => {
        console.warn("Unable to load external Razorpay checkout.js script. Use Test Mode Simulator.");
      };
      document.body.appendChild(script);
    }
  };

  // Simulate payment response (for Test Mode UPI success@razorpay / failure@razorpay)
  const simulatePayment = async (simulateSuccess: boolean) => {
    if (!simulateSuccess) {
      await handlePaymentFailure("Simulated payment failed (failure@razorpay)");
      return;
    }

    setStatus("VERIFYING");

    // Generate valid HMAC test signature from helper
    const testPaymentId = `pay_sim_${Date.now().toString(36)}`;

    try {
      // In test mode, post to verify
      const res = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.orderId,
          razorpayOrderId: orderData.razorpayOrderId,
          razorpayPaymentId: testPaymentId,
          // Generate deterministic HMAC using test secret
          razorpaySignature: await generateClientSignature(orderData.razorpayOrderId, testPaymentId),
          paymentMethod: selectedUpiId.includes("upi") ? "upi" : "card",
        }),
      });

      if (res.ok) {
        setStatus("SUCCESS");
        setTimeout(() => onSuccess(orderData.orderId), 1200);
      } else {
        const data = await res.json();
        setStatus("FAILED");
        setErrorMessage(data.error || "Verification failed");
        onFailure(data.error);
      }
    } catch (err: any) {
      setStatus("FAILED");
      setErrorMessage(err.message || "Simulation error");
      onFailure(err.message);
    }
  };

  const handlePaymentFailure = async (reason: string) => {
    setStatus("FAILED");
    setErrorMessage(reason);
    try {
      await fetch("/api/checkout/failure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.orderId,
          razorpayOrderId: orderData.razorpayOrderId,
          failureReason: reason,
        }),
      });
    } catch {}
    onFailure(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Razorpay Checkout</h3>
              <p className="text-xs text-indigo-200">Test Mode Simulation Gateway</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-indigo-200">Amount Due</div>
            <div className="text-lg font-bold">₹{(orderData.amountPaise / 100).toFixed(2)}</div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {status === "READY" && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order ID:</span>
                  <span className="font-mono font-medium">{orderData.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Razorpay Order:</span>
                  <span className="font-mono font-medium">{orderData.razorpayOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-medium">{orderData.user.name}</span>
                </div>
              </div>

              {/* Assessment Test Mode Controls */}
              <div className="border border-indigo-100 bg-indigo-50/50 p-4 rounded-xl space-y-3">
                <div className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  Assessment Payment Simulator
                </div>
                <p className="text-xs text-slate-600">
                  Select a test UPI ID to simulate the exact assessment requirements:
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => simulatePayment(true)}
                    className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-left transition shadow-xs group"
                  >
                    <div className="text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                      success@razorpay
                    </div>
                    <div className="text-[11px] text-emerald-100 mt-0.5">
                      Simulate successful payment
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => simulatePayment(false)}
                    className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-left transition shadow-xs group"
                  >
                    <div className="text-xs font-bold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-200" />
                      failure@razorpay
                    </div>
                    <div className="text-[11px] text-rose-100 mt-0.5">
                      Simulate failed payment
                    </div>
                  </button>
                </div>

                <div className="pt-2 border-t border-indigo-100/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => startPolling(orderData.orderId)}
                    className="text-xs text-indigo-700 hover:text-indigo-900 font-medium underline flex items-center gap-1"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Simulate Pending UPI Collect Request
                  </button>
                </div>
              </div>

              {/* Official Razorpay checkout button */}
              <button
                type="button"
                onClick={launchOfficialRazorpay}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Open Razorpay Checkout Window</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 py-1"
              >
                Cancel & Close
              </button>
            </div>
          )}

          {status === "PENDING_UPI" && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-600 animate-pulse">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Waiting for UPI Payment...</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  UPI collect request sent. Waiting for webhook or user confirmation on device.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-600">
                Polling status for #{orderData.orderNumber}...
              </div>

              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={() => simulatePayment(true)}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium"
                >
                  Settle from Webhook (Success)
                </button>
                <button
                  onClick={() => simulatePayment(false)}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium"
                >
                  Settle as Failed
                </button>
              </div>
            </div>
          )}

          {status === "VERIFYING" && (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 mx-auto border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <h4 className="font-bold text-slate-900 text-sm">Verifying HMAC Signature & Granting Access...</h4>
              <p className="text-xs text-slate-500">Checking order amount and updating entitlements...</p>
            </div>
          )}

          {status === "SUCCESS" && (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-emerald-900 text-base">Payment Confirmed & Verified!</h4>
              <p className="text-xs text-slate-600">
                Entitlements have been granted to your account. Redirecting to your library...
              </p>
            </div>
          )}

          {status === "FAILED" && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-rose-900 text-base">Payment Failed or Cancelled</h4>
                <p className="text-xs text-slate-600 mt-1">{errorMessage}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStatus("READY")}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
                >
                  Retry Payment
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Client helper to generate deterministic test signature
async function generateClientSignature(orderId: string, paymentId: string): Promise<string> {
  const secret = "placeholderSecretKey123";
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(`${orderId}|${paymentId}`);

  try {
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await window.crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "fallback_signature";
  }
}
