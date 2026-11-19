import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, settleSuccessfulPayment, recordPaymentFailure } from "@/lib/razorpay";
export async function POST(req) {
    let rawBody = "";
    try {
        rawBody = await req.text();
        const signature = req.headers.get("x-razorpay-signature") || "";
        const webhookEventId = req.headers.get("x-razorpay-event-id") || `evt_${Date.now()}`;
        // Verify webhook signature
        const isValid = verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
            console.warn("⚠️ Invalid Razorpay webhook signature");
            return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
        }
        const payload = JSON.parse(rawBody);
        const eventType = payload.event;
        const paymentEntity = payload.payload?.payment?.entity;
        // Check if webhook event already processed (idempotency audit)
        const existingEvent = await prisma.webhookEvent.findFirst({
            where: {
                OR: [
                    { eventId: webhookEventId },
                    {
                        eventType,
                        payloadJson: rawBody,
                    },
                ],
            },
        });
        if (existingEvent && existingEvent.isProcessed) {
            // Already processed idempotently
            return NextResponse.json({ status: "ok", message: "Event already processed" });
        }
        // Save webhook event to audit trail
        const webhookRecord = await prisma.webhookEvent.create({
            data: {
                eventId: webhookEventId,
                eventType,
                payloadJson: rawBody,
                signature,
                isProcessed: false,
            },
        });
        // Handle payment.captured
        if (eventType === "payment.captured") {
            const razorpayOrderId = paymentEntity?.order_id;
            const razorpayPaymentId = paymentEntity?.id;
            const amountPaise = paymentEntity?.amount;
            const paymentMethod = paymentEntity?.method;
            if (!razorpayOrderId) {
                await prisma.webhookEvent.update({
                    where: { id: webhookRecord.id },
                    data: { isProcessed: true, errorMessage: "Missing order_id in payment.captured" },
                });
                return NextResponse.json({ status: "ok" });
            }
            // Find order by razorpayOrderId
            const order = await prisma.order.findFirst({
                where: { razorpayOrderId },
            });
            if (!order) {
                await prisma.webhookEvent.update({
                    where: { id: webhookRecord.id },
                    data: { isProcessed: true, errorMessage: `Order not found for razorpayOrderId: ${razorpayOrderId}` },
                });
                return NextResponse.json({ status: "ok" });
            }
            // Settle payment and grant access idempotently
            await settleSuccessfulPayment({
                orderId: order.id,
                razorpayOrderId,
                razorpayPaymentId,
                amountPaise,
                paymentMethod,
                signature,
                rawPayload: payload,
            });
            await prisma.webhookEvent.update({
                where: { id: webhookRecord.id },
                data: { isProcessed: true, processedAt: new Date() },
            });
        }
        else if (eventType === "payment.failed") {
            const razorpayOrderId = paymentEntity?.order_id;
            const razorpayPaymentId = paymentEntity?.id;
            const failureReason = paymentEntity?.error_description || "Payment failed via webhook";
            if (razorpayOrderId) {
                const order = await prisma.order.findFirst({
                    where: { razorpayOrderId },
                });
                if (order) {
                    await recordPaymentFailure({
                        orderId: order.id,
                        razorpayOrderId,
                        razorpayPaymentId,
                        amountPaise: paymentEntity?.amount,
                        failureReason,
                        rawPayload: payload,
                    });
                }
            }
            await prisma.webhookEvent.update({
                where: { id: webhookRecord.id },
                data: { isProcessed: true, processedAt: new Date() },
            });
        }
        return NextResponse.json({ status: "ok" });
    }
    catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ error: error.message || "Failed to process webhook" }, { status: 500 });
    }
}
