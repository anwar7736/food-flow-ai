const LIVE_GATEWAY_HOST = "securepay.sslcommerz.com";
const SANDBOX_GATEWAY_HOST = "sandbox.sslcommerz.com";

export class SslCommerzConfigurationError extends Error {}

export function getSslCommerzConfig() {
    const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim();
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim();
    const liveValue = process.env.SSLCOMMERZ_IS_LIVE?.trim().toLowerCase();

    if (!storeId || !storePassword || !["true", "false"].includes(liveValue)) {
        throw new SslCommerzConfigurationError(
            "SSLCommerz is not configured. Set SSLCOMMERZ_STORE_ID, SSLCOMMERZ_STORE_PASSWORD, and SSLCOMMERZ_IS_LIVE."
        );
    }

    const isLive = liveValue === "true";
    return {
        storeId,
        storePassword,
        isLive,
        gatewayHost: isLive ? LIVE_GATEWAY_HOST : SANDBOX_GATEWAY_HOST,
    };
}

function getApplicationOrigin(requestOrigin) {
    const appUrl = process.env.APP_URL?.trim() || requestOrigin;
    const url = new URL(appUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
        throw new Error("APP_URL must use HTTPS.");
    }
    return url.origin;
}

function isValidGatewayUrl(value, gatewayHost) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" && url.hostname === gatewayHost;
    } catch {
        return false;
    }
}

export async function createSslCommerzSession({
    config,
    payment,
    customer,
    billingCity,
    billingPostcode,
    requestOrigin,
}) {
    const appOrigin = getApplicationOrigin(requestOrigin);
    const callbackUrl = `${appOrigin}/api/v1/payment/sslcommerz`;
    const form = new URLSearchParams({
        store_id: config.storeId,
        store_passwd: config.storePassword,
        total_amount: Number(payment.amount).toFixed(2),
        currency: payment.currency,
        tran_id: payment.transaction_id,
        success_url: `${callbackUrl}/success`,
        fail_url: `${callbackUrl}/fail`,
        cancel_url: `${callbackUrl}/cancel`,
        ipn_url: `${callbackUrl}/ipn`,
        cus_name: String(customer.name).trim(),
        cus_email: String(customer.email).trim(),
        cus_add1: String(customer.address).trim(),
        cus_city: billingCity,
        cus_postcode: billingPostcode,
        cus_country: "Bangladesh",
        cus_phone: String(customer.phone).trim(),
        shipping_method: "NO",
        product_name: "Food order",
        product_category: "Food",
        product_profile: "general",
    });

    const response = await fetch(`https://${config.gatewayHost}/gwprocess/v4/api.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
        throw new Error(`SSLCommerz session creation returned HTTP ${response.status}.`);
    }

    const result = await response.json();
    if (result?.status !== "SUCCESS" ||
        typeof result.GatewayPageURL !== "string" ||
        !isValidGatewayUrl(result.GatewayPageURL, config.gatewayHost)) {
        throw new Error("SSLCommerz did not return a valid payment URL.");
    }

    return result.GatewayPageURL;
}

function amountInPaisa(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0
        ? Math.round(amount * 100)
        : null;
}

export async function validateSslCommerzPayment(config, validationId, payment) {
    const endpoint = config.isLive
        ? "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php"
        : "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";
    const query = new URLSearchParams({
        val_id: validationId,
        store_id: config.storeId,
        store_passwd: config.storePassword,
        format: "json",
    });
    const response = await fetch(`${endpoint}?${query.toString()}`, {
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
        throw new Error(`SSLCommerz validation returned HTTP ${response.status}.`);
    }

    const result = await response.json();
    return ["VALID", "VALIDATED"].includes(String(result?.status).toUpperCase()) &&
        result.val_id === validationId &&
        result.tran_id === payment.transaction_id &&
        String(result.currency).toUpperCase() === payment.currency &&
        amountInPaisa(result.amount) === amountInPaisa(payment.amount);
}
