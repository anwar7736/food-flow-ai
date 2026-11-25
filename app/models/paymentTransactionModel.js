const { default: mongoose } = require("mongoose");

const paymentOrderItemModel = new mongoose.Schema({
    food_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
}, { _id: false });

const paymentOrderDraftModel = new mongoose.Schema({
    restaurant_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    delivery_partner_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    total: { type: Number, required: true },
    shipping_charge: { type: Number, required: true },
    items: { type: [paymentOrderItemModel], required: true },
}, { _id: false });

const paymentTransactionModel = new mongoose.Schema({
    transaction_id: { type: String, required: true, unique: true },
    checkout_id: { type: String, required: true, unique: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true, default: "BDT" },
    status: {
        type: String,
        enum: ["pending", "paid", "failed", "cancelled"],
        required: true,
        default: "pending",
    },
    validation_id: { type: String, default: null },
    status_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    billing_city: { type: String, required: true },
    billing_postcode: { type: String, required: true },
    order_draft: { type: [paymentOrderDraftModel], required: true },
    order_ids: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    gateway_url: { type: String, default: null },
}, { timestamps: true });

export const paymentTransactionSchema = mongoose.models.payment_transactions
    || mongoose.model("payment_transactions", paymentTransactionModel);
