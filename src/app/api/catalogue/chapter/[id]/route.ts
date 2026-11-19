import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkChapterAccess, getUserOwnershipMap } from "@/lib/entitlements";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        subject: {
          include: {
            class: true,
            products: {
              where: { type: "SUBJECT_PACK", isActive: true },
              include: { prices: { where: { isActive: true } } },
            },
          },
        },
        materials: {
          select: {
            id: true,
            title: true,
            type: true,
            sizeBytes: true,
            createdAt: true,
          },
        },
        products: {
          where: { type: "CHAPTER_NOTES", isActive: true },
          include: { prices: { where: { isActive: true } } },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const access = await checkChapterAccess(user?.id, chapter.id);

    let ownership = {
      ownsClassPass: false,
      ownsSubjectPack: false,
      ownsChapter: false,
    };

    if (user) {
      const map = await getUserOwnershipMap(user.id);
      ownership.ownsClassPass = map.ownedClassIds.has(chapter.subject.classId);
      ownership.ownsSubjectPack = map.ownedSubjectIds.has(chapter.subjectId);
      ownership.ownsChapter = map.ownedChapterIds.has(chapter.id);
    }

    return NextResponse.json({
      chapter,
      access,
      ownership,
      user: user ? { id: user.id, name: user.name, email: user.email } : null,
    });
  } catch (error: any) {
    console.error("Chapter catalogue error:", error);
    return NextResponse.json({ error: "Failed to load chapter" }, { status: 500 });
  }
}
