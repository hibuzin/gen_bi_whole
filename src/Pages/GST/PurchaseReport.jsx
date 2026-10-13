import { useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaSyncAlt,
  FaShoppingCart,
  FaFilter,
} from "react-icons/fa";
import styles from "./PurchaseReport.module.css";
import { API } from "../../constants/api";
import {
  exportPurchaseReportExcel,
  exportPurchaseReportPDF,
} from "./purchaseReportExport";

const PURCHASE_AUDIT_URL = API.gstpurchasereport;

function PurchaseReport() {
  const [purchaseData, setPurchaseData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ==========================================
  // FETCH PURCHASE ITEM-WISE AUDIT
  // ==========================================
  const flattenPurchaseData = (data = []) => {
    return data.flatMap((audit) => {
      if (!Array.isArray(audit.items) || audit.items.length === 0) {
        return [
          {
            ...audit,
            item: null,
          },
        ];
      }

      return audit.items.map((item, index) => {
        const isFirstItem = index === 0;

        return {
          ...audit,

          // Bill-level fields → FIRST ITEM ONLY
          date: isFirstItem ? audit.date : "",
          action: isFirstItem ? audit.action : "",
          grnNo: isFirstItem ? audit.grnNo : "",
          invoiceNo: isFirstItem ? audit.invoiceNo : "",
          grnDate: isFirstItem ? audit.grnDate : "",
          supplierName: isFirstItem ? audit.supplierName : "",
          supplierGstNumber: isFirstItem
            ? audit.supplierGstNumber
            : "",
          placeOfSupply: isFirstItem
            ? audit.placeOfSupply
            : "",
          paymentMode: isFirstItem
            ? audit.paymentMode
            : "",
          user: isFirstItem ? audit.user : null,

          // Product-level fields → EVERY ITEM
          item: {
            ...item,
            itemIndex: index + 1,
          },
        };
      });
    });
  };

  const fetchPurchaseReport = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const params = new URLSearchParams();

      if (action) {
        params.append("action", action);
      }

      if (fromDate) {
        params.append("fromDate", fromDate);
      }

      if (toDate) {
        params.append("toDate", toDate);
      }

      if (search.trim()) {
        params.append("search", search.trim());
      }

      const url = params.toString()
        ? `${PURCHASE_AUDIT_URL}?${params.toString()}`
        : PURCHASE_AUDIT_URL;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch purchase report");
      }

      if (data.success) {
        setPurchaseData(
          flattenPurchaseData(data.data || [])
        );
      } else {
        setPurchaseData([]);
      }
    } catch (error) {
      console.error("Purchase report error:", error);
      setPurchaseData([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================
  useEffect(() => {
    fetchPurchaseReport();
  }, []);

  // ==========================================
  // APPLY FILTER
  // ==========================================
  const handleApplyFilter = () => {
    fetchPurchaseReport();
  };

  // ==========================================
  // CLEAR FILTER
  // ==========================================
  const handleClearFilter = () => {
    setSearch("");
    setAction("");
    setFromDate("");
    setToDate("");

    setTimeout(() => {
      fetchPurchaseReportWithoutFilter();
    }, 0);
  };

  const fetchPurchaseReportWithoutFilter = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch(PURCHASE_AUDIT_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setPurchaseData(
          flattenPurchaseData(data.data || [])
        );
      } else {
        setPurchaseData([]);
      }
    } catch (error) {
      console.error("Purchase report error:", error);
      setPurchaseData([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FRONTEND SEARCH
  // ==========================================
  const filteredData = useMemo(() => {
    if (!search.trim()) {
      return purchaseData;
    }

    const value = search.toLowerCase().trim();

    return purchaseData.filter((row) => {
      const product = row.item || {};

      return (
        row.grnNo?.toLowerCase().includes(value) ||
        row.invoiceNo?.toLowerCase().includes(value) ||
        row.supplierName?.toLowerCase().includes(value) ||
        row.supplierGstNumber?.toLowerCase().includes(value) ||
        row.placeOfSupply?.toLowerCase().includes(value) ||
        product.itemName?.toLowerCase().includes(value) ||
        product.itemCode?.toLowerCase().includes(value) ||
        product.hsnCode?.toLowerCase().includes(value) ||
        product.unit?.toLowerCase().includes(value) ||
        row.action?.toLowerCase().includes(value) ||
        row.user?.name?.toLowerCase().includes(value) ||
        row.user?.role?.toLowerCase().includes(value)
      );
    });
  }, [purchaseData, search]);

  // ==========================================
  // UNIQUE PURCHASE BILLS
  // ==========================================
  const totalBills = useMemo(() => {
    const bills = new Set(
      filteredData
        .map((item) => item.documentId || item.grnNo)
        .filter(Boolean)
    );

    return bills.size;
  }, [filteredData]);

  // ==========================================
  // TOTAL QUANTITY
  // ==========================================
  const totalQty = useMemo(() => {
    return filteredData.reduce(
      (total, row) =>
        total + Number(row.item?.qty || 0),
      0
    );
  }, [filteredData]);

  // ==========================================
  // TOTAL TAX
  // ==========================================
  const totalTax = useMemo(() => {
    return filteredData.reduce(
      (total, row) =>
        total + Number(row.item?.taxAmount || 0),
      0
    );
  }, [filteredData]);

  // ==========================================
  // DATE FORMAT
  // ==========================================
  const formatDate = (date) => {
    if (!date) return "-";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return "-";
    }

    return value.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // ==========================================
  // DATE TIME FORMAT
  // ==========================================
  const formatDateTime = (date) => {
    if (!date) return "-";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return "-";
    }

    return value.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ==========================================
  // AMOUNT FORMAT
  // ==========================================
  const formatAmount = (value) => {
    const number = Number(value || 0);

    return number.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ==========================================
  // ACTION CLASS
  // ==========================================
  const getActionClass = (value) => {
    const type = value?.toLowerCase();

    if (type === "create") {
      return styles.createBadge;
    }

    if (type === "update") {
      return styles.updateBadge;
    }

    if (type === "delete") {
      return styles.deleteBadge;
    }

    return styles.defaultBadge;
  };

  return (
    <div className={styles.container}>
      {/* =====================================
          HEADER
      ====================================== */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleIcon}>
            <FaShoppingCart />
          </div>

          <div>
            <h2>Purchase Report</h2>
            <p>Purchase bill item-wise audit report</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.excelBtn}
            onClick={() => exportPurchaseReportExcel(filteredData)}
            disabled={loading || filteredData.length === 0}
          >
            Excel
          </button>

          <button
            type="button"
            className={styles.pdfBtn}
            onClick={() => exportPurchaseReportPDF(filteredData)}
            disabled={loading || filteredData.length === 0}
          >
            PDF
          </button>

          <button
            type="button"
            onClick={fetchPurchaseReport}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* =====================================
          FILTER SECTION
      ====================================== */}
      <div className={styles.filterSection}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />

          <input
            type="text"
            placeholder="Search GRN, invoice, supplier, item, HSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleApplyFilter();
              }
            }}
          />
        </div>
        <div className={styles.dateFilter}>
          <label>From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className={styles.dateFilter}>
          <label>To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <button
          type="button"
          className={styles.filterBtn}
          onClick={handleApplyFilter}
        >
          <FaFilter />
          Apply
        </button>

        <button
          type="button"
          className={styles.clearBtn}
          onClick={handleClearFilter}
        >
          Clear
        </button>
      </div>

      {/* =====================================
          RESULT INFO
      ====================================== */}
      <div className={styles.tableHeader}>
        <div>
          <h3>Purchase Item Audit</h3>

          <span>
            {filteredData.length} item
            {filteredData.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* =====================================
          TABLE
      ====================================== */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>S.No</th>
              <th>GRN No</th>
              <th>Invoice No</th>
              <th>GRN Date</th>
              <th>Supplier</th>
              <th>Supplier GST No</th>
              <th>Place of Supply</th>
              <th>HSN Code</th>
              <th>Item Name</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Cost Price</th>
              <th>GST Rate</th>
              <th>CGST Rate</th>
              <th>SGST Rate</th>
              <th>CGST Amount</th>
              <th>SGST Amount</th>
              <th>Tax Amount</th>
              <th>Item Total</th>
              <th>Payment Mode</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="24" className={styles.messageCell}>
                  <div className={styles.loader}></div>
                  <span>Loading purchase report...</span>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan="24" className={styles.messageCell}>
                  No purchase audit records found
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => {
                const product = row.item || {};

                return (
                  <tr
                    key={`${row.auditId}-${product.itemIndex || index}-${index}`}
                  >
                    <td className={styles.serialNo}>
                      {index + 1}
                    </td>

                    <td>
                      <span className={styles.grnNo}>
                        {row.grnNo || "-"}
                      </span>
                    </td>

                    <td>{row.invoiceNo || "-"}</td>

                    <td>{formatDate(row.grnDate)}</td>

                    <td>
                      <div className={styles.supplierCell}>
                        <strong>{row.supplierName || "-"}</strong>
                      </div>
                    </td>

                    {/* Supplier GST */}
                    <td className={styles.gstNo}>
                      {row.supplierGstNumber || "-"}
                    </td>

                    {/* Place of Supply */}
                    <td>
                      {row.placeOfSupply || "-"}
                    </td>

                    {/* HSN */}
                    <td>
                      {product.hsnCode || "-"}
                    </td>

                    {/* Item Name */}
                    <td>
                      <div className={styles.itemCell}>
                        <strong>
                          {product.itemName || "-"}
                        </strong>

                        {product.itemIndex ? (
                          <span>
                            Item {product.itemIndex}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className={styles.numberCell}>
                      {product.qty !== undefined &&
                        product.qty !== null &&
                        product.qty !== ""
                        ? Number(product.qty)
                        : "-"}
                    </td>

                    {/* Unit */}
                    <td>
                      <span className={styles.unitBadge}>
                        {product.unit || "-"}
                      </span>
                    </td>

                    {/* Cost Price */}
                    <td className={styles.amountCell}>
                      ₹{formatAmount(product.costPrice)}
                    </td>

                    {/* GST Rate */}
                    <td className={styles.numberCell}>
                      {product.gstRate !== undefined &&
                        product.gstRate !== null &&
                        product.gstRate !== ""
                        ? `${product.gstRate}%`
                        : "-"}
                    </td>

                    {/* CGST Rate */}
                    <td className={styles.numberCell}>
                      {product.cgstRate !== undefined &&
                        product.cgstRate !== null &&
                        product.cgstRate !== ""
                        ? `${product.cgstRate}%`
                        : "-"}
                    </td>

                    {/* SGST Rate */}
                    <td className={styles.numberCell}>
                      {product.sgstRate !== undefined &&
                        product.sgstRate !== null &&
                        product.sgstRate !== ""
                        ? `${product.sgstRate}%`
                        : "-"}
                    </td>

                    {/* CGST Amount */}
                    <td className={styles.amountCell}>
                      ₹{formatAmount(product.cgstAmount)}
                    </td>

                    {/* SGST Amount */}
                    <td className={styles.amountCell}>
                      ₹{formatAmount(product.sgstAmount)}
                    </td>

                    {/* Tax Amount */}
                    <td className={styles.taxAmount}>
                      ₹{formatAmount(product.taxAmount)}
                    </td>

                    {/* Item Total */}
                    <td className={styles.amountCell}>
                      ₹{formatAmount(product.itemTotalAmount)}
                    </td>

                    {/* Payment Mode */}
                    <td>
                      {row.paymentMethod || "-"}
                    </td>
                  </tr>
                );
              })
            )}






          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PurchaseReport;