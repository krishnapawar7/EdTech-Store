import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { verifyRazorpaySignature, settleSuccessfulPayment } from "@/lib/razorpay";

const verifySchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  razorpayOrderId: z.string().min(1, "Razorpay Order ID is required"),
  razorpayPaymentId: z.string().min(1, "Razorpay Payment ID is required"),
  razorpaySignature: z.string().min(1, "Razorpay Signature is required"),
  paymentMethod: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const result = verifySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMethod } =
      result.data;

    // Fetch order from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.userId !== user.id) {
      return NextResponse.json({ error: "Access denied for this order" }, { status: 403 });
    }

    // Verify HMAC-SHA256 Signature
    // If running with test mock simulation, verify against test signature
    const isValidSignature = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValidSignature) {
      // Record payment attempt as failed
      await prisma.payment.create({
        data: {
          orderId: order.id,
          razorpayPaymentId,
          razorpayOrderId,
          amountPaise: order.totalPaise,
          status: "FAILED",
          signature: razorpaySignature,
          failureReason: "Invalid HMAC-SHA256 signature verification failed",
        },
      });

      return NextResponse.json(
        { error: "Payment signature verification failed. Tampered payload detected." },
        { status: 400 }
      );
    }

    // Settle payment idempotently and grant entitlements
    const settlement = await settleSuccessfulPayment({
      orderId: order.id,
      razorpayOrderId,
      razorpayPaymentId,
      amountPaise: order.totalPaise,
      paymentMethod: paymentMethod || "razorpay",
      signature: razorpaySignature,
      rawPayload: body,
    });

    return NextResponse.json({
      success: true,
      message: settlement.alreadySettled
        ? "Payment was already verified and access granted"
        : "Payment verified successfully and access granted",
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
