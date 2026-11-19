import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().optional(),
});
export async function POST(req) {
    try {
        const body = await req.json();
        const result = registerSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });
        }
        const { name, email, password, phone } = result.data;
        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });
        if (existingUser) {
            return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
        }
        const passwordHash = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,
                passwordHash,
                phone,
                role: "STUDENT",
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });
        const token = signToken({
            userId: user.id,
            email: user.email,
            role: "STUDENT",
            name: user.name,
        });
        const response = NextResponse.json({
            message: "Account created successfully",
            user,
        });
        response.cookies.set({
            name: AUTH_COOKIE_NAME,
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });
        return response;
    }
    catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
