import { describe, it, expect } from "vitest";
import { calculateGSTBreakdown, calculateCouponDiscount } from "@/lib/pricing";
describe("Pricing and GST Calculation Engine", () => {
    it("calculates 18% inclusive GST correctly for ₹49 (4900 paise)", () => {
        const totalPaise = 4900;
        const gst = calculateGSTBreakdown(totalPaise);
        expect(gst.totalPaise).toBe(4900);
        // 4900 / 1.18 = 4152.54 => 4153 base
        expect(gst.basePaise).toBe(4153);
        // 4900 - 4153 = 747 paise tax
        expect(gst.gstTotalPaise).toBe(747);
        expect(gst.cgstPaise + gst.sgstPaise).toBe(gst.gstTotalPaise);
        expect(gst.basePaise + gst.gstTotalPaise).toBe(gst.totalPaise);
    });
    it("calculates 18% inclusive GST correctly for ₹499 (49900 paise)", () => {
        const totalPaise = 49900;
        const gst = calculateGSTBreakdown(totalPaise);
        expect(gst.totalPaise).toBe(49900);
        expect(gst.basePaise).toBe(42288);
        expect(gst.gstTotalPaise).toBe(7612);
        expect(gst.cgstPaise).toBe(3806);
        expect(gst.sgstPaise).toBe(3806);
        expect(gst.basePaise + gst.gstTotalPaise).toBe(gst.totalPaise);
    });
    it("handles zero amount gracefully", () => {
        const gst = calculateGSTBreakdown(0);
        expect(gst.totalPaise).toBe(0);
        expect(gst.basePaise).toBe(0);
        expect(gst.gstTotalPaise).toBe(0);
    });
    describe("Coupon Calculation", () => {
        it("applies FLAT coupon correctly", () => {
            const coupon = {
                discountType: "FLAT",
                discountValue: 5000, // ₹50
                minOrderPaise: 9900, // ₹99
                isActive: true,
                usedCount: 0,
            };
            // Below min order
            const res1 = calculateCouponDiscount(8000, coupon);
            expect(res1.discountPaise).toBe(0);
            expect(res1.error).toContain("Minimum order amount");
            // Above min order
            const res2 = calculateCouponDiscount(49900, coupon);
            expect(res2.discountPaise).toBe(5000);
            expect(res2.error).toBeUndefined();
        });
        it("applies PERCENTAGE coupon with max discount cap", () => {
            const coupon = {
                discountType: "PERCENTAGE",
                discountValue: 20, // 20%
                maxDiscountPaise: 10000, // max ₹100
                minOrderPaise: 10000,
                isActive: true,
                usedCount: 0,
            };
            // 20% of 20000 paise (₹200) is 4000 paise (₹40), within cap
            const res1 = calculateCouponDiscount(20000, coupon);
            expect(res1.discountPaise).toBe(4000);
            // 20% of 100000 paise (₹1000) is 20000 paise (₹200), capped at 10000 paise (₹100)
            const res2 = calculateCouponDiscount(100000, coupon);
            expect(res2.discountPaise).toBe(10000);
        });
        it("rejects expired or disabled coupons", () => {
            const expiredCoupon = {
                discountType: "FLAT",
                discountValue: 2000,
                isActive: true,
                expiresAt: new Date(Date.now() - 100000), // in the past
                usedCount: 0,
            };
            const res1 = calculateCouponDiscount(5000, expiredCoupon);
            expect(res1.discountPaise).toBe(0);
            expect(res1.error).toContain("expired");
            const disabledCoupon = {
                discountType: "FLAT",
                discountValue: 2000,
                isActive: false,
                usedCount: 0,
            };
            const res2 = calculateCouponDiscount(5000, disabledCoupon);
            expect(res2.discountPaise).toBe(0);
            expect(res2.error).toContain("disabled");
        });
        it("rejects coupons that reached usage limit", () => {
            const exhaustedCoupon = {
                discountType: "FLAT",
                discountValue: 2000,
                isActive: true,
                maxUses: 10,
                usedCount: 10,
            };
            const res = calculateCouponDiscount(5000, exhaustedCoupon);
            expect(res.discountPaise).toBe(0);
            expect(res.error).toContain("limit reached");
        });
    });
});
