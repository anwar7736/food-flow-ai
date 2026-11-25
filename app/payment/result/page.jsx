"use client";

import { useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CartContext } from "@/app/contexts/CartContext";
import { session_destroy } from "@/app/helpers/SessionHelper";

const paymentResults = {
    success: {
        title: "Payment successful",
        message: "Thank you for your order! Your payment is confirmed, and the restaurant can start preparing your food.",
        icon: "check",
        accent: "text-green-700",
        iconStyle: "bg-green-100 text-green-700",
        primaryLabel: "View my orders",
        primaryHref: "/user/dashboard",
    },
    failed: {
        title: "Payment wasn't completed",
        message: "No order was placed. Your cart is still saved, so you can review it and try again.",
        icon: "cross",
        accent: "text-red-700",
        iconStyle: "bg-red-100 text-red-700",
        primaryLabel: "Return to checkout",
        primaryHref: "/place_order",
    },
    cancelled: {
        title: "Payment cancelled",
        message: "No order was placed. Your cart is ready whenever you want to try again.",
        icon: "cross",
        accent: "text-amber-700",
        iconStyle: "bg-amber-100 text-amber-700",
        primaryLabel: "Return to checkout",
        primaryHref: "/place_order",
    },
    verification_failed: {
        title: "Payment couldn't be verified",
        message: "Your order hasn't been confirmed. If your account was charged, please contact support before trying again.",
        icon: "cross",
        accent: "text-amber-700",
        iconStyle: "bg-amber-100 text-amber-700",
        primaryLabel: "View my orders",
        primaryHref: "/user/dashboard",
    },
    verification_error: {
        title: "We're checking your payment",
        message: "We couldn't confirm the result yet. If you may have been charged, please contact support before retrying.",
        icon: "pending",
        accent: "text-amber-700",
        iconStyle: "bg-amber-100 text-amber-700",
        primaryLabel: "View my orders",
        primaryHref: "/user/dashboard",
    },
};

export default function PaymentResultPage() {
    const { setCart } = useContext(CartContext);
    const [paymentResult, setPaymentResult] = useState(null);
    const processedReturn = useRef(false);

    useEffect(() => {
        if (processedReturn.current) return;
        processedReturn.current = true;

        const url = new URL(window.location.href);
        const result = url.searchParams.get("payment");
        url.searchParams.delete("payment");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);

        if (result === "success") {
            session_destroy("cart");
            setCart([]);
        }
        setPaymentResult(paymentResults[result] ? result : "verification_error");
    }, [setCart]);

    if (!paymentResult) {
        return (
            <main className="flex min-h-[65vh] items-center justify-center px-4 py-12">
                <p className="text-sm font-semibold text-gray-600" role="status">Loading payment result...</p>
            </main>
        );
    }

    const result = paymentResults[paymentResult];
    return (
        <main className="flex min-h-[65vh] items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4 py-12">
            <section className="w-full max-w-xl rounded-3xl border border-green-100 bg-white p-7 text-center shadow-xl shadow-green-950/5 sm:p-10">
                <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-4xl font-semibold ${result.iconStyle}`} aria-hidden="true">
                    {result.icon === "check" ? "✓" : result.icon === "pending" ? "…" : "×"}
                </div>
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${result.accent}`}>Payment update</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{result.title}</h1>
                <p className="mx-auto mt-4 max-w-md text-base leading-7 text-gray-600">{result.message}</p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link href={result.primaryHref} className="rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-800">
                        {result.primaryLabel}
                    </Link>
                    <Link href="/" className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                        Continue browsing
                    </Link>
                </div>
                <p className="mt-7 text-xs text-gray-400">FoodFlow AI · Secure checkout</p>
            </section>
        </main>
    );
}
