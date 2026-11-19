import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getUserOwnershipMap } from "@/lib/entitlements";
import { calculateUpgradeCredit, calculateCouponDiscount, calculateGSTBreakdown } from "@/lib/pricing";

const calculateCartSchema = z.object({
  productIds: z.array(z.string()).min(1, "Cart cannot be empty"),
  couponCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const result = calculateCartSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid cart data", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { productIds, couponCode } = result.data;

    // Fetch user ownership if logged in
    const ownership = user ? await getUserOwnershipMap(user.id) : null;

    // Fetch products from database with active prices
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: {
        prices: {
          where: { isActive: true },
          take: 1,
        },
        class: true,
        subject: true,
        chapter: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json({ error: "No valid products found in cart" }, { status: 400 });
    }

    const processedItems: any[] = [];
    const removedOrOverlappingItems: any[] = [];
    let grossSubtotalPaise = 0;
    let totalUpgradeCreditPaise = 0;

    for (const product of products) {
      const basePricePaise = product.prices[0]?.amountPaise || 0;
      let upgradeCreditPaise = 0;
      let isOverlapping = false;
      let overlapReason = "";

      // Check overlapping purchase rules if user is logged in
      if (ownership) {
        // 1. If user owns an active class pass, everything in that class is already unlocked!
        if (product.classId && ownership.ownedClassIds.has(product.classId)) {
          if (product.type !== "MONTHLY_PASS" && product.type !== "ANNUAL_PASS") {
            isOverlapping = true;
            overlapReason = "You already have active full-access to this entire class!";
          }
        }

        // 2. If user owns a subject pack, chapter notes inside it must NOT be offered
        if (
          product.type === "CHAPTER_NOTES" &&
          product.subjectId &&
          ownership.ownedSubjectIds.has(product.subjectId)
        ) {
          isOverlapping = true;
          overlapReason = "You already own the complete Subject Pack for this subject!";
        }

        // 3. If user already owns this specific chapter
        if (
          product.type === "CHAPTER_NOTES" &&
          product.chapterId &&
          ownership.ownedChapterIds.has(product.chapterId)
        ) {
          isOverlapping = true;
          overlapReason = "You already own this chapter notes!";
        }

        // 4. If user already owns this specific subject pack
        if (
          product.type === "SUBJECT_PACK" &&
          product.subjectId &&
          ownership.ownedSubjectIds.has(product.subjectId)
        ) {
          isOverlapping = true;
          overlapReason = "You already own this Subject Pack!";
        }
      }

      if (isOverlapping) {
        removedOrOverlappingItems.push({
          productId: product.id,
          title: product.title,
          reason: overlapReason,
        });
        continue;
      }

      // Check for upgrade credit on Subject Packs:
      // "A student who owns some chapters of a subject sees the subject pack price reduced by what they already paid for those chapters (never below 0)."
      if (user && product.type === "SUBJECT_PACK" && product.subjectId) {
        const credit = await calculateUpgradeCredit(user.id, product.subjectId, basePricePaise);
        upgradeCreditPaise = credit.creditPaise;
      }

      const finalPricePaise = Math.max(0, basePricePaise - upgradeCreditPaise);

      grossSubtotalPaise += basePricePaise;
      totalUpgradeCreditPaise += upgradeCreditPaise;

      processedItems.push({
        productId: product.id,
        title: product.title,
        type: product.type,
        accessLengthDays: product.accessLengthDays,
        unitPricePaise: basePricePaise,
        upgradeCreditPaise,
        finalPricePaise,
      });
    }

    if (processedItems.length === 0) {
      return NextResponse.json({
        items: [],
        removedOrOverlappingItems,
        subtotalPaise: 0,
        upgradeCreditPaise: 0,
        discountPaise: 0,
        taxPaise: 0,
        totalPaise: 0,
        gstBreakdown: calculateGSTBreakdown(0),
        message: "All items in your cart are already owned or unlocked!",
      });
    }

    // Net subtotal after upgrade credits
    const netAfterUpgrades = Math.max(0, grossSubtotalPaise - totalUpgradeCreditPaise);

    // Coupon calculation
    let couponDiscountPaise = 0;
    let appliedCoupon: any = null;
    let couponError: string | undefined;

    if (couponCode && couponCode.trim()) {
      const code = couponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({
        where: { code },
      });

      if (!coupon) {
        couponError = "Invalid coupon code";
      } else {
        const res = calculateCouponDiscount(netAfterUpgrades, coupon);
        if (res.error) {
          couponError = res.error;
        } else {
          couponDiscountPaise = res.discountPaise;
          appliedCoupon = {
            id: coupon.id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmountPaise: couponDiscountPaise,
          };
        }
      }
    }

    const totalPaise = Math.max(0, netAfterUpgrades - couponDiscountPaise);
    const gstBreakdown = calculateGSTBreakdown(totalPaise);

    return NextResponse.json({
      items: processedItems,
      removedOrOverlappingItems,
      subtotalPaise: grossSubtotalPaise,
      upgradeCreditPaise: totalUpgradeCreditPaise,
      netAfterUpgrades,
      coupon: appliedCoupon,
      couponError,
      discountPaise: couponDiscountPaise,
      taxPaise: gstBreakdown.gstTotalPaise,
      totalPaise,
      gstBreakdown,
    });
  } catch (error: any) {
    console.error("Cart calculation error:", error);
    return NextResponse.json({ error: "Failed to calculate cart pricing" }, { status: 500 });
  }
}
