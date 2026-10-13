const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        role: {
            type: String,
            enum: ["super_admin", "admin", "cashier"],
            required: true
        },

        module: {
            type: String,
            required: true
        },

        action: {
            type: String,
            required: true
        },

        documentId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        oldData: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        newData: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        superAdminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);