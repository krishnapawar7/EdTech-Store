import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserOwnershipMap } from "@/lib/entitlements";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }

    const ownership = await getUserOwnershipMap(user.id);

    return NextResponse.json({
      user,
      ownership: {
        ownedClassIds: Array.from(ownership.ownedClassIds),
        ownedSubjectIds: Array.from(ownership.ownedSubjectIds),
        ownedChapterIds: Array.from(ownership.ownedChapterIds),
      },
    });
  } catch (error: any) {
    console.error("Auth me check error:", error);
    return NextResponse.json({ user: null });
  }
}
