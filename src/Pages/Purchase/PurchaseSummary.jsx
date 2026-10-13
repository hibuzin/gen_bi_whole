
import styles from "./CreatePurchase.module.css";

export default function PurchaseSummary({
  form,
  setForm,
  handleChange,
  purchaseTotals,
}) {
  const paymentMethod = String(form.paymentMethod || "cash")
    .trim()
    .toLowerCase();

  return (
    <div className={styles.invoiceFooter}>
      <div className={styles.footerColumns}>
        {/* LEFT COLUMN */}
        <div className={styles.footerColumn}>
          <div className={`${styles.footerField} ${styles.summaryField}`}>
            <span>Gross amount</span>
            <strong>
              ₹ {Number(purchaseTotals.totalGrossAmount || 0).toLocaleString("en-IN")}
            </strong>
          </div>

          <div className={`${styles.footerField} ${styles.summaryField}`}>
            <span>Tax amount</span>
            <strong>
              ₹ {Number(purchaseTotals.totalTaxAmount || 0).toLocaleString("en-IN")}
            </strong>
          </div>

          <div className={`${styles.footerField} ${styles.summaryField}`}>
            <span>Items total</span>
            <strong>
              ₹ {Number(purchaseTotals.itemsTotal || 0).toLocaleString("en-IN")}
            </strong>
          </div>
        </div>

        {/* TAX COLUMN */}
        <div className={styles.footerColumn}>
          <div className={`${styles.footerField} ${styles.summaryField}`}>
            <span>CGST</span>
            <strong>₹ {Number(purchaseTotals.cgst || 0).toFixed(2)}</strong>
          </div>

          <div className={`${styles.footerField} ${styles.summaryField}`}>
            <span>SGST</span>
            <strong>₹ {Number(purchaseTotals.sgst || 0).toFixed(2)}</strong>
          </div>

          <div className={`${styles.footerField} ${styles.summaryField}`}>
            <span>Total tax</span>
            <strong>
              ₹ {Number(purchaseTotals.totalTaxAmount || 0).toFixed(2)}
            </strong>
          </div>
        </div>

        {/* MIDDLE COLUMN */}
        <div className={styles.footerColumn}>
          <div className={styles.footerField}>
            <span>Freight charge</span>
            <div className={styles.footerInput}>
              <span>₹</span>
              <input
                type="text"
                name="freightCharge"
                value={form.freightCharge}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
          </div>

          <div className={styles.footerField}>
            <span>Packaging charge</span>
            <div className={styles.footerInput}>
              <span>₹</span>
              <input
                type="text"
                name="packagingCharge"
                value={form.packagingCharge}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
          </div>

          <div className={styles.footerField}>
            <span>Discount %</span>
            <div className={styles.footerInput}>
              <input
                type="text"
                name="billDiscountPercent"
                value={form.billDiscountPercent}
                onChange={handleChange}
                placeholder="0"
              />
              <span>%</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.footerColumn}>
          <div className={`${styles.footerField} ${styles.totalAmountField}`}>
            <span>Total amount</span>
            <strong>
              ₹ {Number(purchaseTotals.totalAmount || 0).toLocaleString("en-IN")}
            </strong>
          </div>

          <div className={styles.footerField}>
            <span>Amount paid</span>
            <div className={styles.footerInput}>
              <span>₹</span>
              <input
                type="text"
                name="paidAmount"
                value={form.paidAmount}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
          </div>

          <div className={styles.footerField}>
            <span>Payment type</span>
            <select
              className={styles.footerSelect}
              name="paymentMethod"
              value={paymentMethod}
              onChange={(e) => {
                console.log("Selected payment:", e.target.value);
                handleChange(e);
              }}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {paymentMethod === "bank" && (
            <>
              <div className={styles.footerField}>
                <span>Bank name</span>
                <input
                  className={styles.footerTextInput}
                  type="text"
                  name="bankName"
                  value={form.bankName || ""}
                  onChange={handleChange}
                  placeholder="State Bank of India"
                />
              </div>

              <div className={styles.footerField}>
                <span>Transaction id</span>
                <input
                  className={styles.footerTextInput}
                  type="text"
                  name="transactionId"
                  value={form.transactionId || ""}
                  onChange={handleChange}
                  placeholder="TXN123456789"
                />
              </div>
            </>
          )}

          {paymentMethod === "upi" && (
            <>
              <div className={styles.footerField}>
                <span>UPI id</span>
                <input
                  className={styles.footerTextInput}
                  type="text"
                  name="upiId"
                  value={form.upiId || ""}
                  onChange={handleChange}
                  placeholder="name@upi"
                />
              </div>

              <div className={styles.footerField}>
                <span>Transaction id</span>
                <input
                  className={styles.footerTextInput}
                  type="text"
                  name="upiTransactionId"
                  value={form.upiTransactionId || ""}
                  onChange={handleChange}
                  placeholder="UPI123456789"
                />
              </div>
            </>
          )}

          {paymentMethod === "card" && (
            <>
              <div className={styles.footerField}>
                <span>Card type</span>
                <select
                  className={styles.footerSelect}
                  name="cardType"
                  value={form.cardType || ""}
                  onChange={handleChange}
                >
                  <option value="">Select card</option>
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="RuPay">RuPay</option>
                  <option value="Amex">Amex</option>
                </select>
              </div>

              <div className={styles.footerField}>
                <span>Last 4 digits</span>
                <input
                  className={styles.footerTextInput}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  name="cardLast4"
                  value={form.cardLast4 || ""}
                  onChange={(e) => {
                    const value = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 4);

                    setForm((prev) => ({
                      ...prev,
                      cardLast4: value,
                    }));
                  }}
                  placeholder="1234"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
