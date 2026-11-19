import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
export async function GET() {
    try {
        await requireAdmin();
        const boards = await prisma.board.findMany({
            include: {
                classes: {
                    orderBy: { gradeNumber: "asc" },
                    include: {
                        subjects: {
                            include: {
                                chapters: {
                                    orderBy: { chapterNumber: "asc" },
                                    include: {
                                        materials: true,
                                        products: { include: { prices: true } },
                                    },
                                },
                                products: { include: { prices: true } },
                            },
                        },
                        products: { include: { prices: true } },
                    },
                },
            },
        });
        return NextResponse.json({ boards });
    }
    catch (error) {
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ error: "Failed to load catalogue" }, { status: 500 });
    }
}
// Handler for creating entities: board, class, subject, chapter
export async function POST(req) {
    try {
        await requireAdmin();
        const body = await req.json();
        const { entityType, data } = body;
        if (entityType === "BOARD") {
            const board = await prisma.board.create({
                data: {
                    name: data.name,
                    slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-"),
                    description: data.description,
                },
            });
            return NextResponse.json({ message: "Board created", entity: board });
        }
        if (entityType === "CLASS") {
            const cls = await prisma.class.create({
                data: {
                    boardId: data.boardId,
                    name: data.name,
                    slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-"),
                    gradeNumber: Number(data.gradeNumber),
                },
            });
            // Automatically create default Monthly and Annual pass products for new class
            const monthlyPass = await prisma.product.create({
                data: {
                    type: "MONTHLY_PASS",
                    title: `${cls.name} All-Access Monthly Pass`,
                    description: `Full access to all subjects and chapters in ${cls.name} for 30 days.`,
                    accessLengthDays: 30,
                    classId: cls.id,
                },
            });
            await prisma.price.create({
                data: { productId: monthlyPass.id, amountPaise: 29900 },
            });
            const annualPass = await prisma.product.create({
                data: {
                    type: "ANNUAL_PASS",
                    title: `${cls.name} All-Access Annual Pass`,
                    description: `Unrestricted 365 days access to every subject and update in ${cls.name}.`,
                    accessLengthDays: 365,
                    classId: cls.id,
                },
            });
            await prisma.price.create({
                data: { productId: annualPass.id, amountPaise: 249900 },
            });
            return NextResponse.json({ message: "Class created with pass products", entity: cls });
        }
        if (entityType === "SUBJECT") {
            const sub = await prisma.subject.create({
                data: {
                    classId: data.classId,
                    name: data.name,
                    slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-"),
                    icon: data.icon || "book",
                },
            });
            // Automatically create Subject Pack product
            const pack = await prisma.product.create({
                data: {
                    type: "SUBJECT_PACK",
                    title: `${sub.name} Complete Subject Pack`,
                    description: `All current and future chapters in ${sub.name}. Lifetime access.`,
                    accessLengthDays: null,
                    subjectId: sub.id,
                    classId: sub.classId,
                },
            });
            await prisma.price.create({
                data: { productId: pack.id, amountPaise: 49900 },
            });
            return NextResponse.json({ message: "Subject created with pack product", entity: sub });
        }
        if (entityType === "CHAPTER") {
            const ch = await prisma.chapter.create({
                data: {
                    subjectId: data.subjectId,
                    name: data.name,
                    slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-"),
                    chapterNumber: Number(data.chapterNumber) || 1,
                    isFree: Boolean(data.isFree),
                },
            });
            // Create Chapter Notes product
            const chProduct = await prisma.product.create({
                data: {
                    type: "CHAPTER_NOTES",
                    title: `Chapter ${ch.chapterNumber}: ${ch.name} Notes`,
                    description: `Complete study notes and PDF materials for ${ch.name}. Lifetime access.`,
                    accessLengthDays: null,
                    chapterId: ch.id,
                    subjectId: ch.subjectId,
                },
            });
            await prisma.price.create({
                data: { productId: chProduct.id, amountPaise: 4900 },
            });
            return NextResponse.json({ message: "Chapter created with product", entity: ch });
        }
        return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
    }
    catch (error) {
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ error: "Failed to create entity: " + error.message }, { status: 500 });
    }
}
// Handler for editing/deleting entities
export async function DELETE(req) {
    try {
        await requireAdmin();
        const { searchParams } = new URL(req.url);
        const entityType = searchParams.get("type");
        const id = searchParams.get("id");
        if (!id || !entityType) {
            return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
        }
        if (entityType === "BOARD")
            await prisma.board.delete({ where: { id } });
        else if (entityType === "CLASS")
            await prisma.class.delete({ where: { id } });
        else if (entityType === "SUBJECT")
            await prisma.subject.delete({ where: { id } });
        else if (entityType === "CHAPTER")
            await prisma.chapter.delete({ where: { id } });
        else
            return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
        return NextResponse.json({ message: `${entityType} deleted successfully` });
    }
    catch (error) {
        if (error.message === "FORBIDDEN") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        return NextResponse.json({ error: "Failed to delete: " + error.message }, { status: 500 });
    }
}
