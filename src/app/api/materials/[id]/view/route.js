import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkChapterAccess } from "@/lib/entitlements";
export async function GET(req, { params }) {
    try {
        const user = await getCurrentUser();
        const { id } = await params;
        const material = await prisma.material.findUnique({
            where: { id },
            include: {
                chapter: {
                    include: {
                        subject: {
                            include: { class: true },
                        },
                    },
                },
            },
        });
        if (!material) {
            return NextResponse.json({ error: "Study material not found" }, { status: 404 });
        }
        // Admins always have access
        if (user?.role === "ADMIN") {
            return NextResponse.json({
                material: {
                    id: material.id,
                    title: material.title,
                    type: material.type,
                    content: material.content,
                    sizeBytes: material.sizeBytes,
                    chapterName: material.chapter.name,
                    subjectName: material.chapter.subject.name,
                    className: material.chapter.subject.class.name,
                },
                access: { hasAccess: true, source: "ADMIN_OVERRIDE" },
            });
        }
        // Check user entitlement for this chapter
        const access = await checkChapterAccess(user?.id, material.chapterId);
        if (!access.hasAccess) {
            // Locked content must be refused by the server, not only hidden in the UI!
            return NextResponse.json({
                error: "LOCKED",
                message: access.reason || "Locked content. You do not have an active entitlement to view this material.",
                chapterId: material.chapterId,
            }, { status: 403 });
        }
        return NextResponse.json({
            material: {
                id: material.id,
                title: material.title,
                type: material.type,
                content: material.content,
                sizeBytes: material.sizeBytes,
                chapterName: material.chapter.name,
                subjectName: material.chapter.subject.name,
                className: material.chapter.subject.class.name,
            },
            access,
        });
    }
    catch (error) {
        console.error("Material access error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
