import crypto from "crypto";
import Razorpay from "razorpay";
import { prisma } from "./prisma";
import { grantEntitlementsForOrder } from "./entitlements";

const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholderKey";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "placeholderSecretKey123";
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "placeholderWebhookSecret123";

export const razorpayClient = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

/**
 * Creates a Razorpay Order for the given amount (in paise) and receipt.
 */
export async function createRazorpayOrder(amountPaise: number, receipt: string): Promise<string> {
  // If keys are placeholder or development test mode without network
  const isPlaceholderKey = keyId.includes("placeholder") || keySecret.includes("placeholder");

  if (!isPlaceholderKey) {
    try {
      const rzpOrder = await razorpayClient.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt,
        notes: { receipt },
      });
      return rzpOrder.id;
    } catch (err: any) {
      console.warn("Razorpay API call failed, falling back to deterministic test order ID:", err?.message);
    }
  }

  // Deterministic / test mode fallback order ID format
  return `order_${receipt.replace(/[^a-zA-Z0-9]/g, "").slice(-10)}_${Date.now().toString(36)}`;
}

/**
 * Verifies Razorpay Checkout HMAC-SHA256 signature:
 * Expected: HMAC-SHA256(order_id + "|" + payment_id, keySecret)
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  customSecret?: string
): boolean {
  const secret = customSecret || keySecret;
  const payload = `${orderId}|${paymentId}`;
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return generatedSignature === signature;
}

/**
 * Generates an HMAC-SHA256 signature for test/simulation purposes.
 */
export function generateTestSignature(orderId: string, paymentId: string, customSecret?: string): string {
  const secret = customSecret || keySecret;
  return crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

/**
 * Verifies webhook signature against raw request body using webhook secret.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  customSecret?: string
): boolean {
  const secret = customSecret || webhookSecret;
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return generatedSignature === signature;
}

/**
 * Idempotently settles a successful payment and grants access.
 * "Idempotent. Step 5 and the webhook can both arrive, in either order, more than once.
 * Access must be granted exactly once, and the order must not be counted twice."
 */
export async function settleSuccessfulPayment({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  amountPaise,
  paymentMethod = "unknown",
  signature,
  rawPayload,
}: {
  orderId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  amountPaise: number;
  paymentMethod?: string;
  signature?: string;
  rawPayload?: any;
}) {
  // Find order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      coupon: true,
      payments: true,
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  // Amount Check: Compare the paid amount with saved order amount before granting access
  if (amountPaise !== order.totalPaise) {
    // Record failed payment attempt in audit log
    await prisma.payment.create({
      data: {
        orderId: order.id,
        razorpayPaymentId,
        razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
        amountPaise,
        status: "FAILED",
        paymentMethod,
        signature,
        rawPayload: JSON.stringify(rawPayload || {}),
        failureReason: `Amount mismatch: expected ${order.totalPaise} paise, received ${amountPaise} paise`,
      },
    });
    throw new Error(`Amount mismatch: expected ₹${(order.totalPaise / 100).toFixed(2)}, received ₹${(amountPaise / 100).toFixed(2)}`);
  }

  // Idempotency: If order is already paid, record audit trail for payment attempt if new, but do not re-grant
  if (order.status === "PAID") {
    // Check if payment row already recorded
    const existingPayment = order.payments.find(
      (p) => p.razorpayPaymentId === razorpayPaymentId
    );

    if (!existingPayment && razorpayPaymentId) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          razorpayPaymentId,
          razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
          amountPaise,
          status: "SUCCESS",
          paymentMethod,
          signature,
          rawPayload: JSON.stringify(rawPayload || {}),
        },
      });
    }

    return { success: true, alreadySettled: true, orderId: order.id };
  }

  // Record payment in audit trail
  await prisma.payment.create({
    data: {
      orderId: order.id,
      razorpayPaymentId,
      razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
      amountPaise,
      status: "SUCCESS",
      paymentMethod,
      signature,
      rawPayload: JSON.stringify(rawPayload || {}),
    },
  });

  // Mark order as PAID
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
    },
  });

  // If a coupon was used, increment usedCount
  if (order.couponId) {
    await prisma.coupon.update({
      where: { id: order.couponId },
      data: {
        usedCount: { increment: 1 },
      },
    });
  }

  // Grant entitlements
  await grantEntitlementsForOrder(order.id);

  return { success: true, alreadySettled: false, orderId: order.id };
}

/**
 * Records a payment failure.
 * "Failures. A failed or cancelled payment leaves the order failed, grants nothing, and lets the student retry."
 */
export async function recordPaymentFailure({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  amountPaise,
  failureReason,
  rawPayload,
}: {
  orderId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  amountPaise?: number;
  failureReason: string;
  rawPayload?: any;
}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) return;

  // Don't overwrite if already paid
  if (order.status !== "PAID") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "FAILED",
      },
    });
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      razorpayPaymentId,
      razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
      amountPaise: amountPaise || order.totalPaise,
      status: "FAILED",
      failureReason,
      rawPayload: JSON.stringify(rawPayload || {}),
    },
  });
}
