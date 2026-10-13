import { useEffect, useMemo, useRef, useState } from "react";
import {
    FiSearch,
    FiPrinter,
    FiRefreshCw,
    FiX,
    FiCheckCircle,
} from "react-icons/fi";
import JsBarcode from "jsbarcode";
import styles from "./Barcode.module.css";
import { API } from "../constants/api";
import { useLocation, useNavigate } from "react-router-dom";

const initialForm = {
    productId: "",
    comboOfferId: "",
    printQty: 1,
    barcodeMode: "auto",
    manualBarcode: "",
};

export default function BarcodeGenerate() {
    const location = useLocation();

    const autoSelectProduct =
        location.state?.autoSelectProduct || null;

    const token = localStorage.getItem("token");

    const [form, setForm] = useState(initialForm);

    const [products, setProducts] = useState([]);
    const [productSearch, setProductSearch] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [comboOffers, setComboOffers] = useState([]);
    const [comboSearch, setComboSearch] = useState("");
    const [selectedCombo, setSelectedCombo] = useState(null);
    const [showComboDropdown, setShowComboDropdown] = useState(false);
    const [generatedBarcodes, setGeneratedBarcodes] = useState([]);
    const productDropdownRef = useRef(null);
    const comboDropdownRef = useRef(null);

    const [productLoading, setProductLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchProducts();
        fetchComboOffers();
    }, []);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                productDropdownRef.current &&
                !productDropdownRef.current.contains(event.target)
            ) {
                setShowProductDropdown(false);
            }

            if (
                comboDropdownRef.current &&
                !comboDropdownRef.current.contains(event.target)
            ) {
                setShowComboDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    useEffect(() => {
        if (!autoSelectProduct) return;

        const incomingProductId =
            autoSelectProduct._id ||
            autoSelectProduct.productId ||
            autoSelectProduct.id;

        if (!incomingProductId) return;

        const matchedProduct = products.find((product) => {
            const productId =
                product._id ||
                product.productId ||
                product.id;

            return String(productId) === String(incomingProductId);
        });

        const finalProduct =
            matchedProduct || autoSelectProduct;

        setSelectedProduct(finalProduct);

        setForm((previous) => ({
            ...previous,
            productId: incomingProductId,
        }));

        setProductSearch(
            finalProduct.name ||
            finalProduct.productName ||
            ""
        );

        setShowProductDropdown(false);
    }, [autoSelectProduct, products]);

    useEffect(() => {
        if (!generatedBarcodes.length) return;

        const timer = setTimeout(() => {
            generatedBarcodes.forEach((barcode) => {
                const element = document.getElementById(`barcode-${barcode._id}`);

                if (!element) return;

                try {
                    JsBarcode(element, String(barcode.code), {
                        format: "CODE128",
                        width: 2,
                        height: 55,
                        displayValue: true,
                        fontSize: 14,
                        margin: 5,
                    });
                } catch (error) {
                    console.error("Barcode render error:", error);
                }
            });
        }, 100);

        return () => clearTimeout(timer);
    }, [generatedBarcodes]);

    const showToast = (message, type = "success") => {
        setToast({ message, type });

        setTimeout(() => {
            setToast(null);
        }, 2500);
    };
    const fetchComboOffers = async () => {
        try {
            const response = await fetch(API.comboOffer, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setComboOffers(data.data || []);
            }
        } catch (error) {
            console.error("Combo fetch error:", error);
        }
    };

    const fetchProducts = async () => {
        try {
            setProductLoading(true);

            const response = await fetch(API.products, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to load products");
            }

            setProducts(data.data || []);
        } catch (error) {
            console.error("Product fetch error:", error);
            showToast(error.message || "Failed to load products", "error");
        } finally {
            setProductLoading(false);
        }
    };

    const filteredProducts = useMemo(() => {
        const searchValue = productSearch.trim().toLowerCase();

        if (!searchValue) {
            return products;
        }

        return products.filter((product) => {
            const productName = String(
                product.name || product.productName || ""
            ).toLowerCase();

            const itemCode = String(product.itemCode || "").toLowerCase();

            const barcode = String(
                product.barcode ||
                product.barcodes?.[0]?.code ||
                product.barcodes?.[0]?.barcode ||
                ""
            ).toLowerCase();

            return (
                productName.includes(searchValue) ||
                itemCode.includes(searchValue) ||
                barcode.includes(searchValue)
            );
        });
    }, [products, productSearch]);

    const handleSelectProduct = (product) => {
        const productId = product._id || product.productId;
        const productName = product.name || product.productName || "";

        setSelectedProduct(product);
        setSelectedCombo(null);

        setForm((previous) => ({
            ...previous,
            productId,
            comboOfferId: "",
        }));

        setProductSearch(productName);
        setShowProductDropdown(false);
        setGeneratedBarcodes([]);
    };

    const clearSelectedProduct = () => {
        setSelectedProduct(null);
        setProductSearch("");
        setGeneratedBarcodes([]);

        setForm((previous) => ({
            ...previous,
            productId: "",
        }));
    };

    const handlePrintQuantityChange = (event) => {
        const value = event.target.value;

        if (value === "") {
            setForm((previous) => ({
                ...previous,
                printQty: "",
            }));

            return;
        }

        const quantity = Math.max(1, Number(value));

        setForm((previous) => ({
            ...previous,
            printQty: quantity,
        }));
    };

    const validateForm = () => {
        if (!form.productId && !form.comboOfferId) {
            showToast(
                "Please select a product or combo offer",
                "error"
            );
            return false;
        }

        if (
            form.barcodeMode === "manual" &&
            !form.manualBarcode.trim()
        ) {
            showToast("Please enter manual barcode", "error");
            return false;
        }

        if (!form.printQty || Number(form.printQty) < 1) {
            showToast("Print quantity must be at least 1", "error");
            return false;
        }

        return true;
    };

    const handleGenerateBarcode = async (event) => {
        event.preventDefault();

        if (!form.productId) {
            showToast("Please select a product", "error");
            return;
        }

        if (!form.printQty || Number(form.printQty) < 1) {
            showToast("Print quantity must be at least 1", "error");
            return;
        }

        try {
            setGenerating(true);
            setGeneratedBarcodes([]);

            const payload = {
                productId: form.productId,
                printQty: Number(form.printQty),
            };

            console.log("BARCODE GENERATE PAYLOAD:", payload);

            const response = await fetch(API.generateBarcode, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            console.log("BARCODE GENERATE RESPONSE:", data);

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Barcode generation failed"
                );
            }

            const barcodeData = data.data
                ? [
                    {
                        ...data.data,
                        _id: data.data.id,
                    },
                ]
                : [];

            setGeneratedBarcodes(barcodeData);

            showToast(
                data.message || "Barcode generated successfully",
                "success"
            );
        } catch (error) {
            console.error("Barcode generate error:", error);

            showToast(
                error.message || "Unable to generate barcode",
                "error"
            );
        } finally {
            setGenerating(false);
        }
    };

    const createPrintableBarcodes = () => {
        const labels = [];

        // User entered print quantity is the source of truth
        const quantity = Math.max(1, Number(form.printQty) || 1);

        generatedBarcodes.forEach((barcode) => {
            for (let index = 0; index < quantity; index += 1) {
                labels.push({
                    ...barcode,
                    printQty: quantity,
                    printIndex: index,
                });
            }
        });

        return labels;
    };



    const handlePrint = () => {
        if (!generatedBarcodes.length) {
            showToast("Generate a barcode before printing", "error");
            return;
        }

        const printBarcodes = createPrintableBarcodes();

        const productName =
            selectedProduct?.name ||
            selectedProduct?.productName ||
            "Product";

        const printWindow = window.open(
            "",
            "_blank",
            "width=900,height=700"
        );

        if (!printWindow) {
            showToast("Please allow popup to print barcode", "error");
            return;
        }

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode</title>

          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 10px;
              font-family: Arial, sans-serif;
              background: #ffffff;
            }

            .barcode-sheet {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
            }

            .barcode-label {
              width: 100%;
              min-height: 115px;
              padding: 8px;
              border: 1px dashed #a1a1aa;
              text-align: center;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .product-name {
              margin-bottom: 3px;
              font-size: 12px;
              font-weight: 700;
              color: #18181b;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .price-row {
              display: flex;
              justify-content: center;
              gap: 8px;
              margin-top: 2px;
              font-size: 11px;
              color: #3f3f46;
            }

            svg {
              width: 100%;
              max-width: 210px;
            }

            @media print {
              body {
                padding: 0;
              }

              .barcode-sheet {
                gap: 4px;
              }

              .barcode-label {
                border: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="barcode-sheet">
            ${printBarcodes
                .map(
                    (barcode, index) => `
                  <div class="barcode-label">
                    <div class="product-name">
                      ${productName}
                    </div>

                    <svg id="print-barcode-${index}"></svg>

                    <div class="price-row">
                      <span>MRP: ₹${Number(
                        barcode.mrp || selectedProduct?.mrp || 0
                    ).toFixed(2)}</span>

                      <span>Rs: ₹${Number(
                        barcode.sellingPrice ||
                        selectedProduct?.sellingPrice ||
                        0
                    ).toFixed(2)}</span>
                    </div>
                  </div>
                `
                )
                .join("")}
          </div>

          <script>
            window.onload = function () {
              const barcodeData = ${JSON.stringify(printBarcodes)};

              barcodeData.forEach(function (barcode, index) {
                JsBarcode(
                  "#print-barcode-" + index,
                  String(barcode.code),
                  {
                    format: "CODE128",
                    width: 2,
                    height: 48,
                    displayValue: true,
                    fontSize: 13,
                    margin: 3
                  }
                );
              });

              setTimeout(function () {
                window.print();
              }, 300);
            };

            window.onafterprint = function () {
              window.close();
            };
          </script>
        </body>
      </html>
    `);

        printWindow.document.close();
    };

    const handleReset = () => {
        setForm(initialForm);
        setSelectedProduct(null);
        setProductSearch("");
        setShowProductDropdown(false);
        setGeneratedBarcodes([]);
    };

    const getProductName = () => {
        return (
            selectedProduct?.name ||
            selectedProduct?.productName ||
            "Selected product"
        );
    };

    return (
        <div className={styles.page}>
            {toast && (
                <div
                    className={`${styles.toast} ${toast.type === "error"
                        ? styles.toastError
                        : styles.toastSuccess
                        }`}
                >
                    {toast.message}
                </div>
            )}

            <div className={styles.pageHeader}>
                <div>
                    <h1>Barcode Generator</h1>
                    <p>Generate and print product barcode labels</p>
                </div>

                <button
                    type="button"
                    className={styles.resetButton}
                    onClick={handleReset}
                >
                    <FiRefreshCw />
                    Reset
                </button>
            </div>

            <div className={styles.contentGrid}>
                <form
                    className={styles.formCard}
                    onSubmit={handleGenerateBarcode}
                >
                    <div className={styles.cardTitle}>
                        <div className={styles.titleIcon}>
                            <FiSearch />
                        </div>

                        <div>
                            <h2>Generate Barcode</h2>
                            <p>Select a product and enter print quantity</p>
                        </div>
                    </div>

                    <div className={styles.formBody}>
                        <div className={styles.formGroup}>
                            <label>
                                Product
                            </label>

                            <div
                                className={styles.productSearchWrapper}
                                ref={productDropdownRef}
                            >
                                <FiSearch className={styles.searchIcon} />

                                <input
                                    type="text"
                                    value={productSearch}
                                    placeholder="Search item name or item code"
                                    autoComplete="off"
                                    onFocus={() => setShowProductDropdown(true)}
                                    onChange={(event) => {
                                        setProductSearch(event.target.value);
                                        setShowProductDropdown(true);

                                        if (selectedProduct) {
                                            setSelectedProduct(null);

                                            setForm((previous) => ({
                                                ...previous,
                                                productId: "",
                                                comboOfferId: "",
                                            }));
                                        }
                                    }}
                                />

                                {productSearch && (
                                    <button
                                        type="button"
                                        className={styles.clearButton}
                                        onClick={clearSelectedProduct}
                                    >
                                        <FiX />
                                    </button>
                                )}

                                {showProductDropdown && (
                                    <div className={styles.productDropdown}>
                                        {productLoading ? (
                                            <div className={styles.dropdownMessage}>
                                                Loading products...
                                            </div>
                                        ) : filteredProducts.length > 0 ? (
                                            filteredProducts.slice(0, 50).map((product) => {
                                                const productId =
                                                    product._id ||
                                                    product.productId ||
                                                    product.id;

                                                return (
                                                    <button
                                                        type="button"
                                                        key={productId}
                                                        className={styles.productOption}
                                                        onMouseDown={(event) => {
                                                            event.preventDefault();
                                                            handleSelectProduct(product);
                                                        }}
                                                    >
                                                        <div>
                                                            <strong>
                                                                {product.name ||
                                                                    product.productName ||
                                                                    "Unnamed product"}
                                                            </strong>

                                                            <p>
                                                                Item code:{" "}
                                                                {product.itemCode || "-"}
                                                            </p>
                                                        </div>

                                                        <div className={styles.productOptionRight}>
                                                            <span>
                                                                ₹
                                                                {Number(
                                                                    product.sellingPrice || 0
                                                                ).toFixed(2)}
                                                            </span>

                                                            <small>
                                                                Stock:{" "}
                                                                {product.stock ??
                                                                    product.currentStock ??
                                                                    product.availableQty ??
                                                                    0}{" "}
                                                                {product.unit || ""}
                                                            </small>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className={styles.dropdownMessage}>
                                                No products found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Barcode Type</label>

                            <div className={styles.barcodeModeGroup}>
                                <button
                                    type="button"
                                    className={`${styles.modeButton} ${form.barcodeMode === "auto" ? styles.activeMode : ""
                                        }`}
                                    onClick={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            barcodeMode: "auto",
                                            manualBarcode: "",
                                        }))
                                    }
                                >
                                    Auto Generate
                                </button>

                                <button
                                    type="button"
                                    className={`${styles.modeButton} ${form.barcodeMode === "manual" ? styles.activeMode : ""
                                        }`}
                                    onClick={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            barcodeMode: "manual",
                                        }))
                                    }
                                >
                                    Manual Barcode
                                </button>
                            </div>
                        </div>

                        {form.barcodeMode === "manual" && (
                            <div className={styles.formGroup}>
                                <label>
                                    Barcode Number
                                </label>

                                <input
                                    type="text"
                                    value={form.manualBarcode}
                                    placeholder="Enter barcode number"
                                    maxLength={30}
                                    onChange={(event) => {
                                        const value = event.target.value.replace(/[^a-zA-Z0-9-]/g, "");

                                        setForm((prev) => ({
                                            ...prev,
                                            manualBarcode: value,
                                        }));
                                    }}
                                />

                                <small className={styles.fieldHint}>
                                    Enter your own barcode number
                                </small>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label>
                                Print Quantity
                            </label>

                            <input
                                type="text"
                                name="printQty"
                                value={form.printQty}
                                min="1"
                                max="500"
                                placeholder="Enter print quantity"
                                onChange={handlePrintQuantityChange}
                            />

                            <small className={styles.fieldHint}>
                                Number of barcode labels to print
                            </small>
                        </div>

                        <button
                            type="submit"
                            className={styles.generateButton}
                            disabled={generating}
                        >
                            {generating ? (
                                <>
                                    <span className={styles.spinner} />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FiRefreshCw />
                                    Generate Barcode
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className={styles.previewCard}>
                    <div className={styles.previewHeader}>
                        <div>
                            <h2>Barcode Preview</h2>

                            <p>
                                {generatedBarcodes.length
                                    ? `${form.printQty} label(s) ready to print`
                                    : "Generated barcode will appear here"}
                            </p>
                        </div>

                        <button
                            type="button"
                            className={styles.printButton}
                            onClick={handlePrint}
                            disabled={!generatedBarcodes.length}
                        >
                            <FiPrinter />
                            Print
                        </button>
                    </div>

                    <div className={styles.previewBody}>
                        {generatedBarcodes.length > 0 ? (
                            generatedBarcodes.map((barcode) => (
                                <div
                                    className={styles.barcodeLabel}
                                    key={barcode._id}
                                >
                                    <div className={styles.barcodeProductName}>
                                        {getProductName()}
                                    </div>

                                    <svg id={`barcode-${barcode._id}`} />

                                    <div className={styles.barcodeDetails}>
                                        {!selectedCombo && (
                                            <span>
                                                MRP ₹{Number(barcode.mrp || 0)}
                                            </span>
                                        )}

                                        <span>
                                            Rs ₹
                                            {Number(
                                                selectedCombo
                                                    ? selectedCombo.comboPrice || 0
                                                    : barcode.sellingPrice || 0
                                            )}
                                        </span>
                                    </div>

                                    <div className={styles.barcodeFooter}>
                                        <span>
                                            {barcode.unitValue || 1}{" "}
                                            {barcode.unit || "pcs"}
                                        </span>

                                        <span>
                                            Print Qty: {form.printQty}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyPreview}>
                                <div className={styles.emptyBarcode}>
                                    <span />
                                    <span />
                                    <span />
                                    <span />
                                    <span />
                                    <span />
                                    <span />
                                    <span />
                                </div>

                                <h3>No barcode generated</h3>

                                <p>
                                    Select a product and click Generate Barcode to see
                                    the preview.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}