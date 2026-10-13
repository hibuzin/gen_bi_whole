const mongoose = require("mongoose");
const Barcode = require("../models/barcode");
const Product = require("../models/product");
const Counter = require("../models/counter");

const { attachHierarchy } = require("../utils/hierarchy");

const generateUniqueBarcode = async (superAdminId) => {
    const counter = await Counter.findOneAndUpdate(
        {
            name: "barcode",
            superAdminId
        },
        {
            $inc: { seq: 1 }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return `B${String(counter.seq).padStart(8, "0")}`;
};


exports.generateBarcode = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const {
            productId,
            printQty = 1,
            barcode
        } = req.body;


        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required"
            });
        }

        if (!Number.isInteger(printQty) || printQty < 1) {
            return res.status(400).json({
                success: false,
                message: "printQty must be greater than 0"
            });
        }


        let product = null;
        let existingBarcode = null;


        if (productId) {

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid productId"
                });
            }

            product = await Product.findOne({
                _id: productId,
                superAdminId: hierarchy.superAdminId
            });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            existingBarcode = await Barcode.findOne({
                productId: product._id,
                superAdminId: hierarchy.superAdminId
            });


            if (existingBarcode) {

                if (
                    barcode &&
                    String(barcode).trim() !== existingBarcode.code
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "This product already has a barcode. You cannot assign another barcode."
                    });
                }

                existingBarcode.printQty =
                    (existingBarcode.printQty || 0) + printQty;

                await existingBarcode.save();

                return res.status(200).json({
                    success: true,
                    message:
                        "Product already has a barcode. Print quantity updated.",
                    data: {
                        id: existingBarcode._id,
                        code: existingBarcode.code,
                        productId: existingBarcode.productId,


                        mrp: existingBarcode.mrp,
                        costPrice: existingBarcode.costPrice,
                        retailPrice: existingBarcode.retailPrice,
                        gstRate: existingBarcode.gstRate,

                        unit: existingBarcode.unit,
                        unitValue: existingBarcode.unitValue,

                        qty: existingBarcode.qty,
                        availableQty: existingBarcode.availableQty,

                        printQty: existingBarcode.printQty,
                        isSold: existingBarcode.isSold
                    }
                });
            }
        }




        let code;

        if (barcode !== undefined && barcode !== null) {

            code = String(barcode).trim();

            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: "Barcode cannot be empty"
                });
            }

            const barcodeExists = await Barcode.findOne({
                code,
                superAdminId: hierarchy.superAdminId
            });

            if (barcodeExists) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Barcode already exists for another product or combo offer"
                });
            }

        } else {

            code = await generateUniqueBarcode(
                hierarchy.superAdminId
            );
        }


        const barcodeData = {
            code,

            productId: product
                ? product._id
                : null,

            printQty,

            isSold: false,

            superAdminId: hierarchy.superAdminId,
            adminId: hierarchy.adminId,
            createdBy: req.user.userId
        };


        if (product) {

            barcodeData.mrp = product.mrp || 0;
            barcodeData.costPrice = product.costPrice || 0;
            barcodeData.retailPrice = product.retailPrice || 0;
           
            barcodeData.gstRate =
                product.gstRate !== undefined &&
                    product.gstRate !== null
                    ? product.gstRate
                    : 0;

            barcodeData.unit =
                product.unit || "pcs";

            barcodeData.unitValue =
                product.unitValue !== undefined
                    ? product.unitValue
                    : 1;
        }

        const newBarcode = await Barcode.create(barcodeData);



        return res.status(201).json({
            success: true,
            message: "Barcode generated successfully",

            data: {
                id: newBarcode._id,
                code: newBarcode.code,

                productId:
                    newBarcode.productId || null,


                mrp: newBarcode.mrp,
                costPrice: newBarcode.costPrice,
                retailPrice: newBarcode.retailPrice,

                gstRate: newBarcode.gstRate,

                unit: newBarcode.unit,
                unitValue: newBarcode.unitValue,

                qty: newBarcode.qty,
                availableQty: newBarcode.availableQty,

                printQty: newBarcode.printQty,
                isSold: newBarcode.isSold
            }
        });

    } catch (error) {

        console.error("Generate Barcode Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while generating barcode",
            error: error.message
        });
    }
};