import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { checkChapterAccess, grantEntitlementsForOrder } from "@/lib/entitlements";

describe("Entitlements & Content Lock Verification", () => {
  let student: any;
  let freeChapter: any;
  let paidChapter: any;
  let subject: any;
  let class12: any;

  beforeEach(async () => {
    await prisma.manualAccessLog.deleteMany({});
    await prisma.entitlement.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});

    student = await prisma.user.findFirst({ where: { role: "STUDENT" } });
    freeChapter = await prisma.chapter.findFirst({ where: { isFree: true } });
    paidChapter = await prisma.chapter.findFirst({
      where: { isFree: false },
      include: { subject: { include: { class: true } } },
    });
    subject = paidChapter.subject;
    class12 = paidChapter.subject.class;
  });

  it("permits signed-in student access to free sample chapter", async () => {
    const access = await checkChapterAccess(student.id, freeChapter.id);
    expect(access.hasAccess).toBe(true);
    expect(access.source).toBe("FREE");
  });

  it("strictly refuses access to unpurchased locked content (Must be refused by server)", async () => {
    const access = await checkChapterAccess(student.id, paidChapter.id);
    expect(access.hasAccess).toBe(false);
    expect(access.reason).toContain("locked");
  });

  it("unlocks chapter when user directly owns chapter entitlement", async () => {
    await prisma.entitlement.create({
      data: {
        userId: student.id,
        accessType: "CHAPTER",
        targetId: paidChapter.id,
        validUntil: null, // Lifetime
      },
    });

    const access = await checkChapterAccess(student.id, paidChapter.id);
    expect(access.hasAccess).toBe(true);
    expect(access.source).toBe("CHAPTER");
  });

  it("unlocks chapter when user owns the parent Subject Pack", async () => {
    await prisma.entitlement.create({
      data: {
        userId: student.id,
        accessType: "SUBJECT",
        targetId: subject.id,
        validUntil: null,
      },
    });

    const access = await checkChapterAccess(student.id, paidChapter.id);
    expect(access.hasAccess).toBe(true);
    expect(access.source).toBe("SUBJECT_PACK");
  });

  it("unlocks chapter when user has an active Class Pass", async () => {
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.entitlement.create({
      data: {
        userId: student.id,
        accessType: "CLASS",
        targetId: class12.id,
        validUntil: thirtyDaysLater,
      },
    });

    const access = await checkChapterAccess(student.id, paidChapter.id);
    expect(access.hasAccess).toBe(true);
    expect(access.source).toBe("CLASS_PASS");
  });

  it("refuses access if class pass is expired", async () => {
    const pastDate = new Date(Date.now() - 10000); // Expired in past
    await prisma.entitlement.create({
      data: {
        userId: student.id,
        accessType: "CLASS",
        targetId: class12.id,
        validUntil: pastDate,
      },
    });

    const access = await checkChapterAccess(student.id, paidChapter.id);
    expect(access.hasAccess).toBe(false);
  });

  it("extends time-bound pass from old expiry date when buying again before expiry", async () => {
    const initialExpiry = new Date(Date.now() + 10 * 86400000); // 10 days left

    // Existing active entitlement
    await prisma.entitlement.create({
      data: {
        userId: student.id,
        accessType: "CLASS",
        targetId: class12.id,
        validUntil: initialExpiry,
      },
    });

    // Create a 30-day monthly pass order
    const monthlyPassProduct = await prisma.product.findFirst({
      where: { classId: class12.id, type: "MONTHLY_PASS" },
    });

    const renewalOrder = await prisma.order.create({
      data: {
        orderNumber: `EXT-ORD-${Date.now()}`,
        userId: student.id,
        subtotalPaise: 29900,
        taxPaise: 4561,
        totalPaise: 29900,
        status: "PAID",
        orderItems: {
          create: [
            {
              productId: monthlyPassProduct!.id,
              unitPricePaise: 29900,
              finalPricePaise: 29900,
              title: monthlyPassProduct!.title,
            },
          ],
        },
      },
    });

    // Grant entitlements for renewal order
    await grantEntitlementsForOrder(renewalOrder.id);

    // Verify expiry was extended by 30 days from initialExpiry (approx 40 days from now)
    const updatedEntitlement = await prisma.entitlement.findFirst({
      where: {
        userId: student.id,
        accessType: "CLASS",
        targetId: class12.id,
      },
    });

    const expectedExpiryTime = initialExpiry.getTime() + 30 * 86400000;
    expect(updatedEntitlement?.validUntil?.getTime()).toBe(expectedExpiryTime);
  });
});
