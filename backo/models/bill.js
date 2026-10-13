const mongoose = require("mongoose");

const billSchema = new mongoose.Schema({

    billCount: {
        type: Number,
        default: 0
    },


    items: [
        {

            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product"
            },
            barcodeId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Barcode"
            },
            barcode: String,

            name: String,

            itemCode: {
                type: String,
                default: ""
            },

            hsnCode: {
                type: String,
                default: ""
            },

            discountAmount: {
                type: Number,
                default: 0
            },

            taxableAmount: {
                type: Number,
                default: 0
            },

            totalAmount: {
                type: Number,
                default: 0
            },

            unit: {
                type: String,
                enum: ["pcs", "kg", "g", "tin", "box"],
                default: "pcs"
            },

            unitValue: {
                type: Number,
                default: 1
            },
            unitText: String,

            totalkg: String,

            mrp: Number,

            retailPrice: {
                type: Number,
                default: 0
            },

            wholesalePrice: {
                type: Number,
                default: 0
            },

            selectedPriceType: {
                type: String,
                enum: ["retail", "wholesale"],
                default: "retail"
            },

            appliedPriceLevel: {
                type: String,
                default: "normal"
            },

            appliedSlab: {
                minQty: Number,
                maxQty: {
                    type: Number,
                    default: null
                },
                price: Number
            },

            price: Number,

            costPrice: {
                type: Number,
                default: 0
            },


            qty: {
                type: Number,
                default: 1
            },

            freeQty: {
                type: Number,
                default: 0
            },

            totalGivenQty: {
                type: Number,
                default: 0
            },

            gstRate: {
                type: mongoose.Schema.Types.Mixed,
                enum: [0, 5, 12, 18, 40, "none"]
            },
            gstAmount: Number,
            finalPrice: Number
        }
    ],

    invoiceNo: {
        type: String,
        sparse: true
    },

    summary: {
        subTotal: {
            type: Number,
            default: 0
        },

        totalGST: {
            type: Number,
            default: 0
        },

        itemDiscountAmount: {
            type: Number,
            default: 0
        },

        billDiscountAmount: {
            type: Number,
            default: 0
        },

        billDiscountPercentage: {
            type: Number,
            default: 0
        },

        discount: {
            type: Number,
            default: 0
        },

        grandTotal: {
            type: Number,
            default: 0
        }
    },

    offer: {
        offerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Offer"
        },
        offerName: String,
        discountAmount: {
            type: Number,
            default: 0
        }
    },

    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        default: null
    },

    payments: [
        {
            method: {
                type: String,
                enum: ["cash", "upi", "card", "cheque", "sodexo"]
            },
            amount: Number,

            details: {
                upiId: String,
                upiTransactionId: String,

                cardType: String,
                cardLast4: String,

                chequeNo: String,
                chequeDate: Date,
                bankName: String,
                accountHolder: String
            }
        }
    ],

    sodexoSales: {
        type: Number,
        default: 0
    },


    paymentMethod: {
        type: String,
        enum: ["cash", "upi", "card", "cheque", "sodexo", "split", "due"],
        default: "cash"
    },

    paymentStatus: {
        type: String,
        enum: ["paid", "partial", "due"],
        default: "paid"
    },

    paidAmount: {
        type: Number,
        default: 0
    },

    receivedAmount: {
        type: Number,
        default: 0
    },

    returnAmount: {
        type: Number,
        default: 0
    },

    pendingAmount: {
        type: Number,
        default: 0
    },

    role: {
        type: String,
        default: ""
    },

    superAdminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true
    },

    cashier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });


billSchema.index(
    { superAdminId: 1, invoiceNo: 1 },
    { unique: true }
);

module.exports = mongoose.models.Bill || mongoose.model("Bill", billSchema);

