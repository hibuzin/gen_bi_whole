import { API } from "../../constants/api";

export const round2 = (num) =>
    Math.round(
        (Number(num) + Number.EPSILON) * 100
    ) / 100;

export const calculateNewItemLocal = (item) => {
    const qty = Number(item.qty || 0);
    const freeQty = Number(item.freeQty || 0);

    const netcost = Number(
        item.originalNetcost ||
        item.netcost ||
        item.costPrice ||
        0
    );

    const rawTax =
        item.tax ??
        item.gstRate ??
        0;

    const normalizedTax = String(rawTax)
        .trim()
        .toLowerCase();

    const taxPercentage =
        normalizedTax === "none" || normalizedTax === ""
            ? 0
            : Number(normalizedTax) || 0;

    const discountPercent = Number(item.discountPercent || 0);
    const discountAmountInput = Number(item.discountAmount || 0);

    const isGstIncluded = item.isGstIncluded !== false;

    // Not enough data yet
    if (qty <= 0 || netcost < 0) {
        return {
            ...item,
            rate: "",
            amount: "",
            taxAmount: "",
            netAmount: "",
            totalCostWithGST: "",
            profitAmount: "",
            profitPercent: "",
            roiPercent: "",
        };
    }

    const totalStockQty = qty + freeQty;

    const grossAmount = round2(qty * netcost);

    let discountAmount = 0;
    let finalDiscountPercent = 0;

    // Same rule as backend
    if (discountPercent > 0) {
        finalDiscountPercent = round2(discountPercent);

        discountAmount = round2(
            grossAmount * finalDiscountPercent / 100
        );
    } else if (discountAmountInput > 0) {
        discountAmount = Math.min(
            round2(discountAmountInput),
            grossAmount
        );

        finalDiscountPercent =
            grossAmount > 0
                ? round2((discountAmount / grossAmount) * 100)
                : 0;
    }

    const amountAfterDiscount = round2(
        grossAmount - discountAmount
    );

    let amount = 0;
    let taxAmount = 0;
    let totalCostWithGST = 0;

    if (isGstIncluded) {
        // entered netcost already contains GST
        totalCostWithGST = amountAfterDiscount;

        taxAmount = round2(
            amountAfterDiscount *
            taxPercentage /
            (100 + taxPercentage)
        );

        amount = round2(
            amountAfterDiscount - taxAmount
        );
    } else {
        amount = amountAfterDiscount;

        taxAmount = round2(
            amount * taxPercentage / 100
        );

        totalCostWithGST = round2(
            amount + taxAmount
        );
    }

    const rate =
        totalStockQty > 0
            ? round2(amount / totalStockQty)
            : 0;

    const retailPrice = Number(item.retailPrice ?? 0);
    const wholesalePrice = Number(item.wholesalePrice ?? 0);

    const retailProfitAmount = round2(
        retailPrice - netcost
    );

    const wholesaleProfitAmount = round2(
        wholesalePrice - netcost
    );

    const retailProfitPercent =
        retailPrice > 0
            ? round2(
                (retailProfitAmount / retailPrice) * 100
            )
            : 0;

    const wholesaleProfitPercent =
        wholesalePrice > 0
            ? round2(
                (wholesaleProfitAmount / wholesalePrice) * 100
            )
            : 0;

    const retailRoiPercent =
        netcost > 0
            ? round2(
                (retailProfitAmount / netcost) * 100
            )
            : 0;

    const wholesaleRoiPercent =
        netcost > 0
            ? round2(
                (wholesaleProfitAmount / netcost) * 100
            )
            : 0;

    const netAmount = round2(
        netcost * qty
    );

    return {
        ...item,

        discountPercent: finalDiscountPercent,
        discountAmount,

        totalStockQty,

        amount,
        totalCostWithGST,

        tax:
            normalizedTax === "none"
                ? "none"
                : taxPercentage,

        gstRate:
            normalizedTax === "none"
                ? "none"
                : taxPercentage,

        taxAmount,

        rate,

        netAmount,

        retailPrice,
        wholesalePrice,

        retailProfitAmount,
        wholesaleProfitAmount,

        retailProfitPercent,
        wholesaleProfitPercent,

        retailRoiPercent,
        wholesaleRoiPercent,

        profitAmount: retailProfitAmount,
        profitPercent: retailProfitPercent,
        roiPercent: retailRoiPercent,

        receivedQty: totalStockQty,
        pendingQty: 0,

        originalNetcost:
            item.originalNetcost || netcost,
    };
};

export const calculateNewPurchaseTotals = ({
    items,
    currentForm,
    setPurchaseTotals,
    setForm,
}) => {
    const enteredItems = items.filter(
        (item) =>
            String(item.productName || "").trim() &&
            Number(item.qty || 0) > 0
    );

    let totalGrossAmount = 0;
    let totalTaxAmount = 0;
    let itemsTotal = 0;

    enteredItems.forEach((item) => {
        // Existing item already has calculation
        // New item gets calculated here
        const calculatedItem = item.productId
            ? item
            : calculateNewItemLocal(item);

        totalGrossAmount += Number(
            calculatedItem.amount || 0
        );

        totalTaxAmount += Number(
            calculatedItem.taxAmount || 0
        );

        itemsTotal += Number(
            calculatedItem.totalCostWithGST || 0
        );
    });

    totalGrossAmount = round2(totalGrossAmount);
    totalTaxAmount = round2(totalTaxAmount);
    itemsTotal = round2(itemsTotal);

    // Bill discount
    const billDiscountPercent = Number(
        currentForm.billDiscountPercent || 0
    );

    const billDiscountAmount = round2(
        itemsTotal * billDiscountPercent / 100
    );

    const afterBillDiscount = round2(
        itemsTotal - billDiscountAmount
    );

    const freightCharge = Number(
        currentForm.freightCharge || 0
    );

    const packagingCharge = Number(
        currentForm.packagingCharge || 0
    );

    const totalAmount = round2(
        afterBillDiscount +
        freightCharge +
        packagingCharge
    );

    const cgst = round2(totalTaxAmount / 2);
    const sgst = round2(totalTaxAmount / 2);

    setPurchaseTotals({
        totalAmount,
        totalGrossAmount,
        totalTaxAmount,
        cgst,
        sgst,

        itemsTotal: afterBillDiscount,

        freightCharge,
        packagingCharge,

        billDiscountAmount,

        supplierBillAmount: afterBillDiscount,

        balanceAmount: round2(
            afterBillDiscount -
            Number(currentForm.paidAmount || 0)
        ),
    });

    setForm((prev) => ({
        ...prev,
        supplierBillAmount: afterBillDiscount,
    }));
};

export const calculatePurchase = async ({
    items,
    currentForm,
    token,
    setBillItems,
    setPurchaseTotals,
    setForm,
    showToast,
}) => {
    const validItems = items.filter(
        (item) =>
            item.productId &&
            String(item.qty).trim() !== ""
    );

    if (validItems.length === 0) {
        setBillItems(items);

        setPurchaseTotals({
            totalAmount: 0,
            totalGrossAmount: 0,
            totalTaxAmount: 0,
            cgst: 0,
            sgst: 0,
            itemsTotal: 0,
            freightCharge: 0,
            packagingCharge: 0,
            billDiscountAmount: 0,
            supplierBillAmount: 0,
            balanceAmount: 0,
        });

        setForm((prev) => ({
            ...prev,
            supplierBillAmount: "",
        }));

        return;
    }

    try {
        const payload = {
            supplierId: currentForm.supplierId || "",

            invoiceNo: currentForm.invoiceNo || "",

            invoiceDate: currentForm.invoiceDate || "",

            placeOfSupply: currentForm.placeOfSupply || "",

            grnDate: currentForm.grnDate || "",

            invoiceAmount: Number(
                currentForm.invoiceAmount || 0
            ),

            items: validItems.map((item) => ({
                productId:
                    item.productId?._id ||
                    item.productId,

                qty: Number(item.qty || 0),

                freeQty: Number(item.freeQty || 0),

                netcost: Number(
                    item.originalNetcost ||
                    item.netcost ||
                    item.costPrice ||
                    0
                ),

                mrp: Number(item.mrp || 0),

                retailPrice: Number(
                    item.retailPrice ?? 0
                ),

                wholesalePrice: Number(
                    item.wholesalePrice ?? 0
                ),

                qtyType:
                    item.qtyType ||
                    "unit",

                unitValue: Number(
                    item.unitValue || 1
                ),

                isGstIncluded:
                    item.isGstIncluded !== false,

                discountPercent: Number(
                    item.discountPercent || 0
                ),

                discountAmount: Number(
                    item.discountAmount || 0
                ),

                barcode: item.barcode || "",
            })),

            freightCharge: Number(
                currentForm.freightCharge || 0
            ),

            packagingCharge: Number(
                currentForm.packagingCharge || 0
            ),

            billDiscountPercent: Number(
                currentForm.billDiscountPercent || 0
            ),

            billDiscountAmount: Number(
                currentForm.billDiscountAmount || 0
            ),

            paidAmount: Number(
                currentForm.paidAmount || 0
            ),

            DueDate:
                currentForm.dueDate || "",

            paymentMethod:
                currentForm.paymentMethod ||
                "cash",

            details: {
                bankName:
                    currentForm.bankName || "",

                transactionId:
                    currentForm.transactionId || "",

                upiId:
                    currentForm.upiId || "",

                upiTransactionId:
                    currentForm.upiTransactionId || "",

                cardType:
                    currentForm.cardType || "",

                cardLast4:
                    currentForm.cardLast4 || "",
            },
        };

        console.log(
            "PURCHASE CALCULATION PAYLOAD:",
            payload
        );

        const res = await fetch(
            API.calculatePurchase,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${token}`,
                },

                body: JSON.stringify(payload),
            }
        );

        const data = await res.json();

        console.log(
            "PURCHASE CALCULATION RESPONSE:",
            data
        );

        if (!res.ok || !data.success) {
            throw new Error(
                data.message ||
                "Purchase calculation failed"
            );
        }

        let calcIndex = 0;

        const updated = items.map((item) => {
            if (
                !item.productId ||
                String(item.qty).trim() === ""
            ) {
                return item;
            }

            const calc =
                data.data.items?.[calcIndex];

            calcIndex += 1;

            if (!calc) {
                return item;
            }

            return {
                ...item,

                productName:
                    item.productName ||
                    calc.productName ||
                    "",

                qty: calc.qty,

                freeQty: calc.freeQty,

                totalStockQty:
                    calc.totalStockQty,

                receivedQty:
                    calc.receivedQty,

                pendingQty:
                    calc.pendingQty,

                discountPercent:
                    calc.discountPercent,

                discountAmount:
                    calc.discountAmount,

                amount:
                    calc.amount,

                totalCostWithGST:
                    calc.totalCostWithGST,

                isGstIncluded:
                    calc.isGstIncluded,

                tax:
                    calc.taxPercentage === undefined
                        ? item.tax
                        : calc.taxPercentage,

                gstRate:
                    calc.taxPercentage === undefined
                        ? item.gstRate
                        : calc.taxPercentage,

                taxAmount:
                    calc.taxAmount,

                rate:
                    calc.Rate,

                netcost:
                    calc.netcost,

                costPrice:
                    calc.netcost,

                purchasePrice:
                    calc.netcost,

                originalNetcost:
                    item.originalNetcost ||
                    calc.netcost,

                netAmount:
                    calc.netAmount,

                mrp:
                    calc.mrp,

                retailPrice:
                    calc.retailPrice ??
                    item.retailPrice ??
                    0,

                wholesalePrice:
                    calc.wholesalePrice ??
                    item.wholesalePrice ??
                    0,

                barcode:
                    item.barcode ||
                    calc.barcode ||
                    "",

                retailProfitAmount:
                    calc.retailProfitAmount,

                wholesaleProfitAmount:
                    calc.wholesaleProfitAmount,

                retailProfitPercent:
                    calc.retailProfitPercent,

                wholesaleProfitPercent:
                    calc.wholesaleProfitPercent,

                retailRoiPercent:
                    calc.retailRoiPercent,

                wholesaleRoiPercent:
                    calc.wholesaleRoiPercent,

                profitAmount:
                    calc.retailProfitAmount,

                profitPercent:
                    calc.retailProfitPercent,

                roiPercent:
                    calc.retailRoiPercent,

                purchaseDiscount:
                    calc.purchaseDiscount || 0,
            };
        });

        setBillItems(updated);

        const result = data.data;

        setPurchaseTotals({
            totalAmount:
                Number(result.totalAmount || 0),

            totalGrossAmount:
                Number(result.totalGrossAmount || 0),

            totalTaxAmount:
                Number(result.totalTaxAmount || 0),

            cgst:
                Number(result.cgst || 0),

            sgst:
                Number(result.sgst || 0),

            itemsTotal:
                Number(result.itemsTotal || 0),

            freightCharge:
                Number(result.freightCharge || 0),

            packagingCharge:
                Number(result.packagingCharge || 0),

            billDiscountAmount:
                Number(
                    result.billDiscountAmount || 0
                ),

            supplierBillAmount:
                Number(
                    result.supplierBillAmount || 0
                ),

            balanceAmount:
                Number(
                    result.balanceAmount || 0
                ),
        });

        setForm((prev) => ({
            ...prev,

            supplierBillAmount:
                result.supplierBillAmount || 0,
        }));
    } catch (err) {
        console.error(
            "Purchase calculation error:",
            err
        );

        showToast(
            err.message ||
            "Calculation failed",
            "error"
        );

        throw err;
    }
};

export const handlePurchaseSubmit = async ({
    form,
    billItems,
    purchaseTotals,
    token,
    isEditMode,
    editPurchaseId,
    navigate,
    showToast,
    setForm,
    setBillItems,
    setLoading,
    emptyItem,
    addDays,
    formatDateToDDMMYYYY,
    createInlineSupplier,
    createInlineProduct,
    calculatePurchase,
    setSuppliers,
    supplierSearch,
    supplierDetails,
}) => {

    if (
        !form.supplierId &&
        !String(supplierSearch || "").trim()
    ) {
        return showToast(
            "Select or enter supplier",
            "error"
        );
    }

    // Existing product OR newly typed product
    const enteredItems = billItems.filter(
        (item) =>
            item.productId ||
            String(item.productName || "").trim()
    );

    if (enteredItems.length === 0) {
        return showToast(
            "Add at least one item",
            "error"
        );
    }

    // Validate new products
    const invalidNewItem = enteredItems.find(
        (item) =>
            !item.productId &&
            !String(item.productName || "").trim()
    );

    if (invalidNewItem) {
        return showToast(
            "Enter item name",
            "error"
        );
    }

    const invalidQtyItem = enteredItems.find(
        (item) => Number(item.qty || 0) <= 0
    );

    if (invalidQtyItem) {
        return showToast(
            `Enter quantity for ${invalidQtyItem.productName || "item"
            }`,
            "error"
        );
    }

    try {
        setLoading(true);

        // =================================
        // RESOLVE SUPPLIER FIRST
        // =================================

        let resolvedSupplierId = form.supplierId;

        // No existing supplier selected,
        // but user typed a supplier → create it
        if (!resolvedSupplierId) {

            if (!String(supplierSearch || "").trim()) {
                throw new Error("Enter supplier name");
            }

            showToast(
                `Creating ${supplierSearch}...`,
                "success"
            );

            const createdSupplier =
                await createInlineSupplier();

            resolvedSupplierId =
                createdSupplier.supplierId;

            // Update UI too
            setForm((prev) => ({
                ...prev,
                supplierId: resolvedSupplierId,
            }));

            setSuppliers((prev) => [
                ...prev,
                {
                    ...createdSupplier.supplier,
                    _id: resolvedSupplierId,
                    supplierName:
                        createdSupplier.supplier?.supplierName ||
                        supplierSearch,
                    mobile:
                        createdSupplier.supplier?.mobile ||
                        supplierDetails.number,
                },
            ]);
        }

        console.log(
            "RESOLVED SUPPLIER ID:",
            resolvedSupplierId
        );


        // --------------------------------
        // CREATE NEW PRODUCTS FIRST
        // --------------------------------

        const resolvedItems = [];

        for (const item of enteredItems) {

            // Existing product
            if (item.productId) {
                resolvedItems.push(item);
                continue;
            }

            // New product
            showToast(
                `Creating ${item.productName}...`,
                "success"
            );

            const createdItem =
                await createInlineProduct(item);

            resolvedItems.push(createdItem);
        }

        console.log(
            "PURCHASE ITEMS AFTER PRODUCT CREATE:",
            resolvedItems
        );

        // --------------------------------
        // KEEP ALL 300 TABLE ROWS
        // --------------------------------

        const resolvedBillItems = [...billItems];

        let resolvedIndex = 0;

        for (let i = 0; i < resolvedBillItems.length; i++) {
            if (
                resolvedBillItems[i].productId ||
                String(resolvedBillItems[i].productName || "").trim()
            ) {
                if (resolvedItems[resolvedIndex]) {
                    resolvedBillItems[i] = {
                        ...resolvedBillItems[i],
                        ...resolvedItems[resolvedIndex],
                    };

                    resolvedIndex++;
                }
            }
        }

        // --------------------------------
        // CALCULATE WITHOUT REMOVING EMPTY ROWS
        // --------------------------------

        const calculationItems = resolvedBillItems.map((item) => ({
            ...item,
            qty: Number(item.qty || 0),
            freeQty: Number(item.freeQty || 0),
        }));

        await calculatePurchase(
            calculationItems,
            form
        );

        const payload = {
            supplierId: resolvedSupplierId,

            invoiceNo: form.invoiceNo,

            invoiceDate: form.invoiceDate,

            invoiceAmount: Number(
                form.invoiceAmount || 0
            ),

            placeOfSupply: form.placeOfSupply?.trim() || "Tamil Nadu",

            DueDate: form.dueDate || "",

            paymentMethod: form.paymentMethod || "cash",

            details: {
                bankName: form.bankName || "",
                transactionId: form.transactionId || "",
                upiId: form.upiId || "",
                upiTransactionId: form.upiTransactionId || "",
                cardType: form.cardType || "",
                cardLast4: form.cardLast4 || "",
            },

            grnDate: formatDateToDDMMYYYY(
                form.grnDate
            ),

            supplierBillAmount: Number(
                form.supplierBillAmount ||
                purchaseTotals.supplierBillAmount ||
                0
            ),

            paidAmount: Number(
                form.paidAmount || 0
            ),

            freightCharge: Number(
                form.freightCharge || 0
            ),

            packagingCharge: Number(
                form.packagingCharge || 0
            ),

            billDiscountPercent: Number(
                form.billDiscountPercent || 0
            ),

            billDiscountAmount: Number(
                purchaseTotals.billDiscountAmount || 0
            ),

            items: resolvedItems.map((item) => ({
                productId:
                    item.productId?._id ||
                    item.productId,

                qty: Number(item.qty || 0),

                freeQty: Number(
                    item.freeQty || 0
                ),

                gstRate:
                    (item.tax ?? item.gstRate) === "none"
                        ? "none"
                        : Number(item.tax ?? item.gstRate ?? 0),

                netcost: Number(
                    item.originalNetcost ||
                    item.netcost ||
                    item.costPrice ||
                    0
                ),

                retailPrice: Number(
                    item.retailPrice ?? 0
                ),

                wholesalePrice: Number(
                    item.wholesalePrice ?? 0
                ),

                mrp: Number(item.mrp || 0),

                barcode: item.barcode || "",

                unitValue: Number(
                    item.unitValue || 1
                ),

                qtyType:
                    item.qtyType || "unit",

                isGstIncluded:
                    item.isGstIncluded !== false,
            })),
        };

        const requestUrl = isEditMode
            ? `${API.purchase}/${editPurchaseId}`
            : API.createPurchase;

        const requestMethod = isEditMode
            ? "PUT"
            : "POST";

        console.log(
            isEditMode
                ? "PURCHASE UPDATE PAYLOAD:"
                : "PURCHASE CREATE PAYLOAD:",
            payload
        );

        console.log("FINAL PAYMENT METHOD:", payload.paymentMethod);

        const res = await fetch(requestUrl, {
            method: requestMethod,

            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(
                data.message ||
                (isEditMode
                    ? "Purchase update failed"
                    : "Purchase creation failed")
            );
        }

        showToast(
            isEditMode
                ? "Purchase updated successfully"
                : "Purchase created successfully",
            "success"
        );

        setTimeout(() => {
            navigate("/purchase", {
                replace: true,
            });
        }, 300);

        const today = new Date().toISOString().split("T")[0];

        setForm({
            supplierId: "",
            invoiceNo: "",
            invoiceDate: today,
            grnDate: today,
            invoiceAmount: "",
            dueDate: addDays(today, 7),
            supplierBillAmount: "",
            billDiscountPercent: "",
            packagingCharge: "",
            freightCharge: "",
            paymentMethod: "cash",
            bankName: "",
            transactionId: "",
            upiId: "",
            upiTransactionId: "",
            cardType: "",
            cardLast4: "",
            paidAmount: "",
            notes: "",
        });

        setBillItems(Array.from({ length: 300 }, () => ({ ...emptyItem })));
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        setLoading(false);
    }
};