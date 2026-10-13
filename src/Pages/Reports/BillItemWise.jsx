import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCalendar, FiRefreshCw, FiSearch, FiX } from "react-icons/fi";
import AppBar from "../../components/AppBar/AppBar";
import Toast from "../../components/Toast";
import styles from "./BillItemWise.module.css";
import { API } from "../../constants/api";

const BillItemWise = () => {

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [reportData, setReportData] = useState([]);
    const [billCount, setBillCount] = useState(0);
    const [itemCount, setItemCount] = useState(0);

    const [searchText, setSearchText] = useState("");
    const [loading, setLoading] = useState(false);

    const [toast, setToast] = useState({
        message: "",
        type: "",
    });

    const showToast = (message, type = "error") => {
        setToast({
            message,
            type,
        });

        setTimeout(() => {
            setToast({
                message: "",
                type: "",
            });
        }, 3000);
    };

    const clearToast = () => {
        setToast({
            message: "",
            type: "",
        });
    };

    const formatAmount = (value) => {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            return "0.00";
        }

        return number.toFixed(2);
    };

    const formatQty = (value) => {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            return "0";
        }

        return Number.isInteger(number)
            ? String(number)
            : number.toFixed(3).replace(/\.?0+$/, "");
    };

    const formatGst = (gstRate) => {
        if (
            gstRate === null ||
            gstRate === undefined ||
            gstRate === "" ||
            String(gstRate).toLowerCase() === "none"
        ) {
            return "None";
        }

        return `${gstRate}%`;
    };

    const getCustomerName = (customer) => {
        if (!customer) {
            return "Walk-in Customer";
        }

        return customer.name || "Walk-in Customer";
    };

    const getCustomerMobile = (customer) => {
        if (!customer) {
            return "-";
        }

        return customer.mobile || "-";
    };

    const fetchReport = useCallback(async (useDateFilter = false) => {
        try {
            setLoading(true);

            let url = API.itemwise;

            if (useDateFilter && fromDate && toDate) {
                if (fromDate > toDate) {
                    showToast("From Date cannot be greater than To Date", "error");
                    return;
                }

                const query = new URLSearchParams({
                    fromDate,
                    toDate,
                });

                url = `${API.itemwise}?${query.toString()}`;
            }

            const token = localStorage.getItem("token");

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to fetch report");
            }

            setReportData(Array.isArray(result.data) ? result.data : []);
            setBillCount(result.billCount || 0);
            setItemCount(result.itemCount || 0);
        } catch (error) {
            showToast(error.message || "Failed to fetch report", "error");
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate]);

    useEffect(() => {
        fetchReport(false);
    }, [fetchReport]);

    const filteredData = useMemo(() => {
        const search = searchText.trim().toLowerCase();

        if (!search) {
            return reportData;
        }

        return reportData.filter((item) => {
            const values = [
                item.invoiceNo,
                item.invoiceDate,
                item.invoiceTime,
                item.itemCode,
                item.barcode,
                item.name,
                item.unit,
                item.appliedPriceLevel,
                item.customer?.name,
                item.customer?.mobile,
                item.cashier?.role,
            ];

            return values.some((value) =>
                String(value ?? "")
                    .toLowerCase()
                    .includes(search)
            );
        });
    }, [reportData, searchText]);

    const totalAmount = useMemo(() => {
        return filteredData.reduce((total, item) => {
            return total + (Number(item.totalAmount) || 0);
        }, 0);
    }, [filteredData]);

    const totalQuantity = useMemo(() => {
        return filteredData.reduce((total, item) => {
            return total + (Number(item.totalGivenQty ?? item.qty) || 0);
        }, 0);
    }, [filteredData]);

    const handleRefresh = () => {
        fetchReport(false);
    };

    const handleClearSearch = () => {
        setSearchText("");
    };

    return (
        <div className={styles.page}>
            <AppBar />

            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Bill Item-wise Report</h1>
                        <p className={styles.subtitle}>
                            View sold items and billing details by date
                        </p>
                    </div>

                    <button
                        type="button"
                        className={styles.refreshButton}
                        onClick={handleRefresh}
                        disabled={loading}
                    >
                        <FiRefreshCw
                            className={loading ? styles.spinning : ""}
                            size={17}
                        />
                        {loading ? "Loading..." : "Refresh"}
                    </button>
                </div>

                <div className={styles.filterCard}>
                    <div className={styles.dateGroup}>
                        <label htmlFor="fromDate">From Date</label>

                        <div className={styles.dateInputWrapper}>
                            <FiCalendar size={17} />
                            <input
                                id="fromDate"
                                type="date"
                                value={fromDate}
                                max={toDate || undefined}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.dateGroup}>
                        <label htmlFor="toDate">To Date</label>

                        <div className={styles.dateInputWrapper}>
                            <FiCalendar size={17} />
                            <input
                                id="toDate"
                                type="date"
                                value={toDate}
                                min={fromDate || undefined}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        className={styles.applyButton}
                        onClick={() => fetchReport(true)}
                        disabled={loading}
                    >
                        <FiSearch size={17} />
                        Apply Filter
                    </button>
                </div>

                <div className={styles.summaryRow}>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryContent}>
                            <span className={styles.summaryLabel}>Total Bills</span>
                            <strong className={styles.summaryValue}>{billCount}</strong>
                        </div>
                    </div>

                    <div className={styles.summaryCard}>
                        <div className={styles.summaryContent}>
                            <span className={styles.summaryLabel}>Total Items</span>
                            <strong className={styles.summaryValue}>{itemCount}</strong>
                        </div>
                    </div>

                    <div className={styles.summaryCard}>
                        <div className={styles.summaryContent}>
                            <span className={styles.summaryLabel}>Total Quantity</span>
                            <strong className={styles.summaryValue}>
                                {formatQty(totalQuantity)}
                            </strong>
                        </div>
                    </div>

                    <div className={styles.summaryCard}>
                        <div className={styles.summaryContent}>
                            <span className={styles.summaryLabel}>Total Amount</span>
                            <strong className={styles.amountValue}>
                                ₹{formatAmount(totalAmount)}
                            </strong>
                        </div>
                    </div>
                </div>

                <div className={styles.tableCard}>
                    <div className={styles.tableTop}>
                        <div>
                            <h2 className={styles.tableTitle}>Item Details</h2>
                            <span className={styles.resultText}>
                                {searchText
                                    ? `${filteredData.length} matching items`
                                    : `${reportData.length} items`}
                            </span>
                        </div>

                        <div className={styles.searchWrapper}>
                            <FiSearch size={17} />

                            <input
                                type="text"
                                placeholder="Search invoice, item, barcode, customer..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />

                            {searchText && (
                                <button
                                    type="button"
                                    className={styles.clearSearchButton}
                                    onClick={handleClearSearch}
                                    aria-label="Clear search"
                                >
                                    <FiX size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.serialColumn}>#</th>
                                    <th>Invoice No</th>
                                    <th>Date & Time</th>
                                    <th>Customer</th>
                                    <th>Item Code</th>
                                    <th>Barcode</th>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Free Qty</th>
                                    <th>Unit</th>
                                    <th>Price</th>
                                    <th>Discount</th>
                                    <th>GST</th>
                                    <th>GST Amount</th>
                                    <th>Total</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="15" className={styles.stateCell}>
                                            <div className={styles.loadingState}>
                                                <div className={styles.loader}></div>
                                                <span>Loading report...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="15" className={styles.stateCell}>
                                            <div className={styles.emptyState}>
                                                <div className={styles.emptyIcon}>
                                                    <FiSearch size={22} />
                                                </div>

                                                <strong>No items found</strong>

                                                <span>
                                                    {searchText
                                                        ? "Try changing your search text"
                                                        : "No billing items available for the selected date range"}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, index) => (
                                        <tr key={`${item.billId}-${item.itemCount}-${index}`}>
                                            <td className={styles.serialCell}>
                                                {index + 1}
                                            </td>

                                            <td>
                                                <span className={styles.invoiceNumber}>
                                                    {item.invoiceNo || "-"}
                                                </span>
                                            </td>

                                            <td>
                                                <div className={styles.dateTime}>
                                                    <span>{item.invoiceDate || "-"}</span>
                                                    <small>{item.invoiceTime || "-"}</small>
                                                </div>
                                            </td>

                                            <td>
                                                <div className={styles.customer}>
                                                    <span>{getCustomerName(item.customer)}</span>
                                                    {item.customer?.mobile && (
                                                        <small>{getCustomerMobile(item.customer)}</small>
                                                    )}
                                                </div>
                                            </td>

                                            <td>
                                                <span className={styles.code}>
                                                    {item.itemCode || "-"}
                                                </span>
                                            </td>

                                            <td>
                                                <span className={styles.barcode}>
                                                    {item.barcode || "-"}
                                                </span>
                                            </td>

                                            <td>
                                                <div className={styles.productName}>
                                                    {item.name || "-"}
                                                </div>
                                            </td>

                                            <td className={styles.numberCell}>
                                                {formatQty(item.qty)}
                                            </td>

                                            <td className={styles.numberCell}>
                                                {formatQty(item.freeQty)}
                                            </td>

                                            <td>
                                                <span className={styles.unitBadge}>
                                                    {item.unitText || item.unit || "-"}
                                                </span>
                                            </td>

                                            <td className={styles.amountCell}>
                                                ₹{formatAmount(item.finalPrice)}
                                            </td>

                                            <td className={styles.discountCell}>
                                                {Number(item.discountAmount) > 0
                                                    ? `₹${formatAmount(item.discountAmount)}`
                                                    : "-"}
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        String(item.gstRate).toLowerCase() === "none"
                                                            ? styles.gstNone
                                                            : styles.gstBadge
                                                    }
                                                >
                                                    {formatGst(item.gstRate)}
                                                </span>
                                            </td>

                                            <td className={styles.amountCell}>
                                                ₹{formatAmount(item.gstAmount)}
                                            </td>

                                            <td className={styles.totalCell}>
                                                ₹{formatAmount(item.totalAmount)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {toast.message && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={clearToast}
                />
            )}
        </div>
    );
};

export default BillItemWise;