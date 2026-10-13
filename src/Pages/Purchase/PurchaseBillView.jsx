import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./PurchaseBillView.module.css";
import { API } from "../../constants/api";
import html2pdf from "html2pdf.js";


function PurchaseBillView() {
  const { supplierId, purchaseId } = useParams();
  const navigate = useNavigate();
  const invoiceRef = useRef(null);
  const tableWrapRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBill();
  }, []);

  const handleDownloadPDF = async () => {
    const el = invoiceRef.current;
    const wrap = tableWrapRef.current;
    if (!el || !wrap) return;

    try {
      setDownloading(true);

      // measure the full table width BEFORE changing anything
      const fullWidth = wrap.scrollWidth + 56; // 56 = invoice left+right padding

      el.classList.add(styles.pdfMode);
      el.style.width = `${fullWidth}px`;

      // wait for layout to settle
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      );

      const w = el.scrollWidth;
      const h = el.scrollHeight;

      await html2pdf()
        .set({
          margin: 0,
          filename: `Purchase-${bill.invoiceNo || purchaseId}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            scrollX: 0,
            scrollY: 0,
            width: w,
            height: h,
            windowWidth: w,
            windowHeight: h,
          },
          jsPDF: {
            unit: "px",
            format: [w, h],
            orientation: w > h ? "landscape" : "portrait",
            hotfixes: ["px_scaling"],
          },
        })
        .from(el)
        .save();
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      el.style.width = "";
      el.classList.remove(styles.pdfMode);
      setDownloading(false);
    }
  };

  const fetchBill = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(API.purchaseById(purchaseId), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load purchase");
      }

      setBill(data.data);
    } catch (err) {
      console.error("Fetch purchase error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  if (!bill) {
    return <div style={{ padding: 40 }}>Bill not found</div>;
  }

  return (
    <div className={styles.page}>
      {/* TOP BAR */}
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(-1)}
        >
          ← Purchase Bill
        </button>

        <div className={styles.topActions}>
          <button
            className={styles.outlineBtn}
            onClick={() => window.print()}
          >
            🖨 Print
          </button>

          <button
            className={styles.outlineBtn}
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            {downloading ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* BILL */}
      <div className={styles.billWrap}>
        <div className={styles.invoice} ref={invoiceRef}>
          {/* HEADER */}
          <div className={styles.billHeaderInfo}>

            {/* SUPPLIER DETAILS */}
            <div className={styles.billFrom}>
              <div className={styles.billTitle}>
                PURCHASE BILL
              </div>

              <h3>
                {bill.supplier?.name || bill.supplierName || "-"}
              </h3>

              <p>
                {bill.supplier?.mobile || bill.supplierMobile || "-"}
              </p>

              {bill.supplier?.email && (
                <p>{bill.supplier.email}</p>
              )}
            </div>

            {/* BILL DETAILS */}
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
                <span>GRN No</span>
                <b>{bill.grnNo || "-"}</b>
              </div>

              <div>
                <span>GRN Date</span>
                <b>{bill.grnDate || "-"}</b>
              </div>

            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.divider} />

          {/* ITEMS TABLE */}
          <div className={styles.tableWrapper} ref={tableWrapRef}>
            <table className={styles.itemTable}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Item code</th>
                  <th>Items</th>
                  <th>HSN Code</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>GST %</th>
                  <th>Net cost</th>
                  <th>Mrp</th>
                  <th>Retail Price</th>
                  <th>Wholesale Price</th>
                  <th>Retail Profit</th>
                  <th>Wholesale Profit</th>
                  <th>Retail ROI %</th>
                  <th>Wholesale ROI %</th>
                  <th>Tax amt</th>
                  <th>Amount</th>
                  <th>Stock</th>
                  <th>Unit</th>
                  <th>Dis %</th>
                  <th>Dis amt</th>
                  <th>Free</th>
                  <th>Net amount</th>
                </tr>
              </thead>

              <tbody>
                {(bill.items || []).map((item, i) => (
                  <tr key={item._id || i}>
                    <td>{i + 1}</td>

                    {/* ITEM CODE */}
                    <td>
                      {
                        item.barcode || "—"
                      }
                    </td>

                    {/* ITEMS */}
                    <td className={styles.itemName}>
                      {item.productName || "-"}
                    </td>

                    {/* HSN CODE */}
                    <td>{item.hsnCode || "-"}</td>

                    {/* QTY */}
                    <td>
                      {
                        item.qty || 0
                      }
                    </td>

                    {/* RATE */}
                    <td>
                      ₹{Number(item.Rate || item.rate || 0).toFixed(2)}
                    </td>

                    {/* GST % */}
                    <td>
                      {String(item.taxPercentage ?? "").trim().toLowerCase() === "none"
                        ? "none"
                        : `${Number(item.taxPercentage || 0)}%`}
                    </td>

                    {/* NET COST */}
                    <td>
                      {
                        `₹${Number(item.netcost || 0).toFixed(2)}`
                      }
                    </td>

                    {/* MRP */}
                    <td>
                      {
                        `₹${Number(item.mrp || 0).toFixed(2)}`
                      }
                    </td>

                    {/* RETAIL PRICE */}
                    <td>
                      {
                        `₹${Number(item.retailPrice || 0).toFixed(2)}`
                      }
                    </td>

                    {/* WHOLESALE PRICE */}
                    <td>
                      {
                        `₹${Number(item.wholesalePrice || 0).toFixed(2)}`
                      }
                    </td>

                    {/* RETAIL PROFIT */}
                    <td>
                      ₹{Number(item.retailProfitAmount || 0).toFixed(2)}
                    </td>

                    {/* WHOLESALE PROFIT */}
                    <td>
                      ₹{Number(item.wholesaleProfitAmount || 0).toFixed(2)}
                    </td>

                    {/* RETAIL ROI */}
                    <td>
                      {Number(item.retailRoiPercent || 0).toFixed(2)}%
                    </td>

                    {/* WHOLESALE ROI */}
                    <td>
                      {Number(item.wholesaleRoiPercent || 0).toFixed(2)}%
                    </td>

                    {/* TAX AMOUNT */}
                    <td>
                      ₹{Number(item.taxAmount || 0).toFixed(2)}
                    </td>

                    {/* AMOUNT */}
                    <td>
                      ₹{Number(item.amount || 0).toFixed(2)}
                    </td>

                    {/* STOCK */}
                    <td>
                      {item.stockQty ?? 0}
                    </td>

                    {/* UNIT */}
                    <td>
                      {item.unit || "-"}
                    </td>

                    {/* DISCOUNT % */}
                    <td>
                      {
                        `${Number(item.discountPercent || 0).toFixed(2)}%`
                      }
                    </td>

                    {/* DISCOUNT AMOUNT */}
                    <td>
                      {
                        `₹${Number(item.discountAmount || 0).toFixed(2)}`
                      }
                    </td>

                    {/* FREE */}
                    <td>
                      {
                        item.freeQty || 0
                      }
                    </td>

                    {/* NET AMOUNT */}
                    <td>
                      ₹
                      {Number(
                        item.netAmount || item.totalCostWithGST || 0
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.divider} />

          {/* TOTALS */}
          {/* TOTALS */}
          <div className={styles.totalsWrap}>
            <div className={styles.totalsRight}>

              {/* ROW 1 */}
              <div className={styles.totalRow}>
                <div>
                  <span>Gross Amount</span>
                  <b>
                    ₹ {Number(bill.totalGrossAmount || 0).toFixed(2)}
                  </b>
                </div>

                <div>
                  <span>Discount %</span>
                  <b>

                    {Number(
                      bill.billDiscountPercent || bill.discountAmount || 0
                    )}
                  </b>
                </div>

                <div>
                  <span>Packaging Charge</span>
                  <b>
                    ₹{" "}
                    {Number(
                      bill.packagingCharge ||
                      bill.packagingCharges ||
                      0
                    ).toFixed(2)}
                  </b>
                </div>

                <div>
                  <span>Freight Charge</span>
                  <b>
                    ₹{" "}
                    {Number(
                      bill.freightCharge ||
                      bill.freightCharges ||
                      0
                    ).toFixed(2)}
                  </b>
                </div>
              </div>

              {/* ROW 2 */}
              <div className={styles.totalRow}>
                <div>
                  <span>Tax Amount</span>
                  <b>
                    ₹{" "}
                    {Number(
                      bill.totalTaxAmount ||
                      (bill.items || []).reduce(
                        (sum, item) =>
                          sum + Number(item.taxAmount || 0),
                        0
                      )
                    ).toFixed(2)}
                  </b>
                </div>

                <div>
                  <span>Invoice Amount</span>
                  <b>
                    ₹ {Number(bill.invoiceAmount || 0).toFixed(2)}
                  </b>
                </div>

                <div>
                  <span>Total Amount</span>
                  <b>
                    ₹ {Number(bill.totalAmount || 0).toFixed(2)}
                  </b>
                </div>

                <div>
                  <span>GRN Amount</span>
                  <b>
                    ₹ {Number(bill.grnAmount || 0).toFixed(2)}
                  </b>
                </div>
              </div>

              {/* PAYMENT DETAILS */}
              <div className={styles.paymentSummary}>
                <div className={styles.totalRow}>
                  <div>
                    <span>Paid Amount</span>
                    <b>
                      ₹ {Number(bill.paidAmount || 0).toFixed(2)}
                    </b>
                  </div>

                  <div>
                    <span>Balance</span>
                    <b>
                      ₹ {Number(bill.balanceAmount || 0).toFixed(2)}
                    </b>
                  </div>

                  <div>
                    <span>Status</span>
                    <b>
                      {bill.paymentStatus || "-"}
                    </b>
                  </div>


                  <div>
                    <span>Payment Method</span>
                    <b>{bill.paymentMethod || "-"}</b>
                  </div>

                  <div>
                    <span>Payment History</span>
                    <b>
                      {Array.isArray(bill.paymentHistory)
                        ? bill.paymentHistory.length > 0
                          ? bill.paymentHistory
                            .map((payment) => payment.paymentMethod || payment.method || "-")
                            .join(", ")
                          : "-"
                        : "-"}
                    </b>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PurchaseBillView;