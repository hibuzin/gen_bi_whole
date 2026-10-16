const mongoose = require("mongoose");
const Bill = require("../models/bill");
const Offer = require("../models/offer");
const Session = require("../models/session");
const counter = require("../models/counter");
const Product = require("../models/product");
const Barcode = require("../models/barcode");
const Customer = require("../models/customer");
const PriceLevel = require("../models/price_level");
const DuePayment = require("../models/due_payment");
const { attachHierarchy } = require("../utils/hierarchy");
const CashRegister = require("../models/cashregister");

const AuditLog = require("../models/audit_log");

const getNextInvoiceNo = async (superAdminId) => {
    while (true) {
        const result = await counter.findOneAndUpdate(
            { name: `invoice_${superAdminId}` },
            { $inc: { seq: 1 } },
            {
                returnDocument: "after",
                upsert: true
            }
        );

        const invoiceNo = `INV-${String(result.seq).padStart(5, "0")}`;

        const existingBill = await Bill.findOne({
            invoiceNo,
            superAdminId
        });

        if (!existingBill) {
            return invoiceNo;
        }
    }
};

const getNextBillCount = async (superAdminId) => {
    const result = await counter.findOneAndUpdate(
        { name: `bill_count_${superAdminId}` },
        { $inc: { seq: 1 } },
        { returnDocument: "after", upsert: true }
    );

    return Number(result.seq);
};



exports.createBill = async (req, res) => {

    try {

        const {
            codes,
            items: billItems = [],
            isWalkInCustomer = false,
            customerId,
            redeemPoints = 0,

            priceType = "retail",

            priceLevel = "normal",

            discountPercent,
            discountAmount,

            paymentStatus = "paid",
            paymentMethod = "cash",
            details = {},

            payments = [],
            paidAmount = 0,
            receivedAmount = 0,
            dueDate
        } = req.body;

        if (
            (!Array.isArray(codes) || codes.length === 0) &&
            (!Array.isArray(billItems) || billItems.length === 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "No products provided"
            });
        }

        const hierarchy = attachHierarchy(req.user);


        if (!["retail", "wholesale"].includes(priceType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid priceType. Use retail or wholesale."
            });
        }

        const getSelectedPrice = (product, priceType) => {
            if (priceType === "retail") {
                return Number(product.retailPrice || 0);
            }

            if (priceType === "wholesale") {
                return Number(product.wholesalePrice || 0);
            }

            return 0;
        };

        const invoiceNo = await getNextInvoiceNo(hierarchy.superAdminId);

        const billCount = await getNextBillCount(hierarchy.superAdminId);


        let subTotal = 0;
        let totalGST = 0;
        let totalItemDiscount = 0;

        const items = [];

        const gstAuditItems = [];

        const codeQtyMap = {};

        for (const codeItem of codes || []) {

            const searchValue =
                typeof codeItem === "object"
                    ? String(codeItem.code || "").trim()
                    : String(codeItem).trim();

            if (!searchValue) continue;

            const customPrice =
                typeof codeItem === "object"
                    ? codeItem.price
                    : undefined;

            if (!codeQtyMap[searchValue]) {
                codeQtyMap[searchValue] = {
                    qty: 0,
                    price: customPrice
                };
            }

            codeQtyMap[searchValue].qty += 1;

            if (
                customPrice !== undefined &&
                customPrice !== null &&
                customPrice !== ""
            ) {
                codeQtyMap[searchValue].price = Number(customPrice);
            }
        }

        for (const [searchValue, codeData] of Object.entries(codeQtyMap)) {

            const qty = codeData.qty;
            const customPrice = codeData.price;


            let barcode = await Barcode.findOne({
                code: searchValue,
                superAdminId: hierarchy.superAdminId
            });

            let product = null;

            if (barcode) {
                product = await Product.findOne({
                    _id: barcode.productId,
                    superAdminId: hierarchy.superAdminId
                });
            }

            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Product not found for: ${searchValue}`
                });
            }

            const normalPrice = getSelectedPrice(product, priceType);

            if (normalPrice <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `${priceType === "retail" ? "Retail" : "Wholesale"} price not available for product: ${product.name}`
                });
            }

            let price =
                customPrice !== undefined &&
                    customPrice !== null &&
                    customPrice !== ""
                    ? Number(customPrice)
                    : normalPrice;

            if (isNaN(price) || price <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid price for product: ${product.name}`
                });
            }

            let slabPrice = null;
            let discountPerItem = 0;
            let totalDiscount = 0;

            let appliedPriceLevel = "normal";
            let appliedSlab = null;


            const rawGstRate = barcode?.gstRate ?? product.gstRate ?? "none";

            const isGstNone =
                String(rawGstRate).trim().toLowerCase() === "none";

            const gstRate = isGstNone
                ? "none"
                : Number(rawGstRate);

            const gstRateForCalculation = isGstNone
                ? 0
                : Number(rawGstRate);

            if (
                gstRate !== "none" &&
                (isNaN(gstRate) || gstRate < 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid GST rate for product: ${product.name}`
                });
            }
            const grossAmount = Number((price * qty).toFixed(2));



            const itemDiscountPercent = 0;
            const itemDiscountAmount = 0;

            let itemDiscount = 0;

            if (itemDiscountPercent > 0) {
                itemDiscount = Number(
                    ((grossAmount * itemDiscountPercent) / 100).toFixed(2)
                );
            } else if (itemDiscountAmount > 0) {
                itemDiscount = itemDiscountAmount;
            }

            totalItemDiscount += itemDiscount;

            const finalPrice = Number(
                (grossAmount - itemDiscount).toFixed(2)
            );

            const taxableAmount = Number(
                (
                    finalPrice /
                    (1 + gstRateForCalculation / 100)
                ).toFixed(2)
            );

            const gstAmount = Number((finalPrice - taxableAmount).toFixed(2));

            subTotal += taxableAmount;
            totalGST += gstAmount;

            items.push({
                productId: product._id,
                barcodeId: barcode?._id || null,
                barcode: barcode?.code || "",

                name: product.name || "",
                hsnCode: product.hsnCode || barcode.hsnCode || "",

                unit: barcode?.unit ?? product.unit ?? "pcs",

                unitValue: Number(
                    barcode?.unitValue ?? product.unitValue ?? 1
                ),

                unitText: `${barcode?.unitValue ?? product.unitValue ?? 1} ${barcode?.unit ?? product.unit ?? "pcs"
                    }`,

                totalkg: `${qty * Number(
                    barcode?.unitValue ?? product.unitValue ?? 1
                )} ${barcode?.unit ?? product.unit ?? "pcs"
                    }`,

                mrp: Number(barcode.mrp || 0),

                retailPrice:
                    priceType === "retail"
                        ? Number(price || 0)
                        : Number(product.retailPrice || 0),

                wholesalePrice:
                    priceType === "wholesale"
                        ? Number(price || 0)
                        : Number(product.wholesalePrice || 0),

                selectedPriceType: priceType,

                price: Number(price || 0),

                normalPrice: Number(normalPrice || 0),

                costPrice: Number(product.costPrice || 0),

                qty: Number(qty || 0),
                freeQty: 0,
                totalGivenQty: Number(qty || 0),

                appliedPriceLevel,
                appliedSlab,

                gstRate: gstRate,
                gstAmount: Number(gstAmount || 0),

                discountAmount: Number(itemDiscount || 0),
                taxableAmount: Number(taxableAmount || 0),
                totalAmount: Number(grossAmount || 0),
                finalPrice: Number(finalPrice || 0)
            });

            if (gstRate !== "none") {
                gstAuditItems.push({
                    productId: product._id,
                    productName: product.name || "",
                    barcode: barcode.code,
                    qty,
                    retailPrice:
                        priceType === "retail"
                            ? Number(price || 0)
                            : Number(product.retailPrice || 0),

                    wholesalePrice:
                        priceType === "wholesale"
                            ? Number(price || 0)
                            : Number(product.wholesalePrice || 0),

                    selectedPriceType: priceType,

                    price: Number(price || 0),

                    normalPrice: Number(normalPrice || 0),
                    gstRate,
                    gstAmount,
                    finalPrice
                });
            }

        }


        for (const billItem of billItems) {

            const qty = Number(billItem.qty || 1);

            let freeQty = 0;

            const buyGetOffer = await Offer.findOne({
                superAdminId: hierarchy.superAdminId,
                offerType: "buy_get",
                isActive: true,
                buyProductId: billItem.productId
            });


            if (buyGetOffer && qty >= buyGetOffer.buyQty) {
                freeQty =
                    Math.floor(qty / buyGetOffer.buyQty) *
                    buyGetOffer.freeQty;
            }

            const discountPercent = Number(billItem.discountPercent || 0);
            const discountAmount = Number(billItem.discountAmount || 0);




            if (isNaN(qty) || qty <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid quantity"
                });
            }

            const product = await Product.findOne({
                _id: billItem.productId,
                superAdminId: hierarchy.superAdminId
            });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            const barcode = await Barcode.findOne({
                productId: product._id,
                superAdminId: hierarchy.superAdminId
            });




            const defaultPrice = getSelectedPrice(product, priceType);

            if (defaultPrice <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `${priceType === "retail" ? "Retail" : "Wholesale"} price not available for product: ${product.name}`
                });
            }


            let price =
                billItem.price !== undefined &&
                    billItem.price !== null &&
                    billItem.price !== ""
                    ? Number(billItem.price)
                    : defaultPrice;

            if (isNaN(price) || price <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid price for product: ${product.name}`
                });
            }

            const normalPrice = defaultPrice;

            let slabPrice = null;
            let discountPerItem = 0;
            let totalDiscount = 0;

            let appliedPriceLevel = "normal";
            let appliedSlab = null;

            const productPriceLevel = await PriceLevel.findOne({
                productId: product._id,
                superAdminId: hierarchy.superAdminId,
                isActive: true
            });

            if (productPriceLevel && !hasBillSellingPrice) {

                if (
                    priceLevel === "manual" &&
                    productPriceLevel.pricingType === "manual"
                ) {

                    price = Number(productPriceLevel.manualPrice || price);
                    appliedPriceLevel = "manual";

                } else if (
                    priceLevel === "auto" &&
                    productPriceLevel.pricingType === "auto"
                ) {

                    const profitPercent =
                        Number(productPriceLevel.autoPricing?.profitPercent || 0);

                    const baseOn =
                        productPriceLevel.autoPricing?.baseOn || "costPrice";

                    const basePrice =
                        baseOn === "mrp"
                            ? Number(barcode.mrp || 0)
                            : Number(barcode.costPrice || 0);

                    price =
                        basePrice +
                        (basePrice * profitPercent / 100);

                    appliedPriceLevel = "auto";

                } else if (
                    priceLevel === "slab" &&
                    productPriceLevel.pricingType === "slab"
                ) {

                    const slab = productPriceLevel.slabs.find((s) => {

                        const minOk = qty >= Number(s.minQty || 0);

                        const maxOk =
                            s.maxQty === null ||
                            qty <= Number(s.maxQty);

                        return minOk && maxOk;
                    });

                    if (slab) {
                        slabPrice = Number(slab.price || normalPrice);

                        discountPerItem = Number(
                            (normalPrice - slabPrice).toFixed(2)
                        );

                        totalDiscount = Number((discountPerItem * qty).toFixed(2));

                        price = slabPrice;

                        appliedPriceLevel = "slab";
                        appliedSlab = {
                            minQty: slab.minQty,
                            maxQty: slab.maxQty,
                            slabPrice,
                            discountPerItem,
                            totalDiscount
                        };
                    }
                }
            }


            const rawGstRate = barcode?.gstRate ?? product.gstRate ?? "none";

            const isGstNone =
                String(rawGstRate).trim().toLowerCase() === "none";

            const gstRate = isGstNone
                ? "none"
                : Number(rawGstRate);

            const gstRateForCalculation = isGstNone
                ? 0
                : Number(rawGstRate);

            if (
                gstRate !== "none" &&
                (isNaN(gstRate) || gstRate < 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid GST rate for product: ${product.name}`
                });
            }

            if (price <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid selling price for product: ${product.name}`
                });

            }

            const grossAmount = Number((price * qty).toFixed(2));



            let itemDiscount = 0;

            if (Number(discountPercent) > 0) {
                itemDiscount = Number(
                    ((grossAmount * Number(discountPercent)) / 100).toFixed(2)
                );
            }
            else if (Number(discountAmount) > 0) {
                itemDiscount = Number(discountAmount);
            }

            let calculatedDiscountPercent = discountPercent;

            if (
                calculatedDiscountPercent === 0 &&
                itemDiscount > 0 &&
                grossAmount > 0
            ) {
                calculatedDiscountPercent = Number(
                    ((itemDiscount / grossAmount) * 100).toFixed(2)
                );
            }

            totalItemDiscount += itemDiscount;

            const finalPrice = Number(
                (grossAmount - itemDiscount).toFixed(2)
            );

            const taxableAmount = Number(
                (finalPrice / (1 + gstRateForCalculation / 100)).toFixed(2)
            );
            const gstAmount = Number((finalPrice - taxableAmount).toFixed(2));


            subTotal += taxableAmount;
            totalGST += gstAmount;

            items.push({
                productId: product._id,


                barcodeId: barcode?._id || null,
                barcode: barcode?.code || "",

                name: product.name || "",
                hsnCode: product.hsnCode || barcode?.hsnCode || "",

                unit: barcode?.unit ?? product.unit ?? "pcs",

                unitValue: Number(
                    barcode?.unitValue ?? product.unitValue ?? 1
                ),

                unitText: `${barcode?.unitValue ?? product.unitValue ?? 1
                    } ${barcode?.unit ?? product.unit ?? "pcs"
                    }`,

                totalkg: `${qty * Number(
                    barcode?.unitValue ?? product.unitValue ?? 1
                )
                    } ${barcode?.unit ?? product.unit ?? "pcs"
                    }`,

                mrp: Number(
                    barcode?.mrp ?? product.mrp ?? 0
                ),

                retailPrice:
                    priceType === "retail"
                        ? Number(price || 0)
                        : Number(product.retailPrice || 0),

                wholesalePrice:
                    priceType === "wholesale"
                        ? Number(price || 0)
                        : Number(product.wholesalePrice || 0),

                selectedPriceType: priceType,

                price: Number(price || 0),

                normalPrice: Number(normalPrice || 0),

                costPrice: Number(product.costPrice || 0),

                qty: Number(qty || 0),
                freeQty: Number(freeQty || 0),

                totalGivenQty: Number(qty + freeQty),

                appliedPriceLevel,

                appliedSlab: appliedSlab
                    ? {
                        minQty: Number(appliedSlab.minQty || 0),

                        maxQty:
                            appliedSlab.maxQty !== null &&
                                appliedSlab.maxQty !== undefined
                                ? Number(appliedSlab.maxQty)
                                : null,


                        price: Number(
                            appliedSlab.slabPrice ||
                            appliedSlab.price ||
                            price ||
                            0
                        )
                    }
                    : null,

                gstRate: gstRate,
                gstAmount: Number(gstAmount || 0),

                discountAmount: Number(itemDiscount || 0),
                taxableAmount: Number(taxableAmount || 0),
                totalAmount: Number(grossAmount || 0),
                finalPrice: Number(finalPrice || 0)
            });


            if (gstRate !== "none") {
                gstAuditItems.push({
                    productId: product._id,
                    productName: product.name || "",
                    barcode: barcode?.code || "",
                    qty,
                    price,
                    gstRate,
                    gstAmount,
                    finalPrice
                });
            }



            const availableStock =
                Number(product.stock || 0) -
                Number(product.reservedStock || 0);

            if (availableStock < qty + freeQty) {
                return res.status(400).json({
                    success: false,
                    message: `${product.name} stock not available`
                });
            }


            const stockUpdate = await Product.updateOne(
                {
                    _id: product._id,
                    superAdminId: hierarchy.superAdminId,
                    stock: { $gte: qty + freeQty }
                },
                {
                    $inc: {
                        stock: -(qty + freeQty)
                    }
                }

            );

            if (stockUpdate.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: `${product.name} stock update failed`
                });
            }
        }



        const beforeBillDiscount = Number(
            (subTotal + totalGST).toFixed(2)
        );

        let billDiscount = 0;
        let billDiscountPercentage = 0;

        if (Number(discountPercent) > 0) {

            billDiscount = Number(
                (
                    beforeBillDiscount *
                    Number(discountPercent) /
                    100
                ).toFixed(2)
            );

            billDiscountPercentage = Number(discountPercent);

        } else if (Number(discountAmount) > 0) {

            billDiscount = Number(discountAmount);

            billDiscountPercentage = Number(
                (
                    billDiscount /
                    beforeBillDiscount *
                    100
                ).toFixed(2)
            );
        }


        let discount = 0;
        let customer = null;

        if (!isWalkInCustomer) {

            if (!customerId) {
                return res.status(400).json({
                    success: false,
                    message: "Customer is required or select Walk in Customer."
                });
            }

            customer = await Customer.findOne({
                customerId,
                superAdminId: hierarchy.superAdminId
            });

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found"
                });
            }

            if (Number(redeemPoints) > 0) {
                if (customer.loyaltyPoints < Number(redeemPoints)) {
                    return res.status(400).json({
                        success: false,
                        message: "Not enough loyalty points"
                    });
                }

                discount = Number(redeemPoints);
                customer.loyaltyPoints -= discount;
            }
        } else {

            customer = null;
        }



        let grandTotal = Number(
            (
                subTotal +
                totalGST -
                billDiscount -
                discount
            ).toFixed(2)
        );

        let offer = null;
        let offerDiscount = 0;
        let appliedOffer = null;



        offer = await Offer.findOne({
            superAdminId: hierarchy.superAdminId,
            isActive: true,
            minimumPurchase: { $lte: grandTotal }
        })
            .sort({ minimumPurchase: -1 });



        if (offer) {

            if (offer.discountType === "amount") {

                offerDiscount = Number(offer.discountValue);

            } else {

                offerDiscount = Number(
                    (
                        grandTotal *
                        offer.discountValue /
                        100
                    ).toFixed(2)
                );
            }

            appliedOffer = offer.offerName;
        }

        grandTotal = Number(
            (grandTotal - offerDiscount).toFixed(2)
        );

        const roundedGrandTotal = Math.round(grandTotal);

        const roundOff = Number(
            (roundedGrandTotal - grandTotal).toFixed(2)
        );

        let finalPayments = [];

        if (paymentStatus === "due" || paymentStatus === "partial") {

            if (payments.length > 0) {
                finalPayments = payments;
            } else if (Number(paidAmount) > 0) {
                finalPayments = [
                    {
                        method: paymentMethod,
                        amount: Number(paidAmount)
                    }
                ];
            }

        } else if (paymentMethod === "split") {

            finalPayments = payments;

        } else {
            if (payments.length > 0) {
                finalPayments = payments;
            } else {
                finalPayments = [
                    {
                        method: paymentMethod,
                        amount: roundedGrandTotal,
                        details
                    }
                ];
            }
        }

        const allowedMethods = ["cash", "upi", "card", "cheque", "sodexo"];

        for (const pay of finalPayments) {

            if (!allowedMethods.includes(pay.method)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment method"
                });
            }

            const totalPaid = Number(
                finalPayments.reduce(
                    (sum, pay) => sum + Number(pay.amount || 0),
                    0
                ).toFixed(2)
            );

            if (Number(pay.amount || 0) <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment amount"
                });
            }


            if (pay.method === "cheque") {

                if (!pay.details) {
                    return res.status(400).json({
                        success: false,
                        message: "Cheque details are required"
                    });
                }

                const {
                    chequeNo,
                    chequeDate,
                    bankName,
                    accountHolder
                } = pay.details;

                if (
                    !chequeNo ||
                    !chequeDate ||
                    !bankName ||
                    !accountHolder
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Complete cheque details are required"
                    });
                }
            }
        }


        const totalPaid = Number(
            finalPayments.reduce(
                (sum, pay) => sum + Number(pay.amount || 0),
                0
            ).toFixed(2)
        );


        const finalReceivedAmount = Number(
            receivedAmount || totalPaid || 0
        );

        const returnAmount =
            paymentStatus === "paid" &&
                paymentMethod === "cash"
                ? Number(
                    Math.max(
                        finalReceivedAmount - grandTotal,
                        0
                    ).toFixed(2)
                )
                : 0;


        let pendingAmount = 0;

        if (paymentStatus === "paid") {
            if (
                paymentMethod === "cash" &&
                finalReceivedAmount < roundedGrandTotal
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Received amount is less than grand total"
                });
            }

            if (
                paymentMethod !== "cash" &&
                totalPaid !== roundedGrandTotal
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Paid amount must equal grand total"
                });
            }
        }

        if (paymentStatus === "partial") {
            if (!customer) {
                return res.status(400).json({
                    success: false,
                    message: "Customer required for partial payment"
                });
            }

            if (totalPaid <= 0 || totalPaid >= roundedGrandTotal) {
                return res.status(400).json({
                    success: false,
                    message: "Partial paid amount must be less than grand total"
                });
            }

            pendingAmount = Number((roundedGrandTotal - totalPaid).toFixed(2));
        }

        if (paymentStatus === "due") {
            if (!customer) {
                return res.status(400).json({
                    success: false,
                    message: "Customer required for due payment"
                });
            }

            pendingAmount = Number(
                (roundedGrandTotal - totalPaid).toFixed(2)
            );
        }

        const earnedPoints = Math.floor(roundedGrandTotal / 100);

        if (customer) {
            customer.loyaltyPoints += earnedPoints;
            customer.totalSpent += roundedGrandTotal;
            await customer.save();
        }


        const bill = await Bill.create({

            billCount,

            items,
            summary: {
                subTotal,
                totalGST,

                itemDiscountAmount: totalItemDiscount,
                billDiscountAmount: billDiscount,
                billDiscountPercentage,

                discount,
                roundOff,
                grandTotal: roundedGrandTotal
            },


            offer: {
                offerId: offer?._id || null,
                offerName: appliedOffer,
                discountAmount: offerDiscount
            },

            invoiceNo,
            customerId: customer ? customer._id : null,

            paymentMethod: finalPayments.length > 1 ? "split" : finalPayments[0]?.method || "due",
            paymentStatus,
            payments: finalPayments,

            paidAmount:
                paymentStatus === "paid"
                    ? roundedGrandTotal
                    : totalPaid,

            receivedAmount:
                paymentMethod === "cash"
                    ? finalReceivedAmount
                    : totalPaid,

            returnAmount,

            pendingAmount,

            cashier: req.user.userId || req.user.id,
            createdBy: req.user.userId || req.user.id,

            role: req.user.role,
            ...hierarchy
        });

        const hasGSTItems =
            Array.isArray(gstAuditItems) &&
            gstAuditItems.length > 0;

        if (hasGSTItems) {
            await AuditLog.create({
                ...hierarchy,

                userId: req.user.userId || req.user.id,
                role: req.user.role,

                module: "Bill",
                action: "Create",

                documentId: bill._id,
                oldData: null,

                newData: {
                    invoiceNo: bill.invoiceNo || "",
                    invoiceDate: bill.createdAt || new Date(),

                    customerId: customer?._id || null,
                    customerName: customer?.name || "Walk-in Customer",

                    customerGstNumber:
                        customer?.gstNumber ||
                        customer?.gstnumber ||
                        customer?.gstin ||
                        "",

                    placeOfSupply:
                        customer?.state ||
                        customer?.placeOfSupply ||
                        "",

                    items: bill.items
                        .filter(
                            (item) =>
                                item.gstRate !== "none" &&
                                item.gstRate !== null &&
                                item.gstRate !== undefined &&
                                !isNaN(Number(item.gstRate))
                        )
                        .map((item) => {
                            const qty = Number(item.qty || 0);
                            const freeQty = Number(item.freeQty || 0);

                            const rate = Number(item.price || 0);
                            const gstRate = Number(item.gstRate || 0);
                            const gstAmount = Number(item.gstAmount || 0);
                            const finalAmount = Number(item.finalPrice || 0);

                            const taxableAmount = Number(
                                Number(
                                    item.taxableAmount ??
                                    Math.max(0, finalAmount - gstAmount)
                                ).toFixed(2)
                            );

                            return {
                                productId: item.productId || null,
                                barcodeId: item.barcodeId || null,

                                itemName: item.name || "",
                                hsnCode: item.hsnCode || "",
                                barcode: item.barcode || "",

                                qty,
                                freeQty,

                                totalGivenQty: Number(
                                    item.totalGivenQty ?? (qty + freeQty)
                                ),

                                unit: item.unit || "pcs",
                                unitValue: Number(item.unitValue || 1),
                                unitText: item.unitText || "",
                                totalKg: item.totalkg || "",

                                mrp: Number(item.mrp || 0),
                                rate,

                                retailPrice: Number(item.retailPrice || 0),

                                wholesalePrice: Number(item.wholesalePrice || 0),

                                selectedPriceType: item.selectedPriceType || priceType,

                                price: Number(item.price ?? 0),

                                appliedPriceLevel:
                                    item.appliedPriceLevel || "normal",

                                appliedSlab:
                                    item.appliedPriceLevel === "slab" &&
                                        Number(item.appliedSlab?.price || 0) > 0
                                        ? {
                                            minQty: Number(
                                                item.appliedSlab?.minQty || 0
                                            ),

                                            maxQty:
                                                item.appliedSlab?.maxQty !== null &&
                                                    item.appliedSlab?.maxQty !== undefined
                                                    ? Number(item.appliedSlab.maxQty)
                                                    : null,

                                            price: Number(
                                                item.appliedSlab?.price || 0
                                            )
                                        }
                                        : null,

                                gstRate,

                                cgstRate: Number(
                                    (gstRate / 2).toFixed(2)
                                ),

                                sgstRate: Number(
                                    (gstRate / 2).toFixed(2)
                                ),

                                gstAmount,

                                cgstAmount: Number(
                                    (gstAmount / 2).toFixed(2)
                                ),

                                sgstAmount: Number(
                                    (gstAmount / 2).toFixed(2)
                                ),

                                discountAmount: Number(
                                    item.discountAmount || 0
                                ),

                                taxableAmount,

                                totalAmount: Number(
                                    item.totalAmount || 0
                                ),

                                finalAmount,

                                itemTotalAmount: Number(
                                    finalAmount.toFixed(2)
                                )
                            };
                        }),

                    summary: {
                        subTotal: Number(
                            bill.summary?.subTotal || 0
                        ),

                        totalGST: Number(
                            bill.summary?.totalGST || 0
                        ),

                        itemDiscountAmount: Number(
                            bill.summary?.itemDiscountAmount || 0
                        ),

                        billDiscountAmount: Number(
                            bill.summary?.billDiscountAmount || 0
                        ),

                        billDiscountPercentage: Number(
                            bill.summary?.billDiscountPercentage || 0
                        ),

                        loyaltyDiscount: Number(
                            bill.summary?.discount || 0
                        ),

                        grandTotal: Number(
                            bill.summary?.grandTotal || 0
                        )
                    },

                    offer: {
                        offerId: bill.offer?.offerId || null,
                        offerName: bill.offer?.offerName || "",
                        discountAmount: Number(
                            bill.offer?.discountAmount || 0
                        )
                    },

                    paidAmount: Number(
                        bill.paidAmount || 0
                    ),

                    pendingAmount: Number(
                        bill.pendingAmount || 0
                    ),

                    paymentMethod:
                        bill.paymentMethod || "due",

                    paymentStatus:
                        bill.paymentStatus || "due",

                    payments: (bill.payments || []).map((payment) => ({
                        method: payment.method || "",
                        amount: Number(payment.amount || 0),

                        details: {
                            upiId: payment.details?.upiId || "",
                            cardType: payment.details?.cardType || "",
                            cardLast4: payment.details?.cardLast4 || "",

                            chequeNo:
                                payment.details?.chequeNo || "",

                            chequeDate:
                                payment.details?.chequeDate || null,

                            bankName:
                                payment.details?.bankName || "",

                            accountHolder:
                                payment.details?.accountHolder || ""
                        }
                    }))
                }

            });
        }


        const cgst = Number((totalGST / 2).toFixed(2));
        const sgst = Number((totalGST / 2).toFixed(2));

        return res.status(201).json({
            success: true,
            message: "Bill generated successfully",
            data: {
                billId: bill._id,

                billCount: Number(
                    bill.billCount || 0
                ),

                invoiceNo: bill.invoiceNo,

                invoiceDate: new Date().toLocaleDateString("en-GB"),

                invoiceTime: new Date().toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }),

                customer: customer
                    ? {
                        customerId: customer.customerId,
                        customerName: customer.name,
                        mobile: customer.phone || ""
                    }
                    : {
                        customerId: null,
                        customerName: "Walk in Customer",
                        mobile: ""
                    },

                paymentMethod: bill.paymentMethod,
                paymentStatus: bill.paymentStatus,

                payments: finalPayments,

                paidAmount:
                    paymentStatus === "paid"
                        ? roundedGrandTotal
                        : totalPaid,

                receivedAmount:
                    paymentMethod === "cash"
                        ? finalReceivedAmount
                        : totalPaid,

                returnAmount,

                pendingAmount,

                items,

                summary: {
                    totalAmount: Number((subTotal + totalGST + totalItemDiscount).toFixed(2)),
                    subTotal: Number(subTotal.toFixed(2)),
                    cgst,
                    sgst,
                    totalGST: Number(totalGST.toFixed(2)),

                    itemDiscountAmount: Number(totalItemDiscount.toFixed(2)),

                    billDiscountAmount: Number(billDiscount.toFixed(2)),

                    billDiscountPercentage,

                    totalDiscount: Number(
                        (totalItemDiscount + billDiscount).toFixed(2)
                    ),

                    offerName: appliedOffer,
                    offerAmount: offerDiscount,
                    loyaltyDiscount: discount,

                    actualGrandTotal: grandTotal,
                    roundOff,
                    grandTotal: roundedGrandTotal
                },

                loyalty: {
                    used: discount,
                    earned: earnedPoints,
                    remaining: customer ? customer.loyaltyPoints : 0
                }
            }
        });

    } catch (error) {
        console.error("BILL ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


exports.calculateBill = async (req, res) => {
    try {
        const {
            codes,
            items: billItems = [],
            customerId,
            redeemPoints = 0,

            priceType = "retail",

            loyaltyPoints = 0,
            priceLevel = "normal",
            discountPercent = 0,
            discountAmount = 0,
            receivedAmount = 0
        } = req.body;

        const pointsToRedeem = Number(redeemPoints || loyaltyPoints || 0);

        if (
            (!Array.isArray(codes) || codes.length === 0) &&
            (!Array.isArray(billItems) || billItems.length === 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "No products provided"
            });
        }

        const hierarchy = attachHierarchy(req.user);


        const getSelectedPrice = (product, priceType) => {
            if (priceType === "retail") {
                return Number(product.retailPrice || 0);
            }

            if (priceType === "wholesale") {
                return Number(product.wholesalePrice || 0);
            }

            return null;
        };

        if (!["retail", "wholesale"].includes(priceType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid priceType. Use retail or wholesale."
            });
        }

        let subTotal = 0;
        let totalGST = 0;
        let totalItemDiscount = 0;
        const items = [];

        const codeQtyMap = {};

        for (const codeItem of codes || []) {

            const searchValue =
                typeof codeItem === "object"
                    ? String(codeItem.code || "").trim()
                    : String(codeItem).trim();

            if (!searchValue) continue;

            const customPrice =
                typeof codeItem === "object"
                    ? codeItem.price
                    : undefined;

            if (!codeQtyMap[searchValue]) {
                codeQtyMap[searchValue] = {
                    qty: 0,
                    price: customPrice
                };
            }

            codeQtyMap[searchValue].qty += 1;

            // If price is provided, keep it
            if (
                customPrice !== undefined &&
                customPrice !== null &&
                customPrice !== ""
            ) {
                codeQtyMap[searchValue].price = Number(customPrice);
            }
        }

        for (const [searchValue, codeData] of Object.entries(codeQtyMap)) {

            const qty = codeData.qty;
            const customPrice = codeData.price;

            let freeQty = 0;

            const barcode = await Barcode.findOne({
                code: searchValue,
                superAdminId: hierarchy.superAdminId
            });




            const product = await Product.findOne({
                _id: barcode.productId,
                superAdminId: hierarchy.superAdminId
            });

            if (!product) {
                return res.status(400).json({ success: false, message: `Product not found for: ${searchValue}` });

            }


            const availableStock =
                Number(product.stock || 0) -
                Number(product.reservedStock || 0);

            if (availableStock < qty) {
                return res.status(400).json({
                    success: false,
                    message: `${product.name} stock not available`
                });
            }

            const defaultPrice = getSelectedPrice(product, priceType);

            if (defaultPrice <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `${priceType === "retail" ? "Retail" : "Wholesale"} price not available for product: ${product.name}`
                });
            }

            let price =
                customPrice !== undefined &&
                    customPrice !== null &&
                    customPrice !== ""
                    ? Number(customPrice)
                    : defaultPrice;

            if (isNaN(price) || price <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid price for product: ${product.name}`
                });
            }

            const rawGstRate = barcode?.gstRate ?? product.gstRate ?? "none";

            const isGstNone =
                String(rawGstRate).trim().toLowerCase() === "none";

            const gstRate = isGstNone
                ? "none"
                : Number(rawGstRate) || 0;

            const gstRateForCalculation = isGstNone
                ? 0
                : Number(rawGstRate) || 0;


            const grossAmount = Number((price * qty).toFixed(2));
            let itemDiscount = 0;
            let finalDiscountPercent = 0;

            if (Number(discountPercent) > 0 && Number(discountAmount) > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Provide either discountPercent or discountAmount, not both."
                });
            }

            if (Number(discountPercent) > 0) {
                finalDiscountPercent = Number(
                    Number(discountPercent).toFixed(2)
                );

                itemDiscount = Number(
                    ((grossAmount * finalDiscountPercent) / 100).toFixed(2)
                );
            }
            else if (Number(discountAmount) > 0) {
                if (Number(discountAmount) > grossAmount) {
                    return res.status(400).json({
                        success: false,
                        message: "Discount amount cannot exceed item amount."
                    });
                }

                itemDiscount = Number(
                    Number(discountAmount).toFixed(2)
                );

                finalDiscountPercent = Number(
                    ((itemDiscount / grossAmount) * 100).toFixed(2)
                );
            }
            totalItemDiscount += itemDiscount;

            const finalPrice = Number(
                (grossAmount - itemDiscount).toFixed(2)
            );

            const taxableAmount = Number(
                (finalPrice / (1 + gstRateForCalculation / 100)).toFixed(2)
            );

            const gstAmount = Number((finalPrice - taxableAmount).toFixed(2));

            subTotal += taxableAmount;
            totalGST += gstAmount;

            items.push({
                productId: product._id,
                barcodeId: barcode._id,
                barcode: barcode.code,

                productName: product.name || "",
                name: product.name || "",

                totalAmount: grossAmount,
                discountPercent: Number(discountPercent || 0),
                discountAmount: itemDiscount,
                finalPrice,

                unit: barcode.unit || product.unit || "pcs",
                unitValue: barcode.unitValue || product.unitValue || 1,
                unitText: `${barcode.unitValue || product.unitValue || 1} ${barcode.unit || product.unit || "pcs"}`,

                totalUnitQty:
                    qty * Number(barcode.unitValue || product.unitValue || 1),

                totalUnitText:
                    `${qty * Number(barcode.unitValue || product.unitValue || 1)} ${barcode.unit || product.unit || "pcs"}`,

                qty,
                freeQty,
                totalGivenQty: qty + freeQty,

                mrp: barcode.mrp || 0,

                retailPrice:
                    priceType === "retail"
                        ? Number(price || 0)
                        : Number(product.retailPrice || 0),

                wholesalePrice:
                    priceType === "wholesale"
                        ? Number(price || 0)
                        : Number(product.wholesalePrice || 0),

                selectedPriceType: priceType,

                price: Number(price || 0),

                normalPrice: Number(normalPrice || 0),

                appliedPriceLevel: "normal",
                appliedSlab: null,

                gstRate,
                gstAmount
            });
        }


        for (const billItem of billItems) {

            const qty = Number(billItem.qty || 1);

            let freeQty = 0;

            const buyGetOffer = await Offer.findOne({
                superAdminId: hierarchy.superAdminId,
                offerType: "buy_get",
                isActive: true,
                buyProductId: billItem.productId
            });

            if (buyGetOffer && qty >= buyGetOffer.buyQty) {
                freeQty =
                    Math.floor(qty / buyGetOffer.buyQty) *
                    buyGetOffer.freeQty;
            }

            const itemDiscountPercent = Number(
                billItem.discountPercent || 0
            );

            const itemDiscountAmount = Number(
                billItem.discountAmount || 0
            );

            if (isNaN(qty) || qty <= 0) {
                return res.status(400).json({ success: false, message: "Invalid quantity" });
            }

            const product = await Product.findOne({
                _id: billItem.productId,
                superAdminId: hierarchy.superAdminId
            });

            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }

            const barcode = await Barcode.findOne({
                productId: product._id,
                superAdminId: hierarchy.superAdminId
            });

            const defaultPrice = getSelectedPrice(product, priceType);

            if (defaultPrice <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `${priceType === "retail" ? "Retail" : "Wholesale"} price not available for product: ${product.name}`
                });
            }

            // Use bill-entered price if provided,
            // otherwise use product's default retail/wholesale price
            let price =
                billItem.price !== undefined &&
                    billItem.price !== null &&
                    billItem.price !== ""
                    ? Number(billItem.price)
                    : defaultPrice;

            if (isNaN(price) || price <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid price for product: ${product.name}`
                });
            }

            const normalPrice = defaultPrice;


            let appliedPriceLevel = "normal";
            let appliedSlab = null;
            let discountPerItem = 0;
            let totalDiscount = 0;

            const productPriceLevel = await PriceLevel.findOne({
                productId: product._id,
                superAdminId: hierarchy.superAdminId,
                isActive: true
            });


            if (productPriceLevel) {
                if (priceLevel === "manual" && productPriceLevel.pricingType === "manual") {
                    price = Number(productPriceLevel.manualPrice || price);
                    appliedPriceLevel = "manual";
                } else if (priceLevel === "auto" && productPriceLevel.pricingType === "auto") {
                    const profitPercent = Number(productPriceLevel.autoPricing?.profitPercent || 0);
                    const baseOn = productPriceLevel.autoPricing?.baseOn || "costPrice";

                    const basePrice =
                        baseOn === "mrp"
                            ? Number(
                                barcode?.mrp ??
                                product.mrp ??
                                0
                            )
                            : Number(
                                barcode?.costPrice ??
                                product.costPrice ??
                                0
                            );

                    price = basePrice + (basePrice * profitPercent / 100);
                    appliedPriceLevel = "auto";
                } else if (priceLevel === "slab" && productPriceLevel.pricingType === "slab") {
                    const slab = productPriceLevel.slabs.find((s) => {
                        const minOk = qty >= Number(s.minQty || 0);
                        const maxOk = s.maxQty === null || qty <= Number(s.maxQty);
                        return minOk && maxOk;
                    });

                    if (slab) {
                        const slabPrice = Number(slab.price || normalPrice);

                        discountPerItem = Number(
                            (normalPrice - slabPrice).toFixed(2)
                        );

                        totalDiscount = Number((discountPerItem * qty).toFixed(2));
                        price = slabPrice;
                        appliedPriceLevel = "slab";
                        appliedSlab = {
                            minQty: slab.minQty,
                            maxQty: slab.maxQty,
                            price: slabPrice
                        };
                    }
                }
            }

            if (price <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `${priceType === "retail" ? "Retail" : "Wholesale"} price not available for product: ${product.name}`
                });
            }



            const rawGstRate =
                barcode?.gstRate ??
                product.gstRate ??
                "none";

            const isGstNone =
                String(rawGstRate).trim().toLowerCase() === "none";

            const gstRate = isGstNone
                ? "none"
                : Number(rawGstRate) || 0;

            const gstRateForCalculation = isGstNone
                ? 0
                : Number(rawGstRate) || 0;

            const grossAmount = Number((price * qty).toFixed(2));

            let itemDiscount = 0;
            let finalDiscountPercent = 0;

            if (itemDiscountPercent > 0 && itemDiscountAmount > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Provide either discountPercent or discountAmount, not both."
                });
            }

            if (itemDiscountPercent > 0) {
                finalDiscountPercent = Number(itemDiscountPercent.toFixed(2));

                itemDiscount = Number(
                    ((grossAmount * finalDiscountPercent) / 100).toFixed(2)
                );
            }
            else if (itemDiscountAmount > 0) {

                if (itemDiscountAmount > grossAmount) {
                    return res.status(400).json({
                        success: false,
                        message: "Discount amount cannot exceed item amount."
                    });
                }

                itemDiscount = Number(itemDiscountAmount.toFixed(2));

                finalDiscountPercent = Number(
                    ((itemDiscount / grossAmount) * 100).toFixed(2)
                );
            }

            totalItemDiscount += itemDiscount;

            const finalPrice = Number(
                (grossAmount - itemDiscount).toFixed(2)
            );

            const taxableAmount = Number(
                (finalPrice / (1 + gstRateForCalculation / 100)).toFixed(2)
            );

            const gstAmount = Number((finalPrice - taxableAmount).toFixed(2));

            subTotal += taxableAmount;
            totalGST += gstAmount;

            items.push({
                productId: product._id,
                barcodeId: barcode?._id,
                barcode: barcode?.code,

                productName: product.name || "",
                name: product.name || "",

                totalAmount: grossAmount,
                discountPercent: itemDiscountPercent,
                discountAmount: itemDiscount,
                finalPrice,

                unit: barcode?.unit || product.unit || "pcs",
                unitValue: barcode?.unitValue || product.unitValue || 1,
                unitText: `${barcode?.unitValue || product.unitValue || 1} ${barcode?.unit || product.unit || "pcs"}`,

                totalUnitQty:
                    qty * Number(barcode?.unitValue || product.unitValue || 1),

                totalUnitText:
                    `${qty * Number(barcode?.unitValue || product.unitValue || 1)} ${barcode?.unit || product.unit || "pcs"}`,

                qty,
                freeQty,
                totalGivenQty: qty + freeQty,

                mrp: barcode?.mrp || 0,

                retailPrice:
                    priceType === "retail"
                        ? Number(price || 0)
                        : Number(product.retailPrice || 0),

                wholesalePrice:
                    priceType === "wholesale"
                        ? Number(price || 0)
                        : Number(product.wholesalePrice || 0),

                selectedPriceType: priceType,

                price: Number(price || 0),

                normalPrice: Number(normalPrice || 0),

                slabPrice:
                    appliedPriceLevel === "slab"
                        ? price
                        : null,

                discountPerItem,
                totalDiscount,

                appliedPriceLevel,
                appliedSlab,

                gstRate,
                gstAmount
            });
        }

        const beforeBillDiscount = Number(
            (subTotal + totalGST).toFixed(2)
        );

        let billDiscountAmount = 0;
        let billDiscountPercentage = 0;

        if (
            Number(discountPercent) > 0 &&
            Number(discountAmount) > 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Provide either bill discountPercent or discountAmount, not both."
            });
        }

        if (Number(discountPercent) > 0) {
            billDiscountPercentage = Number(
                Number(discountPercent).toFixed(2)
            );

            billDiscountAmount = Number(
                (
                    beforeBillDiscount *
                    billDiscountPercentage /
                    100
                ).toFixed(2)
            );
        }
        else if (Number(discountAmount) > 0) {
            billDiscountAmount = Number(
                Number(discountAmount).toFixed(2)
            );

            if (billDiscountAmount > beforeBillDiscount) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Bill discount cannot exceed bill amount."
                });
            }

            billDiscountPercentage =
                beforeBillDiscount > 0
                    ? Number(
                        (
                            billDiscountAmount /
                            beforeBillDiscount *
                            100
                        ).toFixed(2)
                    )
                    : 0;
        }

        let loyaltyDiscount = 0;
        let customer = null;

        if (customerId) {

            customer = await Customer.findOne({
                customerId,
                superAdminId: hierarchy.superAdminId
            });

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found"
                });
            }

            if (pointsToRedeem > 0) {

                if (customer.loyaltyPoints < pointsToRedeem) {
                    return res.status(400).json({
                        success: false,
                        message: "Not enough loyalty points"
                    });
                }

                loyaltyDiscount = pointsToRedeem;
            }
        }


        let grandTotal = Number(
            (
                subTotal +
                totalGST -
                billDiscountAmount -
                loyaltyDiscount
            ).toFixed(2)
        );

        let offer = null;
        let offerDiscount = 0;
        let appliedOffer = null;

        offer = await Offer.findOne({
            superAdminId: hierarchy.superAdminId,
            isActive: true,
            offerType: "bill",
            minimumPurchase: { $lte: grandTotal }
        }).sort({ minimumPurchase: -1 });




        if (offer) {

            if (offer.discountType === "amount") {

                offerDiscount = Number(offer.discountValue);

            } else {

                offerDiscount = Number(
                    (
                        grandTotal *
                        offer.discountValue /
                        100
                    ).toFixed(2)
                );
            }

            if (offerDiscount > grandTotal) {
                offerDiscount = grandTotal;
            }

            appliedOffer = offer.offerName;

            grandTotal = Number(
                (grandTotal - offerDiscount).toFixed(2)
            );
        }

        const roundedGrandTotal = Math.round(grandTotal);

        const roundOff = Number(
            (roundedGrandTotal - grandTotal).toFixed(2)
        );

        const cgst = Number((totalGST / 2).toFixed(2));
        const sgst = Number((totalGST / 2).toFixed(2));
        const earnedPoints = Math.floor(roundedGrandTotal / 100);

        let changeAmount = 0;

        if (Number(receivedAmount) > 0) {

            changeAmount = Number(
                Math.max(
                    Number(receivedAmount) - roundedGrandTotal,
                    0
                ).toFixed(2)
            );

        }

        return res.status(200).json({
            success: true,
            message: "Bill calculated successfully",
            data: {
                items,
                summary: {
                    totalAmount: Number(
                        (
                            subTotal +
                            totalGST +
                            totalItemDiscount
                        ).toFixed(2)
                    ),

                    subTotal: Number(subTotal.toFixed(2)),
                    cgst,
                    sgst,
                    totalGST: Number(totalGST.toFixed(2)),

                    itemDiscountAmount: Number(
                        totalItemDiscount.toFixed(2)
                    ),

                    billDiscountAmount: Number(
                        billDiscountAmount.toFixed(2)
                    ),

                    billDiscountPercentage,

                    totalDiscount: Number(
                        (
                            totalItemDiscount +
                            billDiscountAmount
                        ).toFixed(2)
                    ),

                    loyaltyDiscount,
                    offerName: appliedOffer,
                    offerAmount: offerDiscount,

                    actualGrandTotal: grandTotal,
                    roundOff,
                    grandTotal: roundedGrandTotal,

                    receivedAmount: Number(receivedAmount),
                    changeAmount
                },
                loyalty: {
                    used: loyaltyDiscount,
                    earned: earnedPoints,
                    remaining: customer
                        ? customer.loyaltyPoints - loyaltyDiscount
                        : 0
                }
            }
        });

    } catch (error) {
        console.error("CALCULATE BILL ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during calculation",
            error: error.message
        });
    }
};


exports.searchProductsForBill = async (req, res) => {
    try {
        const { search } = req.query;

        if (!search) {
            return res.status(400).json({
                success: false,
                message: "Search is required"
            });
        }

        const searchValue = search.trim();
        const hierarchy = attachHierarchy(req.user);


        const products = await Product.find({
            superAdminId: hierarchy.superAdminId,
            name: { $regex: searchValue, $options: "i" },
            stock: { $gt: 0 }
        }).limit(20);

        const productData = await Promise.all(
            products.map(async (p) => {
                const barcode = await Barcode.findOne({
                    productId: p._id,
                    superAdminId: hierarchy.superAdminId,
                    availableQty: { $gt: 0 }
                });


                const priceLevel = await PriceLevel.findOne({
                    productId: p._id,
                    superAdminId: hierarchy.superAdminId,
                    isActive: true
                });

                return {
                    productId: p._id,
                    productName: p.name,
                    brand: p.brand,
                    barcode: barcode?.code || "",
                    qty: 1,
                    stock: p.stock,

                    mrp: barcode?.mrp || p.mrp || 0,
                    sellingPrice: barcode?.sellingPrice || p.sellingPrice || 0,
                    costPrice: barcode?.costPrice || p.costPrice || 0,
                    gstRate: p.gstRate || 0,

                    priceLevel: priceLevel ? {
                        pricingType: priceLevel.pricingType,
                        manualPrice: priceLevel.manualPrice,
                        autoPricing: priceLevel.autoPricing,
                        slabs: priceLevel.slabs
                    } : null,

                    slabPrices: priceLevel?.pricingType === "slab"
                        ? priceLevel.slabs.map(s => ({
                            minQty: s.minQty,
                            maxQty: s.maxQty,
                            price: s.price
                        }))
                        : [],

                    flavor: barcode?.flavor || "",
                    litters: barcode?.litters || "",
                    kg: barcode?.kg || "",

                    gstRate: barcode?.gstRate || p.gstRate || 0
                };
            })
        );


        const barcodes = await Barcode.find({
            superAdminId: hierarchy.superAdminId,
            code: { $regex: searchValue, $options: "i" },
            availableQty: { $gt: 0 }
        }).populate("productId");

        const barcodeData = await Promise.all(
            barcodes
                .filter((b) => b.productId)
                .map(async (b) => {
                    const priceLevel = await PriceLevel.findOne({
                        productId: b.productId._id,
                        superAdminId: hierarchy.superAdminId,
                        isActive: true
                    });

                    return {
                        productId: b.productId._id,
                        productName: b.productId.name,
                        brand: b.productId.brand,
                        barcode: b.code,
                        qty: 1,
                        stock: b.productId.stock,

                        mrp: b.mrp || b.productId.mrp || 0,
                        sellingPrice: b.sellingPrice || b.productId.sellingPrice || 0,
                        costPrice: b.costPrice || b.productId.costPrice || 0,
                        gstRate: b.productId.gstRate || 0,

                        priceLevel: priceLevel ? {
                            pricingType: priceLevel.pricingType,
                            manualPrice: priceLevel.manualPrice,
                            autoPricing: priceLevel.autoPricing,
                            slabs: priceLevel.slabs
                        } : null,

                        slabPrices: priceLevel?.pricingType === "slab"
                            ? priceLevel.slabs.map(s => ({
                                minQty: s.minQty,
                                maxQty: s.maxQty,
                                price: s.price
                            }))
                            : [],

                        flavor: b.flavor || "",
                        litters: b.litters || "",
                        kg: b.kg || "",
                        gstRate: b.productId.gstRate || 0
                    };
                })
        );


        const merged = [...barcodeData, ...productData];

        const uniqueData = merged.filter(
            (item, index, self) =>
                index === self.findIndex(
                    (x) =>
                        String(x.productId) === String(item.productId) &&
                        x.barcode === item.barcode
                )
        );

        return res.status(200).json({
            success: true,
            count: uniqueData.length,
            data: uniqueData
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


exports.searchCustomerBills = async (req, res) => {
    try {

        const { search } = req.query;

        if (!search) {
            return res.status(400).json({
                success: false,
                message: "Search value is required"
            });
        }

        const hierarchy = attachHierarchy(req.user);

        const conditions = [
            { name: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } }
        ];

        if (!isNaN(search)) {
            conditions.push({ customerId: Number(search) });
            conditions.push({ id: Number(search) });
        }

        const customers = await Customer.find({
            superAdminId: hierarchy.superAdminId,
            $or: conditions
        });

        if (customers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        const customerIds = customers.map(c => c._id);

        const bills = await Bill.find({
            superAdminId: hierarchy.superAdminId,
            $or: [
                { customerId: { $in: customerIds } },
                { invoiceNo: { $regex: search, $options: "i" } }
            ]
        })
            .populate("customerId", "name phone customerId id")
            .populate("createdBy", "name email role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Customer bills fetched successfully",
            count: bills.length,
            data: bills.map(bill => ({
                _id: bill._id,
                invoiceNo: bill.invoiceNo,

                customer: bill.customerId,

                items: bill.items,

                summary: bill.summary,

                paymentStatus: bill.paymentStatus,
                paymentMethod: bill.paymentMethod,

                paidAmount: bill.paidAmount,
                pendingAmount: bill.pendingAmount,

                payments: bill.payments,

                offer: bill.offer,

                createdBy: bill.createdBy,

                createdAt: bill.createdAt
            }))
        });

    } catch (error) {

        console.error("SEARCH CUSTOMER BILL ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};



exports.getBills = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const {
            fromDate,
            toDate,
            period
        } = req.query;

        const filter = {
            superAdminId: hierarchy.superAdminId
        };


        const now = new Date();


        const getISTDate = (date) => {
            return new Date(
                new Date(date).toLocaleString("en-US", {
                    timeZone: "Asia/Kolkata"
                })
            );
        };

        if (fromDate || toDate || period) {

            let startDate;
            let endDate;



            if (period) {
                const today = getISTDate(now);

                today.setHours(0, 0, 0, 0);

                if (period === "today") {
                    startDate = new Date(today);
                    endDate = new Date(today);
                    endDate.setDate(endDate.getDate() + 1);
                }

                else if (period === "yesterday") {
                    startDate = new Date(today);
                    startDate.setDate(startDate.getDate() - 1);

                    endDate = new Date(today);
                }

                else if (period === "week") {
                    startDate = new Date(today);

                    const day = startDate.getDay();
                    const diff = day === 0 ? 6 : day - 1;

                    startDate.setDate(startDate.getDate() - diff);

                    endDate = new Date(today);
                    endDate.setDate(endDate.getDate() + 1);
                }

                else if (period === "month") {
                    startDate = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        1
                    );

                    endDate = new Date(
                        today.getFullYear(),
                        today.getMonth() + 1,
                        1
                    );
                }

                else if (period === "year") {
                    startDate = new Date(
                        today.getFullYear(),
                        0,
                        1
                    );

                    endDate = new Date(
                        today.getFullYear() + 1,
                        0,
                        1
                    );
                }
            }


            if (fromDate) {
                const customFrom = getISTDate(fromDate);

                customFrom.setHours(0, 0, 0, 0);

                startDate = customFrom;
            }



            if (toDate) {
                const customTo = getISTDate(toDate);

                customTo.setHours(23, 59, 59, 999);

                endDate = customTo;
            }



            if (startDate && endDate) {
                filter.createdAt = {
                    $gte: startDate,
                    $lte: endDate
                };
            }

            else if (startDate) {
                filter.createdAt = {
                    $gte: startDate
                };
            }

            else if (endDate) {
                filter.createdAt = {
                    $lte: endDate
                };
            }
        }


        const bills = await Bill.find(filter)
            .populate("customerId", "name phone customerId")
            .populate("createdBy", "name email role")
            .populate(
                "items.productId",
                "itemCode retailPrice wholesalePrice"
            )
            .sort({ createdAt: -1 });

        const billsWithFormattedDates = bills.map((bill, index) => {
            const totalItems = bill.items.length;

            const totalQty = bill.items.reduce(
                (sum, item) => sum + Number(item.qty || 0),
                0
            );

            const totalUnitQty = bill.items.reduce(
                (sum, item) =>
                    sum + (Number(item.qty || 0) * Number(item.unitValue || 1)),
                0
            );

            const totalFreeQty = bill.items.reduce(
                (sum, item) => sum + Number(item.freeQty || 0),
                0
            );

            const totalGivenQty = bill.items.reduce(
                (sum, item) => sum + Number(item.totalGivenQty || item.qty || 0),
                0
            );

            const paidAmount = Number(bill.paidAmount || 0);
            const grandTotal = Number(bill.summary.grandTotal || 0);

            const pendingAmount = Math.max(grandTotal - paidAmount, 0);
            const returnAmount = Math.max(paidAmount - grandTotal, 0);

            return {

                billCount: bills.length - index,

                billId: bill._id,
                invoiceNo: bill.invoiceNo,

                invoiceDate: new Date(bill.createdAt).toLocaleDateString("en-GB", {
                    timeZone: "Asia/Kolkata"
                }),

                invoiceTime: new Date(bill.createdAt).toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true
                }),

                customer: bill.customerId
                    ? {
                        customerId: bill.customerId.customerId,
                        name: bill.customerId.name,
                        mobile: bill.customerId.phone
                    }
                    : null,

                cashier: bill.createdBy
                    ? {
                        id: bill.createdBy._id,
                        name: bill.createdBy.name,
                        email: bill.createdBy.email,
                        role: bill.createdBy.role
                    }
                    : null,

                payment: {
                    paymentMethod: bill.paymentMethod,
                    paymentStatus: bill.paymentStatus,

                    payments: (bill.payments || []).map(payment => ({
                        method: payment.method,
                        amount: Number(payment.amount || 0),

                        details: payment.details
                            ? {
                                upiTransactionId:
                                    payment.details.upiTransactionId || "",

                                cardType:
                                    payment.details.cardType || "",

                                cardLast4:
                                    payment.details.cardLast4 || "",

                                chequeNo:
                                    payment.details.chequeNo || "",

                                chequeDate:
                                    payment.details.chequeDate || null,

                                bankName:
                                    payment.details.bankName || "",

                                accountHolder:
                                    payment.details.accountHolder || ""
                            }
                            : {}
                    })),

                    paidAmount,

                    ...(pendingAmount > 0 && { pendingAmount }),
                    ...(returnAmount > 0 && { returnAmount })
                },

                summary: {
                    subTotal: Number(bill.summary.subTotal || 0),
                    totalGST: Number(bill.summary.totalGST || 0),

                    itemDiscountAmount: Number(bill.summary.itemDiscountAmount || 0),

                    billDiscountAmount: Number(bill.summary.billDiscountAmount || 0),

                    billDiscountPercentage: Number(
                        bill.summary.billDiscountPercentage || 0
                    ),

                    totalDiscount: Number(
                        bill.summary.totalDiscount ??
                        bill.summary.discount ??
                        0
                    ),

                    loyaltyDiscount: Number(
                        bill.summary.loyaltyDiscount || 0
                    ),

                    offerName: bill.summary.offerName || null,

                    offerAmount: Number(
                        bill.summary.offerAmount || 0
                    ),

                    actualGrandTotal: Number(
                        bill.summary.actualGrandTotal ??
                        bill.summary.grandTotal ??
                        0
                    ),

                    roundOff: Number(
                        bill.summary.roundOff || 0
                    ),

                    grandTotal: Number(
                        bill.summary.grandTotal || 0
                    )
                },

                totals: {
                    totalItems,
                    totalQty,
                    totalFreeQty,
                    totalGivenQty,
                    totalUnitQty
                },

                items: bill.items.map(item => ({
                    productId: item.productId,

                    itemCode: item.productId?.itemCode || "",

                    barcodeId: item.barcodeId,
                    barcode: item.barcode,

                    name: item.name,

                    qty: item.qty,
                    freeQty: item.freeQty || 0,
                    totalGivenQty: item.totalGivenQty || item.qty,

                    unit: item.unit,
                    unitValue: item.unitValue,
                    unitText: item.unitText,

                    mrp: item.mrp,

                    retailPrice: Number(item.productId?.retailPrice || 0),
                    wholesalePrice: Number(item.productId?.wholesalePrice || 0),

                    price: item.price,

                    totalAmount: item.totalAmount,
                    discountPercent: item.discountPercent,
                    discountAmount: item.discountAmount,

                    gstRate: item.gstRate,
                    gstAmount: item.gstAmount,

                    finalPrice: item.finalPrice,

                    appliedPriceLevel: item.appliedPriceLevel,
                    appliedSlab: item.appliedSlab
                })),

                createdAt: new Date(bill.createdAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true
                }),

                updatedAt: new Date(bill.updatedAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true
                })
            };
        });

        return res.status(200).json({
            success: true,
            message: "Bills fetched successfully",
            count: bills.length,

            data: billsWithFormattedDates
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


exports.getTodayBillPayments = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const { period = "today" } = req.params;

        const allowedPeriods = [
            "today",
            "yesterday",
            "week",
            "month",
            "year"
        ];

        if (!allowedPeriods.includes(period)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid period. Use today, yesterday, week, month or year"
            });
        }

        const now = new Date();

        const istNowString = now.toLocaleString("en-US", {
            timeZone: "Asia/Kolkata"
        });

        const istNow = new Date(istNowString);

        const year = istNow.getFullYear();
        const month = istNow.getMonth();
        const date = istNow.getDate();

        const istToUTC = (
            year,
            month,
            date,
            hours = 0,
            minutes = 0,
            seconds = 0,
            milliseconds = 0
        ) => {
            return new Date(
                Date.UTC(
                    year,
                    month,
                    date,
                    hours - 5,
                    minutes - 30,
                    seconds,
                    milliseconds
                )
            );
        };

        let startUTC;
        let endUTC;

        let filterStartDate;
        let filterEndDate;

        // TODAY
        if (period === "today") {
            filterStartDate = new Date(
                year,
                month,
                date
            );

            filterEndDate = new Date(
                year,
                month,
                date
            );

            startUTC = istToUTC(
                year,
                month,
                date,
                0,
                0,
                0,
                0
            );

            endUTC = istToUTC(
                year,
                month,
                date,
                23,
                59,
                59,
                999
            );
        }

        // YESTERDAY
        else if (period === "yesterday") {
            const yesterday = new Date(
                year,
                month,
                date - 1
            );

            const yYear = yesterday.getFullYear();
            const yMonth = yesterday.getMonth();
            const yDate = yesterday.getDate();

            filterStartDate = yesterday;
            filterEndDate = yesterday;

            startUTC = istToUTC(
                yYear,
                yMonth,
                yDate,
                0,
                0,
                0,
                0
            );

            endUTC = istToUTC(
                yYear,
                yMonth,
                yDate,
                23,
                59,
                59,
                999
            );
        }

        // WEEK
        else if (period === "week") {
            const today = new Date(
                year,
                month,
                date
            );

            const day = today.getDay();

            const diffToMonday =
                day === 0 ? 6 : day - 1;

            const monday = new Date(
                year,
                month,
                date - diffToMonday
            );

            const sunday = new Date(
                monday.getFullYear(),
                monday.getMonth(),
                monday.getDate() + 6
            );

            const sYear = monday.getFullYear();
            const sMonth = monday.getMonth();
            const sDate = monday.getDate();

            const eYear = sunday.getFullYear();
            const eMonth = sunday.getMonth();
            const eDate = sunday.getDate();

            filterStartDate = monday;
            filterEndDate = sunday;

            startUTC = istToUTC(
                sYear,
                sMonth,
                sDate,
                0,
                0,
                0,
                0
            );

            endUTC = istToUTC(
                eYear,
                eMonth,
                eDate,
                23,
                59,
                59,
                999
            );
        }

        // MONTH
        else if (period === "month") {
            const firstDay = new Date(
                year,
                month,
                1
            );

            const lastDay = new Date(
                year,
                month + 1,
                0
            );

            filterStartDate = firstDay;
            filterEndDate = lastDay;

            startUTC = istToUTC(
                year,
                month,
                1,
                0,
                0,
                0,
                0
            );

            endUTC = istToUTC(
                year,
                month + 1,
                0,
                23,
                59,
                59,
                999
            );
        }

        // YEAR
        else if (period === "year") {
            const firstDay = new Date(
                year,
                0,
                1
            );

            const lastDay = new Date(
                year,
                11,
                31
            );

            filterStartDate = firstDay;
            filterEndDate = lastDay;

            startUTC = istToUTC(
                year,
                0,
                1,
                0,
                0,
                0,
                0
            );

            endUTC = istToUTC(
                year,
                11,
                31,
                23,
                59,
                59,
                999
            );
        }

        // GET ALL BILLS
        const bills = await Bill.find({
            superAdminId: hierarchy.superAdminId,

            createdAt: {
                $gte: startUTC,
                $lte: endUTC
            },

            "payments.0": {
                $exists: true
            }
        })
            .populate(
                "customerId",
                "customerId name phone"
            )
            .sort({
                createdAt: -1
            });

        // PAYMENT METHODS
        const paymentMethods = [
            "upi",
            "card",
            "cash",
            "bank",
            "cheque"
        ];

        // SUMMARY
        const summary = {
            upi: {
                totalAmount: 0,
                totalPayments: 0
            },

            card: {
                totalAmount: 0,
                totalPayments: 0
            },

            cash: {
                totalAmount: 0,
                totalPayments: 0
            },

            bank: {
                totalAmount: 0,
                totalPayments: 0
            },

            cheque: {
                totalAmount: 0,
                totalPayments: 0
            }
        };

        // ALL PAYMENTS
        const payments = [];

        for (const bill of bills) {

            for (const payment of bill.payments || []) {

                const method = payment.method;

                if (!paymentMethods.includes(method)) {
                    continue;
                }

                const amount = Number(
                    payment.amount || 0
                );

                // SUMMARY
                summary[method].totalAmount += amount;

                summary[method].totalPayments += 1;

                // PAYMENT DETAILS
                payments.push({
                    billId: bill._id,

                    invoiceNo: bill.invoiceNo,

                    billDate: bill.createdAt,

                    customer: bill.customerId
                        ? {
                            customerId:
                                bill.customerId.customerId,

                            name:
                                bill.customerId.name,

                            phone:
                                bill.customerId.phone || ""
                        }
                        : {
                            customerId: null,
                            name: "Walk in Customer",
                            phone: ""
                        },

                    paymentMethod: method,

                    amount,

                    details: {
                        upiId:
                            payment.details?.upiId || "",

                        cardType:
                            payment.details?.cardType || "",

                        cardLast4:
                            payment.details?.cardLast4 || "",

                        bankName:
                            payment.details?.bankName || "",

                        chequeNo:
                            payment.details?.chequeNo || "",

                        chequeDate:
                            payment.details?.chequeDate || null,

                        accountHolder:
                            payment.details?.accountHolder || ""
                    }
                });
            }
        }

        // ROUND SUMMARY AMOUNTS
        for (const method of paymentMethods) {
            summary[method].totalAmount =
                Number(
                    summary[method].totalAmount.toFixed(2)
                );
        }

        // TOTAL ALL PAYMENT METHODS
        const totalAmount = Number(
            payments
                .reduce(
                    (sum, payment) =>
                        sum + Number(payment.amount || 0),
                    0
                )
                .toFixed(2)
        );

        // TOTAL PAYMENT COUNT
        const totalPayments = payments.length;

        // DATE FORMAT
        const formatDate = (date) => {
            const yyyy = date.getFullYear();

            const mm = String(
                date.getMonth() + 1
            ).padStart(2, "0");

            const dd = String(
                date.getDate()
            ).padStart(2, "0");

            return `${yyyy}-${mm}-${dd}`;
        };

        return res.status(200).json({
            success: true,

            message:
                `All ${period} payments fetched successfully`,

            data: {
                period,

                fromDate:
                    formatDate(filterStartDate),

                toDate:
                    formatDate(filterEndDate),

                totalAmount,

                totalPayments,

                summary,

                payments
            }
        });

    } catch (error) {

        console.error(
            "GET ALL BILL PAYMENTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


exports.getBillItemWiseReport = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const {
            fromDate,
            toDate,
            period
        } = req.query;

        const filter = {
            superAdminId: hierarchy.superAdminId
        };


        const now = new Date();

        const getISTDate = (date) => {
            return new Date(
                new Date(date).toLocaleString("en-US", {
                    timeZone: "Asia/Kolkata"
                })
            );
        };

        if (fromDate || toDate || period) {

            let startDate;
            let endDate;


            if (period) {

                const today = getISTDate(now);

                today.setHours(0, 0, 0, 0);

                if (period === "today") {

                    startDate = new Date(today);

                    endDate = new Date(today);
                    endDate.setDate(endDate.getDate() + 1);
                }

                else if (period === "yesterday") {

                    startDate = new Date(today);
                    startDate.setDate(
                        startDate.getDate() - 1
                    );

                    endDate = new Date(today);
                }

                else if (period === "week") {

                    startDate = new Date(today);

                    const day = startDate.getDay();

                    const diff =
                        day === 0 ? 6 : day - 1;

                    startDate.setDate(
                        startDate.getDate() - diff
                    );

                    endDate = new Date(today);
                    endDate.setDate(
                        endDate.getDate() + 1
                    );
                }

                else if (period === "month") {

                    startDate = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        1
                    );

                    endDate = new Date(
                        today.getFullYear(),
                        today.getMonth() + 1,
                        1
                    );
                }

                else if (period === "year") {

                    startDate = new Date(
                        today.getFullYear(),
                        0,
                        1
                    );

                    endDate = new Date(
                        today.getFullYear() + 1,
                        0,
                        1
                    );
                }
            }


            if (fromDate) {

                const customFrom = getISTDate(fromDate);

                customFrom.setHours(0, 0, 0, 0);

                startDate = customFrom;
            }


            if (toDate) {

                const customTo = getISTDate(toDate);

                customTo.setHours(23, 59, 59, 999);

                endDate = customTo;
            }


            if (startDate && endDate) {

                filter.createdAt = {
                    $gte: startDate,
                    $lte: endDate
                };

            } else if (startDate) {

                filter.createdAt = {
                    $gte: startDate
                };

            } else if (endDate) {

                filter.createdAt = {
                    $lte: endDate
                };
            }
        }


        const bills = await Bill.find(filter)
            .populate(
                "customerId",
                "name phone customerId"
            )
            .populate(
                "createdBy",
                "name email role"
            )
            .populate(
                "items.productId",
                "itemCode"
            )
            .sort({
                createdAt: -1
            });


        const itemWiseData = [];

        let itemCount = 0;

        for (const bill of bills) {

            for (const item of bill.items) {

                itemCount++;

                const qty = Number(
                    item.qty || 0
                );

                const freeQty = Number(
                    item.freeQty || 0
                );

                const totalGivenQty = Number(
                    item.totalGivenQty ||
                    item.qty ||
                    0
                );

                const unitValue = Number(
                    item.unitValue || 1
                );

                const totalUnitQty =
                    qty * unitValue;

                itemWiseData.push({


                    itemCount,

                    billId: bill._id,

                    invoiceNo:
                        bill.invoiceNo,

                    invoiceDate:
                        new Date(
                            bill.createdAt
                        ).toLocaleDateString(
                            "en-GB",
                            {
                                timeZone:
                                    "Asia/Kolkata"
                            }
                        ),

                    invoiceTime:
                        new Date(
                            bill.createdAt
                        ).toLocaleTimeString(
                            "en-IN",
                            {
                                timeZone:
                                    "Asia/Kolkata",

                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",

                                hour12: true
                            }
                        ),


                    customer:
                        bill.customerId
                            ? {
                                customerId:
                                    bill.customerId
                                        .customerId,

                                name:
                                    bill.customerId
                                        .name,

                                mobile:
                                    bill.customerId
                                        .phone
                            }
                            : null,


                    cashier:
                        bill.createdBy
                            ? {
                                id:
                                    bill.createdBy
                                        ._id,

                                name:
                                    bill.createdBy
                                        .name,

                                email:
                                    bill.createdBy
                                        .email,

                                role:
                                    bill.createdBy
                                        .role
                            }
                            : null,


                    productId:
                        item.productId?._id ||
                        item.productId ||
                        null,

                    itemCode:
                        item.productId?.itemCode ||
                        "",

                    barcodeId:
                        item.barcodeId ||
                        null,

                    barcode:
                        item.barcode ||
                        "",

                    name:
                        item.name,


                    qty,

                    freeQty,

                    totalGivenQty,

                    unit:
                        item.unit,

                    unitValue,

                    unitText:
                        item.unitText,

                    totalUnitQty,


                    mrp:
                        Number(item.mrp || 0),

                    retailPrice:
                        Number(item.retailPrice || 0),

                    wholesalePrice:
                        Number(item.wholesalePrice || 0),

                    selectedPriceType:
                        item.selectedPriceType || null,

                    price:
                        Number(item.price || 0),


                    discountPercent:
                        Number(
                            item.discountPercent || 0
                        ),

                    discountAmount:
                        Number(
                            item.discountAmount || 0
                        ),


                    gstRate:
                        item.gstRate,

                    gstAmount:
                        Number(
                            item.gstAmount || 0
                        ),

                    // =========================
                    // FINAL PRICE
                    // =========================

                    finalPrice:
                        Number(
                            item.finalPrice || 0
                        ),

                    totalAmount:
                        Number(
                            item.totalAmount || 0
                        ),


                    appliedPriceLevel:
                        item.appliedPriceLevel ||
                        null,

                    appliedSlab:
                        item.appliedSlab ||
                        null
                });
            }
        }


        return res.status(200).json({

            success: true,

            message:
                "Bill item-wise report fetched successfully",

            billCount:
                bills.length,

            itemCount:
                itemWiseData.length,

            data:
                itemWiseData
        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message:
                "Server error",

            error:
                error.message
        });
    }
};


exports.getWalkInCustomerBills = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const bills = await Bill.find({
            superAdminId: hierarchy.superAdminId,
            customerId: null
        })
            .sort({ createdAt: -1 })
            .populate("createdBy", "name CompanyName");

        const data = bills.map((bill) => ({
            billId: bill._id,
            invoiceNo: bill.invoiceNo,

            invoiceDate: bill.createdAt.toLocaleDateString("en-GB"),
            invoiceTime: bill.createdAt.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
            }),

            customer: {
                customerId: null,
                customerName: "Walk in Customer",
                mobile: ""
            },

            items: bill.items.map(item => ({
                productId: item.productId,

                productName: item.productName || item.name,
                barcode: item.barcode,
                qty: item.qty,
                freeQty: item.freeQty || 0,
                totalGivenQty: item.totalGivenQty || item.qty,
                unit: item.unit,
                unitValue: item.unitValue,
                retailPrice: Number(item.retailPrice || 0),
                wholesalePrice: Number(item.wholesalePrice || 0),
                selectedPriceType: item.selectedPriceType || null,
                price: Number(item.price || 0),
                finalPrice: Number(item.finalPrice || 0),
                gstRate: item.gstRate,
                gstAmount: item.gstAmount
            })),

            totalItems: bill.items.length,

            summary: {
                subTotal: bill.summary?.subTotal || 0,
                totalGST: bill.summary?.totalGST || 0,
                discount: bill.summary?.discount || 0,
                grandTotal: bill.summary?.grandTotal || 0
            },

            paidAmount: bill.paidAmount || 0,
            pendingAmount: bill.pendingAmount || 0,

            paymentMethod: bill.paymentMethod,
            paymentStatus: bill.paymentStatus
        }));

        return res.status(200).json({
            success: true,
            totalBills: data.length,
            data
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.salescheck = async (req, res) => {
    try {
        const { type = "today" } = req.query;
        const hierarchy = attachHierarchy(req.user);

        const now = new Date();
        let startDate;

        if (type === "today") {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (type === "week") {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
        } else if (type === "month") {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (type === "year") {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid type. Use today, week, month, or year"
            });
        }

        const sales = await Bill.aggregate([
            {
                $match: {
                    superAdminId: hierarchy.superAdminId,
                    createdAt: { $gte: startDate, $lte: now },
                    paymentStatus: "paid"
                }
            },
            {
                $group: {
                    _id: null,
                    totalBills: { $sum: 1 },
                    totalSales: { $sum: "$summary.grandTotal" },
                    totalGST: { $sum: "$summary.totalGST" },
                    totalDiscount: { $sum: "$summary.discount" },
                    subTotal: { $sum: "$summary.subTotal" },

                    profitAmount: {
                        $sum: {
                            $reduce: {
                                input: "$items",
                                initialValue: 0,
                                in: {
                                    $add: [
                                        "$$value",
                                        {
                                            $multiply: [
                                                {
                                                    $subtract: [
                                                        { $ifNull: ["$$this.price", 0] },
                                                        { $ifNull: ["$$this.costPrice", 0] }
                                                    ]
                                                },
                                                { $ifNull: ["$$this.qty", 0] }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            }

        ]);

        const result = sales[0] || {
            totalBills: 0,
            totalSales: 0,
            totalGST: 0,
            totalDiscount: 0,
            subTotal: 0,
            profitAmount: 0
        };

        result.totalSales = Number(Number(result.totalSales || 0).toFixed(2));
        result.totalGST = Number(Number(result.totalGST || 0).toFixed(2));
        result.totalDiscount = Number(Number(result.totalDiscount || 0).toFixed(2));
        result.subTotal = Number(Number(result.subTotal || 0).toFixed(2));
        result.profitAmount = Number(Number(result.profitAmount || 0).toFixed(2));

        result.profitPercentage = result.subTotal > 0
            ? Number(
                ((result.profitAmount / result.subTotal) * 100).toFixed(2)
            )
            : 0;

        return res.status(200).json({
            success: true,
            message: `${type} sales fetched successfully`,
            filter: {
                type,
                from: startDate,
                to: now
            },
            data: result
        });

    } catch (error) {
        console.error("SALES CHECK ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}


exports.cashierWiseSales = async (req, res) => {
    try {
        const { type = "today" } = req.query;
        const hierarchy = attachHierarchy(req.user);

        const now = new Date();
        let startDate;

        if (type === "today") {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (type === "week") {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
        } else if (type === "month") {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (type === "year") {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid type. Use today, week, month, or year"
            });
        }

        const sales = await Bill.aggregate([
            {
                $match: {
                    superAdminId: hierarchy.superAdminId,
                    createdAt: { $gte: startDate, $lte: now },
                    paymentStatus: "paid"
                }
            },
            {
                $group: {
                    _id: "$createdBy",
                    totalBills: { $sum: 1 },
                    subTotal: { $sum: "$summary.subTotal" },
                    totalGST: { $sum: "$summary.totalGST" },
                    totalDiscount: { $sum: "$summary.discount" },
                    totalSales: { $sum: "$summary.grandTotal" }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "cashier"
                }
            },
            {
                $unwind: {
                    path: "$cashier",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    cashierId: "$_id",
                    cashierName: { $ifNull: ["$cashier.name", "Unknown"] },
                    cashierEmail: { $ifNull: ["$cashier.email", ""] },
                    totalBills: 1,
                    subTotal: 1,
                    totalGST: 1,
                    totalDiscount: 1,
                    totalSales: 1
                }
            },
            {
                $sort: { totalSales: -1 }
            }
        ]);

        return res.status(200).json({
            success: true,
            message: "Cashier wise sales fetched successfully",
            filter: {
                type,
                from: startDate,
                to: now
            },
            data: sales
        });

    } catch (error) {
        console.error("CASHIER SALES ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}


exports.getBillById = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const bill = await Bill.findOne({
            _id: req.params.id,
            superAdminId: hierarchy.superAdminId
        })
            .populate("customerId", "name phone customerId")
            .populate("createdBy", "name email role");

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Bill not found"
            });
        }

        const formattedBill = {
            ...bill.toObject(),

            createdAt: new Date(bill.createdAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
            }),

            updatedAt: new Date(bill.updatedAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
            })
        };

        const totalGST = Number(formattedBill.summary?.totalGST || 0);

        const cgst = Number((totalGST / 2).toFixed(2));
        const sgst = Number((totalGST / 2).toFixed(2));

        const itemsWithItemCode = await Promise.all(
            formattedBill.items.map(async (item) => {
                const product = await mongoose.model("Product").findById(
                    item.productId
                ).select("itemCode retailPrice wholesalePrice costPrice");

                return {
                    productId: item.productId,
                    itemCode: product?.itemCode || "",

                    barcodeId: item.barcodeId,
                    barcode: item.barcode,

                    name: item.name,

                    qty: item.qty,
                    freeQty: item.freeQty || 0,
                    totalGivenQty: item.totalGivenQty || item.qty,

                    unit: item.unit,
                    unitValue: item.unitValue,
                    unitText: item.unitText,
                    totalkg: item.totalkg,

                    mrp: item.mrp,

                    costPrice: Number(product?.costPrice || 0),

                    retailPrice: Number(product?.retailPrice || 0),
                    wholesalePrice: Number(product?.wholesalePrice || 0),

                    price: item.price,

                    totalAmount: item.totalAmount,
                    discountAmount: item.discountAmount,

                    gstRate: item.gstRate,
                    gstAmount: item.gstAmount,

                    finalPrice: item.finalPrice,

                    appliedPriceLevel: item.appliedPriceLevel,
                    appliedSlab: item.appliedSlab
                };
            })
        );

        const response = {
            billId: formattedBill._id,

            invoiceNo: formattedBill.invoiceNo,

            invoiceDate: new Date(bill.createdAt).toLocaleDateString("en-GB"),

            invoiceTime: new Date(bill.createdAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }),

            customer: formattedBill.customerId
                ? {
                    customerId: formattedBill.customerId.customerId,
                    customerName: formattedBill.customerId.name,
                    mobile: formattedBill.customerId.phone || ""
                }
                : null,

            paymentMethod: formattedBill.paymentMethod,
            paymentStatus: formattedBill.paymentStatus,

            payments: (formattedBill.payments || []).map(payment => ({
                method: payment.method,
                amount: Number(payment.amount || 0),

                details: payment.details
                    ? {
                        upiTransactionId:
                            payment.details.upiTransactionId || "",

                        cardType:
                            payment.details.cardType || "",

                        cardLast4:
                            payment.details.cardLast4 || "",

                        chequeNo:
                            payment.details.chequeNo || "",

                        chequeDate:
                            payment.details.chequeDate || null,

                        bankName:
                            payment.details.bankName || "",

                        accountHolder:
                            payment.details.accountHolder || ""
                    }
                    : {}
            })),

            paidAmount: formattedBill.paidAmount,
            pendingAmount: formattedBill.pendingAmount,

            items: itemsWithItemCode,

            summary: {
                totalAmount: Number(
                    formattedBill.summary.subTotal || 0
                ),

                subTotal: Number(
                    formattedBill.summary.subTotal || 0
                ),

                cgst,
                sgst,

                totalGST: Number(
                    formattedBill.summary.totalGST || 0
                ),

                itemDiscountAmount: Number(
                    formattedBill.summary.itemDiscountAmount ||
                    formattedBill.items.reduce(
                        (sum, item) => sum + Number(item.discountAmount || 0),
                        0
                    )
                ),

                billDiscountAmount: Number(
                    formattedBill.summary.billDiscountAmount || 0
                ),

                billDiscountPercentage: Number(
                    formattedBill.summary.billDiscountPercentage || 0
                ),

                totalDiscount: Number(
                    formattedBill.summary.totalDiscount ??
                    formattedBill.summary.discount ??
                    0
                ),

                loyaltyDiscount: Number(
                    formattedBill.summary.loyaltyDiscount || 0
                ),

                offerName: formattedBill.summary.offerName || null,

                offerAmount: Number(
                    formattedBill.summary.offerAmount || 0
                ),

                actualGrandTotal: Number(
                    formattedBill.summary.actualGrandTotal ??
                    formattedBill.summary.grandTotal ??
                    0
                ),

                roundOff: Number(
                    formattedBill.summary.roundOff || 0
                ),

                grandTotal: Number(
                    formattedBill.summary.grandTotal || 0
                )
            },

            loyalty: {
                used: Number(formattedBill.summary.loyaltyDiscount || 0)
            },

            createdBy: formattedBill.createdBy
        };

        return res.status(200).json({
            success: true,
            message: "Bill fetched successfully",
            data: response
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


exports.editBill = async (req, res) => {
    try {
        const { billId } = req.params;

        const {
            items: billItems = [],

            customerId,
            isWalkInCustomer = false,

            priceType: priceTypeFromRequest = "retail",

            discountPercent = 0,
            discountAmount = 0,

            paymentStatus = "paid",
            paymentMethod = "cash",

            payments = [],
            paidAmount = 0
        } = req.body;

        const hierarchy = attachHierarchy(req.user);


        const bill = await Bill.findOne({
            _id: billId,
            superAdminId: hierarchy.superAdminId
        });


        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Bill not found"
            });
        }



        const billCreatedTime = new Date(bill.createdAt).getTime();
        const currentTime = Date.now();

        const difference = currentTime - billCreatedTime;

        const ONE_DAY = 24 * 60 * 60 * 1000;

        if (difference > ONE_DAY) {
            return res.status(403).json({
                success: false,
                message: "Bill can only be edited within 24 hours of creation"
            });
        }

        if (!Array.isArray(billItems) || billItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one item is required"
            });
        }

        // Keep old values for session update
        const oldGrandTotal = Number(
            bill.summary?.grandTotal || 0
        );

        const oldPayments = bill.payments || [];


        for (const oldItem of bill.items || []) {

            const restoreQty =
                Number(oldItem.qty || 0) +
                Number(oldItem.freeQty || 0);



            if (oldItem.productId) {
                await Product.updateOne(
                    {
                        _id: oldItem.productId,
                        superAdminId: hierarchy.superAdminId
                    },
                    {
                        $inc: {
                            stock: restoreQty
                        }
                    }
                );
            }
        }


        let subTotal = 0;
        let totalGST = 0;
        let totalItemDiscount = 0;

        const newItems = [];

        for (const billItem of billItems) {

            const qty = Number(billItem.qty || 0);

            if (qty <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid quantity"
                });
            }

            const product = await Product.findOne({
                _id: billItem.productId,
                superAdminId: hierarchy.superAdminId
            });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            const barcode = await Barcode.findOne({
                productId: product._id,
                superAdminId: hierarchy.superAdminId
            });


            let freeQty = 0;

            const buyGetOffer = await Offer.findOne({
                superAdminId: hierarchy.superAdminId,
                offerType: "buy_get",
                isActive: true,
                buyProductId: product._id
            });

            if (
                buyGetOffer &&
                qty >= Number(buyGetOffer.buyQty || 0)
            ) {
                freeQty =
                    Math.floor(
                        qty / Number(buyGetOffer.buyQty)
                    ) *
                    Number(buyGetOffer.freeQty || 0);
            }

            const totalRequiredQty = qty + freeQty;


            const retailPrice = Number(
                product.retailPrice || 0
            );

            const wholesalePrice = Number(
                product.wholesalePrice || 0
            );

            const priceType = billItem.selectedPriceType || priceTypeFromRequest || "retail";

            const defaultPrice =
                priceType === "wholesale"
                    ? wholesalePrice
                    : retailPrice;

            const hasCustomPrice =
                billItem.price !== undefined &&
                billItem.price !== null &&
                billItem.price !== "";

            const price = hasCustomPrice
                ? Number(billItem.price)
                : defaultPrice;

            if (price <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid price for ${product.name}`
                });
            }

            const rawGstRate =
                billItem.gstRate ??
                barcode?.gstRate ??
                product.gstRate ??
                "none";

            const isGstNone =
                String(rawGstRate).trim().toLowerCase() === "none";

            const gstRate = isGstNone
                ? "none"
                : Number(rawGstRate);

            const gstRateForCalculation = isGstNone
                ? 0
                : Number(rawGstRate);

            if (
                gstRate !== "none" &&
                (isNaN(gstRate) || gstRate < 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid GST rate for product: ${product.name}`
                });
            }

            const grossAmount = Number(
                (price * qty).toFixed(2)
            );

            const itemDiscountPercent = Number(
                billItem.discountPercent || 0
            );

            const itemDiscountAmount = Number(
                billItem.discountAmount || 0
            );

            let itemDiscount = 0;

            if (itemDiscountPercent > 0) {
                itemDiscount = Number(
                    (
                        grossAmount *
                        itemDiscountPercent /
                        100
                    ).toFixed(2)
                );

            } else if (itemDiscountAmount > 0) {
                itemDiscount = Number(
                    itemDiscountAmount.toFixed(2)
                );
            }

            if (itemDiscount > grossAmount) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Discount cannot exceed item total for ${product.name}`
                });
            }

            let calculatedDiscountPercent =
                itemDiscountPercent;

            if (
                calculatedDiscountPercent === 0 &&
                itemDiscount > 0 &&
                grossAmount > 0
            ) {
                calculatedDiscountPercent = Number(
                    (
                        itemDiscount /
                        grossAmount *
                        100
                    ).toFixed(2)
                );
            }

            totalItemDiscount += itemDiscount;

            const finalPrice = Number(
                (
                    grossAmount -
                    itemDiscount
                ).toFixed(2)
            );


            const taxableAmount = Number(
                (
                    finalPrice /
                    (1 + gstRateForCalculation / 100)
                ).toFixed(2)
            );

            const gstAmount = Number(
                (
                    finalPrice -
                    taxableAmount
                ).toFixed(2)
            );

            subTotal += taxableAmount;
            totalGST += gstAmount;

            newItems.push({
                productId: product._id,

                barcodeId: barcode?._id,
                barcode: barcode?.code,

                productName: product.name || "",
                name: product.name || "",

                itemCode:
                    product.itemCode ||
                    billItem.itemCode ||
                    "",

                hsnCode:
                    product.hsnCode ||
                    billItem.hsnCode ||
                    "",

                qty,
                freeQty,
                totalGivenQty: qty + freeQty,

                unit:
                    product.unit || "pcs",

                unitValue:
                    Number(product.unitValue || 1),

                unitText:
                    `${product.unitValue || 1} ${product.unit || "pcs"}`,

                totalUnitQty:
                    qty * Number(product.unitValue || 1),

                totalUnitText:
                    `${qty * Number(product.unitValue || 1)} ${product.unit || "pcs"}`,



                mrp: Number(product.mrp || 0),

                retailPrice:
                    priceType === "retail"
                        ? Number(price || 0)
                        : Number(product.retailPrice || 0),

                wholesalePrice:
                    priceType === "wholesale"
                        ? Number(price || 0)
                        : Number(product.wholesalePrice || 0),

                selectedPriceType: priceType,

                price: Number(price || 0),

                normalPrice: Number(defaultPrice || 0),

                totalAmount: grossAmount,

                discountPercent:
                    calculatedDiscountPercent,

                discountAmount:
                    itemDiscount,

                finalPrice,

                gstRate,
                gstAmount
            });


            const stockUpdate =
                await Product.updateOne(
                    {
                        _id: product._id,
                        superAdminId:
                            hierarchy.superAdminId,

                        stock: {
                            $gte: totalRequiredQty
                        }
                    },
                    {
                        $inc: {
                            stock: -totalRequiredQty
                        }
                    }
                );

            if (stockUpdate.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message:
                        `${product.name} stock update failed`
                });
            }
        }

        subTotal = Number(subTotal.toFixed(2));
        totalGST = Number(totalGST.toFixed(2));


        const beforeBillDiscount = Number(
            (subTotal + totalGST).toFixed(2)
        );

        let billDiscount = 0;
        let billDiscountPercentage = 0;

        if (Number(discountPercent) > 0) {

            billDiscount = Number(
                (
                    beforeBillDiscount *
                    Number(discountPercent) /
                    100
                ).toFixed(2)
            );

            billDiscountPercentage =
                Number(discountPercent);

        } else if (Number(discountAmount) > 0) {

            billDiscount =
                Number(discountAmount);

            billDiscountPercentage =
                beforeBillDiscount > 0
                    ? Number(
                        (
                            billDiscount /
                            beforeBillDiscount *
                            100
                        ).toFixed(2)
                    )
                    : 0;
        }


        let customer = null;

        if (!isWalkInCustomer) {

            if (!customerId) {
                return res.status(400).json({
                    success: false,
                    message: "Customer is required."
                });
            }

            const customerFilter = {
                superAdminId: hierarchy.superAdminId,
                $or: []
            };

            if (mongoose.Types.ObjectId.isValid(customerId)) {
                customerFilter.$or.push({
                    _id: customerId
                });
            }

            if (!isNaN(customerId)) {
                customerFilter.$or.push({
                    customerId: Number(customerId)
                });
            }

            customer = await Customer.findOne(customerFilter);

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found"
                });
            }
        }


        const loyaltyDiscount = Number(
            bill.summary?.discount || 0
        );


        let grandTotal = Number(
            (
                subTotal +
                totalGST -
                billDiscount -
                loyaltyDiscount
            ).toFixed(2)
        );

        let offer = null;
        let offerDiscount = 0;
        let appliedOffer = null;

        offer = await Offer.findOne({
            superAdminId:
                hierarchy.superAdminId,

            isActive: true,

            minimumPurchase: {
                $lte: grandTotal
            }
        }).sort({
            minimumPurchase: -1
        });

        if (offer) {

            if (
                offer.discountType === "amount"
            ) {
                offerDiscount =
                    Number(offer.discountValue || 0);

            } else {
                offerDiscount = Number(
                    (
                        grandTotal *
                        Number(
                            offer.discountValue || 0
                        ) /
                        100
                    ).toFixed(2)
                );
            }

            appliedOffer =
                offer.offerName;
        }

        grandTotal = Number(
            Math.max(
                grandTotal - offerDiscount,
                0
            ).toFixed(2)
        );


        let finalPayments = [];

        if (
            paymentStatus === "due" ||
            paymentStatus === "partial"
        ) {

            if (
                Array.isArray(payments) &&
                payments.length > 0
            ) {
                finalPayments = payments;

            } else if (
                Number(paidAmount) > 0
            ) {
                finalPayments = [
                    {
                        method: paymentMethod,
                        amount:
                            Number(paidAmount)
                    }
                ];
            }

        } else if (
            paymentMethod === "split"
        ) {

            finalPayments = payments;

        } else {

            finalPayments = [
                {
                    method: paymentMethod,
                    amount: Number(paidAmount) > 0
                        ? Number(paidAmount)
                        : grandTotal
                }
            ];
        }

        const allowedMethods = [
            "cash",
            "upi",
            "card",
            "cheque",
            "sodexo"
        ];

        for (const pay of finalPayments) {

            if (
                !allowedMethods.includes(
                    pay.method
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment method"
                });
            }

            if (
                Number(pay.amount || 0) <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment amount"
                });
            }
        }

        const totalPaid = Number(
            finalPayments
                .reduce(
                    (sum, pay) =>
                        sum +
                        Number(pay.amount || 0),
                    0
                )
                .toFixed(2)
        );

        let pendingAmount = 0;
        let returnAmount = 0;

        if (paymentStatus === "paid") {

            if (totalPaid < grandTotal) {
                return res.status(400).json({
                    success: false,
                    message: "Paid amount cannot be less than grand total"
                });
            }

            returnAmount = Number(
                (totalPaid - grandTotal).toFixed(2)
            );

        }

        if (paymentStatus === "partial") {

            if (
                totalPaid <= 0 ||
                totalPaid >= grandTotal
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Partial amount must be less than grand total"
                });
            }

            pendingAmount = Number(
                (
                    grandTotal -
                    totalPaid
                ).toFixed(2)
            );
        }

        if (paymentStatus === "due") {

            pendingAmount = Number(
                (
                    grandTotal -
                    totalPaid
                ).toFixed(2)
            );
        }


        bill.items = newItems;

        bill.summary = {
            subTotal,
            totalGST,


            discount: loyaltyDiscount,

            grandTotal,

            itemDiscountAmount:
                Number(
                    totalItemDiscount.toFixed(2)
                ),

            billDiscountAmount:
                billDiscount,

            billDiscountPercentage
        };

        bill.offer = {
            offerId:
                offer?._id || null,

            offerName:
                appliedOffer,

            discountAmount:
                offerDiscount
        };

        bill.paymentMethod =
            finalPayments.length > 1
                ? "split"
                : finalPayments[0]?.method ||
                "due";

        bill.paymentStatus =
            paymentStatus;

        bill.payments =
            finalPayments;

        bill.paidAmount =
            totalPaid;

        bill.pendingAmount =
            pendingAmount;

        bill.returnAmount =
            returnAmount;

        bill.customerId = customer ? customer._id : null;

        bill.updatedBy =
            req.user.userId ||
            req.user.id;

        await bill.save();


        const userId =
            req.user.userId ||
            req.user.id;

        const activeSession =
            await Session.findOne({
                cashier: userId,

                superAdminId:
                    hierarchy.superAdminId,

                status: "open"
            });

        if (activeSession) {


            activeSession.totalSales =
                Number(
                    (
                        Number(
                            activeSession.totalSales ||
                            0
                        ) -
                        oldGrandTotal +
                        grandTotal
                    ).toFixed(2)
                );

            const getPaymentTotal = (
                paymentList,
                method
            ) => {
                return paymentList
                    .filter(
                        (p) =>
                            p.method === method
                    )
                    .reduce(
                        (sum, p) =>
                            sum +
                            Number(
                                p.amount || 0
                            ),
                        0
                    );
            };

            const methods = [
                "cash",
                "upi",
                "card",
                "cheque",
                "sodexo"
            ];

            for (const method of methods) {

                const oldAmount =
                    getPaymentTotal(
                        oldPayments,
                        method
                    );

                const newAmount =
                    getPaymentTotal(
                        finalPayments,
                        method
                    );

                const difference =
                    newAmount -
                    oldAmount;

                switch (method) {

                    case "cash":
                        activeSession.cashSales =
                            Number(
                                (
                                    Number(
                                        activeSession.cashSales ||
                                        0
                                    ) +
                                    difference
                                ).toFixed(2)
                            );
                        break;

                    case "upi":
                        activeSession.upiSales =
                            Number(
                                (
                                    Number(
                                        activeSession.upiSales ||
                                        0
                                    ) +
                                    difference
                                ).toFixed(2)
                            );
                        break;

                    case "card":
                        activeSession.cardSales =
                            Number(
                                (
                                    Number(
                                        activeSession.cardSales ||
                                        0
                                    ) +
                                    difference
                                ).toFixed(2)
                            );
                        break;

                    case "cheque":
                        activeSession.chequeSales =
                            Number(
                                (
                                    Number(
                                        activeSession.chequeSales ||
                                        0
                                    ) +
                                    difference
                                ).toFixed(2)
                            );
                        break;

                    case "sodexo":
                        activeSession.sodexoSales =
                            Number(
                                (
                                    Number(
                                        activeSession.sodexoSales ||
                                        0
                                    ) +
                                    difference
                                ).toFixed(2)
                            );
                        break;
                }
            }

            activeSession.expectedCash =
                Number(
                    (
                        Number(
                            activeSession.openingAmount ||
                            0
                        ) +
                        Number(
                            activeSession.cashSales ||
                            0
                        )
                    ).toFixed(2)
                );

            await activeSession.save();
        }

        await AuditLog.findOneAndUpdate(
            {
                module: "Bill",
                action: "Create",
                documentId: bill._id,
                superAdminId: hierarchy.superAdminId
            },
            {
                $set: {
                    userId:
                        req.user.userId ||
                        req.user.id,

                    role: req.user.role,

                    action: "create",

                    oldData: null,

                    newData: {
                        invoiceNo:
                            bill.invoiceNo || "",


                        invoiceDate:
                            bill.createdAt || new Date(),


                        customerId:
                            customer?._id || null,

                        customerName:
                            customer?.name ||
                            "Walk-in Customer",

                        customerGstNumber:
                            customer?.gstNumber ||
                            customer?.gstnumber ||
                            customer?.gstin ||
                            "",

                        placeOfSupply:
                            customer?.state ||
                            customer?.placeOfSupply ||
                            "",

                        items: newItems.map((item) => {
                            const qty =
                                Number(item.qty || 0);

                            const freeQty =
                                Number(item.freeQty || 0);

                            const rate =
                                Number(item.price || 0);

                            const gstRate =
                                Number(item.gstRate || 0);

                            const gstAmount =
                                Number(item.gstAmount || 0);

                            const finalAmount =
                                Number(item.finalPrice || 0);

                            const taxableAmount =
                                Number(
                                    Number(
                                        item.taxableAmount ??
                                        Math.max(
                                            0,
                                            finalAmount - gstAmount
                                        )
                                    ).toFixed(2)
                                );

                            return {
                                productId:
                                    item.productId || null,

                                barcodeId:
                                    item.barcodeId || null,

                                itemCode:
                                    item.itemCode || "",

                                itemName:
                                    item.name ||
                                    item.productName ||
                                    "",

                                hsnCode:
                                    item.hsnCode || "",

                                barcode:
                                    item.barcode || "",

                                qty,

                                freeQty,

                                totalGivenQty:
                                    Number(
                                        item.totalGivenQty ??
                                        (qty + freeQty)
                                    ),

                                unit:
                                    item.unit || "pcs",

                                unitValue:
                                    Number(
                                        item.unitValue || 1
                                    ),

                                unitText:
                                    item.unitText || "",

                                totalKg:
                                    item.totalkg || "",

                                mrp:
                                    Number(item.mrp || 0),

                                rate,

                                retailPrice:
                                    Number(
                                        item.retailPrice || 0
                                    ),

                                wholesalePrice:
                                    Number(
                                        item.wholesalePrice || 0
                                    ),

                                selectedPriceType:
                                    item.selectedPriceType ||
                                    priceType ||
                                    "retail",

                                price:
                                    Number(
                                        item.price ?? 0
                                    ),

                                appliedPriceLevel:
                                    item.appliedPriceLevel ||
                                    "normal",

                                appliedSlab:
                                    item.appliedPriceLevel === "slab" &&
                                        Number(
                                            item.appliedSlab?.price || 0
                                        ) > 0
                                        ? {
                                            minQty:
                                                Number(
                                                    item.appliedSlab?.minQty || 0
                                                ),

                                            maxQty:
                                                item.appliedSlab?.maxQty !== null &&
                                                    item.appliedSlab?.maxQty !== undefined
                                                    ? Number(
                                                        item.appliedSlab.maxQty
                                                    )
                                                    : null,

                                            price:
                                                Number(
                                                    item.appliedSlab?.price || 0
                                                )
                                        }
                                        : null,

                                gstRate,

                                cgstRate:
                                    Number(
                                        (gstRate / 2).toFixed(2)
                                    ),

                                sgstRate:
                                    Number(
                                        (gstRate / 2).toFixed(2)
                                    ),

                                gstAmount,

                                cgstAmount:
                                    Number(
                                        (gstAmount / 2).toFixed(2)
                                    ),

                                sgstAmount:
                                    Number(
                                        (gstAmount / 2).toFixed(2)
                                    ),

                                discountAmount:
                                    Number(
                                        item.discountAmount || 0
                                    ),

                                taxableAmount,

                                totalAmount:
                                    Number(
                                        item.totalAmount || 0
                                    ),

                                finalAmount,

                                itemTotalAmount:
                                    Number(
                                        finalAmount.toFixed(2)
                                    )
                            };
                        }),

                        summary: {
                            subTotal:
                                Number(subTotal || 0),

                            totalGST:
                                Number(totalGST || 0),

                            itemDiscountAmount:
                                Number(
                                    Number(
                                        totalItemDiscount || 0
                                    ).toFixed(2)
                                ),

                            billDiscountAmount:
                                Number(billDiscount || 0),

                            billDiscountPercentage:
                                Number(
                                    billDiscountPercentage || 0
                                ),

                            loyaltyDiscount:
                                Number(
                                    loyaltyDiscount || 0
                                ),

                            grandTotal:
                                Number(grandTotal || 0)
                        },

                        offer: {
                            offerId:
                                bill.offer?.offerId || null,

                            offerName:
                                appliedOffer ||
                                bill.offer?.offerName ||
                                "",

                            discountAmount:
                                Number(
                                    offerDiscount ||
                                    bill.offer?.discountAmount ||
                                    0
                                )
                        },

                        paidAmount:
                            Number(totalPaid || 0),

                        pendingAmount:
                            Number(pendingAmount || 0),

                        returnAmount:
                            Number(returnAmount || 0),

                        paymentMethod:
                            bill.paymentMethod || "due",

                        paymentStatus:
                            bill.paymentStatus || "due",

                        payments:
                            (finalPayments || []).map(
                                (payment) => ({
                                    method:
                                        payment.method || "",

                                    amount:
                                        Number(
                                            payment.amount || 0
                                        ),

                                    details: {
                                        upiId:
                                            payment.details?.upiId || "",

                                        cardType:
                                            payment.details?.cardType || "",

                                        cardLast4:
                                            payment.details?.cardLast4 || "",

                                        chequeNo:
                                            payment.details?.chequeNo || "",

                                        chequeDate:
                                            payment.details?.chequeDate || null,

                                        bankName:
                                            payment.details?.bankName || "",

                                        accountHolder:
                                            payment.details?.accountHolder || ""
                                    }
                                })
                            ),

                        editedAt:
                            new Date()
                    }
                }
            },
            {
                new: true
            }
        );

        const cgst = Number(
            (totalGST / 2).toFixed(2)
        );

        const sgst = Number(
            (totalGST / 2).toFixed(2)
        );


        return res.status(200).json({
            success: true,

            message:
                "Bill updated successfully",

            data: {

                billId:
                    bill._id,

                invoiceNo:
                    bill.invoiceNo,


                customer: customer
                    ? {
                        customerId: customer.customerId,
                        customerName: customer.name,
                        mobile: customer.phone
                    }
                    : {
                        customerId: null,
                        customerName: "Walk In Customer",
                        mobile: null
                    },


                items:
                    newItems,

                paymentMethod:
                    bill.paymentMethod,

                paymentStatus,

                payments:
                    finalPayments,

                paidAmount:
                    totalPaid,

                pendingAmount,

                returnAmount,


                summary: {
                    totalAmount:
                        Number(
                            (
                                subTotal +
                                totalGST +
                                totalItemDiscount
                            ).toFixed(2)
                        ),

                    subTotal,

                    cgst,
                    sgst,

                    totalGST,

                    itemDiscountAmount:
                        Number(
                            totalItemDiscount.toFixed(2)
                        ),

                    billDiscountAmount:
                        billDiscount,

                    billDiscountPercentage,

                    offerName:
                        appliedOffer,

                    offerAmount:
                        offerDiscount,

                    loyaltyDiscount,

                    grandTotal
                }
            }
        });

    } catch (error) {

        console.error(
            "UPDATE BILL ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};