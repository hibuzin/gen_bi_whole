const Barcode = require("../models/barcode");
const Product = require("../models/product");
const PriceLevel = require("../models/price_level");
const { attachHierarchy } = require("../utils/hierarchy");
const { successResponse, errorResponse } = require("../utils/response");



exports.scanProductForPurchase = async (req, res) => {
    try {
        const code = String(req.params.code || "").trim();

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Barcode is required"
            });
        }

        const hierarchy = attachHierarchy(req.user);

        const barcode = await Barcode.findOne({
            code,
            superAdminId: hierarchy.superAdminId
        }).populate("productId");

        if (!barcode) {
            return res.status(404).json({
                success: false,
                message: "Barcode not found. Please create product first"
            });
        }

        const product = barcode.productId;

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.json({
            success: true,
            message: "Product scanned for purchase",
            data: {
                productId: product._id,
                itemCode: product.itemCode || "",
                productName: product.name,
                brand: product.brand || "",

                barcode: barcode.code,

                hsnCode: product.hsnCode || "",
                gstRate: product.gstRate ?? "none",

                kg: product.kg || "",

                stock: product.stock || 0,

                unit: product.unit || "pcs",
                unitValue: product.unitValue || 1,

                mrp: product.mrp ?? 0,
                costPrice: product.costPrice ?? 0,

                retailPrice: product.retailPrice ?? 0,
                wholesalePrice: product.wholesalePrice ?? 0
            }
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.scanProduct = async (req, res) => {
    try {
        const code = String(req.params.code || "").trim();

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Barcode is required"
            });
        }

        const hierarchy = attachHierarchy(req.user);

        // Find ALL products matching this barcode
        const barcodes = await Barcode.find({
            code,
            superAdminId: hierarchy.superAdminId
        }).populate("productId");

        if (!barcodes.length) {
            return res.status(404).json({
                success: false,
                message: "Barcode not found"
            });
        }

        // Remove missing products and products without available stock
        const validProducts = barcodes
            .filter(barcode => barcode.productId)
            .filter(barcode => Number(barcode.productId.stock || 0) > 0);

        if (!validProducts.length) {
            return res.status(404).json({
                success: false,
                message: "No matching product with available stock"
            });
        }

        // Prepare response for every matching product
        const products = await Promise.all(
            validProducts.map(async (barcode) => {
                const product = barcode.productId;

                const priceLevel = await PriceLevel.findOne({
                    productId: product._id,
                    superAdminId: hierarchy.superAdminId,
                    isActive: true
                });

                return {
                    itemCode: product.itemCode || "",
                    barcode: barcode.code,
                    barcodeId: barcode._id,

                    productId: product._id,
                    productName: product.name,

                    qty: 1,
                    stock: product.stock || 0,

                    hsnCode: product.hsnCode || "",
                    gstRate: product.gstRate ?? "none",

                    kg: product.kg || "",

                    mrp: product.mrp ?? 0,
                    costPrice: product.costPrice ?? 0,

                    retailPrice: product.retailPrice ?? 0,
                    wholesalePrice: product.wholesalePrice ?? 0,

                    selectedPriceType: "retail",
                    priceLevel: priceLevel || null,

                    isSold: barcode.isSold || false
                };
            })
        );

        return res.json({
            success: true,
            message: "Products scanned successfully",
            count: products.length,
            data: products
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};