import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./CustomerBillView.module.css";
import { API } from "../../constants/api";
import html2pdf from "html2pdf.js";

function CustomerBillView() {
  const { customerId, billId } = useParams();
  const navigate = useNavigate();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    fetchBill();
  }, [billId]);

  const downloadPDF = () => {
  const element = document.querySelector(`.${styles.billBox}`);

  const options = {
    margin: [8, 8, 8, 8],
    filename: `${bill.invoiceNo || "customer-bill"}.pdf`,
    image: {
      type: "jpeg",
      quality: 0.98,
    },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
    },
    pagebreak: {
      mode: ["css", "legacy"],
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    },
  };

  html2pdf()
    .set(options)
    .from(element)
    .save();
};

  const fetchBill = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API.bill}/${billId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      setBill(data.data || data);
    } catch (err) {
      console.log("Bill fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        Loading bill...
      </div>
    );
  }

  if (!bill) {
    return (
      <div className={styles.loading}>
        Bill not found
      </div>
    );
  }

  const customerName =
    bill.customer?.customerName ||
    bill.customer?.name ||
    bill.customerName ||
    "Walk-in Customer";

  const customerPhone =
    bill.customer?.mobile ||
    bill.customer?.phone ||
    bill.customerPhone ||
    "-";

  const summary = bill.summary || {};

  return (
    <div className={styles.page}>

      {/* TOP BAR */}
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <div className={styles.topTitle}>
          <h2>Customer Bill</h2>
          <span>{bill.invoiceNo || bill.billId}</span>
        </div>

        <button
          className={styles.printBtn}
          onClick={downloadPDF}
        >
          Download PDF
        </button>
      </div>

      {/* BILL SCROLL CONTAINER */}
      <div className={styles.billScroll}>

        {/* BILL */}
        <div className={styles.billBox}>

          {/* INVOICE HEADER */}
          <div className={styles.invoiceHeader}>

            <div className={styles.companyInfo}>
              <h1>AR TRADERS</h1>
              <p>Tax Invoice</p>
            </div>

            <div className={styles.invoiceInfo}>
              <div>
                <span>Invoice No</span>
                <b>{bill.invoiceNo || "-"}</b>
              </div>

              <div>
                <span>Invoice Date</span>
                <b>{bill.invoiceDate || "-"}</b>
              </div>

              <div>
                <span>Invoice Time</span>
                <b>{bill.invoiceTime || "-"}</b>
              </div>
            </div>
          </div>

          <div className={styles.divider} />

          {/* CUSTOMER + PAYMENT */}
          <div className={styles.infoGrid}>

            <div className={styles.infoCard}>
              <span className={styles.sectionLabel}>
                CUSTOMER
              </span>

              <h3>{customerName}</h3>

              <p>{customerPhone}</p>
            </div>

            <div className={styles.infoCard}>
              <span className={styles.sectionLabel}>
                PAYMENT
              </span>

              <div className={styles.paymentLine}>
                <span>Method</span>
                <b>
                  {bill.paymentMethod
                    ? bill.paymentMethod.toUpperCase()
                    : "-"}
                </b>
              </div>

              <div className={styles.paymentLine}>
                <span>Status</span>
                <b
                  className={
                    bill.paymentStatus === "paid"
                      ? styles.paid
                      : styles.pending
                  }
                >
                  {bill.paymentStatus
                    ? bill.paymentStatus.toUpperCase()
                    : "-"}
                </b>
              </div>
            </div>
          </div>

          {/* ITEMS */}
          <div className={styles.tableSection}>

            <div className={styles.sectionHeading}>
              <h3>Items</h3>
              <span>
                {bill.items?.length || 0} item
                {(bill.items?.length || 0) !== 1 ? "s" : ""}
              </span>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.center}>No</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>MRP</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {bill.items?.map((item, index) => (
                    <tr key={item.productId || index}>

                      <td >
                        {index + 1}
                      </td>

                      <td>
                          {item.name || "-"}
                      </td>

                      <td>
                        {item.totalGivenQty ??
                          item.qty ??
                          0}
                      </td>

                      <td>
                        ₹ {formatMoney(item.mrp)}
                      </td>

                      <td >
                        ₹{" "}
                        {formatMoney(
                          item.price ||
                          item.retailPrice ||
                          0
                        )}
                      </td>

                      <td>
                        ₹{" "}
                        {formatMoney(
                          item.finalPrice ??
                          item.totalAmount
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* BILL BOTTOM */}
          <div className={styles.bottomSection}>

            {/* LEFT */}
            <div className={styles.bottomLeft}>

              <div className={styles.thankYou}>
                <h4>Thank you for your purchase.</h4>

                <p>
                  Please keep this invoice for your
                  records.
                </p>
              </div>

              {bill.payments?.length > 0 && (
                <div className={styles.paymentDetails}>

                  <h4>Payment Details</h4>

                  {bill.payments.map((payment, index) => (
                    <div
                      className={styles.paymentDetailRow}
                      key={index}
                    >
                      <span>
                        {payment.method
                          ? payment.method.toUpperCase()
                          : "-"}
                      </span>

                      <b>
                        ₹ {formatMoney(payment.amount)}
                      </b>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT TOTALS */}
            <div className={styles.totals}>

              <div className={styles.totalRow}>
                <span>Sub Total</span>
                <b>
                  ₹ {formatMoney(summary.subTotal)}
                </b>
              </div>

              <div className={styles.totalRow}>
                <span>Total GST</span>
                <b>
                  ₹ {formatMoney(summary.totalGST)}
                </b>
              </div>

              {Number(summary.totalDiscount || 0) > 0 && (
                <div className={styles.totalRow}>
                  <span>Total Discount</span>
                  <b className={styles.discount}>
                    - ₹{" "}
                    {formatMoney(summary.totalDiscount)}
                  </b>
                </div>
              )}

              {Number(summary.loyaltyDiscount || 0) > 0 && (
                <div className={styles.totalRow}>
                  <span>Loyalty Discount</span>
                  <b className={styles.discount}>
                    - ₹{" "}
                    {formatMoney(summary.loyaltyDiscount)}
                  </b>
                </div>
              )}

              {Number(summary.offerAmount || 0) > 0 && (
                <div className={styles.totalRow}>
                  <span>
                    {summary.offerName || "Offer"}
                  </span>

                  <b className={styles.discount}>
                    - ₹{" "}
                    {formatMoney(summary.offerAmount)}
                  </b>
                </div>
              )}

              {Number(summary.roundOff || 0) !== 0 && (
                <div className={styles.totalRow}>
                  <span>Round Off</span>

                  <b>
                    ₹ {formatMoney(summary.roundOff)}
                  </b>
                </div>
              )}

              <div className={styles.grandTotal}>
                <span>Grand Total</span>

                <b>
                  ₹ {formatMoney(summary.grandTotal)}
                </b>
              </div>

              <div className={styles.totalRow}>
                <span>Paid Amount</span>

                <b className={styles.paidAmount}>
                  ₹ {formatMoney(bill.paidAmount)}
                </b>
              </div>

              <div className={styles.totalRow}>
                <span>Pending Amount</span>

                <b
                  className={
                    Number(bill.pendingAmount || 0) > 0
                      ? styles.pendingAmount
                      : styles.paidAmount
                  }
                >
                  ₹ {formatMoney(bill.pendingAmount)}
                </b>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className={styles.invoiceFooter}>
            <span>
              Invoice: {bill.invoiceNo || "-"}
            </span>

            <span>
              Payment:{" "}
              {bill.paymentMethod
                ? bill.paymentMethod.toUpperCase()
                : "-"}
            </span>

            <span>
              Status:{" "}
              {bill.paymentStatus
                ? bill.paymentStatus.toUpperCase()
                : "-"}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

export default CustomerBillView;