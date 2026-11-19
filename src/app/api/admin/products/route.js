import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
const productSchema = z.object({
    type: z.enum(["CHAPTER_NOTES", "SUBJECT_PACK", "MONTHLY_PASS", "ANNUAL_PASS", "BUNDLE"]),
    title: z.string().min(3),
    description: z.string().optional(),
    amountPaise: z.number().int().positive("Price must be a positive integer in paise"),
    accessLengthDays: z.number().int().positive().nullable().optional(),
    classId: z.string().optional(),
    subjectId: z.string().optional(),
    chapterId: z.string().optional(),
    bundleItemIds: z.array(z.string()).optional(),
});
export async function GET() {
    try {
        await requireAdmin();
        const products = await prisma.product.findMany({
            include: {
                prices: { where: { isActive: true } },
                class: true,
                subject: true,
                chapter: true,
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ products });
    }
    catch (error) {
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
    }
}
export async function POST(req) {
    try {
        await requireAdmin();
        const body = await req.json();
        const result = productSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });
        }
        const { type, title, description, amountPaise, accessLengthDays, classId, subjectId, chapterId, bundleItemIds, } = result.data;
        let computedAccessDays = accessLengthDays;
        if (type === "MONTHLY_PASS" && !computedAccessDays)
            computedAccessDays = 30;
        if (type === "ANNUAL_PASS" && !computedAccessDays)
            computedAccessDays = 365;
        if (type === "CHAPTER_NOTES" || type === "SUBJECT_PACK" || type === "BUNDLE")
            computedAccessDays = null;
        const product = await prisma.product.create({
            data: {
                type,
                title,
                description,
                accessLengthDays: computedAccessDays,
                classId: classId || null,
                subjectId: subjectId || null,
                chapterId: chapterId || null,
                bundleItemIds: bundleItemIds ? JSON.stringify(bundleItemIds) : null,
            },
        });
        const price = await prisma.price.create({
            data: {
                productId: product.id,
                amountPaise,
            },
        });
        return NextResponse.json({
            message: "Product created successfully",
            product: { ...product, prices: [price] },
        });
    }
    catch (error) {
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ error: "Failed to create product: " + error.message }, { status: 500 });
    }
}
