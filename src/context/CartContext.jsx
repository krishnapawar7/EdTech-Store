"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
const CartContext = createContext(undefined);
export function CartProvider({ children }) {
    const { user } = useAuth();
    const [productIds, setProductIds] = useState([]);
    const [couponCode, setCouponCode] = useState("");
    const [calculation, setCalculation] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);
    // Load cart from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem("edtech_cart");
            if (saved) {
                setProductIds(JSON.parse(saved));
            }
        }
        catch { }
    }, []);
    // Save cart to localStorage
    useEffect(() => {
        try {
            localStorage.setItem("edtech_cart", JSON.stringify(productIds));
        }
        catch { }
    }, [productIds]);
    // Recalculate whenever productIds, couponCode or user changes
    const recalculateCart = async () => {
        if (productIds.length === 0) {
            setCalculation(null);
            return;
        }
        setIsCalculating(true);
        try {
            const res = await fetch("/api/cart/calculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productIds,
                    couponCode: couponCode || undefined,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setCalculation(data);
                // If items were overlapping and removed by server rules, update cart
                if (data.removedOrOverlappingItems && data.removedOrOverlappingItems.length > 0) {
                    const removedIds = new Set(data.removedOrOverlappingItems.map((i) => i.productId));
                    setProductIds((prev) => prev.filter((id) => !removedIds.has(id)));
                }
            }
        }
        catch (err) {
            console.error("Failed to calculate cart:", err);
        }
        finally {
            setIsCalculating(false);
        }
    };
    useEffect(() => {
        recalculateCart();
    }, [productIds, couponCode, user]);
    const addToCart = (productId) => {
        if (!productIds.includes(productId)) {
            setProductIds((prev) => [...prev, productId]);
        }
    };
    const removeFromCart = (productId) => {
        setProductIds((prev) => prev.filter((id) => id !== productId));
    };
    const clearCart = () => {
        setProductIds([]);
        setCouponCode("");
        setCalculation(null);
    };
    const isInCart = (productId) => productIds.includes(productId);
    return (<CartContext.Provider value={{
            productIds,
            calculation,
            couponCode,
            isCalculating,
            addToCart,
            removeFromCart,
            clearCart,
            setCoupon: setCouponCode,
            recalculateCart,
            isInCart,
        }}>
      {children}
    </CartContext.Provider>);
}
export function useCart() {
    const context = useContext(CartContext);
    if (!context)
        throw new Error("useCart must be used within a CartProvider");
    return context;
}
