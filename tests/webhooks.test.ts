import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { settleSuccessfulPayment } from "@/lib/razorpay";

describe("Payment Settlement & Idempotency", () => {
  let testUser: any;
  let testProduct: any;
  let testOrder: any;

  beforeEach(async () => {
    // Clean up test records
    await prisma.manualAccessLog.deleteMany({});
    await prisma.entitlement.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});

    // Find student user and chapter product from seed
    testUser = await prisma.user.findFirst({ where: { role: "STUDENT" } });
    testProduct = await prisma.product.findFirst({
      where: { type: "CHAPTER_NOTES" },
      include: { prices: true },
    });

    // Create a fresh test order
    testOrder = await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-${Date.now()}`,
        userId: testUser.id,
        subtotalPaise: testProduct.prices[0].amountPaise,
        taxPaise: 747,
        totalPaise: testProduct.prices[0].amountPaise,
        status: "CREATED",
        razorpayOrderId: `rzp_order_${Date.now()}`,
        orderItems: {
          create: [
            {
              productId: testProduct.id,
              unitPricePaise: testProduct.prices[0].amountPaise,
              finalPricePaise: testProduct.prices[0].amountPaise,
              title: testProduct.title,
            },
          ],
        },
      },
    });
  });

  it("settles payment successfully on first arrival and grants entitlement", async () => {
    const paymentId = `pay_first_${Date.now()}`;
    const result = await settleSuccessfulPayment({
      orderId: testOrder.id,
      razorpayOrderId: testOrder.razorpayOrderId,
      razorpayPaymentId: paymentId,
      amountPaise: testOrder.totalPaise,
      paymentMethod: "upi",
    });

    expect(result.success).toBe(true);
    expect(result.alreadySettled).toBe(false);

    // Verify order updated to PAID
    const updatedOrder = await prisma.order.findUnique({
      where: { id: testOrder.id },
    });
    expect(updatedOrder?.status).toBe("PAID");

    // Verify entitlement granted
    const entitlements = await prisma.entitlement.findMany({
      where: {
        userId: testUser.id,
        targetId: testProduct.chapterId,
        isActive: true,
      },
    });
    expect(entitlements.length).toBe(1);
    expect(entitlements[0].accessType).toBe("CHAPTER");
  });

  it("is idempotent: receiving the same payment event twice grants access only once", async () => {
    const paymentId = `pay_duplicate_${Date.now()}`;

    // First arrival (e.g. from client callback)
    const res1 = await settleSuccessfulPayment({
      orderId: testOrder.id,
      razorpayOrderId: testOrder.razorpayOrderId,
      razorpayPaymentId: paymentId,
      amountPaise: testOrder.totalPaise,
      paymentMethod: "upi",
    });
    expect(res1.success).toBe(true);
    expect(res1.alreadySettled).toBe(false);

    // Second arrival (e.g. from Razorpay webhook payment.captured)
    const res2 = await settleSuccessfulPayment({
      orderId: testOrder.id,
      razorpayOrderId: testOrder.razorpayOrderId,
      razorpayPaymentId: paymentId,
      amountPaise: testOrder.totalPaise,
      paymentMethod: "upi",
    });
    expect(res2.success).toBe(true);
    expect(res2.alreadySettled).toBe(true);

    // Verify entitlements were not duplicated
    const entitlements = await prisma.entitlement.findMany({
      where: {
        userId: testUser.id,
        targetId: testProduct.chapterId,
        isActive: true,
      },
    });
    expect(entitlements.length).toBe(1);
  });

  it("enforces amount check: rejects settlement if paid amount does not match saved order amount", async () => {
    const tamperedAmount = testOrder.totalPaise - 1000; // Underpaid

    await expect(
      settleSuccessfulPayment({
        orderId: testOrder.id,
        razorpayOrderId: testOrder.razorpayOrderId,
        razorpayPaymentId: `pay_tampered_${Date.now()}`,
        amountPaise: tamperedAmount,
        paymentMethod: "upi",
      })
    ).rejects.toThrow("Amount mismatch");

    // Order should remain in CREATED state, not PAID
    const orderAfter = await prisma.order.findUnique({
      where: { id: testOrder.id },
    });
    expect(orderAfter?.status).toBe("CREATED");

    // Entitlement must not be granted
    const entitlements = await prisma.entitlement.findMany({
      where: {
        userId: testUser.id,
        targetId: testProduct.chapterId,
      },
    });
    expect(entitlements.length).toBe(0);
  });
});
