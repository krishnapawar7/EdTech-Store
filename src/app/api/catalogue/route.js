import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getUserOwnershipMap } from "@/lib/entitlements";
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search")?.trim();
        const user = await getCurrentUser();
        let ownership = null;
        if (user) {
            const map = await getUserOwnershipMap(user.id);
            ownership = {
                ownedClassIds: Array.from(map.ownedClassIds),
                ownedSubjectIds: Array.from(map.ownedSubjectIds),
                ownedChapterIds: Array.from(map.ownedChapterIds),
            };
        }
        // If searching by name
        if (search) {
            const [chapters, subjects, classes] = await Promise.all([
                prisma.chapter.findMany({
                    where: {
                        name: { contains: search },
                    },
                    include: {
                        subject: {
                            include: { class: true },
                        },
                        products: {
                            where: { type: "CHAPTER_NOTES" },
                            include: { prices: { where: { isActive: true } } },
                        },
                    },
                    take: 20,
                }),
                prisma.subject.findMany({
                    where: {
                        name: { contains: search },
                    },
                    include: {
                        class: true,
                        products: {
                            where: { type: "SUBJECT_PACK" },
                            include: { prices: { where: { isActive: true } } },
                        },
                    },
                    take: 10,
                }),
                prisma.class.findMany({
                    where: {
                        name: { contains: search },
                    },
                    include: {
                        products: {
                            include: { prices: { where: { isActive: true } } },
                        },
                    },
                    take: 5,
                }),
            ]);
            return NextResponse.json({
                search,
                results: { chapters, subjects, classes },
                ownership,
            });
        }
        // Default catalogue hierarchy: Boards -> Classes -> Subjects -> Chapters
        const boards = await prisma.board.findMany({
            include: {
                classes: {
                    orderBy: { gradeNumber: "asc" },
                    include: {
                        products: {
                            where: { isActive: true },
                            include: { prices: { where: { isActive: true } } },
                        },
                        subjects: {
                            include: {
                                products: {
                                    where: { type: "SUBJECT_PACK", isActive: true },
                                    include: { prices: { where: { isActive: true } } },
                                },
                                chapters: {
                                    orderBy: { chapterNumber: "asc" },
                                    include: {
                                        products: {
                                            where: { type: "CHAPTER_NOTES", isActive: true },
                                            include: { prices: { where: { isActive: true } } },
                                        },
                                        materials: {
                                            select: { id: true, title: true, type: true, sizeBytes: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        const bundles = await prisma.product.findMany({
            where: { type: "BUNDLE", isActive: true },
            include: {
                prices: { where: { isActive: true } },
            },
        });
        return NextResponse.json({
            boards,
            bundles,
            ownership,
        });
    }
    catch (error) {
        console.error("Catalogue error:", error);
        return NextResponse.json({ error: "Failed to load catalogue" }, { status: 500 });
    }
}
