import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { recordPaymentFailure } from "@/lib/razorpay";
const failureSchema = z.object({
    orderId: z.string().min(1),
    razorpayOrderId: z.string().optional(),
    razorpayPaymentId: z.string().optional(),
    failureReason: z.string().optional(),
    rawError: z.any().optional(),
});
export async function POST(req) {
    try {
        const user = await requireAuth();
        const body = await req.json();
        const result = failureSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: "Validation failed" }, { status: 400 });
        }
        const { orderId, razorpayOrderId, razorpayPaymentId, failureReason, rawError } = result.data;
        const order = await prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order || order.userId !== user.id) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }
        await recordPaymentFailure({
            orderId: order.id,
            razorpayOrderId,
            razorpayPaymentId,
            amountPaise: order.totalPaise,
            failureReason: failureReason || "Payment cancelled or failed by user/bank",
            rawPayload: rawError || body,
        });
        return NextResponse.json({
            success: true,
            message: "Payment failure recorded. You may retry payment.",
            orderId: order.id,
        });
    }
    catch (error) {
        console.error("Payment failure recording error:", error);
        return NextResponse.json({ error: "Failed to record payment failure" }, { status: 500 });
    }
}
