import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
export async function GET() {
    try {
        const user = await requireAuth();
        const orders = await prisma.order.findMany({
            where: { userId: user.id },
            include: {
                orderItems: true,
                coupon: true,
                payments: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ orders });
    }
    catch (error) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
    }
}
