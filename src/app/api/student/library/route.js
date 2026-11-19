import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
export async function GET() {
    try {
        const user = await requireAuth();
        const now = new Date();
        const entitlements = await prisma.entitlement.findMany({
            where: {
                userId: user.id,
                isActive: true,
            },
            include: {
                sourceOrder: true,
            },
            orderBy: { createdAt: "desc" },
        });
        const activeEntitlements = entitlements.filter((e) => !e.validUntil || e.validUntil > now);
        // Group entitlements by type
        const classEntitlements = activeEntitlements.filter((e) => e.accessType === "CLASS");
        const subjectEntitlements = activeEntitlements.filter((e) => e.accessType === "SUBJECT");
        const chapterEntitlements = activeEntitlements.filter((e) => e.accessType === "CHAPTER");
        // Fetch related details
        const [classes, subjects, chapters] = await Promise.all([
            prisma.class.findMany({
                where: { id: { in: classEntitlements.map((e) => e.targetId) } },
                include: {
                    board: true,
                    subjects: {
                        include: {
                            chapters: {
                                orderBy: { chapterNumber: "asc" },
                                include: {
                                    materials: {
                                        select: { id: true, title: true, type: true },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.subject.findMany({
                where: { id: { in: subjectEntitlements.map((e) => e.targetId) } },
                include: {
                    class: true,
                    chapters: {
                        orderBy: { chapterNumber: "asc" },
                        include: {
                            materials: {
                                select: { id: true, title: true, type: true },
                            },
                        },
                    },
                },
            }),
            prisma.chapter.findMany({
                where: { id: { in: chapterEntitlements.map((e) => e.targetId) } },
                include: {
                    subject: {
                        include: { class: true },
                    },
                    materials: {
                        select: { id: true, title: true, type: true },
                    },
                },
            }),
        ]);
        // Map expiration dates to classes
        const classMap = classes.map((c) => {
            const ent = classEntitlements.find((e) => e.targetId === c.id);
            return {
                ...c,
                validUntil: ent?.validUntil || null,
                entitlementId: ent?.id,
            };
        });
        return NextResponse.json({
            classes: classMap,
            subjects,
            chapters,
            totalOwned: {
                classes: classMap.length,
                subjects: subjects.length,
                chapters: chapters.length,
            },
        });
    }
    catch (error) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ error: "Failed to load library" }, { status: 500 });
    }
}
