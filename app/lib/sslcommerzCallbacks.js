import { NextResponse } from "next/server";
import {
    completeSslCommerzPayment,
    setSslCommerzPaymentResult,
} from "@/app/lib/sslcommerzOrderPayment";

function paymentReturnUrl(request, paymentResult) {
    const url = new URL("/place_order", request.nextUrl.origin);
    url.searchParams.set("payment", paymentResult);
    return url;
}

export async function handleSslCommerzCallback(request, resultType) {
    try {
        const form = await request.formData();
        const transactionId = String(form.get("tran_id") || "");
        if (resultType === "fail" || resultType === "cancel") {
            const status = resultType === "fail" ? "failed" : "cancelled";
            await setSslCommerzPaymentResult(transactionId, status);
            return NextResponse.redirect(
                paymentReturnUrl(request, resultType === "fail" ? "failed" : "cancelled"),
                303
            );
        }

        const validationId = String(form.get("val_id") || "");
        const result = await completeSslCommerzPayment(transactionId, validationId);
        if (result.success) {
            return NextResponse.redirect(paymentReturnUrl(request, "success"), 303);
        }
        return NextResponse.redirect(paymentReturnUrl(request, "verification_failed"), 303);
    } catch (error) {
        console.error("SSLCommerz callback processing failed:", error.name);
        return NextResponse.redirect(paymentReturnUrl(request, "verification_error"), 303);
    }
}

export async function handleSslCommerzIpn(request) {
    try {
        const form = await request.formData();
        const transactionId = String(form.get("tran_id") || "");
        const validationId = String(form.get("val_id") || "");
        const result = await completeSslCommerzPayment(transactionId, validationId);
        if (!result.success) {
            return NextResponse.json({ success: false, message: result.reason }, { status: 400 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("SSLCommerz IPN processing failed:", error.name);
        return NextResponse.json(
            { success: false, message: "Unable to process the payment notification." },
            { status: 500 }
        );
    }
}
