import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generateInvoiceHtml } from "@/lib/invoice";
export async function GET(req, { params }) {
    try {
        const user = await requireAuth();
        const { id } = await params;
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                user: true,
                orderItems: true,
                payments: {
                    where: { status: "SUCCESS" },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
        });
        if (!order) {
            return new NextResponse("Order not found", { status: 404 });
        }
        // Only buyer or admin can view invoice
        if (order.userId !== user.id && user.role !== "ADMIN") {
            return new NextResponse("Access denied", { status: 403 });
        }
        if (order.status !== "PAID") {
            return new NextResponse("Invoice is only available for paid orders", { status: 400 });
        }
        const payment = order.payments[0];
        const html = generateInvoiceHtml({
            orderNumber: order.orderNumber,
            invoiceDate: new Date(order.createdAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
            }),
            customerName: order.user.name,
            customerEmail: order.user.email,
            customerPhone: order.user.phone,
            paymentId: payment?.razorpayPaymentId,
            paymentMethod: payment?.paymentMethod,
            items: order.orderItems.map((item) => ({
                title: item.title,
                unitPricePaise: item.unitPricePaise,
                upgradeCreditPaise: item.upgradeCreditPaise,
                finalPricePaise: item.finalPricePaise,
            })),
            subtotalPaise: order.subtotalPaise,
            upgradeCreditPaise: order.upgradeCreditPaise,
            discountPaise: order.discountPaise,
            totalPaise: order.totalPaise,
        });
        return new NextResponse(html, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
            },
        });
    }
    catch (error) {
        if (error.message === "UNAUTHORIZED") {
            return new NextResponse("Unauthorized", { status: 401 });
        }
        return new NextResponse("Failed to generate invoice", { status: 500 });
    }
}
