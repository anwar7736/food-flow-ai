import { orderSchema } from "@/app/models/orderModel";
import { orderItemSchema } from "@/app/models/orderItemModel";
import { orderStatusLogSchema } from "@/app/models/orderStatusLogModel";

export async function createCheckoutOrders({
    userId,
    checkoutId,
    checkoutTotal,
    orderDrafts,
    statusId,
    paymentMethod,
    paymentStatus,
    paymentTransactionId = null,
}, mongoSession) {
    const orders = [];

    for (const draft of orderDrafts) {
        const order = await new orderSchema({
            user_id: userId,
            restaurant_id: draft.restaurant_id,
            delivery_partner_id: draft.delivery_partner_id,
            date: new Date(),
            invoice_no: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
            checkout_id: checkoutId,
            checkout_total: checkoutTotal,
            checkout_order_count: orderDrafts.length,
            total: draft.total,
            shipping_charge: draft.shipping_charge,
            final_total: draft.total + draft.shipping_charge,
            status_id: statusId,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            payment_transaction_id: paymentTransactionId,
        }).save({ session: mongoSession });

        await orderItemSchema.insertMany(
            draft.items.map((item) => ({ ...item, order_id: order._id })),
            { session: mongoSession }
        );
        await new orderStatusLogSchema({
            order_id: order._id,
            status_id: statusId,
            date: new Date(),
        }).save({ session: mongoSession });
        orders.push(order);
    }

    return orders;
}
