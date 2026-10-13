import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
    FiCalendar,
    FiChevronDown,
    FiChevronUp,
    FiRefreshCw,
    FiSearch,
    FiX,
} from "react-icons/fi";

import AppBar from "../../components/AppBar/AppBar";

import Toast from "../../components/Toast";

import styles from "./BillWise.module.css";

import { API } from "../../constants/api";

const BillWise = () => {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [reportData, setReportData] = useState([]);

    const [billCount, setBillCount] = useState(0);

    const [searchText, setSearchText] = useState("");

    const [loading, setLoading] = useState(false);

    const [expandedBill, setExpandedBill] = useState(null);

    const [toast, setToast] = useState({
        message: "",
        type: "",
    });

    const showToast = useCallback((message, type = "error") => {
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
    }, []);

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

    const getPaymentMethod = (payment) => {
        if (!payment) {
            return "-";
        }

        if (payment.payments?.length > 1) {
            return "Multiple";
        }

        return payment.paymentMethod || "-";
    };

    const getPaymentStatus = (payment) => {
        if (!payment) {
            return "-";
        }

        return payment.paymentStatus || "-";
    };

    const getPaymentStatusClass = (status) => {
        const value = String(status || "").toLowerCase();

        if (value === "paid") {
            return styles.statusPaid;
        }

        if (value === "partial") {
            return styles.statusPartial;
        }

        if (value === "due") {
            return styles.statusDue;
        }

        if (value === "pending") {
            return styles.statusPending;
        }

        return styles.statusDefault;
    };

    const getPaymentMethodClass = (method) => {
        const value = String(method || "").toLowerCase();

        if (value === "cash") {
            return styles.cashBadge;
        }

        if (value === "upi") {
            return styles.upiBadge;
        }

        if (value === "card") {
            return styles.cardBadge;
        }

        if (value === "cheque") {
            return styles.chequeBadge;
        }

        return styles.paymentBadge;
    };

    const fetchReport = useCallback(
        async (useDateFilter = false) => {
            try {
                setLoading(true);

                let url = API.bill;

                if (useDateFilter && fromDate && toDate) {
                    if (fromDate > toDate) {
                        showToast(
                            "From Date cannot be greater than To Date",
                            "error"
                        );
                        return;
                    }

                    const query = new URLSearchParams({
                        fromDate,
                        toDate,
                    });

                    url = `${API.bill}?${query.toString()}`;
                }

                const token = localStorage.getItem("token");

                const response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "Failed to fetch bills"
                    );
                }

                setReportData(
                    Array.isArray(result.data) ? result.data : []
                );

                setBillCount(result.count || 0);

                setExpandedBill(null);
            } catch (error) {
                showToast(
                    error.message || "Failed to fetch bills",
                    "error"
                );
            } finally {
                setLoading(false);
            }
        },
        [fromDate, toDate, showToast]
    );

    useEffect(() => {
        fetchReport(false);
    }, [fetchReport]);

    const filteredData = useMemo(() => {
        const search = searchText.trim().toLowerCase();

        if (!search) {
            return reportData;
        }

        return reportData.filter((bill) => {
            const values = [
                bill.invoiceNo,
                bill.invoiceDate,
                bill.invoiceTime,
                bill.customer?.name,
                bill.customer?.mobile,
                bill.cashier?.role,
                bill.payment?.paymentMethod,
                bill.payment?.paymentStatus,
                ...(bill.payment?.payments || []).map(
                    (payment) => payment.method
                ),
                bill.summary?.offerName,
                ...(bill.items || []).flatMap((item) => [
                    item.itemCode,
                    item.barcode,
                    item.name,
                ]),
            ];

            return values.some((value) =>
                String(value ?? "")
                    .toLowerCase()
                    .includes(search)
            );
        });
    }, [reportData, searchText]);

    const totalItems = useMemo(() => {
        return filteredData.reduce((total, bill) => {
            return total + (Number(bill.totals?.totalItems) || 0);
        }, 0);
    }, [filteredData]);

    const totalQuantity = useMemo(() => {
        return filteredData.reduce((total, bill) => {
            return total + (Number(bill.totals?.totalGivenQty) || 0);
        }, 0);
    }, [filteredData]);

    const totalGST = useMemo(() => {
        return filteredData.reduce((total, bill) => {
            return total + (Number(bill.summary?.totalGST) || 0);
        }, 0);
    }, [filteredData]);

    const totalAmount = useMemo(() => {
        return filteredData.reduce((total, bill) => {
            return total + (Number(bill.summary?.grandTotal) || 0);
        }, 0);
    }, [filteredData]);

    const handleRefresh = () => {
        fetchReport(false);
    };

    const handleApplyFilter = () => {
        fetchReport(true);
    };

    const handleClearSearch = () => {
        setSearchText("");
    };

    const toggleBill = (billId) => {
        setExpandedBill((current) =>
            current === billId ? null : billId
        );
    };

    return (
        <div className={styles.page}>
            <AppBar />

            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>
                            Bill-wise Report
                        </h1>

                        <p className={styles.subtitle}>
                            View complete billing and payment details
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
                        <label htmlFor="fromDate">
                            From Date
                        </label>

                        <div className={styles.dateInputWrapper}>
                            <FiCalendar size={17} />

                            <input
                                id="fromDate"
                                type="date"
                                value={fromDate}
                                max={toDate || undefined}
                                onChange={(e) =>
                                    setFromDate(e.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className={styles.dateGroup}>
                        <label htmlFor="toDate">
                            To Date
                        </label>

                        <div className={styles.dateInputWrapper}>
                            <FiCalendar size={17} />

                            <input
                                id="toDate"
                                type="date"
                                value={toDate}
                                min={fromDate || undefined}
                                onChange={(e) =>
                                    setToDate(e.target.value)
                                }
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        className={styles.applyButton}
                        onClick={handleApplyFilter}
                        disabled={loading}
                    >
                        <FiSearch size={17} />
                        Apply Filter
                    </button>
                </div>

                <div className={styles.summaryRow}>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryContent}>
                            <span className={styles.summaryLabel}>
                                Total Bills
                            </span>

                            <strong className={styles.summaryValue}>
                                {billCount}
                            </strong>
                        </div>
                    </div>

                    <div className={styles.summaryCard}>
                        <div className={styles.summaryContent}>
                            <span className={styles.summaryLabel}>
                                Total Items
                            </span>

                            <strong className={styles.summaryValue}>
                                {totalItems}
                            </strong>
                        </div>
                    </div>

                    <div className={styles.summaryCard}>
                        <div className={styles.summaryContent}>
                            <span className={styles.summaryLabel}>
                                Total Quantity
                            </span>

                            <strong className={styles.summaryValue}>
                                {formatQty(totalQuantity)}
                            </strong>
                        </div>
                    </div>

                    <div className={styles.summaryCard}>
                        <div className={styles.summaryContent}>
                            <span className={styles.summaryLabel}>
                                Total GST
                            </span>

                            <strong className={styles.summaryValue}>
                                ₹{formatAmount(totalGST)}
                            </strong>
                        </div>
                    </div>

                    <div className={styles.summaryCard}>
                        <div className={styles.summaryContent}>
                            <span className={styles.summaryLabel}>
                                Grand Total
                            </span>

                            <strong className={styles.amountValue}>
                                ₹{formatAmount(totalAmount)}
                            </strong>
                        </div>
                    </div>
                </div>

                <div className={styles.tableCard}>
                    <div className={styles.tableTop}>
                        <div>
                            <h2 className={styles.tableTitle}>
                                Bill Details
                            </h2>

                            <span className={styles.resultText}>
                                {searchText
                                    ? `${filteredData.length} matching bills`
                                    : `${reportData.length} bills`}
                            </span>
                        </div>

                        <div className={styles.searchWrapper}>
                            <FiSearch size={17} />

                            <input
                                type="text"
                                placeholder="Search invoice, customer, mobile, payment..."
                                value={searchText}
                                onChange={(e) =>
                                    setSearchText(e.target.value)
                                }
                            />

                            {searchText && (
                                <button
                                    type="button"
                                    className={
                                        styles.clearSearchButton
                                    }
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
                                    <th className={styles.serialColumn}>
                                        #
                                    </th>

                                    <th>Invoice No</th>

                                    <th>Date & Time</th>

                                    <th>Customer</th>

                                    <th>Items</th>

                                    <th>Qty</th>

                                    <th>Payment</th>

                                    <th>Status</th>

                                    <th>GST</th>

                                    <th>Discount</th>

                                    <th>Grand Total</th>

                                    <th></th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan="12"
                                            className={styles.stateCell}
                                        >
                                            <div
                                                className={
                                                    styles.loadingState
                                                }
                                            >
                                                <div
                                                    className={
                                                        styles.loader
                                                    }
                                                ></div>

                                                <span>
                                                    Loading bills...
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="12"
                                            className={styles.stateCell}
                                        >
                                            <div
                                                className={
                                                    styles.emptyState
                                                }
                                            >
                                                <div
                                                    className={
                                                        styles.emptyIcon
                                                    }
                                                >
                                                    <FiSearch
                                                        size={22}
                                                    />
                                                </div>

                                                <strong>
                                                    No bills found
                                                </strong>

                                                <span>
                                                    {searchText
                                                        ? "Try changing your search text"
                                                        : "No billing records available for the selected date range"}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((bill, index) => {
                                        const paymentMethod =
                                            getPaymentMethod(
                                                bill.payment
                                            );

                                        const paymentStatus =
                                            getPaymentStatus(
                                                bill.payment
                                            );

                                        const isExpanded =
                                            expandedBill ===
                                            bill.billId;

                                        return (
                                           <Fragment key={bill.billId}>
                                                <tr
                                                    className={
                                                        isExpanded
                                                            ? styles.expandedRow
                                                            : ""
                                                    }
                                                >
                                                    <td
                                                        className={
                                                            styles.serialCell
                                                        }
                                                    >
                                                        {index + 1}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={
                                                                styles.invoiceNumber
                                                            }
                                                        >
                                                            {bill.invoiceNo ||
                                                                "-"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div
                                                            className={
                                                                styles.dateTime
                                                            }
                                                        >
                                                            <span>
                                                                {bill.invoiceDate ||
                                                                    "-"}
                                                            </span>

                                                            <small>
                                                                {bill.invoiceTime ||
                                                                    "-"}
                                                            </small>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div
                                                            className={
                                                                styles.customer
                                                            }
                                                        >
                                                            <span>
                                                                {getCustomerName(
                                                                    bill.customer
                                                                )}
                                                            </span>

                                                            {bill.customer
                                                                ?.mobile && (
                                                                <small>
                                                                    {getCustomerMobile(
                                                                        bill.customer
                                                                    )}
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className={styles.numberCell}>
                                                        {bill.totals
                                                            ?.totalItems ||
                                                            0}
                                                    </td>

                                                    <td className={styles.numberCell}>
                                                        {formatQty(
                                                            bill.totals
                                                                ?.totalGivenQty
                                                        )}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`${styles.paymentBadge} ${getPaymentMethodClass(
                                                                paymentMethod
                                                            )}`}
                                                        >
                                                            {paymentMethod}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`${styles.statusBadge} ${getPaymentStatusClass(
                                                                paymentStatus
                                                            )}`}
                                                        >
                                                            {paymentStatus}
                                                        </span>
                                                    </td>

                                                    <td
                                                        className={
                                                            styles.amountCell
                                                        }
                                                    >
                                                        ₹
                                                        {formatAmount(
                                                            bill.summary
                                                                ?.totalGST
                                                        )}
                                                    </td>

                                                    <td
                                                        className={
                                                            styles.discountCell
                                                        }
                                                    >
                                                        {Number(
                                                            bill.summary
                                                                ?.discount
                                                        ) > 0
                                                            ? `₹${formatAmount(
                                                                  bill
                                                                      .summary
                                                                      ?.discount
                                                              )}`
                                                            : "-"}
                                                    </td>

                                                    <td
                                                        className={
                                                            styles.totalCell
                                                        }
                                                    >
                                                        ₹
                                                        {formatAmount(
                                                            bill.summary
                                                                ?.grandTotal
                                                        )}
                                                    </td>

                                                    <td>
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.expandButton
                                                            }
                                                            onClick={() =>
                                                                toggleBill(
                                                                    bill.billId
                                                                )
                                                            }
                                                            aria-label={
                                                                isExpanded
                                                                    ? "Hide items"
                                                                    : "Show items"
                                                            }
                                                        >
                                                            {isExpanded ? (
                                                                <FiChevronUp
                                                                    size={
                                                                        17
                                                                    }
                                                                />
                                                            ) : (
                                                                <FiChevronDown
                                                                    size={
                                                                        17
                                                                    }
                                                                />
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {isExpanded && (
                                                    <tr
                                                        className={
                                                            styles.detailsRow
                                                        }
                                                    >
                                                        <td
                                                            colSpan="12"
                                                        >
                                                            <div
                                                                className={
                                                                    styles.detailsPanel
                                                                }
                                                            >
                                                                <div
                                                                    className={
                                                                        styles.detailsHeader
                                                                    }
                                                                >
                                                                    <div>
                                                                        <strong>
                                                                            Bill
                                                                            Items
                                                                        </strong>

                                                                        <span>
                                                                            {
                                                                                bill
                                                                                    .items
                                                                                    ?.length
                                                                            }{" "}
                                                                            items
                                                                        </span>
                                                                    </div>

                                                                    <div
                                                                        className={
                                                                            styles.paidInfo
                                                                        }
                                                                    >
                                                                        <span>
                                                                            Paid
                                                                        </span>

                                                                        <strong>
                                                                            ₹
                                                                            {formatAmount(
                                                                                bill
                                                                                    .payment
                                                                                    ?.paidAmount
                                                                            )}
                                                                        </strong>
                                                                    </div>
                                                                </div>

                                                                <div
                                                                    className={
                                                                        styles.itemsTableWrapper
                                                                    }
                                                                >
                                                                    <table
                                                                        className={
                                                                            styles.itemsTable
                                                                        }
                                                                    >
                                                                        <thead>
                                                                            <tr>
                                                                                <th>
                                                                                    Item
                                                                                </th>

                                                                                <th>
                                                                                    Item
                                                                                    Code
                                                                                </th>

                                                                                <th>
                                                                                    Barcode
                                                                                </th>

                                                                                <th>
                                                                                    Qty
                                                                                </th>

                                                                                <th>
                                                                                    Unit
                                                                                </th>

                                                                                <th>
                                                                                    Price
                                                                                </th>

                                                                                <th>
                                                                                    GST
                                                                                </th>

                                                                                <th>
                                                                                    Discount
                                                                                </th>

                                                                                <th>
                                                                                    Total
                                                                                </th>
                                                                            </tr>
                                                                        </thead>

                                                                        <tbody>
                                                                            {(
                                                                                bill.items ||
                                                                                []
                                                                            ).map(
                                                                                (
                                                                                    item,
                                                                                    itemIndex
                                                                                ) => (
                                                                                    <tr
                                                                                        key={`${bill.billId}-${itemIndex}`}
                                                                                    >
                                                                                        <td>
                                                                                            <div
                                                                                                className={
                                                                                                    styles.itemName
                                                                                                }
                                                                                            >
                                                                                                {
                                                                                                    item.name
                                                                                                }
                                                                                            </div>
                                                                                        </td>

                                                                                        <td>
                                                                                            <span
                                                                                                className={
                                                                                                    styles.code
                                                                                                }
                                                                                            >
                                                                                                {item.itemCode ||
                                                                                                    item
                                                                                                        .productId
                                                                                                        ?.itemCode ||
                                                                                                    "-"}
                                                                                            </span>
                                                                                        </td>

                                                                                        <td>
                                                                                            <span
                                                                                                className={
                                                                                                    styles.barcode
                                                                                                }
                                                                                            >
                                                                                                {item.barcode ||
                                                                                                    "-"}
                                                                                            </span>
                                                                                        </td>

                                                                                        <td
                                                                                            className={
                                                                                                styles.numberCell
                                                                                            }
                                                                                        >
                                                                                            {formatQty(
                                                                                                item.totalGivenQty ??
                                                                                                    item.qty
                                                                                            )}
                                                                                        </td>

                                                                                        <td>
                                                                                            <span
                                                                                                className={
                                                                                                    styles.unitBadge
                                                                                                }
                                                                                            >
                                                                                                {item.unitText ||
                                                                                                    item.unit ||
                                                                                                    "-"}
                                                                                            </span>
                                                                                        </td>

                                                                                        <td
                                                                                            className={
                                                                                                styles.amountCell
                                                                                            }
                                                                                        >
                                                                                            ₹
                                                                                            {formatAmount(
                                                                                                item.finalPrice
                                                                                            )}
                                                                                        </td>

                                                                                        <td>
                                                                                            <span
                                                                                                className={
                                                                                                    String(
                                                                                                        item.gstRate
                                                                                                    ).toLowerCase() ===
                                                                                                    "none"
                                                                                                        ? styles.gstNone
                                                                                                        : styles.gstBadge
                                                                                                }
                                                                                            >
                                                                                                {formatGst(
                                                                                                    item.gstRate
                                                                                                )}
                                                                                            </span>
                                                                                        </td>

                                                                                        <td
                                                                                            className={
                                                                                                styles.discountCell
                                                                                            }
                                                                                        >
                                                                                            {Number(
                                                                                                item.discountAmount
                                                                                            ) >
                                                                                            0
                                                                                                ? `₹${formatAmount(
                                                                                                      item.discountAmount
                                                                                                  )}`
                                                                                                : "-"}
                                                                                        </td>

                                                                                        <td
                                                                                            className={
                                                                                                styles.totalCell
                                                                                            }
                                                                                        >
                                                                                            ₹
                                                                                            {formatAmount(
                                                                                                item.totalAmount
                                                                                            )}
                                                                                        </td>
                                                                                    </tr>
                                                                                )
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>

                                                                <div
                                                                    className={
                                                                        styles.detailsFooter
                                                                    }
                                                                >
                                                                    <span>
                                                                        Sub
                                                                        Total
                                                                    </span>

                                                                    <strong>
                                                                        ₹
                                                                        {formatAmount(
                                                                            bill
                                                                                .summary
                                                                                ?.subTotal
                                                                        )}
                                                                    </strong>

                                                                    <span>
                                                                        GST
                                                                    </span>

                                                                    <strong>
                                                                        ₹
                                                                        {formatAmount(
                                                                            bill
                                                                                .summary
                                                                                ?.totalGST
                                                                        )}
                                                                    </strong>

                                                                    <span>
                                                                        Grand
                                                                        Total
                                                                    </span>

                                                                    <strong
                                                                        className={
                                                                            styles.footerGrandTotal
                                                                        }
                                                                    >
                                                                        ₹
                                                                        {formatAmount(
                                                                            bill
                                                                                .summary
                                                                                ?.grandTotal
                                                                        )}
                                                                    </strong>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })
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

export default BillWise;