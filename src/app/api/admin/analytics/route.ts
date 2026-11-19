import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch stats
    const [
      paidOrders,
      activePassesCount,
      totalStudents,
      recentOrders,
      topProductsRaw,
    ] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: "PAID",
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          totalPaise: true,
          createdAt: true,
        },
      }),
      prisma.entitlement.count({
        where: {
          accessType: "CLASS",
          isActive: true,
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        },
      }),
      prisma.user.count({
        where: { role: "STUDENT" },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { name: true, email: true } },
          orderItems: true,
        },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: { status: "PAID" },
        },
        _count: { productId: true },
        _sum: { finalPricePaise: true },
        orderBy: {
          _count: { productId: "desc" },
        },
        take: 5,
      }),
    ]);

    // Compute total revenue and revenue by day
    let totalRevenuePaise = 0;
    const revenueByDayMap = new Map<string, number>();

    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split("T")[0];
      revenueByDayMap.set(dateKey, 0);
    }

    for (const order of paidOrders) {
      totalRevenuePaise += order.totalPaise;
      const dateKey = order.createdAt.toISOString().split("T")[0];
      const current = revenueByDayMap.get(dateKey) || 0;
      revenueByDayMap.set(dateKey, current + order.totalPaise);
    }

    const revenueByDay = Array.from(revenueByDayMap.entries()).map(([date, revenuePaise]) => ({
      date,
      revenuePaise,
      revenueINR: revenuePaise / 100,
    }));

    // Resolve top products with titles
    const productIds = topProductsRaw.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, type: true },
    });

    const topProducts = topProductsRaw.map((p) => {
      const prod = products.find((pr) => pr.id === p.productId);
      return {
        productId: p.productId,
        title: prod?.title || "Unknown Product",
        type: prod?.type || "UNKNOWN",
        salesCount: p._count.productId,
        totalRevenuePaise: p._sum.finalPricePaise || 0,
      };
    });

    return NextResponse.json({
      totalRevenuePaise,
      totalRevenueINR: totalRevenuePaise / 100,
      activePassesCount,
      totalStudents,
      revenueByDay,
      topProducts,
      recentOrders,
    });
  } catch (error: any) {
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 });
    }
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Admin analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
