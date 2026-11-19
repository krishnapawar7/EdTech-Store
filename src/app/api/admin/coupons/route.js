import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
const couponSchema = z.object({
    code: z.string().min(2).toUpperCase(),
    discountType: z.enum(["FLAT", "PERCENTAGE"]),
    discountValue: z.number().positive(), // in paise if FLAT, percentage integer if PERCENTAGE
    maxDiscountPaise: z.number().positive().optional(),
    minOrderPaise: z.number().positive().optional(),
    maxUses: z.number().int().positive().optional(),
    expiresAt: z.string().optional(),
    isActive: z.boolean().default(true),
});
export async function GET() {
    try {
        await requireAdmin();
        const coupons = await prisma.coupon.findMany({
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ coupons });
    }
    catch (error) {
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
export async function POST(req) {
    try {
        await requireAdmin();
        const body = await req.json();
        const result = couponSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });
        }
        const { code, discountType, discountValue, maxDiscountPaise, minOrderPaise, maxUses, expiresAt, isActive, } = result.data;
        const existing = await prisma.coupon.findUnique({
            where: { code },
        });
        if (existing) {
            return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 });
        }
        const coupon = await prisma.coupon.create({
            data: {
                code,
                discountType,
                discountValue,
                maxDiscountPaise: maxDiscountPaise || null,
                minOrderPaise: minOrderPaise || null,
                maxUses: maxUses || null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                isActive,
            },
        });
        return NextResponse.json({ message: "Coupon created successfully", coupon });
    }
    catch (error) {
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
    }
}
