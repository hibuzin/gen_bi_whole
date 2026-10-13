
const mongoose = require("mongoose");

const barcodeSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            trim: true
        },

        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        purchaseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Purchase",
            default: null
        },

        superAdminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        cashierId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    { timestamps: true }
);



module.exports =
    mongoose.models.Barcode ||
    mongoose.model("Barcode", barcodeSchema);
