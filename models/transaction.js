const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const transactionSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        paymentType: {
            type: String,
            required: true,
        },
        currency: {
            type: String,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        courseId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        isRefund: {
            type: Boolean,
            required: true,
        },
        isSuccess: {
            type: Boolean,
            required: true,
        },
        status: {
            type: String,
            required: false,
        },
        coinbaseChargeId: {
            type: String,
            required: false,
        },
        error: {
            type: String,
            required: false,
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Transaction", transactionSchema);
