import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getUserOwnershipMap } from "@/lib/entitlements";
import { calculateUpgradeCredit } from "@/lib/pricing";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            products: {
              where: { isActive: true },
              include: { prices: { where: { isActive: true } } },
            },
          },
        },
        chapters: {
          orderBy: { chapterNumber: "asc" },
          include: {
            materials: {
              select: { id: true, title: true, type: true, sizeBytes: true },
            },
            products: {
              where: { type: "CHAPTER_NOTES", isActive: true },
              include: { prices: { where: { isActive: true } } },
            },
          },
        },
        products: {
          where: { type: "SUBJECT_PACK", isActive: true },
          include: { prices: { where: { isActive: true } } },
        },
      },
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const subjectPackProduct = subject.products[0];
    const basePackPricePaise = subjectPackProduct?.prices[0]?.amountPaise || 49900;

    let upgradeInfo = {
      creditPaise: 0,
      finalPricePaise: basePackPricePaise,
      hasUpgrade: false,
    };

    let userState = {
      isLoggedIn: !!user,
      ownsClassPass: false,
      ownsSubjectPack: false,
      ownedChapterIds: [] as string[],
    };

    if (user) {
      const ownership = await getUserOwnershipMap(user.id);
      userState.ownsClassPass = ownership.ownedClassIds.has(subject.classId);
      userState.ownsSubjectPack = ownership.ownedSubjectIds.has(subject.id);
      userState.ownedChapterIds = Array.from(ownership.ownedChapterIds);

      if (!userState.ownsClassPass && !userState.ownsSubjectPack) {
        const credit = await calculateUpgradeCredit(user.id, subject.id, basePackPricePaise);
        if (credit.creditPaise > 0) {
          upgradeInfo = {
            creditPaise: credit.creditPaise,
            finalPricePaise: credit.discountedPricePaise,
            hasUpgrade: true,
          };
        }
      }
    }

    return NextResponse.json({
      subject,
      upgradeInfo,
      userState,
    });
  } catch (error: any) {
    console.error("Subject catalogue error:", error);
    return NextResponse.json({ error: "Failed to load subject" }, { status: 500 });
  }
}
