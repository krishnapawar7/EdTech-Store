import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getUserOwnershipMap } from "@/lib/entitlements";
import { calculateUpgradeCredit, calculateCouponDiscount, calculateGSTBreakdown } from "@/lib/pricing";
import { createRazorpayOrder } from "@/lib/razorpay";

const createOrderSchema = z.object({
  productIds: z.array(z.string()).min(1, "Cart cannot be empty"),
  couponCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const result = createOrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { productIds, couponCode } = result.data;
    const ownership = await getUserOwnershipMap(user.id);

    // Fetch products
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: {
        prices: { where: { isActive: true }, take: 1 },
      },
    });

    if (products.length === 0) {
      return NextResponse.json({ error: "No valid products found" }, { status: 400 });
    }

    // Filter overlapping items
    const validOrderItems: {
      productId: string;
      title: string;
      unitPricePaise: number;
      upgradeCreditPaise: number;
      finalPricePaise: number;
    }[] = [];

    let grossSubtotalPaise = 0;
    let totalUpgradeCreditPaise = 0;

    for (const p of products) {
      // Overlap rules
      if (p.classId && ownership.ownedClassIds.has(p.classId)) {
        if (p.type !== "MONTHLY_PASS" && p.type !== "ANNUAL_PASS") {
          continue; // Skip already unlocked by class pass
        }
      }
      if (p.type === "CHAPTER_NOTES" && p.subjectId && ownership.ownedSubjectIds.has(p.subjectId)) {
        continue; // Skip already owned via subject pack
      }
      if (p.type === "CHAPTER_NOTES" && p.chapterId && ownership.ownedChapterIds.has(p.chapterId)) {
        continue;
      }
      if (p.type === "SUBJECT_PACK" && p.subjectId && ownership.ownedSubjectIds.has(p.subjectId)) {
        continue;
      }

      const unitPricePaise = p.prices[0]?.amountPaise || 0;
      let upgradeCreditPaise = 0;

      if (p.type === "SUBJECT_PACK" && p.subjectId) {
        const credit = await calculateUpgradeCredit(user.id, p.subjectId, unitPricePaise);
        upgradeCreditPaise = credit.creditPaise;
      }

      const finalPricePaise = Math.max(0, unitPricePaise - upgradeCreditPaise);

      grossSubtotalPaise += unitPricePaise;
      totalUpgradeCreditPaise += upgradeCreditPaise;

      validOrderItems.push({
        productId: p.id,
        title: p.title,
        unitPricePaise,
        upgradeCreditPaise,
        finalPricePaise,
      });
    }

    if (validOrderItems.length === 0) {
      return NextResponse.json(
        { error: "All items in cart are already owned or unlocked" },
        { status: 400 }
      );
    }

    const netAfterUpgrades = Math.max(0, grossSubtotalPaise - totalUpgradeCreditPaise);

    // Coupon
    let couponDiscountPaise = 0;
    let couponId: string | null = null;

    if (couponCode && couponCode.trim()) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });
      if (coupon) {
        const res = calculateCouponDiscount(netAfterUpgrades, coupon);
        if (!res.error && res.discountPaise > 0) {
          couponDiscountPaise = res.discountPaise;
          couponId = coupon.id;
        }
      }
    }

    const totalPaise = Math.max(0, netAfterUpgrades - couponDiscountPaise);
    const gstBreakdown = calculateGSTBreakdown(totalPaise);

    const orderNumber = `ORD-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;

    // Create Razorpay Order
    const razorpayOrderId = await createRazorpayOrder(totalPaise, orderNumber);

    // Create Order and OrderItems in database
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        subtotalPaise: grossSubtotalPaise,
        upgradeCreditPaise: totalUpgradeCreditPaise,
        discountPaise: couponDiscountPaise,
        taxPaise: gstBreakdown.gstTotalPaise,
        totalPaise,
        status: "CREATED",
        couponId,
        razorpayOrderId,
        orderItems: {
          create: validOrderItems.map((item) => ({
            productId: item.productId,
            unitPricePaise: item.unitPricePaise,
            upgradeCreditPaise: item.upgradeCreditPaise,
            finalPricePaise: item.finalPricePaise,
            title: item.title,
          })),
        },
      },
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      razorpayOrderId,
      amountPaise: order.totalPaise,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "rzp_test_placeholderKey",
      gstBreakdown,
      user: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Please log in to checkout" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
