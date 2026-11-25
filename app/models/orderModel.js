const { default: mongoose } = require("mongoose");

const orderModel = new mongoose.Schema({
    "user_id": mongoose.Schema.Types.ObjectId,
    "restaurant_id": mongoose.Schema.Types.ObjectId,
    "delivery_partner_id": mongoose.Schema.Types.ObjectId,
    "date": Date,
    "invoice_no": String,
    "checkout_id": String,
    "checkout_total": Number,
    "checkout_order_count": Number,
    "total": Number,
    "shipping_charge": Number,
    "final_total": Number,
    "payment_method": {
        type: String,
        enum: ["cash_on_delivery", "sslcommerz"],
        default: "cash_on_delivery",
    },
    "payment_status": {
        type: String,
        enum: ["unpaid", "paid"],
        default: "unpaid",
    },
    "payment_transaction_id": { type: String, default: null },
    "status_id": mongoose.Schema.Types.ObjectId,
});

export const orderSchema = mongoose.models.orders
    || mongoose.model('orders', orderModel);