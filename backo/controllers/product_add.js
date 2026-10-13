const mongoose = require("mongoose");
const Product = require("../models/product");
const Barcode = require("../models/barcode");
const PriceLevel = require("../models/price_level");
const { attachHierarchy } = require("../utils/hierarchy");
const category = require("../models/category");

const Hsn = require("../models/hsn");

const generateItemCode = async (superAdminId) => {
    let code;
    let exists = true;

    while (exists) {
        code = Math.floor(10000 + Math.random() * 90000).toString();

        exists = await Product.findOne({
            itemCode: code,
            superAdminId
        });
    }

    return code;
};

exports.productcreate = async (req, res) => {

    try {
        const {
            name,
            description,
            categoryId,
            hsnCode,
            gstRate,
            mrp,
            unit,
            unitValue,
            costPrice,
            retailPrice,
            wholesalePrice,
            barcode,
            priceLevel,
            productType,
            parentProductId,
            lowStockQty,
            openingStock
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Name required"
            });
        }

        const hierarchy = attachHierarchy(req.user);

        console.log("USER ROLE:", req.user.role);
        console.log("USER ID:", req.user.userId);
        console.log("TOKEN SUPERADMIN ID:", req.user.superAdminId);
        console.log("HIERARCHY SUPERADMIN ID:", hierarchy.superAdminId);

        const itemCode = await generateItemCode(hierarchy.superAdminId);

        let cat = null;

        if (categoryId) {
            cat = await category.findOne({
                _id: categoryId,
                superAdminId: hierarchy.superAdminId
            });

            if (!cat) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found"
                });
            }
        }

        const allowedGstRates = ["none", "0", "5", "12", "18", "40"];

        let processedGstRate;

        if (
            gstRate === undefined ||
            gstRate === null ||
            gstRate === ""
        ) {
            processedGstRate = "none";
        } else {
            processedGstRate = String(gstRate).trim().toLowerCase();
        }

        if (!allowedGstRates.includes(processedGstRate)) {
            return res.status(400).json({
                success: false,
                message: "GST rate must be none, 0, 5, 12, 18 or 40"
            });
        }


        const allowedUnits = ["pcs", "kg", "g", "tin", "box"];

        let finalUnit = unit
            ? String(unit).trim().toLowerCase()
            : "pcs";

        if (finalUnit === "gram" || finalUnit === "grams") {
            finalUnit = "g";
        }

        if (finalUnit === "piece" || finalUnit === "pieces") {
            finalUnit = "pcs";
        }


        const finalUnitValue =
            unitValue !== undefined && unitValue !== null && unitValue !== ""
                ? Number(unitValue)
                : undefined;

        if (!allowedUnits.includes(finalUnit)) {
            return res.status(400).json({
                success: false,
                message: "Unit must be pcs, kg, g, tin or box"
            });
        }


        if (
            finalUnitValue !== undefined &&
            (isNaN(finalUnitValue) || finalUnitValue <= 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid unitValue is required"
            });
        }


        const processedMrp = Number(mrp || 0);

        const allowedProductTypes = ["normal", "bulk", "repack"];

        const finalProductType = productType
            ? String(productType).trim().toLowerCase()
            : "normal";

        if (!allowedProductTypes.includes(finalProductType)) {
            return res.status(400).json({
                success: false,
                message: "Product type must be normal, bulk or repack"
            });
        }
        let finalParentProductId = null;

        if (finalProductType === "repack") {
            if (!parentProductId) {
                return res.status(400).json({
                    success: false,
                    message: "Parent bulk product required for repack product"
                });
            }

            const parentProduct = await Product.findOne({
                _id: parentProductId,
                productType: "bulk",
                superAdminId: hierarchy.superAdminId
            });

            if (!parentProduct) {
                return res.status(404).json({
                    success: false,
                    message: "Parent bulk product not found"
                });
            }

            finalParentProductId = parentProductId;
        }


        const processedCostPrice = Number(costPrice || 0);
        const processedRetailPrice = Number(retailPrice || 0);
        const processedWholesalePrice = Number(wholesalePrice || 0);

        const processedLowStockQty = Number(lowStockQty || 10);

        if (isNaN(processedLowStockQty) || processedLowStockQty < 0) {
            return res.status(400).json({
                success: false,
                message: "Valid low stock qty is required"
            });
        }

        const processedOpeningStock = Number(openingStock ?? 0);

        if (
            !Number.isFinite(processedOpeningStock) ||
            processedOpeningStock < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid opening stock is required"
            });
        }


        let barcodeCode = "";

        if (barcode) {
            barcodeCode = String(barcode).trim();

        }
        const product = await Product.create({
            name: String(name).trim(),
            itemCode,


            description: description
                ? String(description).trim()
                : "",

            stock: processedOpeningStock,
            lowStockQty: processedLowStockQty,
            reservedStock: 0,

            mrp: processedMrp,

            unit: finalUnit,
            ...(finalUnitValue !== undefined && { unitValue: finalUnitValue }),

            costPrice: processedCostPrice,
            retailPrice: processedRetailPrice,
            wholesalePrice: processedWholesalePrice,

            categoryId: categoryId || null,
            categoryName: cat ? cat.name : "",

            hsnCode: hsnCode ? String(hsnCode).trim() : "",
            gstRate: processedGstRate,

            productType: finalProductType,
            parentProductId: finalParentProductId,

            ...hierarchy,
            createdBy: req.user.userId
        });



        let createdBarcode = null;

        if (barcode) {
            const barcodeCode = String(barcode).trim();



            createdBarcode = await Barcode.create({
                productId: product._id,
                code: barcodeCode,

                ...hierarchy,
                createdBy: req.user.userId
            });
        }

        let createdPriceLevel = null;

        if (priceLevel) {
            createdPriceLevel = await PriceLevel.findOneAndUpdate(
                {
                    productId: product._id,
                    superAdminId: hierarchy.superAdminId
                },
                {
                    productId: product._id,
                    pricingType: priceLevel.pricingType || "slab",
                    manualPrice: priceLevel.manualPrice || 0,
                    autoPricing: priceLevel.autoPricing || {
                        baseOn: "costPrice",
                        profitPercent: 0
                    },
                    slabs: priceLevel.slabs || [],

                    ...hierarchy,
                    createdBy: req.user.userId,
                    isActive: true
                },
                {
                    upsert: true,
                    returnDocument: "after",
                    runValidators: true
                }
            );
        }

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: {
                product,
                barcode: createdBarcode,
                priceLevel: createdPriceLevel
            }
        });


    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Product already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.bulkProductCreate = async (req, res) => {
    try {
        const { products } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Products array is required"
            });
        }

        const hierarchy = attachHierarchy(req.user);

        const bulkId = new mongoose.Types.ObjectId();

        const allowedGstRates = ["none", "0", "5", "12", "18", "40"];

        const allowedUnits = ["pcs", "kg", "g", "tin", "box"];

        const errors = [];
        const validatedProducts = [];
        const requestBarcodes = new Set();





        for (let i = 0; i < products.length; i++) {
            try {
                const item = products[i];

                const name = item.name
                    ? String(item.name).trim()
                    : "";

                const brand = item.brand
                    ? String(item.brand).trim()
                    : "";

                const description = item.description
                    ? String(item.description).trim()
                    : "";

                const categoryId = item.categoryId || null;

                const hsnCode = item.hsnCode
                    ? String(item.hsnCode).trim()
                    : "";

                const barcodeCode = item.barcode
                    ? String(item.barcode).trim()
                    : "";



                if (!name) {
                    errors.push({
                        row: i + 1,
                        name,
                        barcode: barcodeCode,
                        message: "Name is required"
                    });

                    continue;
                }



                let cat = null;

                if (categoryId) {
                    cat = await category.findOne({
                        _id: categoryId,
                        superAdminId: hierarchy.superAdminId
                    });

                    if (!cat) {
                        errors.push({
                            row: i + 1,
                            name,
                            barcode: barcodeCode,
                            message: "Category not found"
                        });

                        continue;
                    }
                }



                let processedGstRate;

                if (
                    item.gstRate === undefined ||
                    item.gstRate === null ||
                    item.gstRate === ""
                ) {
                    processedGstRate = "none";
                } else {
                    processedGstRate = String(item.gstRate).trim().toLowerCase();
                }

                if (!allowedGstRates.includes(processedGstRate)) {
                    errors.push({
                        row: i + 1,
                        name,
                        barcode: barcodeCode,
                        message: "GST rate must be none, 0, 5, 12, 18 or 40"
                    });

                    continue;
                }


                let finalUnit = item.unit
                    ? String(item.unit).trim().toLowerCase()
                    : "pcs";

                if (
                    finalUnit === "gram" ||
                    finalUnit === "grams"
                ) {
                    finalUnit = "g";
                }

                if (!allowedUnits.includes(finalUnit)) {
                    errors.push({
                        row: i + 1,
                        name,
                        barcode: barcodeCode,
                        message: "Unit must be pcs, kg, g, tin or box"
                    });

                    continue;
                }


                const finalUnitValue =
                    item.unitValue !== undefined &&
                        item.unitValue !== null &&
                        item.unitValue !== ""
                        ? Number(item.unitValue)
                        : undefined;

                if (
                    finalUnitValue !== undefined &&
                    (
                        isNaN(finalUnitValue) ||
                        finalUnitValue <= 0
                    )
                ) {
                    errors.push({
                        row: i + 1,
                        name,
                        barcode: barcodeCode,
                        message: "Valid unitValue is required"
                    });

                    continue;
                }



                const processedMrp = Number(item.mrp || 0);



                const allowedProductTypes = [
                    "normal",
                    "bulk",
                    "repack"
                ];

                const finalProductType = item.productType
                    ? String(item.productType).trim().toLowerCase()
                    : "normal";

                if (!allowedProductTypes.includes(finalProductType)) {
                    errors.push({
                        row: i + 1,
                        name,
                        barcode: barcodeCode,
                        message:
                            "Product type must be normal, bulk or repack"
                    });

                    continue;
                }



                let finalParentProductId = null;

                if (finalProductType === "repack") {
                    if (!item.parentProductId) {
                        errors.push({
                            row: i + 1,
                            name,
                            barcode: barcodeCode,
                            message:
                                "Parent bulk product required for repack product"
                        });

                        continue;
                    }

                    const parentProduct = await Product.findOne({
                        _id: item.parentProductId,
                        productType: "bulk",
                        superAdminId: hierarchy.superAdminId
                    });

                    if (!parentProduct) {
                        errors.push({
                            row: i + 1,
                            name,
                            barcode: barcodeCode,
                            message:
                                "Parent bulk product not found"
                        });

                        continue;
                    }

                    finalParentProductId = item.parentProductId;
                }



                const processedCostPrice =
                    Number(item.costPrice || 0);

                const processedRetailPrice =
                    Number(item.retailPrice || 0);

                const processedWholesalePrice =
                    Number(item.wholesalePrice || 0);

                const processedLowStockQty =
                    Number(item.lowStockQty || 10);



                const processedOpeningStock =
                    item.openingStock !== undefined &&
                        item.openingStock !== null &&
                        item.openingStock !== ""
                        ? Number(item.openingStock)
                        : 0;

                if (
                    isNaN(processedOpeningStock) ||
                    processedOpeningStock < 0
                ) {
                    errors.push({
                        row: i + 1,
                        name,
                        barcode: barcodeCode,
                        message:
                            "Valid opening stock is required"
                    });

                    continue;
                }



                if (
                    isNaN(processedLowStockQty) ||
                    processedLowStockQty < 0
                ) {
                    errors.push({
                        row: i + 1,
                        name,
                        barcode: barcodeCode,
                        message:
                            "Valid low stock qty is required"
                    });

                    continue;
                }




                validatedProducts.push({
                    row: i + 1,
                    item,
                    name,
                    brand,
                    description,
                    categoryId,
                    cat,
                    hsnCode,
                    barcodeCode,
                    processedGstRate,
                    finalUnit,
                    finalUnitValue,
                    processedMrp,
                    finalProductType,
                    finalParentProductId,
                    processedCostPrice,
                    processedRetailPrice,
                    processedWholesalePrice,
                    processedLowStockQty,
                    processedOpeningStock
                });

            } catch (err) {
                errors.push({
                    row: i + 1,
                    name: products[i]?.name || "",
                    barcode: products[i]?.barcode || "",
                    message:
                        err.code === 11000
                            ? "Duplicate product or barcode"
                            : err.message
                });
            }
        }



        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Bulk product add failed. Fix all errors and try again.",
                bulkId,
                total: products.length,
                createdCount: 0,
                errorCount: errors.length,
                data: [],
                errors
            });
        }



        const createdProducts = [];

        for (const validated of validatedProducts) {
            const {
                row,
                item,
                name,
                brand,
                description,
                categoryId,
                cat,
                hsnCode,
                barcodeCode,
                processedGstRate,
                finalUnit,
                finalUnitValue,
                processedMrp,
                finalProductType,
                finalParentProductId,
                processedCostPrice,
                processedRetailPrice,
                processedWholesalePrice,
                processedLowStockQty,
                processedOpeningStock
            } = validated;

            const itemCode =
                await generateItemCode(
                    hierarchy.superAdminId
                );



            const product = await Product.create({
                itemCode,

                name,
                brand,
                description,

                productType: finalProductType,
                parentProductId: finalParentProductId,

                bulkId,

                stock: processedOpeningStock,
                lowStockQty: processedLowStockQty,
                reservedStock: 0,

                mrp: processedMrp,

                unit: finalUnit,

                ...(finalUnitValue !== undefined && {
                    unitValue: finalUnitValue
                }),

                costPrice: processedCostPrice,
                retailPrice: processedRetailPrice,
                wholesalePrice: processedWholesalePrice,

                categoryId,
                categoryName: cat
                    ? cat.name
                    : null,

                hsnCode,
                gstRate: processedGstRate,

                ...hierarchy,
                createdBy: req.user.userId
            });



            let createdBarcode = null;

            if (barcodeCode) {
                createdBarcode =
                    await Barcode.create({
                        productId: product._id,
                        code: barcodeCode,



                        mrp: processedMrp,

                        unit: finalUnit,

                        ...(finalUnitValue !== undefined && {
                            unitValue: finalUnitValue
                        }),

                        costPrice: processedCostPrice,
                        retailPrice: processedRetailPrice,
                        wholesalePrice: processedWholesalePrice,
                        gstRate: processedGstRate,

                        isSold: false,

                        ...hierarchy,
                        createdBy: req.user.userId
                    });
            }




            let createdPriceLevel = null;

            if (item.priceLevel) {
                createdPriceLevel =
                    await PriceLevel.findOneAndUpdate(
                        {
                            productId: product._id,
                            superAdminId:
                                hierarchy.superAdminId
                        },
                        {
                            productId: product._id,

                            pricingType:
                                item.priceLevel.pricingType ||
                                "slab",

                            manualPrice:
                                item.priceLevel.manualPrice ||
                                0,

                            autoPricing:
                                item.priceLevel.autoPricing || {
                                    baseOn: "costPrice",
                                    profitPercent: 0
                                },

                            slabs:
                                item.priceLevel.slabs || [],

                            ...hierarchy,

                            createdBy: req.user.userId,

                            isActive: true
                        },
                        {
                            upsert: true,
                            new: true,
                            runValidators: true
                        }
                    );
            }



            createdProducts.push({
                ...product.toObject(),

                priceLevel: createdPriceLevel
                    ? {
                        id: createdPriceLevel._id,
                        pricingType: createdPriceLevel.pricingType
                    }
                    : null,

                barcodeCount: createdBarcode ? 1 : 0,

                barcodes: createdBarcode
                    ? [
                        {
                            barcodeId: createdBarcode._id,
                            barcode: createdBarcode.code,
                            productId: product._id
                        }
                    ]
                    : []
            });
        }


        return res.status(201).json({
            success: true,
            message: "Bulk product add completed",

            bulkId,

            total: products.length,

            createdCount: createdProducts.length,

            errorCount: 0,

            data: createdProducts,

            errors: []
        });

    } catch (err) {
        console.error(
            "Bulk product create error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.getProductsByBulkId = async (req, res) => {
    try {
        const { bulkId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(bulkId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bulk ID"
            });
        }

        const hierarchy = attachHierarchy(req.user);

        const products = await Product.find({
            bulkId,
            superAdminId: hierarchy.superAdminId
        }).sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            bulkId,
            count: products.length,
            data: products
        });

    } catch (err) {
        console.error("Get bulk products error:", err);

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.getproductMrps = async (req, res) => {
    try {
        const { productId } = req.params;

        const hierarchy = attachHierarchy(req.user);

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            productId: product._id,
            name: product.name,
            brand: product.brand,

            mrps: product.variants.map(v => ({
                variantId: v._id,
                mrp: v.mrp
            }))
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};

exports.getProductsByType = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);
        const { productType } = req.query;

        const allowedProductTypes = ["normal", "bulk", "repack"];

        if (!productType || !allowedProductTypes.includes(productType)) {
            return res.status(400).json({
                success: false,
                message: "productType must be normal, bulk or repack"
            });
        }

        const products = await Product.find({
            superAdminId: hierarchy.superAdminId,
            productType
        })
            .populate("categoryId", "name")
            .populate("parentProductId", "name productType unit unitValue stock")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: `${productType} products fetched successfully`,
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


exports.allProducts = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        let products = await Product.find({
            superAdminId: hierarchy.superAdminId
        })
            .populate("categoryId", "name")
            .sort({ createdAt: -1 })
            .lean();

        products = await Promise.all(
            products.map(async (product) => {
                const barcodes = await Barcode.find({
                    productId: product._id,
                    superAdminId: hierarchy.superAdminId
                })
                    .sort({ createdAt: -1 })
                    .lean();

                const priceLevel = await PriceLevel.findOne({
                    productId: product._id,
                    superAdminId: hierarchy.superAdminId,
                    isActive: true
                }).lean();



                return {
                    ...product,
                    stock: Number(Number(product.stock || 0).toFixed(2)),


                    barcodeCount: barcodes.length,

                    barcodes: barcodes.map((barcode) => ({
                        barcodeId: barcode._id,
                        barcode: barcode.code || "",
                        productId: barcode.productId
                    })),

                    priceLevel: priceLevel
                        ? {
                            pricingType: priceLevel.pricingType,
                            manualPrice: priceLevel.manualPrice,
                            autoPricing: priceLevel.autoPricing,
                            slabs: priceLevel.slabs
                        }
                        : null
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: "Products fetched successfully",
            count: products.length,
            data: products
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};



exports.searchProducts = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);
        const { search } = req.query;

        if (!search) {
            return res.status(400).json({
                success: false,
                message: "Search value is required"
            });
        }


        const barcodeRecords = await Barcode.find({
            superAdminId: hierarchy.superAdminId,
            code: { $regex: search, $options: "i" }
        }).select("productId code");


        const barcodeProductIds = barcodeRecords.map(
            (barcode) => barcode.productId
        );

        const products = await Product.find({
            superAdminId: hierarchy.superAdminId,
            isActive: { $ne: false },
            $or: [
                { name: { $regex: search, $options: "i" } },
                { itemCode: { $regex: search, $options: "i" } },
                { brand: { $regex: search, $options: "i" } },
                { hsnCode: { $regex: search, $options: "i" } },
                { _id: { $in: barcodeProductIds } }
            ]
        })
            .populate("categoryId", "name hsnCode gstRate")
            .sort({ createdAt: -1 })
            .limit(20);

        const data = products.map((product) => ({
            productId: product._id,
            productName: product.name || "",
            itemCode: product.itemCode || "",

            stock: parseFloat((product.stock || 0).toFixed(2)),
            reservedStock: parseFloat((product.reservedStock || 0).toFixed(2)),

            categoryId: product.categoryId?._id || "",
            categoryName: product.categoryId?.name || "",

            hsnCode: product.hsnCode || product.categoryId?.hsnCode || "",
            gstRate: Number(product.gstRate || product.categoryId?.gstRate || 0),

            costPrice: Number(product.costPrice || 0),

            retailPrice: Number(product.retailPrice || 0),
            wholesalePrice: Number(product.wholesalePrice || 0),

            mrp:
                product.mrps?.length > 0
                    ? Number(product.mrps[0].mrp || 0)
                    : 0,

            unitValue: Number(product.unitValue || 0),
            unit: product.unit || "",

            mrp: Number(product.mrp || 0),

            barcodes: barcodeRecords
                .filter(
                    (barcode) =>
                        String(barcode.productId) === String(product._id)
                )
                .map((barcode) => barcode.code),

            status:
                Number(product.stock || 0) <= 0
                    ? "Out Of Stock"
                    : Number(product.stock || 0) <= 10
                        ? "Low Stock"
                        : "Available"
        }));

        return res.status(200).json({
            success: true,
            count: data.length,
            data
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.searchProductsByCategory = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);
        const { categoryId } = req.params;
        const { search } = req.query;

        const cat = await category.findOne({
            _id: categoryId,
            superAdminId: hierarchy.superAdminId,
            isActive: true
        });

        if (!cat) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        const filter = {
            superAdminId: hierarchy.superAdminId,
            categoryId: cat._id,
            isActive: { $ne: false }
        };

        if (search) {
            const categoryName = String(cat.name || "").toLowerCase();
            const searchValue = String(search || "").toLowerCase();

            if (!categoryName.includes(searchValue)) {
                filter.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { brand: { $regex: search, $options: "i" } },
                    { hsnCode: { $regex: search, $options: "i" } }
                ];
            }
        }

        const products = await Product.find(filter)
            .populate("categoryId", "name hsnCode gstRate")
            .sort({ createdAt: -1 });

        const data = products.map((product) => ({
            productId: product._id,
            productName: product.name || "",
            brand: product.brand || "",
            stock: Number((product.stock || 0).toFixed(2)),
            reservedStock: Number(product.reservedStock || 0),

            categoryId: product.categoryId?._id || "",
            categoryName: product.categoryId?.name || "",

            hsnCode: product.hsnCode || product.categoryId?.hsnCode || "",
            gstRate: Number(product.gstRate || product.categoryId?.gstRate || 0),


            mrps: product.mrps || [],

            status:
                Number(product.stock || 0) <= 0
                    ? "Out Of Stock"
                    : Number(product.stock || 0) <= 10
                        ? "Low Stock"
                        : "Available"
        }));

        return res.status(200).json({
            success: true,
            category: {
                categoryId: cat._id,
                categoryName: cat.name,
                hsnCode: cat.hsnCode,
                gstRate: cat.gstRate
            },
            count: data.length,
            data
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.ProductsById = async (req, res) => {
    try {
        const { id } = req.params;
        const hierarchy = attachHierarchy(req.user);

        const product = await Product.findOne({
            _id: id,
            superAdminId: hierarchy.superAdminId
        })
            .populate("categoryId", "name hsnCode gstRate")
            .populate("hsnId", "hsnCode gstRate cgst sgst igst cess")
            .lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const barcodes = await Barcode.find({
            productId: product._id,
            superAdminId: hierarchy.superAdminId
        })
            .sort({ createdAt: -1 })
            .lean();

        const priceLevel = await PriceLevel.findOne({
            productId: product._id,
            superAdminId: hierarchy.superAdminId,
            isActive: true
        }).lean();



        return res.status(200).json({
            success: true,
            data: {
                ...product,


                barcodeCount: barcodes.length,

                lowStockQty: product.lowStockQty || 10,

                barcodes: barcodes.map((barcode) => ({
                    barcodeId: barcode._id,
                    barcode: barcode.code || "",
                    productId: barcode.productId
                })),

                priceLevel: priceLevel || null
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


exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            description,
            categoryId,
            hsnCode,
            gstRate,
            mrp,
            unit,
            unitValue,
            lowStockQty,
            costPrice,
            retailPrice,
            wholesalePrice,
            barcode,
            openingStock
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product id"
            });
        }

        const hierarchy = attachHierarchy(req.user);

        const product = await Product.findOne({
            _id: id,
            superAdminId: hierarchy.superAdminId
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        if (categoryId) {
            const cat = await category.findOne({
                _id: categoryId,
                superAdminId: hierarchy.superAdminId
            });

            if (!cat) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found"
                });
            }

            product.categoryId = categoryId;
            product.categoryName = cat.name || "";
        }

        if (name) product.name = String(name).trim();

        if (description !== undefined) {
            product.description = String(description).trim();
        }

        if (hsnCode !== undefined) {
            product.hsnCode = hsnCode ? String(hsnCode).trim() : "";
        }

        if (gstRate !== undefined) {
            const processedGstRate = String(gstRate).trim().toLowerCase();

            const allowedGstRates = ["none", "0", "5", "12", "18", "40"];

            if (!allowedGstRates.includes(processedGstRate)) {
                return res.status(400).json({
                    success: false,
                    message: "GST rate must be none, 0, 5, 12, 18 or 40"
                });
            }

            product.gstRate = processedGstRate;
        }

        if (mrp !== undefined) {
            const processedMrp = Number(mrp);

            if (isNaN(processedMrp) || processedMrp < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Valid MRP is required"
                });
            }

            product.mrp = processedMrp;
        }


        const allowedUnits = ["pcs", "kg", "g", "tin", "box"];

        if (unit !== undefined) {
            let finalUnit = String(unit).trim().toLowerCase();

            if (finalUnit === "gram" || finalUnit === "grams") {
                finalUnit = "g";
            }

            if (!allowedUnits.includes(finalUnit)) {
                return res.status(400).json({
                    success: false,
                    message: "Unit must be pcs, kg, g, tin or box"
                });
            }

            product.unit = finalUnit;
        }


        if (unitValue !== undefined) {
            const processedUnitValue = Number(unitValue);

            if (isNaN(processedUnitValue) || processedUnitValue <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Valid unitValue is required"
                });
            }

            product.unitValue = processedUnitValue;
        }

        if (lowStockQty !== undefined) {
            const processedLowStockQty = Number(lowStockQty);

            if (isNaN(processedLowStockQty) || processedLowStockQty < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Valid low stock qty is required"
                });
            }

            product.lowStockQty = processedLowStockQty;
        }

        if (costPrice !== undefined) {
            const processedCostPrice = Number(costPrice);

            if (isNaN(processedCostPrice) || processedCostPrice < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Valid cost price is required"
                });
            }

            product.costPrice = processedCostPrice;
        }

        if (retailPrice !== undefined) {
            const processedRetailPrice = Number(retailPrice);

            if (
                !Number.isFinite(processedRetailPrice) ||
                processedRetailPrice < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid retail price is required"
                });
            }

            product.retailPrice = processedRetailPrice;
        }

        if (wholesalePrice !== undefined) {
            const processedWholesalePrice = Number(wholesalePrice);

            if (
                !Number.isFinite(processedWholesalePrice) ||
                processedWholesalePrice < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid wholesale price is required"
                });
            }

            product.wholesalePrice = processedWholesalePrice;
        }
        if (
            product.mrp &&
            product.costPrice !== undefined &&
            product.costPrice > product.mrp
        ) {
            return res.status(400).json({
                success: false,
                message: "Cost price cannot be greater than MRP"
            });
        }

        if (
            product.mrp &&
            product.retailPrice !== undefined &&
            product.retailPrice > product.mrp
        ) {
            return res.status(400).json({
                success: false,
                message: "Retail price cannot be greater than MRP"
            });
        }

        if (
            product.mrp &&
            product.wholesalePrice !== undefined &&
            product.wholesalePrice > product.mrp
        ) {
            return res.status(400).json({
                success: false,
                message: "Wholesale price cannot be greater than MRP"
            });
        }

        product.updatedBy = req.user.userId || req.user.id;

        if (openingStock !== undefined) {
            const processedOpeningStock = Number(openingStock);

            if (
                !Number.isFinite(processedOpeningStock) ||
                processedOpeningStock < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid opening stock is required"
                });
            }


            product.stock = processedOpeningStock;

        }

        let createdBarcode = null;

        if (
            barcode !== undefined &&
            barcode !== null &&
            String(barcode).trim() !== ""
        ) {
            const barcodeCode = String(barcode).trim();



            const existingBarcode = await Barcode.findOne({
                productId: product._id,
                superAdminId: hierarchy.superAdminId
            });


            if (existingBarcode) {
                existingBarcode.code = barcodeCode;
                await existingBarcode.save();
                createdBarcode = existingBarcode;
            } else {
                createdBarcode = await Barcode.create({
                    productId: product._id,
                    code: barcodeCode,

                    ...hierarchy,
                    createdBy: req.user.userId
                });
            }
        }

        await product.save();

        const barcodes = await Barcode.find({
            productId: product._id,
            superAdminId: hierarchy.superAdminId
        }).lean();

        return res.json({
            success: true,
            message: "Product updated successfully",
            data: {
                product,
                createdBarcode,
                barcodes
            }
        });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Product already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};



exports.bulkProductUpdate = async (req, res) => {
    try {
        const { bulkId } = req.params;
        const { products } = req.body;

        if (!bulkId) {
            return res.status(400).json({
                success: false,
                message: "Bulk ID is required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(bulkId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bulk ID"
            });
        }

        if (
            !Array.isArray(products) ||
            products.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Products array is required"
            });
        }

        const hierarchy = attachHierarchy(req.user);

        const updatedProducts = [];
        const errors = [];

        for (let i = 0; i < products.length; i++) {
            try {
                const item = products[i];

                if (!item.productId) {
                    errors.push({
                        row: i + 1,
                        message:
                            "Product ID is required"
                    });
                    continue;
                }


                const product =
                    await Product.findOne({
                        _id: item.productId,
                        bulkId: bulkId,
                        superAdminId:
                            hierarchy.superAdminId
                    });

                if (!product) {
                    errors.push({
                        row: i + 1,
                        productId:
                            item.productId,
                        message:
                            "Product not found in this bulk"
                    });
                    continue;
                }



                if (item.name !== undefined) {
                    const name =
                        String(item.name).trim();

                    if (!name) {
                        errors.push({
                            row: i + 1,
                            message:
                                "Product name cannot be empty"
                        });
                        continue;
                    }

                    product.name = name;
                }

                if (item.brand !== undefined) {
                    product.brand =
                        String(item.brand).trim();
                }

                if (
                    item.description !== undefined
                ) {
                    product.description =
                        String(
                            item.description
                        ).trim();
                }

                if (item.hsnCode !== undefined) {
                    product.hsnCode =
                        String(
                            item.hsnCode
                        ).trim();
                }

                // -------------------------
                // CATEGORY
                // -------------------------

                if (item.categoryId) {
                    const cat =
                        await category.findOne({
                            _id:
                                item.categoryId,
                            superAdminId:
                                hierarchy.superAdminId
                        });

                    if (!cat) {
                        errors.push({
                            row: i + 1,
                            message:
                                "Category not found"
                        });
                        continue;
                    }

                    product.categoryId =
                        item.categoryId;

                    product.categoryName =
                        cat.name || "";
                }

                // -------------------------
                // GST
                // -------------------------

                if (
                    item.gstRate !== undefined
                ) {
                    const gstRate =
                        Number(
                            item.gstRate
                        );

                    if (
                        isNaN(gstRate) ||
                        ![
                            0,
                            5,
                            12,
                            18,
                            28
                        ].includes(gstRate)
                    ) {
                        errors.push({
                            row: i + 1,
                            message:
                                "GST rate must be 0, 5, 12, 18 or 28"
                        });
                        continue;
                    }

                    product.gstRate =
                        gstRate;
                }

                // -------------------------
                // MRP
                // -------------------------

                if (
                    item.mrp !== undefined
                ) {
                    const mrp =
                        Number(item.mrp);

                    if (
                        isNaN(mrp) ||
                        mrp < 0
                    ) {
                        errors.push({
                            row: i + 1,
                            message:
                                "Invalid MRP"
                        });
                        continue;
                    }

                    product.mrp = mrp;
                }

                // -------------------------
                // COST PRICE
                // -------------------------

                if (
                    item.costPrice !==
                    undefined
                ) {
                    const costPrice =
                        Number(
                            item.costPrice
                        );

                    if (
                        isNaN(costPrice) ||
                        costPrice < 0
                    ) {
                        errors.push({
                            row: i + 1,
                            message:
                                "Invalid cost price"
                        });
                        continue;
                    }

                    product.costPrice =
                        costPrice;
                }

                // -------------------------
                // RETAIL PRICE
                // -------------------------

                if (
                    item.retailPrice !==
                    undefined
                ) {
                    const retailPrice =
                        Number(
                            item.retailPrice
                        );

                    if (
                        isNaN(retailPrice) ||
                        retailPrice < 0
                    ) {
                        errors.push({
                            row: i + 1,
                            message:
                                "Invalid retail price"
                        });
                        continue;
                    }

                    product.retailPrice =
                        retailPrice;
                }


                if (
                    item.wholesalePrice !==
                    undefined
                ) {
                    const wholesalePrice =
                        Number(
                            item.wholesalePrice
                        );

                    if (
                        isNaN(wholesalePrice) ||
                        wholesalePrice < 0
                    ) {
                        errors.push({
                            row: i + 1,
                            message:
                                "Invalid wholesale price"
                        });
                        continue;
                    }

                    product.wholesalePrice =
                        wholesalePrice;
                }

                if (
                    item.lowStockQty !==
                    undefined
                ) {
                    const lowStockQty =
                        Number(
                            item.lowStockQty
                        );

                    if (
                        isNaN(lowStockQty) ||
                        lowStockQty < 0
                    ) {
                        errors.push({
                            row: i + 1,
                            message:
                                "Invalid low stock quantity"
                        });
                        continue;
                    }

                    product.lowStockQty =
                        lowStockQty;
                }

                // -------------------------
                // UNIT
                // -------------------------

                if (item.unit !== undefined) {
                    let unit =
                        String(item.unit)
                            .trim()
                            .toLowerCase();

                    if (
                        unit === "gram" ||
                        unit === "grams"
                    ) {
                        unit = "g";
                    }

                    if (
                        ![
                            "pcs",
                            "kg",
                            "g"
                        ].includes(unit)
                    ) {
                        errors.push({
                            row: i + 1,
                            message:
                                "Unit must be pcs, kg or g"
                        });
                        continue;
                    }

                    product.unit = unit;
                }

                // -------------------------
                // UNIT VALUE
                // -------------------------

                if (
                    item.unitValue !==
                    undefined
                ) {
                    const unitValue =
                        Number(
                            item.unitValue
                        );

                    if (
                        isNaN(unitValue) ||
                        unitValue <= 0
                    ) {
                        errors.push({
                            row: i + 1,
                            message:
                                "Invalid unit value"
                        });
                        continue;
                    }

                    product.unitValue =
                        unitValue;
                }

                await product.save();

                // -------------------------
                // UPDATE BARCODE DATA
                // -------------------------

                const barcode =
                    await Barcode.findOne({
                        productId:
                            product._id,
                        superAdminId:
                            hierarchy.superAdminId
                    });

                if (barcode) {
                    barcode.mrp =
                        product.mrp;

                    barcode.unit =
                        product.unit;

                    barcode.unitValue =
                        product.unitValue;

                    barcode.costPrice =
                        product.costPrice;

                    barcode.retailPrice =
                        product.retailPrice;

                    barcode.wholesalePrice =
                        product.wholesalePrice;

                    barcode.gstRate =
                        product.gstRate;

                    await barcode.save();
                }

                updatedProducts.push({
                    row: i + 1,
                    product
                });

            } catch (err) {
                errors.push({
                    row: i + 1,
                    message:
                        err.message
                });
            }
        }

        return res.status(200).json({
            success: true,
            message:
                "Bulk product update completed",

            bulkId,

            total:
                products.length,

            updatedCount:
                updatedProducts.length,

            errorCount:
                errors.length,

            data:
                updatedProducts,

            errors
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};



exports.deleteAllProducts = async (req, res) => {

    try {

        const hierarchy = attachHierarchy(req.user);

        const result = await Product.deleteMany({
            superAdminId: hierarchy.superAdminId
        });

        res.json({
            success: true,
            message: "All products deleted successfully",
            deletedCount: result.deletedCount
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};

exports.deleteProduct = async (req, res) => {

    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product id"
            });
        }

        const hierarchy = attachHierarchy(req.user);

        const product = await Product.findOneAndDelete({
            _id: id,
            superAdminId: hierarchy.superAdminId
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }


        await Barcode.deleteMany({
            productId: product._id,
            superAdminId: hierarchy.superAdminId
        });

        res.json({
            success: true,
            message: "Product  deleted successfully"
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};