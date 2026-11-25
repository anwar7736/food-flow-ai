import mongoose from "mongoose";
import { mongoDB_connect } from "@/app/helpers/helper";
import { paymentTransactionSchema } from "@/app/models/paymentTransactionModel";
import { createCheckoutOrders } from "@/app/lib/checkoutOrders";
import { getSslCommerzConfig, validateSslCommerzPayment } from "@/app/lib/sslcommerz";

export async function completeSslCommerzPayment(transactionId, validationId) {
    if (!transactionId || !validationId) {
        return { success: false, reason: "invalid_callback" };
    }

    await mongoDB_connect();
    const payment = await paymentTransactionSchema.findOne({ transaction_id: transactionId });
    if (!payment) {
        return { success: false, reason: "payment_not_found" };
    }
    if (payment.status === "paid") {
        return { success: true, orderIds: payment.order_ids };
    }
    if (payment.status !== "pending") {
        return { success: false, reason: "payment_not_pending" };
    }

    const isValid = await validateSslCommerzPayment(
        getSslCommerzConfig(),
        validationId,
        payment
    );
    if (!isValid) {
        return { success: false, reason: "payment_not_valid" };
    }

    const mongoSession = await mongoose.startSession();
    let result;
    try {
        await mongoSession.withTransaction(async () => {
            const currentPayment = await paymentTransactionSchema
                .findOne({ transaction_id: transactionId })
                .session(mongoSession);
            if (!currentPayment) {
                throw new Error("SSLCommerz transaction disappeared during completion.");
            }
            if (currentPayment.status === "paid") {
                result = { success: true, orderIds: currentPayment.order_ids };
                return;
            }
            if (currentPayment.status !== "pending") {
                result = { success: false, reason: "payment_not_pending" };
                return;
            }

            const orders = await createCheckoutOrders({
                userId: currentPayment.user_id,
                checkoutId: currentPayment.checkout_id,
                checkoutTotal: currentPayment.amount,
                orderDrafts: currentPayment.order_draft,
                statusId: currentPayment.status_id,
                paymentMethod: "sslcommerz",
                paymentStatus: "paid",
                paymentTransactionId: currentPayment.transaction_id,
            }, mongoSession);

            currentPayment.status = "paid";
            currentPayment.validation_id = validationId;
            currentPayment.order_ids = orders.map((order) => order._id);
            await currentPayment.save({ session: mongoSession });
            result = { success: true, orderIds: currentPayment.order_ids };
        });
    } finally {
        await mongoSession.endSession();
    }

    return result || { success: false, reason: "payment_completion_failed" };
}

export async function setSslCommerzPaymentResult(transactionId, status) {
    if (!transactionId || !["failed", "cancelled"].includes(status)) return;
    await mongoDB_connect();
    await paymentTransactionSchema.updateOne(
        { transaction_id: transactionId, status: "pending" },
        { $set: { status } }
    );
}
