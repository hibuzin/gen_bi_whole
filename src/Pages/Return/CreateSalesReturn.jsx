import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import styles from "./CreateSalesReturn.module.css";
import { API } from "../../constants/api";

function CreateSalesReturn() {
  const navigate = useNavigate();

  const [invoiceNo, setInvoiceNo] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [items, setItems] = useState([{ productId: "", returnQty: 1 }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === "returnQty" ? Number(value) : value;
    setItems(updated);
  };

  const addRow = () => {
    setItems([...items, { productId: "", returnQty: 1 }]);
  };

  const removeRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    const cleanItems = items.filter(
      (item) => item.productId.trim() && Number(item.returnQty) > 0
    );

    if (!invoiceNo.trim()) {
      setError("Invoice number is required");
      return;
    }

    if (cleanItems.length === 0) {
      setError("Add at least one valid return item");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(API.salesReturn, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoiceNo,
          refundMethod,
          items: cleanItems,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Failed to create sales return");
        return;
      }

      setResult(data.data);
      setInvoiceNo("");
      setRefundMethod("cash");
      setItems([{ productId: "", returnQty: 1 }]);
    } catch (err) {
      console.log(err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.topSection}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate("/sales-return")}
          >
            <FaArrowLeft />
          </button>

          <div>
            <h2 className={styles.title}>Create Sales Return</h2>
          </div>
        </div>
      </div>

      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>Invoice no</label>
            <input
              type="text"
              placeholder="INV-00423"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label>Refund method</label>
            <select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank">Bank</option>
            </select>
          </div>
        </div>

        <div className={styles.itemsWrap}>
          {items.map((item, index) => (
            <div key={index} className={styles.itemCard}>
              <div className={styles.itemHeader}>
                <h4>Return item {index + 1}</h4>

                {items.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeRow(index)}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className={styles.itemGrid}>
                <div className={styles.field}>
                  <label>Product id</label>
                  <input
                    type="text"
                    placeholder="Product id"
                    value={item.productId}
                    onChange={(e) =>
                      handleItemChange(index, "productId", e.target.value)
                    }
                  />
                </div>

                <div className={styles.field}>
                  <label>Return qty</label>
                  <input
                    type="number"
                    min="1"
                    value={item.returnQty}
                    onChange={(e) =>
                      handleItemChange(index, "returnQty", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}

          {error && <div className={styles.error}>{error}</div>}

          {result && (
            <div className={styles.resultBox}>
              <h3>Sales Return Created Successfully</h3>

              <div className={styles.resultGrid}>
                <p>
                  <span>Return no</span>
                  <b>{result.returnNo}</b>
                </p>

                <p>
                  <span>Invoice no</span>
                  <b>{result.invoiceNo}</b>
                </p>

                <p>
                  <span>Refund Method</span>
                  <b>{result.refundMethod}</b>
                </p>

                <p>
                  <span>Total return</span>
                  <b>₹ {formatMoney(result.summary?.totalReturnAmount)}</b>
                </p>
              </div>

              <div className={styles.summaryWrap}>
                <table className={styles.summaryTable}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Barcode</th>
                      <th>Sold qty</th>
                      <th>Return qty</th>
                      <th>Gst</th>
                      <th>Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {result.items?.map((item, index) => (
                      <tr key={index}>
                        <td>{item.productName}</td>
                        <td>{item.barcode}</td>
                        <td>{item.soldQty}</td>
                        <td>{item.returnQty}</td>
                        <td>₹ {formatMoney(item.gstAmount)}</td>
                        <td>₹ {formatMoney(item.returnAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footerActions}>
          <button type="button" className={styles.addBtn} onClick={addRow}>
            + Add item
          </button>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? "Creating..." : "Create sales return"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateSalesReturn;