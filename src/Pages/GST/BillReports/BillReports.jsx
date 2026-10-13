import { useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaShoppingCart,
} from "react-icons/fa";
import styles from "./BillReports.module.css";
import { API } from "../../../constants/api";
import {
  exportSalesReportExcel,
  exportSalesReportPDF,
} from "./BillWiseExport";

const SALES_GST_URL = API.gstbillreport;

function SalesGSTReport() {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ==========================================
  // FLATTEN SALES BILL DATA
  // ==========================================
  const flattenSalesData = (data = []) => {
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

          // ==========================================
          // BILL LEVEL FIELDS - FIRST ITEM ONLY
          // ==========================================
          invoiceNo: isFirstItem ? audit.invoiceNo : "",
          invoiceDate: isFirstItem ? audit.invoiceDate : "",

          customerId: isFirstItem ? audit.customerId : null,
          customerName: isFirstItem ? audit.customerName : "",
          customerGstNumber: isFirstItem
            ? audit.customerGstNumber
            : "",
          placeOfSupply: isFirstItem
            ? audit.placeOfSupply
            : "",
          paymentMethod: isFirstItem
            ? audit.paymentMethod
            : "",
          paymentStatus: isFirstItem
            ? audit.paymentStatus
            : "",

          // ==========================================
          // PRODUCT LEVEL
          // ==========================================
          item: {
            ...item,
            itemIndex: index + 1,
          },
        };
      });
    });
  };

  // ==========================================
  // FETCH SALES GST REPORT
  // ==========================================
  const fetchSalesReport = async () => {
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
        ? `${SALES_GST_URL}?${params.toString()}`
        : SALES_GST_URL;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch sales GST report"
        );
      }

      if (data.success) {
        setSalesData(
          flattenSalesData(data.data || [])
        );
      } else {
        setSalesData([]);
      }
    } catch (error) {
      console.error("Sales GST report error:", error);
      setSalesData([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================
  useEffect(() => {
    fetchSalesReport();
  }, []);

  // ==========================================
  // APPLY FILTER
  // ==========================================
  const handleApplyFilter = () => {
    fetchSalesReport();
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
      fetchSalesReportWithoutFilter();
    }, 0);
  };

  // ==========================================
  // FETCH WITHOUT FILTER
  // ==========================================
  const fetchSalesReportWithoutFilter = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch(SALES_GST_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setSalesData(
          flattenSalesData(data.data || [])
        );
      } else {
        setSalesData([]);
      }
    } catch (error) {
      console.error("Sales GST report error:", error);
      setSalesData([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FRONTEND SEARCH
  // ==========================================
  const filteredData = useMemo(() => {
    if (!search.trim()) {
      return salesData;
    }

    const value = search.toLowerCase().trim();

    return salesData.filter((row) => {
      const product = row.item || {};

      return (
        row.invoiceNo
          ?.toLowerCase()
          .includes(value) ||

        row.customerName
          ?.toLowerCase()
          .includes(value) ||

        row.customerGstNumber
          ?.toLowerCase()
          .includes(value) ||

        row.placeOfSupply
          ?.toLowerCase()
          .includes(value) ||

        row.paymentMethod
          ?.toLowerCase()
          .includes(value) ||

        row.paymentStatus
          ?.toLowerCase()
          .includes(value) ||

        product.itemName
          ?.toLowerCase()
          .includes(value) ||

        product.itemCode
          ?.toLowerCase()
          .includes(value) ||

        product.barcode
          ?.toLowerCase()
          .includes(value) ||

        product.hsnCode
          ?.toLowerCase()
          .includes(value) ||

        product.unit
          ?.toLowerCase()
          .includes(value) ||

        row.action
          ?.toLowerCase()
          .includes(value) ||

        row.user?.name
          ?.toLowerCase()
          .includes(value) ||

        row.user?.role
          ?.toLowerCase()
          .includes(value)
      );
    });
  }, [salesData, search]);

  // ==========================================
  // TOTAL BILLS
  // ==========================================
  const totalBills = useMemo(() => {
    const bills = new Set(
      filteredData
        .map(
          (item) =>
            item.documentId ||
            item.invoiceNo
        )
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
  // TOTAL GST
  // ==========================================
  const totalTax = useMemo(() => {
    return filteredData.reduce(
      (total, row) =>
        total +
        Number(row.item?.gstAmount || 0),
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

          <div>
            <h2>Sales GST Report</h2>

            <p>
              Sales bill item-wise GST audit report
            </p>
          </div>

        </div>

        <div className={styles.headerActions}>

          <button
            type="button"
            className={styles.excelBtn}
            onClick={() =>
              exportSalesReportExcel(filteredData)
            }
            disabled={
              loading ||
              filteredData.length === 0
            }
          >
            Excel
          </button>

          <button
            type="button"
            className={styles.pdfBtn}
            onClick={() =>
              exportSalesReportPDF(filteredData)
            }
            disabled={
              loading ||
              filteredData.length === 0
            }
          >
            PDF
          </button>

          <button
            type="button"
            onClick={fetchSalesReport}
            disabled={loading}
          >
            Refresh
          </button>

        </div>

      </div>



      {/* =====================================
    TABLE HEADER + SEARCH
===================================== */}
      <div className={styles.tableToolbar}>
        <div className={styles.tableHeader}>
          <div>
          </div>
        </div>
        <div className={styles.dateFilters}>
          <div className={styles.dateField}>
            <label>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className={styles.dateField}>
            <label>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={handleApplyFilter}
            disabled={loading}
          >
            Apply
          </button>

          <button
            type="button"
            onClick={handleClearFilter}
            disabled={loading}
          >
            Clear
          </button>
        </div>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />

          <input
            type="text"
            placeholder="Search invoice, customer, item, HSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleApplyFilter();
              }
            }}
          />
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

              <th>Invoice No</th>

              <th>Invoice Date</th>

              <th>Customer</th>

              <th>Customer GST No</th>

              <th>Place of Supply</th>

              <th>HSN Code</th>

              <th>Item Name</th>

              <th>Barcode</th>

              <th>Quantity</th>

              <th>Unit</th>

              <th>Rate</th>

              <th>Discount</th>

              <th>Taxable Amount</th>

              <th>GST Rate</th>

              <th>CGST Rate</th>

              <th>SGST Rate</th>

              <th>CGST Amount</th>

              <th>SGST Amount</th>

              <th>GST Amount</th>

              <th>Item Total</th>

              <th>Payment Mode</th>
            </tr>
          </thead>
          <tbody>

            {loading ? (

              <tr>

                <td
                  colSpan="26"
                  className={styles.messageCell}
                >

                  <div
                    className={styles.loader}
                  ></div>

                  <span>
                    Loading sales GST report...
                  </span>

                </td>

              </tr>

            ) : filteredData.length === 0 ? (

              <tr>

                <td
                  colSpan="26"
                  className={styles.messageCell}
                >
                  No sales GST audit records found
                </td>

              </tr>

            ) : (

              filteredData.map(
                (row, index) => {

                  const product =
                    row.item || {};

                  return (

                    <tr
                      key={`${row.auditId}-${product.itemIndex ||
                        index
                        }-${index}`}
                    >

                      {/* S.NO */}
                      <td
                        className={
                          styles.serialNo
                        }
                      >
                        {index + 1}
                      </td>

                      {/* INVOICE NO */}
                      <td>

                        <span
                          className={
                            styles.grnNo
                          }
                        >
                          {row.invoiceNo || "-"}
                        </span>

                      </td>

                      {/* INVOICE DATE */}
                      <td>
                        {formatDate(
                          row.invoiceDate
                        )}
                      </td>

                      {/* CUSTOMER */}
                      <td>

                        <div
                          className={
                            styles.supplierCell
                          }
                        >

                          <strong>
                            {row.customerName ||
                              "-"}
                          </strong>

                        </div>

                      </td>

                      {/* CUSTOMER GST */}
                      <td
                        className={
                          styles.gstNo
                        }
                      >
                        {row.customerGstNumber ||
                          "-"}
                      </td>

                      {/* PLACE OF SUPPLY */}
                      <td>
                        {row.placeOfSupply ||
                          "-"}
                      </td>

                      {/* HSN */}
                      <td>
                        {product.hsnCode ||
                          "-"}
                      </td>

                      {/* ITEM NAME */}
                      <td>

                        <div
                          className={
                            styles.itemCell
                          }
                        >

                          <strong>
                            {product.itemName ||
                              "-"}
                          </strong>

                        </div>

                      </td>

                      {/* BARCODE */}
                      <td>
                        {product.barcode ||
                          "-"}
                      </td>

                      {/* QUANTITY */}
                      <td
                        className={
                          styles.numberCell
                        }
                      >

                        {product.qty !==
                          undefined &&
                          product.qty !== null &&
                          product.qty !== ""
                          ? Number(
                            product.qty
                          )
                          : "-"}

                      </td>

                      {/* UNIT */}
                      <td>

                        <span
                          className={
                            styles.unitBadge
                          }
                        >
                          {product.unit ||
                            "-"}
                        </span>

                      </td>

                      {/* RATE */}
                      <td
                        className={
                          styles.amountCell
                        }
                      >
                        ₹
                        {formatAmount(
                          product.rate
                        )}
                      </td>

                      {/* DISCOUNT */}
                      <td
                        className={
                          styles.amountCell
                        }
                      >
                        ₹
                        {formatAmount(
                          product.discountAmount
                        )}
                      </td>

                      {/* TAXABLE AMOUNT */}
                      <td
                        className={
                          styles.amountCell
                        }
                      >
                        ₹
                        {formatAmount(
                          product.taxableAmount
                        )}
                      </td>

                      {/* GST RATE */}
                      <td
                        className={
                          styles.numberCell
                        }
                      >

                        {product.gstRate !==
                          undefined &&
                          product.gstRate !== null &&
                          product.gstRate !== ""
                          ? `${product.gstRate}%`
                          : "-"}

                      </td>

                      {/* CGST RATE */}
                      <td
                        className={
                          styles.numberCell
                        }
                      >

                        {product.cgstRate !==
                          undefined &&
                          product.cgstRate !== null &&
                          product.cgstRate !== ""
                          ? `${product.cgstRate}%`
                          : "-"}

                      </td>

                      {/* SGST RATE */}
                      <td
                        className={
                          styles.numberCell
                        }
                      >

                        {product.sgstRate !==
                          undefined &&
                          product.sgstRate !== null &&
                          product.sgstRate !== ""
                          ? `${product.sgstRate}%`
                          : "-"}

                      </td>

                      {/* CGST AMOUNT */}
                      <td
                        className={
                          styles.amountCell
                        }
                      >
                        ₹
                        {formatAmount(
                          product.cgstAmount
                        )}
                      </td>

                      {/* SGST AMOUNT */}
                      <td
                        className={
                          styles.amountCell
                        }
                      >
                        ₹
                        {formatAmount(
                          product.sgstAmount
                        )}
                      </td>

                      {/* GST AMOUNT */}
                      <td
                        className={
                          styles.taxAmount
                        }
                      >
                        ₹
                        {formatAmount(
                          product.gstAmount
                        )}
                      </td>

                      {/* ITEM TOTAL */}
                      <td
                        className={
                          styles.amountCell
                        }
                      >
                        ₹
                        {formatAmount(
                          product.itemTotalAmount ??
                          product.finalAmount ??
                          product.totalAmount
                        )}
                      </td>

                      {/* PAYMENT MODE */}
                      <td>
                        {row.paymentMethod ||
                          "-"}
                      </td>

                    </tr>

                  );
                }
              )

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default SalesGSTReport;