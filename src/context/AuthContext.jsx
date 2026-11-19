"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [ownership, setOwnership] = useState({
        ownedClassIds: [],
        ownedSubjectIds: [],
        ownedChapterIds: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const refreshUser = async () => {
        try {
            const res = await fetch("/api/auth/me");
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                if (data.ownership) {
                    setOwnership(data.ownership);
                }
                else {
                    setOwnership({ ownedClassIds: [], ownedSubjectIds: [], ownedChapterIds: [] });
                }
            }
            else {
                setUser(null);
                setOwnership({ ownedClassIds: [], ownedSubjectIds: [], ownedChapterIds: [] });
            }
        }
        catch {
            setUser(null);
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        refreshUser();
    }, []);
    const login = async (email, password) => {
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            if (res.ok) {
                await refreshUser();
                return true;
            }
            return false;
        }
        catch {
            return false;
        }
    };
    const logout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        setUser(null);
        setOwnership({ ownedClassIds: [], ownedSubjectIds: [], ownedChapterIds: [] });
    };
    const switchToRole = async (role) => {
        const creds = role === "ADMIN"
            ? { email: "admin@edstore.com", password: "Admin@123" }
            : { email: "student@edstore.com", password: "Student@123" };
        await login(creds.email, creds.password);
    };
    return (<AuthContext.Provider value={{
            user,
            ownership,
            isLoading,
            refreshUser,
            login,
            logout,
            switchToRole,
        }}>
      {children}
    </AuthContext.Provider>);
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error("useAuth must be used within an AuthProvider");
    return context;
}
