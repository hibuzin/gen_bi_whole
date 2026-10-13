import {
  useEffect,
  useRef,
  useState,
} from "react";

import { FiTrash2 } from "react-icons/fi";
import { API } from "../../constants/api";

import {
  calculateNewItemLocal,
} from "./PurchaseLogic";

import styles from "./CreatePurchase.module.css";

export default function PurchaseTable({
  billItems,
  setBillItems,
  form,
  token,
  showToast,
  emptyItem,
  calculatePurchase,
  calculateNewPurchaseTotals,
  registerCreateProduct,
  firstItemRef,
}) {

  const [rowSearches, setRowSearches] = useState({});
  const [rowSearchResults, setRowSearchResults] = useState({});
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const itemInputRefs = useRef([]);
  const fieldRefs = useRef({});
  const dropdownItemRefs = useRef({});
  const [highlightedIndexes, setHighlightedIndexes] = useState({});
  const scannerBufferRef = useRef("");
  const scannerStartTimeRef = useRef(0);
  const scannerTimerRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      itemInputRefs.current[0]?.focus();
    }, 100);
  }, []);

  const focusNextField = (index, field) => {
    const order = [
      "productName",
      "hsnCode",
      "unit",
      "qty",
      "tax",
      "netcost",
      "mrp",
      "retailPrice",
      "wholesalePrice",
    ];

    const currentIndex = order.indexOf(field);
    const nextField = order[currentIndex + 1];

    if (!nextField) {
      const nextRow = index + 1;

      if (nextRow >= billItems.length) {
        setBillItems((prev) => [
          ...prev,
          { ...emptyItem },
        ]);
      }

      setTimeout(() => {
        itemInputRefs.current[nextRow]?.focus();
        itemInputRefs.current[nextRow]?.select();
      }, 100);

      return;
    }

    setTimeout(() => {
      const nextInput = fieldRefs.current[`${index}-${nextField}`];

      nextInput?.focus();

      if (
        nextField === "unit" ||
        nextField === "tax"
      ) {
        nextInput?.click();
      } else {
        nextInput?.select();
      }
    }, 0);
  };

  const updateItem = async (index, field, value) => {
    let updated = [...billItems];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    if (field === "netcost") {
      updated[index].purchasePrice = value;
      updated[index].costPrice = value;
      updated[index].originalNetcost = value;
    }

    // Don't allow negative values
    if (
      [
        "qty",
        "freeQty",
        "discountPercent",
        "discountAmount",
        "netcost",
        "mrp",
        "sellingPrice",
        "tax",
      ].includes(field) &&
      value !== "" &&
      Number(value) < 0
    ) {
      return;
    }

    // Save typed value first
    setBillItems(updated);

    // ---------------------------------
    // NEW INLINE PRODUCT
    // ---------------------------------
    if (
      !updated[index].productId &&
      String(updated[index].productName || "").trim()
    ) {
      const before = updated[index];
      const calculatedItem = calculateNewItemLocal(before);

      const INPUT_FIELDS = [
        "qty",
        "freeQty",
        "discountPercent",
        "discountAmount",
        "netcost",
        "mrp",
        "retailPrice",
        "wholesalePrice",
      ];

      const next = { ...calculatedItem };

      // user type pannaadha field blank ah irundha, blank ah thaan irukkanum
      INPUT_FIELDS.forEach((f) => {
        if (before[f] === "" || before[f] === undefined || before[f] === null) {
          next[f] = "";
        }
      });

      // ippo type panra field oda raw value
      next[field] = value;

      updated[index] = next;

      setBillItems(updated);
      calculateNewPurchaseTotals(updated, form);
      return;
    }

    // ---------------------------------
    // EXISTING PRODUCT
    // ---------------------------------
    if (updated[index].productId) {
      try {
        await calculatePurchase(updated, form);
      } catch (error) {
        console.error(
          "Existing product calculation error:",
          error
        );

        showToast(
          "Unable to calculate item",
          "error"
        );
      }
    }
  };

  const removeRow = async (index) => {
    const updated = [...billItems];

    updated.splice(index, 1);
    updated.push({ ...emptyItem });

    setBillItems(updated);

    await calculatePurchase(updated);

    setRowSearches({});
    setRowSearchResults({});
  };
  // auto table create 
  const getNextEmptyRowIndex = () => {
    const idx = billItems.findIndex(
      (item) =>
        !item.productId &&
        !String(item.productName || "").trim() &&
        !String(item.barcode || item.itemCode || "").trim()
    );

    return idx === -1 ? billItems.length : idx;
  };

  useEffect(() => {
    const handleCtrlI = (e) => {
      if (
        e.ctrlKey &&
        !e.shiftKey &&
        !e.altKey &&
        !e.metaKey &&
        e.key.toLowerCase() === "i"
      ) {
        e.preventDefault();

        const nextEmptyIndex = getNextEmptyRowIndex();

        if (nextEmptyIndex >= billItems.length) {
          setBillItems((prev) => [
            ...prev,
            { ...emptyItem },
          ]);
        }

        setTimeout(() => {
          itemInputRefs.current[nextEmptyIndex]?.focus();
          itemInputRefs.current[nextEmptyIndex]?.select();
        }, 100);
      }
    };

    window.addEventListener("keydown", handleCtrlI);

    return () => {
      window.removeEventListener("keydown", handleCtrlI);
    };
  }, [billItems, emptyItem, setBillItems]);

  const searchProductsForRow = async (rowIndex, value) => {
    setRowSearches((prev) => ({
      ...prev,
      [rowIndex]: value,
    }));

    setActiveRowIndex(rowIndex);

    const searchValue = String(value || "").trim();

    if (!searchValue) {
      setRowSearchResults((prev) => ({
        ...prev,
        [rowIndex]: [],
      }));

      setHighlightedIndexes((prev) => ({
        ...prev,
        [rowIndex]: -1,
      }));

      return;
    }

    try {
      const res = await fetch(
        `${API.productSearch}?search=${encodeURIComponent(searchValue)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to search products");
      }

      setRowSearchResults((prev) => ({
        ...prev,
        [rowIndex]: data.data || [],
      }));
      setHighlightedIndexes((prev) => ({
        ...prev,
        [rowIndex]: -1,
      }));
    } catch (error) {
      console.error("Product search error:", error);

      setRowSearchResults((prev) => ({
        ...prev,
        [rowIndex]: [],
      }));

      showToast("Failed to search products", "error");
    }
  };

  const scanBarcodeForRow = async (rowIndex, barcode) => {
    const value = String(barcode || "").trim();

    if (!value) return;

    try {
      const res = await fetch(
        `${API.scanpurchaseBarcode}/${encodeURIComponent(value)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || "Product not found"
        );
      }

      const product = data.data;

      const updated = [...billItems];

      updated[rowIndex] = {
        ...emptyItem,

        productId: product.productId || "",

        productName: product.productName || "",

        itemCode: product.itemCode || "",

        barcode: product.barcode || "",

        hsnCode: product.hsnCode || "",

        gstRate:
          product.gstRate === "none"
            ? "none"
            : Number(product.gstRate || 0),

        tax:
          product.gstRate === "none"
            ? "none"
            : Number(product.gstRate || 0),

        stock: Number(product.stock || 0),

        unit: product.unit || "pcs",

        unitValue: Number(product.unitValue || 1),

        mrp: Number(product.mrp || 0),

        costPrice: Number(product.costPrice || 0),

        netcost: Number(product.costPrice || 0),

        originalNetcost: Number(product.costPrice || 0),

        purchasePrice: Number(product.costPrice || 0),

        retailPrice: Number(product.retailPrice || 0),

        wholesalePrice: Number(
          product.wholesalePrice || 0
        ),

        qty: 1,

        freeQty: 0,
      };

      setBillItems(updated);

      setRowSearches((prev) => ({
        ...prev,
        [rowIndex]: "",
      }));

      setRowSearchResults((prev) => ({
        ...prev,
        [rowIndex]: [],
      }));

      setActiveRowIndex(null);

      await calculatePurchase(updated, form);

    } catch (error) {
      console.error(
        "Barcode scan error:",
        error
      );

      showToast(
        error.message || "Product not found",
        "error"
      );
    }
  };

  useEffect(() => {
    const handleGlobalScanner = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === "Enter") {
        const barcode = scannerBufferRef.current.trim();

        if (barcode.length >= 3) {
          e.preventDefault();

          const existingRowIndex = billItems.findIndex(
            (item) =>
              item.productId &&
              String(item.barcode || item.itemCode || "").trim() === barcode
          );

          if (existingRowIndex !== -1) {
            const updated = [...billItems];

            updated[existingRowIndex] = {
              ...updated[existingRowIndex],
              qty: Number(updated[existingRowIndex].qty || 0) + 1,
            };

            setBillItems(updated);
            calculatePurchase(updated, form);
          } else {
            const rowIndex = getNextEmptyRowIndex();

            scanBarcodeForRow(rowIndex, barcode);
          }
        }

        scannerBufferRef.current = "";
        scannerStartTimeRef.current = 0;

        return;
      }

      if (e.key.length !== 1) return;

      const now = Date.now();

      if (
        !scannerStartTimeRef.current ||
        now - scannerStartTimeRef.current > 100
      ) {
        scannerBufferRef.current = e.key;
        scannerStartTimeRef.current = now;
      } else {
        scannerBufferRef.current += e.key;
      }

      clearTimeout(scannerTimerRef.current);

      scannerTimerRef.current = setTimeout(() => {
        scannerBufferRef.current = "";
        scannerStartTimeRef.current = 0;
      }, 150);
    };

    window.addEventListener("keydown", handleGlobalScanner);

    return () => {
      window.removeEventListener("keydown", handleGlobalScanner);
      clearTimeout(scannerTimerRef.current);
    };
  }, [billItems, form]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(`.${styles.rowSearchBox}`)) {
        setActiveRowIndex(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const selectRowProduct = async (rowIndex, product) => {
    const updated = [...billItems];

    updated[rowIndex] = {
      ...emptyItem,
      productId: product.productId || product._id,
      productName: product.productName || product.name || "",
      itemCode: product.itemCode || "",
      barcode: product.barcode || "",
      hsnCode: product.hsnCode || "",
      mrp: Number(product.mrp || 0),
      costPrice: Number(product.costPrice || product.purchasePrice || 0),
      netcost: Number(
        product.netcost ||
        product.costPrice ||
        product.purchasePrice ||
        0
      ),
      rate: Number(
        product.rate ||
        product.costPrice ||
        product.purchasePrice ||
        0
      ),

      retailPrice: Number(
        product.retailPrice ??
        product.sellingPrice ??
        0
      ),

      wholesalePrice: Number(
        product.wholesalePrice ??
        0
      ),

      tax:
        (product.gstRate ?? product.tax) === "none"
          ? "none"
          : Number(product.gstRate ?? product.tax ?? 0),

      stock: Number(
        product.stock ??
        product.currentStock ??
        product.totalQty ??
        0
      ),

      unit: product.unit || "pcs",

      qty: 1,
      freeQty: 0,
    };

    setBillItems(updated);

    setRowSearches((prev) => ({ ...prev, [rowIndex]: "" }));
    setRowSearchResults((prev) => ({ ...prev, [rowIndex]: [] }));
    setActiveRowIndex(null);

    await calculatePurchase(updated);

    setTimeout(() => {
      itemInputRefs.current[rowIndex + 1]?.focus();
    }, 100);
  };

  const createInlineProduct = async (item) => {
    const productPayload = {
      name: String(item.productName || "").trim(),

      categoryId: item.categoryId || "",

      hsnCode: item.hsnCode || "",

      gstRate:
        (item.tax ?? item.gstRate) === "none"
          ? "none"
          : Number(item.tax ?? item.gstRate ?? 0),

      lowStockQty: Number(item.lowStockQty || 0),

      mrp: Number(item.mrp || 0),

      costPrice: Number(
        item.originalNetcost ||
        item.netcost ||
        item.costPrice ||
        0
      ),

      retailPrice: Number(item.retailPrice ?? 0),

      wholesalePrice: Number(item.wholesalePrice ?? 0),

      unit:
        item.unit ||
        localStorage.getItem("defaultUnit") ||
        "pcs",

      unitValue: Number(item.unitValue || 1),

      productType: "normal",

      barcode: item.barcode || "",

      description: item.description || "",
    };

    console.log(
      "INLINE CREATE PRODUCT PAYLOAD:",
      productPayload
    );

    const res = await fetch(API.createProduct, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(productPayload),
    });

    const data = await res.json();

    console.log(
      "INLINE CREATE PRODUCT RESPONSE:",
      data
    );

    if (!res.ok || !data.success) {
      throw new Error(
        data.message ||
        `Failed to create ${item.productName}`
      );
    }

    // IMPORTANT:
    // create-product API returns actual product inside data.data.product
    const createdProduct =
      data.data?.product ||
      data.data?.createdProduct ||
      data.data;

    const productId =
      createdProduct?._id ||
      createdProduct?.productId ||
      data.data?.productId ||
      data.productId;

    console.log("CREATED PRODUCT:", createdProduct);
    console.log("CREATED PRODUCT ID:", productId);

    if (!productId) {
      console.error(
        "Created product but productId missing:",
        data
      );

      throw new Error(
        `Product created but product id not returned for ${item.productName}`
      );
    }

    return {
      ...item,

      productId: String(productId),

      productName:
        createdProduct?.name ||
        createdProduct?.productName ||
        item.productName,

      itemCode:
        createdProduct?.itemCode ||
        data.data?.barcodes?.[0]?.code ||
        item.itemCode ||
        "",

      barcode: item.barcode || "",

      hsnCode:
        createdProduct?.hsnCode ||
        item.hsnCode ||
        "",

      tax:
        (
          createdProduct?.gstRate ??
          item.tax ??
          item.gstRate
        ) === "none"
          ? "none"
          : Number(
            createdProduct?.gstRate ??
            item.tax ??
            item.gstRate ??
            0
          ),


      gstRate:
        (
          createdProduct?.gstRate ??
          item.tax ??
          item.gstRate
        ) === "none"
          ? "none"
          : Number(
            createdProduct?.gstRate ??
            item.tax ??
            item.gstRate ??
            0
          ),

      mrp: Number(
        createdProduct?.mrp ??
        item.mrp ??
        0
      ),

      costPrice: Number(
        createdProduct?.costPrice ??
        item.costPrice ??
        item.originalNetcost ??
        item.netcost ??
        0
      ),

      netcost: Number(
        item.originalNetcost ||
        item.netcost ||
        createdProduct?.costPrice ||
        0
      ),

      originalNetcost: Number(
        item.originalNetcost ||
        item.netcost ||
        createdProduct?.costPrice ||
        0
      ),

      retailPrice: Number(
        createdProduct?.retailPrice ??
        createdProduct?.sellingPrice ??
        item.retailPrice ??
        0
      ),

      wholesalePrice: Number(
        createdProduct?.wholesalePrice ??
        item.wholesalePrice ??
        0
      ),

      unit:
        createdProduct?.unit ||
        item.unit ||
        "pcs",

      unitValue: Number(
        createdProduct?.unitValue ??
        item.unitValue ??
        1
      ),
    };

  };

  useEffect(() => {
    registerCreateProduct?.(createInlineProduct);
  }, [registerCreateProduct]);

  return (
    <div className={styles.tableSection}>
      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th className={styles.colMrp}>No</th>
            <th className={styles.colBarcode}>Item code</th>
            <th className={styles.colItem}>Items</th>
            <th className={styles.colMrp}>HSN Code</th>
            <th className={styles.colMrp}>Unit</th>
            <th className={styles.colQty}>Qty</th>
            <th className={styles.colMrp}>Rate</th>
            <th className={styles.colMrp}>GST %</th>
            <th className={styles.colMrp}>Net cost</th>
            <th className={styles.colMrp}>Mrp</th>
            <th className={styles.colAmount}>Retail Price</th>
            <th className={styles.colAmount}>Wholesale Price</th>
            <th className={styles.colMrp}>Tax amt</th>
            <th className={styles.colMrp}>Amount</th>
            <th className={styles.colMrp}>Stock</th>
            <th className={styles.colAmount}>Net amount</th>
            <th className={styles.colAction}></th>
          </tr>
        </thead>

        <tbody>
          {billItems.map((item, index) => (
            <tr key={index} className={styles.itemRow}>
              <td className={styles.colNo}>{index + 1}</td>

              {/* ITEM CODE */}
              <td>
                <input
                  type="text"
                  className={styles.cellInput}
                  value={item.itemCode ?? ""}
                  onChange={(e) =>
                    updateItem(index, "itemCode", e.target.value)
                  }
                />
              </td>

              {/* ITEM NAME / SEARCH */}
              <td>
                {item.productId ? (
                  item.productName ||
                  item.itemName ||
                  ""
                ) : (
                  <div className={styles.rowSearchBox}>
                    <input
                      ref={(element) => {
                        itemInputRefs.current[index] = element;

                        if (index === 0 && firstItemRef) {
                          firstItemRef.current = element;
                        }
                      }}
                      className={styles.rowSearchInput}
                      type="text"
                      value={
                        rowSearches[index] ??
                        item.productName ??
                        ""
                      }
                      onFocus={() =>
                        setActiveRowIndex(index)
                      }
                      onChange={(e) => {
                        const value = e.target.value;

                        searchProductsForRow(
                          index,
                          value
                        );

                        setBillItems((previousItems) => {
                          const updatedItems = [
                            ...previousItems,
                          ];

                          updatedItems[index] = {
                            ...updatedItems[index],
                            productName: value,
                          };

                          return updatedItems;
                        });
                      }}
                      onKeyDown={(e) => {
                        const products = rowSearchResults[index] || [];

                        if (e.key === "ArrowDown" && products.length) {
                          e.preventDefault();

                          const currentIndex = highlightedIndexes[index] ?? -1;
                          const nextIndex =
                            currentIndex < products.length - 1
                              ? currentIndex + 1
                              : 0;

                          setHighlightedIndexes((prev) => ({
                            ...prev,
                            [index]: nextIndex,
                          }));

                          return;
                        }

                        if (e.key === "ArrowUp" && products.length) {
                          e.preventDefault();

                          const currentIndex = highlightedIndexes[index] ?? -1;
                          const nextIndex =
                            currentIndex > 0
                              ? currentIndex - 1
                              : products.length - 1;

                          setHighlightedIndexes((prev) => ({
                            ...prev,
                            [index]: nextIndex,
                          }));

                          return;
                        }

                        if (e.key === "Enter") {
                          e.preventDefault();

                          if (activeRowIndex === index && products.length) {
                            const selectedIndex =
                              highlightedIndexes[index] >= 0
                                ? highlightedIndexes[index]
                                : 0;

                            const selectedProduct = products[selectedIndex];

                            if (selectedProduct) {
                              selectRowProduct(index, selectedProduct);
                            }

                            return;
                          }

                          if (!item.productId && String(item.productName || "").trim()) {
                            focusNextField(index, "productName");
                          }
                        }
                      }}
                    />

                    {activeRowIndex === index &&
                      rowSearchResults[index]?.length >
                      0 && (
                        <div
                          className={styles.rowDropdown}
                        >
                          {rowSearchResults[index].map(
                            (product, productIndex) => (
                              <div
                                ref={(el) => {
                                  dropdownItemRefs.current[`${index}-${productIndex}`] = el;
                                }}
                                key={`${product.productId || product._id}-${product.barcode || product.itemCode || ""}`}
                                className={`${styles.rowDropdownItem} ${highlightedIndexes[index] === productIndex
                                  ? styles.rowDropdownItemActive
                                  : ""
                                  }`}
                                onMouseDown={() =>
                                  selectRowProduct(
                                    index,
                                    product
                                  )
                                }
                              >
                                <div>
                                  <strong>
                                    {product.productName ||
                                      product.name}
                                  </strong>

                                  <p>
                                    Stock:{" "}
                                    {product.stock ??
                                      product.currentStock ??
                                      product.totalQty ??
                                      0}{" "}
                                    {product.unit || "pcs"}
                                  </p>
                                </div>

                                <span>
                                  ₹
                                  {product.costPrice ||
                                    product.mrp ||
                                    0}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                  </div>
                )}
              </td>

              {/* HSN CODE */}
              <td>
                <input
                  ref={(el) => {
                    fieldRefs.current[`${index}-hsnCode`] = el;
                  }}
                  type="text"
                  className={styles.cellInput}
                  value={item.hsnCode ?? ""}
                  onChange={(e) =>
                    updateItem(index, "hsnCode", e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      focusNextField(index, "hsnCode");
                    }
                  }}
                />
              </td>

              {/* UNIT */}
              <td>
                {item.productId ? (
                  <span>
                    {(item.unit || "pcs").toUpperCase()}
                  </span>
                ) : (
                  <select
                    ref={(el) => {
                      fieldRefs.current[`${index}-unit`] = el;
                    }}
                    className={styles.cellInput}
                    value={item.unit || "pcs"}
                    onChange={(e) =>
                      updateItem(index, "unit", e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        focusNextField(index, "unit");
                      }
                    }}
                  >
                    <option value="pcs">PCS</option>
                    <option value="kg">KG</option>
                    <option value="g">G</option>
                    <option value="box">box</option>
                    <option value="tin">tin</option>
                  </select>

                )}
              </td>

              {/* QUANTITY */}
              <td>
                <input
                  ref={(el) => {
                    fieldRefs.current[`${index}-qty`] = el;
                  }}
                  type="number"
                  className={styles.cellInput}
                  min="0"
                  step="0.001"
                  value={item.qty ?? ""}
                  onChange={(e) =>
                    updateItem(index, "qty", e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      focusNextField(index, "qty");
                    }
                  }}
                />
              </td>

              {/* RATE */}
              <td>{item.rate ?? ""}</td>

              {/* GST */}
              <td>
                <select
                  ref={(el) => {
                    fieldRefs.current[`${index}-tax`] = el;
                  }}
                  className={styles.cellInput}
                  value={item.tax ?? ""}
                  onChange={(e) =>
                    updateItem(index, "tax", e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      focusNextField(index, "tax");
                    }
                  }}
                >
                  <option value="">GST</option>
                  <option value="none">None</option>
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="40">40%</option>
                </select>
              </td>

              {/* NET COST */}
              <td>
                <input
                  type="number"
                  className={styles.cellInput}
                  value={item.netcost ?? ""}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "netcost",
                      e.target.value
                    )
                  }
                  ref={(el) => {
                    fieldRefs.current[`${index}-netcost`] = el;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      focusNextField(index, "netcost");
                    }
                  }}
                />
              </td>

              {/* MRP */}
              <td>
                <input
                  type="number"
                  className={styles.cellInput}
                  value={item.mrp ?? ""}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "mrp",
                      e.target.value
                    )
                  }
                  ref={(el) => {
                    fieldRefs.current[`${index}-mrp`] = el;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      focusNextField(index, "mrp");
                    }
                  }}
                />
              </td>

              <td>
                <input
                  type="number"
                  className={styles.cellInput}
                  value={item.retailPrice ?? ""}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "retailPrice",
                      e.target.value
                    )
                  }
                  ref={(el) => {
                    fieldRefs.current[`${index}-retailPrice`] = el;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      focusNextField(index, "retailPrice");
                    }
                  }}
                />
              </td>

              <td>
                <input
                  type="number"
                  className={styles.cellInput}
                  value={item.wholesalePrice ?? ""}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "wholesalePrice",
                      e.target.value
                    )
                  }
                  ref={(el) => {
                    fieldRefs.current[`${index}-wholesalePrice`] = el;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      focusNextField(index, "wholesalePrice");
                    }
                  }}
                />
              </td>

              {/* TAX AMOUNT */}
              <td>
                {item.taxAmount !== undefined &&
                  item.taxAmount !== ""
                  ? `₹ ${item.taxAmount}`
                  : ""}
              </td>

              {/* AMOUNT */}
              <td>
                {item.amount !== undefined &&
                  item.amount !== ""
                  ? `₹ ${item.amount}`
                  : ""}
              </td>

              {/* STOCK */}
              <td>
                {item.productId
                  ? `${Number(
                    item.stock || 0
                  ).toFixed(2)} ${(
                    item.unit || "pcs"
                  ).toUpperCase()}`
                  : ""}
              </td>

              {/* NET AMOUNT */}
              <td>
                {item.netAmount !== undefined &&
                  item.netAmount !== ""
                  ? `₹ ${item.netAmount}`
                  : ""}
              </td>

              {/* DELETE */}
              <td className={styles.colAction}>
                <button
                  type="button"
                  className={styles.deleteRowBtn}
                  onClick={() => removeRow(index)}
                >
                  <FiTrash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}