import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
const materialSchema = z.object({
    chapterId: z.string().min(1, "Chapter ID is required"),
    title: z.string().min(2, "Title is required"),
    type: z.enum(["PDF", "VIDEO", "QUIZ"]).default("PDF"),
    content: z.string().optional(),
    fileUrl: z.string().optional(),
    sizeBytes: z.number().int().optional(),
    markChapterFree: z.boolean().optional(),
});
export async function POST(req) {
    try {
        await requireAdmin();
        const body = await req.json();
        const result = materialSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });
        }
        const { chapterId, title, type, content, fileUrl, sizeBytes, markChapterFree } = result.data;
        // Check chapter
        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId },
        });
        if (!chapter) {
            return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
        }
        // Update chapter isFree if specified
        if (markChapterFree !== undefined) {
            await prisma.chapter.update({
                where: { id: chapterId },
                data: { isFree: markChapterFree },
            });
        }
        // Create material
        const material = await prisma.material.create({
            data: {
                chapterId,
                title,
                type,
                content: content || `# ${title}\n\nComprehensive notes and exam formulas.`,
                fileUrl: fileUrl || `/uploads/${chapter.slug}-notes.pdf`,
                sizeBytes: sizeBytes || 1024 * 1024 * 2, // default 2MB
            },
        });
        return NextResponse.json({
            message: "Material added successfully",
            material,
            chapterFreeStatus: markChapterFree ?? chapter.isFree,
        });
    }
    catch (error) {
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ error: "Failed to upload material: " + error.message }, { status: 500 });
    }
}
// Route to toggle chapter free sample status
export async function PATCH(req) {
    try {
        await requireAdmin();
        const body = await req.json();
        const { chapterId, isFree } = body;
        if (!chapterId || isFree === undefined) {
            return NextResponse.json({ error: "Missing chapterId or isFree" }, { status: 400 });
        }
        const chapter = await prisma.chapter.update({
            where: { id: chapterId },
            data: { isFree: Boolean(isFree) },
        });
        return NextResponse.json({
            message: `Chapter '${chapter.name}' is now ${chapter.isFree ? "marked as FREE SAMPLE" : "locked"}`,
            chapter,
        });
    }
    catch (error) {
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ error: "Failed to update chapter: " + error.message }, { status: 500 });
    }
}
