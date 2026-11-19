import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
export async function PATCH(req, { params }) {
    try {
        await requireAdmin();
        const { id } = await params;
        const body = await req.json();
        const coupon = await prisma.coupon.update({
            where: { id },
            data: {
                isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
            },
        });
        return NextResponse.json({ message: "Coupon updated successfully", coupon });
    }
    catch (error) {
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
    }
}
export async function DELETE(req, { params }) {
    try {
        await requireAdmin();
        const { id } = await params;
        await prisma.coupon.delete({ where: { id } });
        return NextResponse.json({ message: "Coupon deleted successfully" });
    }
    catch (error) {
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
    }
}
