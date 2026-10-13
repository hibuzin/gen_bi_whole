import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import styles from "./BulkAction.module.css";
import * as XLSX from "xlsx";
import { API } from "../../constants/api";

const columns = [
  "Name",
  "Description",
  "Category",
  "HSN Code",
  "GST %",
  "MRP",
  "Unit",
  "Unit Value",
  "Cost Price",
  "Retail Price",
  "Wholesale Price",
  "Opening Stock",
  "Low Stock Qty",
  "Barcode",
];

const ROW_HEIGHT = 34;
const BUFFER = 8;
const INITIAL_ROWS = 4000;

const createRow = () => columns.map(() => "");

function BulkAction() {
  const [data, setData] = useState(() =>
    Array.from({ length: INITIAL_ROWS }, createRow)
  );

  const excelInputRef = useRef(null);
  const [excelFileName, setExcelFileName] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  const containerRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detect grid height

  useEffect(() => {
    const el = containerRef.current;

    if (!el) return;

    const update = () => {
      setViewportHeight(el.clientHeight);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // --------------------------------------------------
  // Fetch Categories
  // --------------------------------------------------

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(API.categories, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await res.json();

        if (res.ok) {
          setCategories(result.data || []);
        } else {
          console.error(
            result.message || "Failed to fetch categories"
          );
        }
      } catch (error) {
        console.error("Category fetch error:", error);
      }
    };

    fetchCategories();
  }, []);

  // --------------------------------------------------
  // Scroll
  // --------------------------------------------------

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // --------------------------------------------------
  // Virtual Rows
  // --------------------------------------------------

  const totalRows = data.length;

  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - BUFFER
  );

  const endIndex = Math.min(
    totalRows,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER
  );

  const visibleRows = useMemo(
    () => data.slice(startIndex, endIndex),
    [data, startIndex, endIndex]
  );

  // --------------------------------------------------
  // Update Cell
  // --------------------------------------------------

  const updateCell = useCallback(
    (rowIdx, colIdx, value) => {
      setData((prev) => {
        const next = prev.slice();

        const row = next[rowIdx].slice();

        row[colIdx] = value;

        next[rowIdx] = row;

        return next;
      });
    },
    []
  );

  // --------------------------------------------------
  // Delete Row
  // --------------------------------------------------

  const deleteRow = useCallback((rowIdx) => {
    setData((prev) =>
      prev.filter((_, index) => index !== rowIdx)
    );
  }, []);

  // --------------------------------------------------
  // Add 1000 Rows
  // --------------------------------------------------

  const add1000Rows = useCallback(() => {
    setData((prev) => [
      ...prev,
      ...Array.from({ length: 1000 }, createRow),
    ]);
  }, []);

  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setExcelFileName(file.name);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(
          event.target.result,
          {
            type: "array",
          }
        );

        const sheetName =
          workbook.SheetNames[0];

        const worksheet =
          workbook.Sheets[sheetName];

        const excelRows =
          XLSX.utils.sheet_to_json(
            worksheet,
            {
              defval: "",
            }
          );

        console.log(
          "EXCEL OBJECT ROWS:",
          excelRows
        );

        console.log("FIRST EXCEL ROW:", excelRows[0]);

        if (excelRows.length === 0) {
          alert("Excel file is empty");
          return;
        }

        const getValue = (row, possibleKeys) => {
          for (const key of possibleKeys) {
            const actualKey = Object.keys(row).find(
              (rowKey) =>
                String(rowKey).trim().toLowerCase() ===
                String(key).trim().toLowerCase()
            );

            if (
              actualKey &&
              row[actualKey] !== undefined &&
              row[actualKey] !== null &&
              String(row[actualKey]).trim() !== ""
            ) {
              return row[actualKey];
            }
          }

          return "";
        };

        const importedRows =
          excelRows.map((item) => {

            // NAME
            const name = getValue(
              item,
              [
                "Name",
                "Item Name",
                "Product Name",
                "Item",
                "Product",
              ]
            );

            // DESCRIPTION
            const description = getValue(
              item,
              [
                "Description",
                "Item Description",
                "Product Description",
              ]
            );

            // CATEGORY
            const categoryName =
              String(
                getValue(
                  item,
                  [
                    "Category",
                    "Category Name",
                  ]
                )
              )
                .trim()
                .toLowerCase();

            const matchedCategory =
              categories.find(
                (cat) =>
                  String(cat.name)
                    .trim()
                    .toLowerCase() ===
                  categoryName
              );

            // HSN
            const hsnCode = getValue(
              item,
              [
                "HSN Code",
                "HSN",
                "Hsn Code",
                "Hsn",
              ]
            );

            // GST
            const gstValue = getValue(
              item,
              [
                "GST %",
                "Gst%",
                "GST",
                "GST Rate",
                "Gst Rate",
                "Tax %",
              ]
            );

            const gstRate =
              String(gstValue ?? "").trim().toLowerCase() === "none"
                ? "none"
                : Number(gstValue) <= 1
                  ? String(Number(gstValue) * 100)
                  : String(gstValue).replace("%", "").trim();

            // MRP
            const mrp = getValue(
              item,
              [
                "MRP",
                "Mrp",
              ]
            );

            // UNIT
            let unit = String(
              getValue(
                item,
                [
                  "Unit",
                  "UOM",
                  "Uom",
                ]
              ) || "pcs"
            )
              .trim()
              .toLowerCase();

            if (
              unit === "piece" ||
              unit === "pieces" ||
              unit === "pc"
            ) {
              unit = "pcs";
            }

            if (
              unit === "gram" ||
              unit === "grams"
            ) {
              unit = "g";
            }

            // UNIT VALUE
            const unitValue =
              getValue(
                item,
                [
                  "Unit Value",
                  "UnitValue",
                  "Pack Size",
                ]
              );

            // COST PRICE
            const costPrice = getValue(item, [
              "Purchase Price",
              "Cost Price",
              "PurchasePrice",
              "Cost",
              "Buy Price",
            ]);


            // RETAIL PRICE
            const retailPrice = getValue(item, [
              "Retail Price",
              "RetailPrice",
              "Selling Price",
              "Sale Price",
              "Sales Price",
            ]);

            // WHOLESALE PRICE
            const wholesalePrice = getValue(item, [
              "Wholesale Price",
              "WholesalePrice",
              "Wholesale",
            ]);

            // OPENING STOCK
            const openingStock = getValue(item, [
              "Stock",
              "Opening Stock",
              "Current Stock",
              "Qty",
              "Quantity",
            ]);

            // LOW STOCK
            const lowStockQty =
              getValue(
                item,
                [
                  "Low Stock Qty",
                  "Low Stock",
                  "Minimum Stock",
                  "Reorder Level",
                ]
              );

            // BARCODE
            const barcode =
              getValue(
                item,
                [
                  "Barcode",
                  "Bar Code",
                  "Barcode No",
                  "EAN",
                ]
              );

            return [
              String(name || "").trim(),
              String(description || "").trim(),
              matchedCategory?._id || "",
              String(hsnCode || "").trim(),
              String(gstRate ?? "").trim(),
              String(mrp ?? "").trim(),
              unit,
              String(unitValue ?? "").trim(),
              String(costPrice ?? "").trim(),
              String(retailPrice ?? "").trim(),
              String(wholesalePrice ?? "").trim(),
              String(openingStock ?? "").trim(),
              String(lowStockQty ?? "").trim(),
              String(barcode ?? "").trim(),
            ];
          });

        const validRows =
          importedRows.filter(
            (row) =>
              row.some(
                (cell) =>
                  String(cell).trim() !== ""
              )
          );

        if (validRows.length === 0) {
          alert(
            "No matching product fields found"
          );
          return;
        }

        const remainingRows =
          Math.max(
            INITIAL_ROWS -
            validRows.length,
            0
          );

        setData([
          ...validRows,

          ...Array.from(
            {
              length: remainingRows,
            },
            createRow
          ),
        ]);

        setScrollTop(0);

        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }

        alert(
          `${validRows.length} products imported successfully`
        );

      } catch (error) {
        console.error(
          "Excel import error:",
          error
        );

        alert(
          "Failed to read Excel file"
        );
      }
    };

    reader.readAsArrayBuffer(file);

    e.target.value = "";
  };


  const handleCreateCategory = async () => {
    const categoryName = newCategory.trim();

    if (!categoryName) {
      alert("Please enter category name");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(API.categories, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: categoryName,
        }),
      });

      const result = await res.json();

      console.log("Category Status:", res.status);
      console.log("Category Response:", result);

      if (!res.ok) {
        alert(result.message || "Failed to create category");
        return;
      }

      if (result.data) {
        setCategories((prev) => [
          ...prev,
          result.data,
        ]);
      }

      setNewCategory("");
      setShowCategoryModal(false);

      alert("Category created successfully");
    } catch (error) {
      console.error("Create category error:", error);
      alert("Error while creating category");
    }
  };

  // --------------------------------------------------
  // Submit Bulk Products
  // --------------------------------------------------

  const submitBulk = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const token = localStorage.getItem("token");

      const products = data
        .filter((row) =>
          row.some((cell) => String(cell).trim() !== "")
        )
        .map((row) => ({
          name: row[0]?.trim() || "",
          description: row[1]?.trim() || "",

          categoryId: row[2] || "",

          hsnCode: row[3]?.trim() || "",

          gstRate:
            String(row[4] || "").trim().toLowerCase() === "none"
              ? "none"
              : Number(row[4] || 0),

          mrp: Number(row[5] || 0),

          unit: row[6]?.trim() || "",

          unitValue:
            row[7] !== undefined &&
              String(row[7]).trim() !== ""
              ? Number(row[7])
              : undefined,

          costPrice: Number(row[8] || 0),

          retailPrice: Number(row[9] || 0),

          wholesalePrice: Number(row[10] || 0),

          openingStock: Number(row[11] || 0),

          lowStockQty: Number(row[12] || 0),

          barcode: row[13]?.trim() || "",
        }));

      if (products.length === 0) {
        alert("Please enter at least one product");
        return;
      }

      // ============================================
      // BATCH UPLOAD
      // ============================================

      const BATCH_SIZE = 500;

      let totalCreated = 0;
      let totalErrors = 0;

      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);

        console.log(
          `Uploading ${i + 1} - ${Math.min(
            i + BATCH_SIZE,
            products.length
          )} of ${products.length}`
        );

        const res = await fetch(API.createBulkProduct, {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            products: batch,
          }),
        });

        // Don't blindly call res.json()
        const contentType = res.headers.get("content-type");

        let result;

        if (contentType?.includes("application/json")) {
          result = await res.json();
        } else {
          const text = await res.text();

          console.error("Server returned non-JSON:", text);

          throw new Error(
            `Server error (${res.status}) while uploading batch`
          );
        }

        console.log("Batch response:", result);

        if (!res.ok || !result.success) {
          console.error("Batch failed:", result);

          throw new Error(
            result.message ||
            `Batch upload failed with status ${res.status}`
          );
        }

        totalCreated += result.createdCount || 0;
        totalErrors += result.errorCount || 0;
      }

      // ============================================
      // SUCCESS
      // ============================================

      alert(
        `Bulk product upload completed!\n\n` +
        `Total: ${products.length}\n` +
        `Created: ${totalCreated}\n` +
        `Errors: ${totalErrors}`
      );

      setData(
        Array.from(
          { length: INITIAL_ROWS },
          createRow
        )
      );

      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }

      setScrollTop(0);

    } catch (error) {
      console.error("Bulk submit error:", error);

      alert(
        error.message ||
        "Error while adding products"
      );

    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className={styles.container}>

      <div className={styles.header}>
        <h2>Bulk Product Upload</h2>

        <div className={styles.headerActions}>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleExcelUpload}
          />

          <button
            type="button"
            className={styles.excelUploadBtn}
            onClick={() =>
              excelInputRef.current?.click()
            }
          >
            Upload Excel
          </button>

          {excelFileName && (
            <span
              className={
                styles.excelFileName
              }
            >
              {excelFileName}
            </span>
          )}
        </div>
      </div>

      {/* =========================
          EXCEL GRID
      ========================== */}

      <div
        className={styles.excelGrid}
        ref={containerRef}
        onScroll={handleScroll}
      >
        <div className={styles.excelGridInner}>

          {/* HEADER */}

          <div className={styles.excelHeader}>

            <div className={styles.rowNumber}>
              #
            </div>

            {columns.map((column) => (
              <div key={column}>
                {column}
              </div>
            ))}

            <div className={styles.deleteHeader}>
              ×
            </div>
          </div>

          {/* BODY */}

          <div
            style={{
              height:
                totalRows * ROW_HEIGHT,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top:
                  startIndex * ROW_HEIGHT,
                left: 0,
                right: 0,
              }}
            >

              {visibleRows.map(
                (row, i) => {
                  const rowIdx =
                    startIndex + i;

                  return (
                    <div
                      className={
                        styles.excelRow
                      }
                      key={rowIdx}
                    >

                      {/* ROW NUMBER */}

                      <div
                        className={
                          styles.rowNumber
                        }
                      >
                        {rowIdx + 1}
                      </div>

                      {/* CELLS */}

                      {row.map(
                        (
                          cell,
                          colIdx
                        ) => {

                          // Category
                          if (
                            colIdx === 2
                          ) {
                            return (
                              <select
                                key={
                                  colIdx
                                }
                                className={
                                  styles.excelCell
                                }
                                value={
                                  cell
                                }
                                onChange={(
                                  e
                                ) => {

                                  if (
                                    e
                                      .target
                                      .value ===
                                    "__add_category__"
                                  ) {
                                    setShowCategoryModal(
                                      true
                                    );

                                    return;
                                  }

                                  updateCell(
                                    rowIdx,
                                    colIdx,
                                    e
                                      .target
                                      .value
                                  );
                                }}
                              >

                                <option value="">
                                  Select
                                </option>

                                {categories.map(
                                  (
                                    cat
                                  ) => (
                                    <option
                                      key={
                                        cat._id
                                      }
                                      value={
                                        cat._id
                                      }
                                    >
                                      {
                                        cat.name
                                      }
                                    </option>
                                  )
                                )}

                                <option value="__add_category__">
                                  + Add Category
                                </option>

                              </select>
                            );
                          }

                          {/* GST DROPDOWN */ }
                          if (colIdx === 4) {
                            return (
                              <select
                                key={colIdx}
                                className={styles.excelCell}
                                value={cell}
                                onChange={(e) =>
                                  updateCell(
                                    rowIdx,
                                    colIdx,
                                    e.target.value
                                  )
                                }
                              >
                                <option value="">Select GST</option>
                                <option value="none">None</option>
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="40">40%</option>
                              </select>
                            );
                          }


                          /* UNIT DROPDOWN */
                          if (colIdx === 6) {
                            return (
                              <select
                                key={colIdx}
                                className={styles.excelCell}
                                value={cell}
                                onChange={(e) =>
                                  updateCell(
                                    rowIdx,
                                    colIdx,
                                    e.target.value
                                  )
                                }
                              >

                                <option value="">Select Unit</option>
                                <option value="pcs">pcs</option>
                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="box">box</option>
                                <option value="tin">tin</option>
                              </select>
                            );
                          }

                          return (
                            <input
                              key={
                                colIdx
                              }
                              className={
                                styles.excelCell
                              }
                              value={
                                cell
                              }
                              onChange={(
                                e
                              ) =>
                                updateCell(
                                  rowIdx,
                                  colIdx,
                                  e
                                    .target
                                    .value
                                )
                              }
                            />
                          );
                        }
                      )}

                      {/* DELETE */}

                      <button
                        type="button"
                        className={
                          styles.deleteBtn
                        }
                        onClick={() =>
                          deleteRow(
                            rowIdx
                          )
                        }
                        title="Delete row"
                      >
                        ×
                      </button>

                    </div>
                  );
                }
              )}

            </div>
          </div>
        </div>
      </div>

      {/* =========================
          ACTION BUTTONS
      ========================== */}

      <div className={styles.actions}>

        <button
          type="button"
          className={styles.addBtn}
          onClick={add1000Rows}
          disabled={isSubmitting}
        >
          +1000 Rows
        </button>

        <button
          type="button"
          className={
            styles.submitBtn
          }
          onClick={submitBulk}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Uploading..."
            : "Submit Products"}
        </button>

      </div>

      {/* =========================
          CREATE CATEGORY MODAL
      ========================== */}

      {showCategoryModal && (
        <div
          className={
            styles.modalOverlay
          }
        >

          <div
            className={
              styles.modal
            }
          >

            <h3>
              Create Category
            </h3>

            <input
              type="text"
              value={
                newCategory
              }
              onChange={(e) =>
                setNewCategory(
                  e.target.value
                )
              }
              placeholder="Enter category name"
              autoFocus
              onKeyDown={(e) => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  handleCreateCategory();
                }

                if (
                  e.key ===
                  "Escape"
                ) {
                  setShowCategoryModal(
                    false
                  );
                }
              }}
            />

            <div
              className={
                styles.modalActions
              }
            >

              <button
                type="button"
                onClick={() => {
                  setNewCategory("");
                  setShowCategoryModal(
                    false
                  );
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleCreateCategory
                }
              >
                Create
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default BulkAction;