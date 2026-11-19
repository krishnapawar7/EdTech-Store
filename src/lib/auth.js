import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-development-min-32-chars";
export const AUTH_COOKIE_NAME = "edtech_auth_token";
export async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
export function signToken(payload, expiresIn = "7d") {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
export async function getCurrentUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
        if (!token)
            return null;
        const payload = verifyToken(token);
        if (!payload?.userId)
            return null;
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, name: true, role: true },
        });
        return user;
    }
    catch {
        return null;
    }
}
export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("UNAUTHORIZED");
    }
    return user;
}
export async function requireAdmin() {
    const user = await requireAuth();
    if (user.role !== "ADMIN") {
        throw new Error("FORBIDDEN");
    }
    return user;
}
