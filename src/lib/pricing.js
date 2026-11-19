import { prisma } from "./prisma";
/**
 * Calculates 18% GST breakdown from an inclusive total amount in paise.
 * Total = Base + 18% GST => Base = Math.round(Total / 1.18)
 * GST = Total - Base
 * CGST = Math.round(GST / 2), SGST = GST - CGST
 */
export function calculateGSTBreakdown(inclusiveTotalPaise) {
    if (inclusiveTotalPaise <= 0) {
        return {
            totalPaise: 0,
            basePaise: 0,
            gstTotalPaise: 0,
            cgstPaise: 0,
            sgstPaise: 0,
            gstRate: 18,
        };
    }
    const basePaise = Math.round(inclusiveTotalPaise / 1.18);
    const gstTotalPaise = inclusiveTotalPaise - basePaise;
    const cgstPaise = Math.round(gstTotalPaise / 2);
    const sgstPaise = gstTotalPaise - cgstPaise;
    return {
        totalPaise: inclusiveTotalPaise,
        basePaise,
        gstTotalPaise,
        cgstPaise,
        sgstPaise,
        gstRate: 18,
    };
}
/**
 * Calculates upgrade credit for a student buying a subject pack.
 * "A student who owns some chapters of a subject sees the subject pack price
 * reduced by what they already paid for those chapters (never below 0)."
 */
export async function calculateUpgradeCredit(userId, subjectId, subjectPackPricePaise) {
    // Find all chapters in this subject
    const chapters = await prisma.chapter.findMany({
        where: { subjectId },
        select: { id: true },
    });
    const chapterIds = chapters.map((c) => c.id);
    if (chapterIds.length === 0) {
        return { creditPaise: 0, discountedPricePaise: subjectPackPricePaise };
    }
    // Find paid order items for chapters in this subject by this user
    const paidChapterItems = await prisma.orderItem.findMany({
        where: {
            order: {
                userId,
                status: "PAID",
            },
            product: {
                type: "CHAPTER_NOTES",
                chapterId: { in: chapterIds },
            },
        },
        select: {
            finalPricePaise: true,
            productId: true,
        },
    });
    // Unique chapters paid for to prevent counting duplicates if any
    const paidProducts = new Set();
    let creditPaise = 0;
    for (const item of paidChapterItems) {
        if (!paidProducts.has(item.productId)) {
            paidProducts.add(item.productId);
            creditPaise += item.finalPricePaise;
        }
    }
    // Upgrade credit cannot exceed the pack price, and price never below 0
    const applicableCredit = Math.min(creditPaise, subjectPackPricePaise);
    const discountedPricePaise = Math.max(0, subjectPackPricePaise - applicableCredit);
    return {
        creditPaise: applicableCredit,
        discountedPricePaise,
    };
}
/**
 * Applies a coupon to a subtotal amount.
 * Handles FLAT and PERCENTAGE coupons with limits.
 */
export function calculateCouponDiscount(subtotalPaise, coupon) {
    if (!coupon.isActive) {
        return { discountPaise: 0, error: "Coupon is disabled" };
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return { discountPaise: 0, error: "Coupon has expired" };
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return { discountPaise: 0, error: "Coupon usage limit reached" };
    }
    if (coupon.minOrderPaise && subtotalPaise < coupon.minOrderPaise) {
        return {
            discountPaise: 0,
            error: `Minimum order amount of ₹${(coupon.minOrderPaise / 100).toFixed(2)} required`,
        };
    }
    let discountPaise = 0;
    if (coupon.discountType === "FLAT") {
        discountPaise = Math.min(coupon.discountValue, subtotalPaise);
    }
    else if (coupon.discountType === "PERCENTAGE") {
        discountPaise = Math.round((subtotalPaise * coupon.discountValue) / 100);
        if (coupon.maxDiscountPaise && coupon.maxDiscountPaise > 0) {
            discountPaise = Math.min(discountPaise, coupon.maxDiscountPaise);
        }
    }
    return { discountPaise: Math.min(discountPaise, subtotalPaise) };
}
