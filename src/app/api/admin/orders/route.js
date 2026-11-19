import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
export async function GET(req) {
    try {
        await requireAdmin();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status")?.trim();
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const search = searchParams.get("search")?.trim();
        const where = {};
        if (status && status !== "ALL") {
            where.status = status;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }
        if (search) {
            where.OR = [
                { orderNumber: { contains: search } },
                { user: { name: { contains: search } } },
                { user: { email: { contains: search } } },
                { razorpayOrderId: { contains: search } },
            ];
        }
        const orders = await prisma.order.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                orderItems: true,
                coupon: true,
                payments: {
                    orderBy: { createdAt: "desc" },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        return NextResponse.json({ orders });
    }
    catch (error) {
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 });
        }
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
    }
}
