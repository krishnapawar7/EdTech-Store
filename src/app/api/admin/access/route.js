import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
const accessManagementSchema = z.object({
    targetUserId: z.string().min(1, "Target student is required"),
    action: z.enum(["GRANT", "REVOKE"]),
    accessType: z.enum(["CLASS", "SUBJECT", "CHAPTER"]),
    targetId: z.string().min(1, "Target ID is required"),
    durationDays: z.number().int().positive().optional(),
    reason: z.string().min(5, "Mandatory audit reason must be at least 5 characters"),
});
export async function POST(req) {
    try {
        const admin = await requireAdmin();
        const body = await req.json();
        const result = accessManagementSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });
        }
        const { targetUserId, action, accessType, targetId, durationDays, reason } = result.data;
        // Check target student exists
        const student = await prisma.user.findUnique({
            where: { id: targetUserId },
        });
        if (!student) {
            return NextResponse.json({ error: "Target student not found" }, { status: 404 });
        }
        const now = new Date();
        if (action === "GRANT") {
            const validUntil = durationDays
                ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
                : null;
            // Upsert entitlement
            const existing = await prisma.entitlement.findFirst({
                where: {
                    userId: targetUserId,
                    accessType,
                    targetId,
                    isActive: true,
                },
            });
            if (existing) {
                await prisma.entitlement.update({
                    where: { id: existing.id },
                    data: {
                        validUntil,
                        isActive: true,
                    },
                });
            }
            else {
                await prisma.entitlement.create({
                    data: {
                        userId: targetUserId,
                        accessType,
                        targetId,
                        validUntil,
                        isActive: true,
                    },
                });
            }
        }
        else if (action === "REVOKE") {
            // Deactivate all matching entitlements for this target
            await prisma.entitlement.updateMany({
                where: {
                    userId: targetUserId,
                    accessType,
                    targetId,
                    isActive: true,
                },
                data: {
                    isActive: false,
                },
            });
        }
        // MANDATORY AUDIT LOG
        const log = await prisma.manualAccessLog.create({
            data: {
                adminId: admin.id,
                targetUserId,
                action,
                accessType,
                targetId,
                reason,
            },
        });
        return NextResponse.json({
            message: `Access successfully ${action === "GRANT" ? "granted" : "revoked"} for student ${student.name}`,
            log,
        });
    }
    catch (error) {
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ error: "Failed to modify access" }, { status: 500 });
    }
}
export async function GET() {
    try {
        await requireAdmin();
        const [logs, students] = await Promise.all([
            prisma.manualAccessLog.findMany({
                include: {
                    adminUser: { select: { name: true, email: true } },
                    targetUser: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 50,
            }),
            prisma.user.findMany({
                where: { role: "STUDENT" },
                select: { id: true, name: true, email: true },
            }),
        ]);
        return NextResponse.json({ logs, students });
    }
    catch (error) {
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
    }
}
