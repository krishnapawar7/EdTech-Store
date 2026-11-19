import { describe, it, expect } from "vitest";
import { verifyRazorpaySignature, generateTestSignature, verifyWebhookSignature, } from "@/lib/razorpay";
import crypto from "crypto";
describe("Razorpay Signature Verification", () => {
    const secretKey = "test_secret_key_12345";
    const orderId = "order_N76as8d76asd";
    const paymentId = "pay_M98as7d6asd";
    it("verifies a valid checkout signature successfully", () => {
        // Generate authentic HMAC-SHA256 signature
        const validSignature = crypto
            .createHmac("sha256", secretKey)
            .update(`${orderId}|${paymentId}`)
            .digest("hex");
        const result = verifyRazorpaySignature(orderId, paymentId, validSignature, secretKey);
        expect(result).toBe(true);
    });
    it("rejects a tampered signature", () => {
        const tamperedSignature = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
        const result = verifyRazorpaySignature(orderId, paymentId, tamperedSignature, secretKey);
        expect(result).toBe(false);
    });
    it("rejects when payment ID is altered", () => {
        const validSignature = generateTestSignature(orderId, paymentId, secretKey);
        const tamperedPaymentId = "pay_TAMPERED12345";
        const result = verifyRazorpaySignature(orderId, tamperedPaymentId, validSignature, secretKey);
        expect(result).toBe(false);
    });
    it("rejects when order ID is altered", () => {
        const validSignature = generateTestSignature(orderId, paymentId, secretKey);
        const tamperedOrderId = "order_TAMPERED999";
        const result = verifyRazorpaySignature(tamperedOrderId, paymentId, validSignature, secretKey);
        expect(result).toBe(false);
    });
    describe("Webhook Signature Verification", () => {
        const webhookSecret = "webhook_secret_998877";
        const rawPayload = JSON.stringify({
            event: "payment.captured",
            payload: { payment: { entity: { id: "pay_123", amount: 4900 } } },
        });
        it("verifies valid webhook signature", () => {
            const validSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(rawPayload)
                .digest("hex");
            const result = verifyWebhookSignature(rawPayload, validSignature, webhookSecret);
            expect(result).toBe(true);
        });
        it("rejects tampered webhook body", () => {
            const validSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(rawPayload)
                .digest("hex");
            const tamperedPayload = rawPayload.replace("4900", "9900");
            const result = verifyWebhookSignature(tamperedPayload, validSignature, webhookSecret);
            expect(result).toBe(false);
        });
    });
});
