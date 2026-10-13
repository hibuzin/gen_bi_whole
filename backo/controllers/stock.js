const Product = require("../models/product");
const mongoose = require("mongoose");
const Purchase = require("../models/purchase");
const Barcode = require("../models/barcode");
const Bill = require("../models/bill");
const { attachHierarchy } = require("../utils/hierarchy");


exports.allstockcheck = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const products = await Product.find({
            superAdminId: hierarchy.superAdminId
        }).lean();

        const barcodes = await Barcode.find({
            superAdminId: hierarchy.superAdminId
        })
            .select("productId code")
            .lean();

        const data = [];

        const formatQty = (value) => {
            const num = Number(value || 0);

            return Number.isInteger(num)
                ? String(num)
                : String(Number(num.toFixed(2)));
        };

        // Group barcodes by product
        const barcodeMap = new Map();

        for (const barcode of barcodes) {
            if (!barcode.productId) continue;

            const productId = String(barcode.productId);

            if (!barcodeMap.has(productId)) {
                barcodeMap.set(productId, []);
            }

            barcodeMap.get(productId).push(barcode);
        }

        for (const product of products) {
            const productId = String(product._id);

            const productBarcodes =
                barcodeMap.get(productId) || [];

            // -----------------------------------------
            // PRODUCT STOCK = SINGLE SOURCE OF TRUTH
            // -----------------------------------------

            const currentStock = Number(
                Number(product.stock || 0).toFixed(2)
            );

            const unit = product.unit || "pcs";

            const unitValue = Number(
                product.unitValue ?? 1
            );

            const safeUnitValue =
                unitValue > 0 ? unitValue : 1;

            const costPrice = Number(
                product.costPrice || 0
            );


            let totalStockText = "";

            if (unit === "kg") {
                totalStockText =
                    `${formatQty(currentStock)} kg`;

            } else if (unit === "g") {
                totalStockText =
                    `${formatQty(currentStock / 1000)} kg`;

            } else {
                totalStockText =
                    `${formatQty(currentStock)} pcs`;
            }

            // -----------------------------------------
            // STOCK VALUE
            // -----------------------------------------

            let stockValue = 0;

            if (unit === "kg") {
                stockValue =
                    currentStock * costPrice;

            } else if (unit === "g") {
                stockValue =
                    (currentStock / 1000) * costPrice;

            } else {
                stockValue =
                    currentStock * costPrice;
            }

            stockValue = Number(
                stockValue.toFixed(2)
            );

            // -----------------------------------------
            // STOCK STATUS
            // -----------------------------------------

            let status = "Available";

            if (currentStock <= 0) {
                status = "Out Of Stock";
            } else if (
                currentStock <= Number(product.lowStockQty || 10)
            ) {
                status = "Low Stock";
            }



            // -----------------------------------------
            // ONE ROW PER PRODUCT
            // PRODUCT.STOCK IS SINGLE SOURCE OF TRUTH
            // -----------------------------------------

            const displayBarcode =
                productBarcodes.length > 0
                    ? productBarcodes[0].code
                    : null;

            data.push({
                productId: product._id,

                productName:
                    product.name || "",

                itemCode:
                    product.itemCode || "",

                barcode: displayBarcode,

                totalQty: currentStock,

                currentStock,

                soldQty: 0,

                actualStockQty:
                    currentStock,

                totalStockText,

                stockValue,

                mrp:
                    product.mrp || 0,

                costPrice,

                retailPrice:
                    Number(product.retailPrice || 0),

                wholesalePrice:
                    Number(product.wholesalePrice || 0),

                gst:
                    product.gstRate ?? "none",

                unit,

                unitValue,

                unitText:
                    `${safeUnitValue} ${unit}`,

                status
            });
        }



        data.sort((a, b) => {
            return String(b.productId).localeCompare(
                String(a.productId)
            );
        });


        const totalStockValue = Number(
            data
                .reduce(
                    (sum, item) =>
                        sum +
                        Number(item.stockValue || 0),
                    0
                )
                .toFixed(2)
        );

        return res.status(200).json({
            success: true,
            count: data.length,
            totalStockValue,
            data
        });

    } catch (err) {
        console.error(
            "allstockcheck error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.getAllRepackStock = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const products = await Product.find({
            superAdminId: hierarchy.superAdminId,
            productType: "repack"
        }).lean();



        const barcodes = await Barcode.find({
            superAdminId: hierarchy.superAdminId
        }).lean();

        const data = [];

        const formatQty = (value) => {
            const num = Number(value || 0);
            return Number.isInteger(num)
                ? String(num)
                : String(Number(num.toFixed(2)));
        };

        const barcodeMap = new Map();

        for (const barcode of barcodes) {
            const productId = String(barcode.productId);

            if (!barcodeMap.has(productId)) {
                barcodeMap.set(productId, []);
            }

            barcodeMap.get(productId).push(barcode);
        }



        for (const product of products) {

            const productId = String(product._id);

            const productBarcodes =
                barcodeMap.get(productId) || [];



            if (productBarcodes.length > 0) {

                const currentStock = Number(
                    Number(product.stock || 0).toFixed(2)
                );

                const totalQty = currentStock;

                const soldQty = 0;

                const unit = product.unit || "pcs";

                const unitValue = Number(
                    product.unitValue ?? 1
                );

                const safeUnitValue =
                    unitValue > 0 ? unitValue : 1;

                let totalStockText = "";

                if (unit === "kg") {
                    totalStockText =
                        `${formatQty(currentStock)} kg`;
                } else if (unit === "g") {
                    totalStockText =
                        `${formatQty(currentStock / 1000)} kg`;
                } else {
                    totalStockText =
                        `${formatQty(currentStock)} pcs`;
                }

                const costPrice = Number(
                    product.costPrice || 0
                );

                let stockValue = 0;

                if (unit === "g") {
                    stockValue =
                        (currentStock / 1000) * costPrice;
                } else {
                    stockValue =
                        currentStock * costPrice;
                }

                stockValue = Number(
                    stockValue.toFixed(2)
                );

                const gst = product.gstRate ?? "none";

                let status = "Available";

                if (currentStock <= 0) {
                    status = "Out Of Stock";
                } else if (
                    currentStock <= Number(product.lowStockQty || 10)
                ) {
                    status = "Low Stock";
                }

                for (const barcode of productBarcodes) {

                    data.push({
                        productId: product._id,

                        bulkProductId:
                            product.parentProductId || null,

                        productName:
                            product.name || "",

                        itemCode:
                            product.itemCode || "",

                        barcode:
                            barcode.code || null,

                        totalQty,

                        currentStock,

                        soldQty,

                        totalStockText,

                        mrp:
                            Number(product.mrp || 0),

                        costPrice,

                        retailPrice:
                            Number(product.retailPrice || 0),

                        wholesalePrice:
                            Number(product.wholesalePrice || 0),

                        gst,

                        stockValue,

                        unit,

                        unitValue: safeUnitValue,

                        unitText:
                            `${safeUnitValue} ${unit}`,

                        status
                    });
                }
            }


            else {

                const currentStock = Number(
                    Number(product.stock || 0).toFixed(2)
                );

                const totalQty = currentStock;

                const soldQty = 0;

                const unit =
                    product.unit || "pcs";

                const unitValue = Number(
                    product.unitValue || 1
                );

                let totalStockText = "";

                if (unit === "kg") {

                    totalStockText =
                        `${formatQty(
                            currentStock * unitValue
                        )} kg`;

                } else if (unit === "g") {

                    totalStockText =
                        `${formatQty(
                            (currentStock * unitValue) / 1000
                        )} kg`;

                } else {

                    totalStockText =
                        `${formatQty(currentStock)} pcs`;
                }

                const costPrice = Number(
                    product.costPrice || 0
                );

                const stockValue = Number(
                    (currentStock * costPrice).toFixed(2)
                );

                data.push({

                    productId: product._id,

                    bulkProductId:
                        product.parentProductId || null,

                    productName:
                        product.name || "",

                    itemCode:
                        product.itemCode || "",


                    barcode: null,

                    totalQty,

                    currentStock,

                    soldQty,

                    totalStockText,

                    mrp:
                        product.mrp || 0,

                    costPrice,

                    retailPrice:
                        Number(product.retailPrice || 0),

                    wholesalePrice:
                        Number(product.wholesalePrice || 0),

                    gst:
                        product.gstRate ?? "none",

                    stockValue,

                    unit,

                    unitValue,

                    unitText:
                        `${unitValue} ${unit}`,

                    status:
                        currentStock <= 0
                            ? "Out Of Stock"
                            : currentStock <= 10
                                ? "Low Stock"
                                : "Available"
                });
            }
        }



        data.sort((a, b) => {
            return String(b.productId).localeCompare(
                String(a.productId)
            );
        });

        return res.status(200).json({
            success: true,
            count: data.length,
            data
        });

    } catch (err) {

        console.error(
            "getAllRepackStock error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.getAllBulkProducts = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const bulkProducts = await Product.find({
            superAdminId: hierarchy.superAdminId,
            productType: "bulk"
        })
            .select(
                "name itemCode stock unit unitValue mrp costPrice retailPrice wholesalePrice gstRate lowStockQty"
            )

            .sort({ name: 1 });

        const data = bulkProducts.map((item) => {
            const stock = Number(item.stock || 0);
            const costPrice = Number(item.costPrice || 0);

            return {
                bulkId: item._id,
                productName: item.name,

                itemCode: item.itemCode || "",

                stock,
                unit: item.unit,
                unitValue: item.unitValue,

                mrp: item.mrp || 0,
                costPrice,

                retailPrice:
                    Number(item.retailPrice || 0),

                wholesalePrice:
                    Number(item.wholesalePrice || 0),

                gst: item.gstRate ?? "none",

                stockValue: Number((stock * costPrice).toFixed(2)),

                status:
                    stock <= 0
                        ? "Out Of Stock"
                        : stock <= 10
                            ? "Low Stock"
                            : "Available"
            };
        });

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


exports.stockCheckByBulkId = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);
        const { bulkId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(bulkId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bulk product id"
            });
        }

        const bulkProduct = await Product.findOne({
            _id: bulkId,
            superAdminId: hierarchy.superAdminId,
            productType: "bulk"
        });

        if (!bulkProduct) {
            return res.status(404).json({
                success: false,
                message: "Bulk product not found"
            });
        }

        const barcodes = await Barcode.find({
            superAdminId: hierarchy.superAdminId
        }).populate(
            "productId",
            "name itemCode stock unit unitValue mrp costPrice retailPrice wholesalePrice parentProductId productType gstRate lowStockQty"
        );

        const formatQty = (value) => {
            const num = Number(value || 0);
            return Number.isInteger(num)
                ? String(num)
                : String(Number(num.toFixed(2)));
        };

        const data = [];

        for (const barcode of barcodes) {
            const product = barcode.productId;

            if (!product) continue;


            if (
                product.productType !== "repack" ||
                String(product.parentProductId) !== String(bulkId)
            ) {
                continue;
            }

            const currentStock = Number(Number(product.stock || 0).toFixed(2));

            const totalQty = currentStock;
            const soldQty = 0;

            const costPrice = Number(product.costPrice || 0);

            let stockValue = 0;

            if (product.unit === "g") {
                stockValue = (currentStock / 1000) * costPrice;
            } else {
                stockValue = currentStock * costPrice;
            }

            stockValue = Number(stockValue.toFixed(2));

            const gst = product.gstRate ?? "none";

            const unitValue = Number(product.unitValue ?? 1);

            const safeUnitValue = unitValue > 0 ? unitValue : 1;


            data.push({
                productId: product._id,
                productName: product.name,
                barcode: barcode.code,

                currentStock,
                soldQty,
                totalQty,

                costPrice,

                retailPrice:
                    Number(product.retailPrice || 0),

                wholesalePrice:
                    Number(product.wholesalePrice || 0),

                stockValue,

                unit: product.unit,
                unitValue: safeUnitValue,
                unitText: `${safeUnitValue} ${product.unit}`,

                gst,

                status:
                    currentStock <= 0
                        ? "Out Of Stock"
                        : currentStock <= Number(product.lowStockQty || 10)
                            ? "Low Stock"
                            : "Available"
            });
        }

        return res.status(200).json({
            success: true,
            bulkProduct: {
                _id: bulkProduct._id,
                name: bulkProduct.name,
                stock: bulkProduct.stock,
                unit: bulkProduct.unit,
                unitValue: bulkProduct.unitValue
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


exports.getStockValue = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const round2 = (num) =>
            Math.round((Number(num) + Number.EPSILON) * 100) / 100;

        const products = await Product.find({
            superAdminId: hierarchy.superAdminId
        }).lean();



        const barcodes = await Barcode.find({
            superAdminId: hierarchy.superAdminId
        }).lean();


        let totalCostValue = 0;
        let totalRetailValue = 0;
        let totalWholesaleValue = 0;
        let totalMrpValue = 0;

        const data = [];



        const barcodeMap = new Map();

        for (const barcode of barcodes) {
            const productId = String(barcode.productId);

            if (!barcodeMap.has(productId)) {
                barcodeMap.set(productId, []);
            }

            barcodeMap.get(productId).push(barcode);
        }



        for (const product of products) {

            const productId = String(product._id);

            const productBarcodes =
                barcodeMap.get(productId) || [];

            const currentStock = Number(
                Number(product.stock || 0).toFixed(2)
            );

            const mrp = Number(product.mrp || 0);
            const costPrice = Number(product.costPrice || 0);
            const retailPrice =
                Number(product.retailPrice || 0);

            const wholesalePrice =
                Number(product.wholesalePrice || 0);

            let costValue = 0;
            let sellingValue = 0;
            let mrpValue = 0;

            if (product.unit === "g") {
                costValue = round2((currentStock / 1000) * costPrice);
                
                retailValue =
                    round2(
                        (currentStock / 1000) *
                        retailPrice
                    );

                wholesaleValue =
                    round2(
                        (currentStock / 1000) *
                        wholesalePrice
                    );

                mrpValue = round2((currentStock / 1000) * mrp);
            } else {
                costValue = round2(currentStock * costPrice);
                sellingValue = round2(currentStock * sellingPrice);
                mrpValue = round2(currentStock * mrp);
            }


            totalCostValue += costValue;
            totalSellingValue += sellingValue;
            totalMrpValue += mrpValue;

            const unit = product.unit || "pcs";
            const unitValue = Number(product.unitValue ?? 1);
            const safeUnitValue = unitValue > 0 ? unitValue : 1;

            const gst = product.gstRate ?? "none";

            const status =
                currentStock <= 0
                    ? "Out Of Stock"
                    : currentStock <= Number(product.lowStockQty || 10)
                        ? "Low Stock"
                        : "Available";



            if (productBarcodes.length > 0) {

                for (const barcode of productBarcodes) {



                    data.push({
                        productId: product._id,
                        productName: product.name || "",
                        itemCode: product.itemCode || "",

                        barcode: barcode.code || "",

                        currentStock,
                        productStock: currentStock,

                        mrp,
                        costPrice,
                        sellingPrice,

                        costValue,
                        sellingValue,
                        mrpValue,

                        unit,
                        unitValue,

                        gst,

                        status
                    });
                }
            }

            else {
                data.push({
                    productId: product._id,
                    productName: product.name || "",
                    itemCode: product.itemCode || "",

                    barcode: null,

                    currentStock,
                    productStock: currentStock,

                    mrp,
                    costPrice,
                    sellingPrice,

                    costValue,
                    sellingValue,
                    mrpValue,

                    unit,
                    unitValue,

                    gst,

                    status
                });

            }
        }

        data.sort((a, b) => {
            return String(b.productId).localeCompare(
                String(a.productId)
            );
        });

        return res.status(200).json({
            success: true,

            count: data.length,

            summary: {
                totalCostValue:
                    round2(totalCostValue),

                totalSellingValue:
                    round2(totalSellingValue),

                totalMrpValue:
                    round2(totalMrpValue),

                expectedProfit:
                    round2(
                        totalSellingValue -
                        totalCostValue
                    )
            },

            data
        });

    } catch (err) {

        console.error(
            "getStockValue error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.getproductsearchstock = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);
        const { search } = req.query;

        if (!search || search.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Search is required"
            });
        }

        const searchText = search.trim();

        const products = await Product.find({
            superAdminId: hierarchy.superAdminId,
            $or: [
                {
                    name: {
                        $regex: searchText,
                        $options: "i"
                    }
                },
                {
                    itemCode: {
                        $regex: searchText,
                        $options: "i"
                    }
                }
            ]
        }).lean();


        const productIds = products.map(
            product => product._id
        );

        const barcodes = await Barcode.find({
            superAdminId: hierarchy.superAdminId,
            $or: [
                { productId: { $in: productIds } },
                { code: { $regex: searchText, $options: "i" } }
            ]
        })
            .populate(
                "productId",
                "name itemCode stock unit unitValue mrp costPrice sellingPrice gstRate lowStockQty"
            )

            .sort({ createdAt: -1 })
            .lean();

        const data = [];

        const barcodeMap = new Map();


        for (const barcode of barcodes) {

            if (!barcode.productId) continue;

            const productId =
                String(barcode.productId._id);

            if (!barcodeMap.has(productId)) {
                barcodeMap.set(productId, []);
            }

            barcodeMap.get(productId).push(barcode);
        }



        for (const product of products) {

            const productId =
                String(product._id);

            const productBarcodes =
                barcodeMap.get(productId) || [];



            if (productBarcodes.length > 0) {

                for (const barcode of productBarcodes) {

                    const currentStock = Number(
                        Number(product.stock || 0).toFixed(2)
                    );

                    const costPrice = Number(product.costPrice || 0);

                    let stockValue = 0;

                    if (product.unit === "g") {
                        stockValue = Number(
                            ((currentStock / 1000) * costPrice).toFixed(2)
                        );
                    } else {
                        stockValue = Number(
                            (currentStock * costPrice).toFixed(2)
                        );
                    }

                    data.push({
                        productId: product._id,
                        itemCode: product.itemCode || "",
                        productName: product.name || "",


                        barcode: barcode.code,

                        currentStock,
                        productStock: Number(product.stock || 0),


                        mrp: Number(product.mrp || 0),

                        costPrice,

                        sellingPrice: Number(product.sellingPrice || 0),

                        stockValue,



                        gst: product.gstRate ?? "none",


                        unit: product.unit || "pcs",

                        unitValue: Number(product.unitValue || 1),

                        displayName: `${Number(product.unitValue || 1)} ${product.unit || "pcs"} ${product.name}`,

                        status:
                            currentStock <= 0
                                ? "Out Of Stock"
                                : currentStock <= Number(product.lowStockQty || 10)
                                    ? "Low Stock"
                                    : "Available"
                    });
                }
            }

            else {

                const currentStock = Number(
                    Number(
                        product.stock || 0
                    ).toFixed(2)
                );

                const costPrice = Number(
                    product.costPrice || 0
                );

                const sellingPrice = Number(
                    product.sellingPrice || 0
                );

                const mrp = Number(
                    product.mrp || 0
                );

                const gst = product.gstRate ?? "none";

                const unit =
                    product.unit || "pcs";

                const unitValue = Number(
                    product.unitValue || 1
                );

                let stockValue = 0;

                if (unit === "g") {
                    stockValue = Number(
                        ((currentStock / 1000) * costPrice).toFixed(2)
                    );
                } else {
                    stockValue = Number(
                        (currentStock * costPrice).toFixed(2)
                    );
                }

                data.push({

                    productId:
                        product._id,

                    itemCode:
                        product.itemCode || "",

                    productName:
                        product.name || "",

                    barcode: null,

                    currentStock,

                    productStock:
                        currentStock,



                    soldQty: 0,

                    mrp,

                    costPrice,

                    stockValue,

                    sellingPrice,

                    gst: product.gstRate ?? "none",

                    unit,

                    unitValue,

                    displayName:
                        `${unitValue} ${unit} ${product.name}`,

                    status:
                        currentStock <= 0
                            ? "Out Of Stock"
                            : currentStock <= Number(product.lowStockQty || 10)
                                ? "Low Stock"
                                : "Available"
                });
            }
        }



        const existingBarcodeIds = new Set(
            data
                .filter(item => item.barcode)
                .map(item => String(item.barcode))
        );

        for (const barcode of barcodes) {

            if (!barcode.productId) continue;

            if (
                !barcode.code
                    .toLowerCase()
                    .includes(
                        searchText.toLowerCase()
                    )
            ) {
                continue;
            }

            if (
                existingBarcodeIds.has(
                    String(barcode.code)
                )
            ) {
                continue;
            }

            const product =
                barcode.productId;

            const currentStock = Number(
                Number(product.stock || 0).toFixed(2)
            );



            const costPrice = Number(product.costPrice || 0);

            const retailPrice =
                Number(product.retailPrice || 0);

            const wholesalePrice =
                Number(product.wholesalePrice || 0);

            const mrp = Number(product.mrp || 0);

            const gst = product.gstRate ?? "none";

            const unit = product.unit || "pcs";

            const unitValue = Number(product.unitValue || 1);

            let stockValue = 0;

            if (unit === "g") {
                stockValue = Number(
                    ((currentStock / 1000) * costPrice).toFixed(2)
                );
            } else {
                stockValue = Number(
                    (currentStock * costPrice).toFixed(2)
                );
            }

            const soldQty = 0;

            data.push({

                productId:
                    product._id,

                itemCode:
                    product.itemCode || "",

                productName:
                    product.name || "",

                barcode:
                    barcode.code,

                currentStock,

                productStock:
                    Number(
                        product.stock || 0
                    ),



                soldQty,

                mrp,

                costPrice,

                stockValue,

                sellingPrice,

                gst,

                unit,

                unitValue,

                displayName:
                    `${unitValue} ${unit} ${product.name}`,

                status:
                    currentStock <= 0
                        ? "Out Of Stock"
                        : currentStock <= Number(product.lowStockQty || 10)
                            ? "Low Stock"
                            : "Available"
            });

            existingBarcodeIds.add(
                String(barcode.code)
            );
        }


        data.sort((a, b) => {
            return String(b.productId).localeCompare(
                String(a.productId)
            );
        });

        return res.status(200).json({
            success: true,
            count: data.length,
            data
        });

    } catch (err) {

        console.error(
            "getproductsearchstock error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};

exports.productStockById = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);
        const { productId } = req.params;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product id is required"
            });
        }

        const product = await Product.findOne({
            _id: productId,
            superAdminId: hierarchy.superAdminId
        }).lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const barcodes = await Barcode.find({
            productId,
            superAdminId: hierarchy.superAdminId
        })
            .select("code createdAt")

            .sort({ createdAt: -1 })
            .lean();

        const data = [];

        const formatQty = (value) => {
            const num = Number(value || 0);

            return Number.isInteger(num)
                ? String(num)
                : String(Number(num.toFixed(2)));
        };



        const currentStock = Number(
            Number(product.stock || 0).toFixed(2)
        );

        const unit = product.unit || "pcs";

        const unitValue = Number(
            product.unitValue ?? 1
        );

        const safeUnitValue =
            unitValue > 0 ? unitValue : 1;

        const costPrice = Number(
            product.costPrice || 0
        );

        const sellingPrice = Number(
            product.sellingPrice || 0
        );


        let productTotalStockText = "";

        if (unit === "kg") {
            productTotalStockText =
                `${formatQty(currentStock)} kg`;

        } else if (unit === "g") {
            productTotalStockText =
                `${formatQty(currentStock / 1000)} kg`;

        } else {
            productTotalStockText =
                `${formatQty(currentStock)} pcs`;
        }


        let totalCostValue = 0;
        let totalRetailValue = 0;
        let totalWholesaleValue = 0;

        if (unit === "kg") {
            totalCostValue =
                currentStock * costPrice;

            totalSellingValue =
                currentStock * sellingPrice;

        } else if (unit === "g") {
            totalCostValue =
                (currentStock / 1000) * costPrice;

            totalSellingValue =
                (currentStock / 1000) * sellingPrice;

        } else {
            totalCostValue =
                currentStock * costPrice;

            totalSellingValue =
                currentStock * sellingPrice;
        }

        totalCostValue = Number(
            totalCostValue.toFixed(2)
        );

        totalSellingValue = Number(
            totalSellingValue.toFixed(2)
        );



        for (const barcode of barcodes) {

            let totalStockText = "";

            if (unit === "kg") {
                totalStockText = `${formatQty(currentStock)} kg`;
            } else if (unit === "g") {
                totalStockText = `${formatQty(currentStock / 1000)} kg`;
            } else {
                totalStockText = `${formatQty(currentStock)} pcs`;
            }

            const gst = product.gstRate ?? "none";

            data.push({
                productId: product._id,

                productName: product.name || "",

                itemCode: product.itemCode || "",

                barcode: barcode.code || null,

                totalQty: currentStock,

                currentStock,

                soldQty: 0,

                actualStockQty: currentStock,

                stockValue: totalCostValue,

                totalStockText,

                mrp: Number(product.mrp || 0),

                costPrice,

                sellingPrice,

                gst,

                unit,

                unitValue: safeUnitValue,

                unitText: `${safeUnitValue} ${unit}`,

                status:
                    currentStock <= 0
                        ? "Out Of Stock"
                        : currentStock <= Number(product.lowStockQty || 10)
                            ? "Low Stock"
                            : "Available"
            });

        }



        if (barcodes.length === 0) {



            data.push({
                productId: product._id,

                productName:
                    product.name || "",

                itemCode:
                    product.itemCode || "",

                barcode: null,

                totalQty:
                    currentStock,

                currentStock,

                soldQty: 0,

                actualStockQty:
                    currentStock,

                stockValue:
                    totalCostValue,

                totalStockText:
                    productTotalStockText,

                mrp:
                    product.mrp || 0,

                costPrice,

                sellingPrice,

                gst: product.gstRate ?? "none",

                unit,

                unitValue,

                unitText:
                    `${safeUnitValue} ${unit}`,

                status:
                    currentStock <= 0
                        ? "Out Of Stock"
                        : currentStock <= Number(
                            product.lowStockQty || 10
                        )
                            ? "Low Stock"
                            : "Available"
            });
        }



        let status = "Available";

        if (currentStock <= 0) {
            status = "Out Of Stock";
        } else if (
            currentStock <= Number(
                product.lowStockQty || 10
            )
        ) {
            status = "Low Stock";
        }


        return res.status(200).json({
            success: true,

            product: {
                productId: product._id,

                productName:
                    product.name || "",

                itemCode:
                    product.itemCode || "",

                unit:
                    product.unit || "pcs",

                unitValue:
                    product.unitValue || 1,

                currentStock,

                totalStock:
                    productTotalStockText,

                gst: product.gstRate ?? "none",

                status
            },

            summary: {
                // Product.stock is the actual current stock
                totalQty: currentStock,

                currentStock,

                // Not calculated from Barcode
                soldQty: 0,

                totalCostValue,

                totalSellingValue,

                expectedProfit: Number(
                    (
                        totalSellingValue -
                        totalCostValue
                    ).toFixed(2)
                )
            },

            count: data.length,

            data
        });

    } catch (err) {
        console.error(
            "productStockById error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.getTopSellingProducts = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);


        const result = await Bill.aggregate([
            {
                $match: {
                    superAdminId: hierarchy.superAdminId
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId",
                    productNameFromBill: { $first: "$items.productName" },
                    nameFromBill: { $first: "$items.name" },

                    totalQtySold: { $sum: "$items.qty" },
                    totalSalesAmount: { $sum: "$items.finalPrice" },
                    totalGST: { $sum: "$items.gstAmount" }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            {

                $unwind: "$product"
            },

            {
                $sort: {
                    totalQtySold: -1
                }
            },
            {
                $project: {
                    _id: 0,

                    productId: "$_id",

                    itemCode: {
                        $ifNull: ["$product.itemCode", ""]
                    },

                    productName: {
                        $ifNull: [
                            "$productNameFromBill",
                            {
                                $ifNull: [
                                    "$nameFromBill",
                                    "$product.name"
                                ]
                            }
                        ]
                    },

                    currentStock: {
                        $ifNull: ["$product.stock", 0]
                    },

                    productStock: {
                        $ifNull: ["$product.stock", 0]
                    },

                    mrp: {
                        $ifNull: ["$product.mrp", 0]
                    },

                    costPrice: {
                        $ifNull: ["$product.costPrice", 0]
                    },

                    sellingPrice: {
                        $ifNull: ["$product.sellingPrice", 0]
                    },

                    gst: {
                        $ifNull: ["$product.gstRate", "none"]
                    },

                    unit: {
                        $ifNull: ["$product.unit", "pcs"]
                    },

                    unitValue: {
                        $ifNull: ["$product.unitValue", 1]
                    },

                    totalQtySold: 1,

                    totalSalesAmount: {
                        $round: ["$totalSalesAmount", 2]
                    },

                    totalGST: {
                        $round: ["$totalGST", 2]
                    }

                }
            }
        ]);

        return res.status(200).json({
            success: true,
            message: "Top selling products fetched successfully",
            data: result
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


exports.lowstockcheck = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const products = await Product.find({
            superAdminId: hierarchy.superAdminId
        }).lean();

        let totalLowStockQty = 0;
        let totalStockValue = 0;

        const data = [];

        const formatQty = (value) => {
            const num = Number(value || 0);

            return Number.isInteger(num)
                ? String(num)
                : String(Number(num.toFixed(2)));
        };

        for (const product of products) {

            const qty = Number(
                Number(product.stock || 0).toFixed(2)
            );

            const lowStockQty = Number(
                product.lowStockQty || 10
            );

            // Only low stock products
            if (qty <= 0 || qty > lowStockQty) {
                continue;
            }

            const unit = product.unit || "pcs";

            const unitValue = Number(
                product.unitValue ?? 1
            );

            const safeUnitValue =
                unitValue > 0 ? unitValue : 1;

            const mrp = Number(
                product.mrp || 0
            );

            const costPrice = Number(
                product.costPrice || 0
            );

            const sellingPrice = Number(
                product.sellingPrice || 0
            );

            // Stock value
            let stockValue = 0;

            if (unit === "g") {
                stockValue =
                    (qty / 1000) * costPrice;
            } else {
                stockValue =
                    qty * costPrice;
            }

            stockValue = Number(
                stockValue.toFixed(2)
            );

            // Total stock text
            let totalUnitText = "";

            if (unit === "kg") {
                totalUnitText =
                    `${formatQty(qty)} kg`;

            } else if (unit === "g") {
                totalUnitText =
                    `${formatQty(qty / 1000)} kg`;

            } else {
                totalUnitText =
                    `${formatQty(qty)} pcs`;
            }

            totalLowStockQty += qty;
            totalStockValue += stockValue;

            data.push({
                productId: product._id,

                productName:
                    product.name || "",

                itemCode:
                    product.itemCode || "",

                barcode: null,

                currentStock: qty,

                lowStockQty,

                totalProductStock: qty,

                gst:
                    product.gstRate ?? "none",

                unit,

                unitValue: safeUnitValue,

                totalUnitText,

                mrp,

                costPrice,

                sellingPrice,

                stockValue,

                status: "Low Stock"
            });
        }

        data.sort((a, b) => {
            return (
                Number(a.currentStock) -
                Number(b.currentStock)
            );
        });

        data.forEach((item, index) => {
            item.sno = index + 1;
        });

        return res.status(200).json({
            success: true,

            summary: {
                totalLowStockProducts:
                    data.length,

                totalLowStockQty:
                    Number(
                        totalLowStockQty.toFixed(2)
                    ),

                totalStockValue:
                    Number(
                        totalStockValue.toFixed(2)
                    )
            },

            count: data.length,

            data
        });

    } catch (err) {

        console.error(
            "lowstockcheck error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.outofstockcheck = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const products = await Product.find({
            superAdminId: hierarchy.superAdminId
        }).lean();

        const data = [];

        const formatQty = (value) => {
            const num = Number(value || 0);

            return Number.isInteger(num)
                ? String(num)
                : String(Number(num.toFixed(2)));
        };

        for (const product of products) {

            const qty = Number(
                Number(product.stock || 0).toFixed(2)
            );

            // Only out of stock
            if (qty > 0) {
                continue;
            }

            const unit = product.unit || "pcs";

            const unitValue = Number(
                product.unitValue ?? 1
            );

            const safeUnitValue =
                unitValue > 0 ? unitValue : 1;

            let totalUnitText = "";

            if (unit === "kg") {

                totalUnitText =
                    `${formatQty(qty)} kg`;

            } else if (unit === "g") {

                totalUnitText =
                    `${formatQty(qty / 1000)} kg`;

            } else {

                totalUnitText =
                    `${formatQty(qty)} pcs`;
            }

            data.push({

                productId:
                    product._id,

                productName:
                    product.name || "",

                itemCode:
                    product.itemCode || "",

                barcode: null,

                currentStock:
                    qty,

                totalProductStock:
                    qty,

                unit,

                unitValue:
                    safeUnitValue,

                totalUnitText,

                mrp:
                    Number(product.mrp || 0),

                costPrice:
                    Number(product.costPrice || 0),

                sellingPrice:
                    Number(product.sellingPrice || 0),

                gst:
                    product.gstRate ?? "none",

                status:
                    "Out Of Stock"
            });
        }

        data.sort((a, b) => {
            return String(b.productId).localeCompare(
                String(a.productId)
            );
        });

        data.forEach((item, index) => {
            item.sno = index + 1;
        });

        return res.status(200).json({

            success: true,

            summary: {
                totalOutOfStockProducts:
                    data.length
            },

            count:
                data.length,

            data
        });

    } catch (err) {

        console.error(
            "outofstockcheck error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};