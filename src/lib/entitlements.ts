import { prisma } from "./prisma";

export interface UserAccessStatus {
  hasAccess: boolean;
  source?: "FREE" | "CLASS_PASS" | "SUBJECT_PACK" | "CHAPTER" | "BUNDLE";
  validUntil?: Date | null;
  reason?: string;
}

/**
 * Checks if a user has access to a specific chapter.
 * Reads solely from the entitlements table (or isFree flag on chapter).
 * Fast and cached / indexed.
 */
export async function checkChapterAccess(
  userId: string | null | undefined,
  chapterId: string
): Promise<UserAccessStatus> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      subject: {
        include: {
          class: true,
        },
      },
    },
  });

  if (!chapter) {
    return { hasAccess: false, reason: "Chapter not found" };
  }

  // Free sample check: "One chapter per subject marked free (Lifetime, sign-in required: 0)"
  if (chapter.isFree) {
    if (!userId) {
      return { hasAccess: false, reason: "Sign-in required to read free sample" };
    }
    return { hasAccess: true, source: "FREE" };
  }

  if (!userId) {
    return { hasAccess: false, reason: "Authentication required" };
  }

  const now = new Date();

  // Query user active entitlements for this Chapter, its Subject, or its Class
  const entitlements = await prisma.entitlement.findMany({
    where: {
      userId,
      isActive: true,
      OR: [
        { accessType: "CLASS", targetId: chapter.subject.class.id },
        { accessType: "SUBJECT", targetId: chapter.subject.id },
        { accessType: "CHAPTER", targetId: chapter.id },
      ],
    },
  });

  for (const ent of entitlements) {
    // Check expiration if time-bound
    if (ent.validUntil && ent.validUntil < now) {
      continue; // Expired
    }

    if (ent.accessType === "CLASS") {
      return { hasAccess: true, source: "CLASS_PASS", validUntil: ent.validUntil };
    }
    if (ent.accessType === "SUBJECT") {
      return { hasAccess: true, source: "SUBJECT_PACK", validUntil: ent.validUntil };
    }
    if (ent.accessType === "CHAPTER") {
      return { hasAccess: true, source: "CHAPTER", validUntil: ent.validUntil };
    }
  }

  return { hasAccess: false, reason: "Content locked. Purchase required." };
}

/**
 * Get all active entitlements for a student to determine "Owned" states across the catalog.
 */
export async function getUserOwnershipMap(userId: string) {
  const now = new Date();
  const entitlements = await prisma.entitlement.findMany({
    where: {
      userId,
      isActive: true,
    },
  });

  const activeEntitlements = entitlements.filter(
    (e) => !e.validUntil || e.validUntil > now
  );

  const ownedClassIds = new Set<string>();
  const ownedSubjectIds = new Set<string>();
  const ownedChapterIds = new Set<string>();

  for (const e of activeEntitlements) {
    if (e.accessType === "CLASS") ownedClassIds.add(e.targetId);
    if (e.accessType === "SUBJECT") ownedSubjectIds.add(e.targetId);
    if (e.accessType === "CHAPTER") ownedChapterIds.add(e.targetId);
  }

  return {
    ownedClassIds,
    ownedSubjectIds,
    ownedChapterIds,
    activeEntitlements,
  };
}

/**
 * Grants entitlements for a successfully paid order.
 * Handles lifetime items, bundles, and time-bound extension:
 * "Buying again before expiry extends from the old expiry date."
 */
export async function grantEntitlementsForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order || order.status !== "PAID") {
    throw new Error(`Order ${orderId} is not in PAID state`);
  }

  const userId = order.userId;
  const now = new Date();

  for (const item of order.orderItems) {
    const product = item.product;

    if (product.type === "CHAPTER_NOTES" && product.chapterId) {
      // Check existing active entitlement
      const existing = await prisma.entitlement.findFirst({
        where: {
          userId,
          accessType: "CHAPTER",
          targetId: product.chapterId,
          isActive: true,
        },
      });

      if (!existing) {
        await prisma.entitlement.create({
          data: {
            userId,
            accessType: "CHAPTER",
            targetId: product.chapterId,
            sourceOrderId: order.id,
            validUntil: null, // Lifetime
          },
        });
      }
    } else if (product.type === "SUBJECT_PACK" && product.subjectId) {
      const existing = await prisma.entitlement.findFirst({
        where: {
          userId,
          accessType: "SUBJECT",
          targetId: product.subjectId,
          isActive: true,
        },
      });

      if (!existing) {
        await prisma.entitlement.create({
          data: {
            userId,
            accessType: "SUBJECT",
            targetId: product.subjectId,
            sourceOrderId: order.id,
            validUntil: null, // Lifetime
          },
        });
      }
    } else if (
      (product.type === "MONTHLY_PASS" || product.type === "ANNUAL_PASS") &&
      product.classId
    ) {
      const durationDays = product.accessLengthDays || (product.type === "MONTHLY_PASS" ? 30 : 365);

      // Check existing active pass for this class
      const existing = await prisma.entitlement.findFirst({
        where: {
          userId,
          accessType: "CLASS",
          targetId: product.classId,
          isActive: true,
        },
      });

      let newValidUntil: Date;

      if (existing && existing.validUntil && existing.validUntil > now) {
        // "Buying again before expiry extends from the old expiry date."
        newValidUntil = new Date(existing.validUntil.getTime() + durationDays * 86400000);
        await prisma.entitlement.update({
          where: { id: existing.id },
          data: {
            validUntil: newValidUntil,
            sourceOrderId: order.id,
          },
        });
      } else if (existing) {
        newValidUntil = new Date(now.getTime() + durationDays * 86400000);
        await prisma.entitlement.update({
          where: { id: existing.id },
          data: {
            validFrom: now,
            validUntil: newValidUntil,
            sourceOrderId: order.id,
            isActive: true,
          },
        });
      } else {
        newValidUntil = new Date(now.getTime() + durationDays * 86400000);
        await prisma.entitlement.create({
          data: {
            userId,
            accessType: "CLASS",
            targetId: product.classId,
            sourceOrderId: order.id,
            validFrom: now,
            validUntil: newValidUntil,
          },
        });
      }
    } else if (product.type === "BUNDLE" && product.bundleItemIds) {
      try {
        const itemIds: string[] = JSON.parse(product.bundleItemIds);
        for (const targetId of itemIds) {
          // Check if it matches a subject or chapter
          const isSubject = await prisma.subject.findUnique({ where: { id: targetId } });
          const accessType = isSubject ? "SUBJECT" : "CHAPTER";

          const existing = await prisma.entitlement.findFirst({
            where: {
              userId,
              accessType,
              targetId,
              isActive: true,
            },
          });

          if (!existing) {
            await prisma.entitlement.create({
              data: {
                userId,
                accessType,
                targetId,
                sourceOrderId: order.id,
                validUntil: null, // Lifetime
              },
            });
          }
        }
      } catch (err) {
        console.error("Failed to parse bundle items:", err);
      }
    }
  }
}
