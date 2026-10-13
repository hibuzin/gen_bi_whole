import { useEffect, useMemo, useState } from "react";
import { API } from "../../constants/api";
import Toast from "../../components/Toast";
import styles from "./Payment.module.css";

function Payment() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const [payModal, setPayModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [paymentType, setPaymentType] = useState("cash"); // NEW
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API.suppliers}/supplier-purchases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setPayments(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      const text = search.toLowerCase();
      const isPaid = item.paymentMode === "Paid" || Number(item.balanceAmount) <= 0;
      const matchesSearch =
        item.supplierName?.toLowerCase().includes(text) ||
        item.invoiceNo?.toLowerCase().includes(text);
      return !isPaid && matchesSearch;
    });
  }, [payments, search]);

  const openPayModal = (item) => {
    setSelectedPurchase(item);
    setPayAmount("");
    setPaymentType("cash"); // reset
    setPayModal(true);
  };

  const closePayModal = () => {
    setPayModal(false);
    setSelectedPurchase(null);
    setPayAmount("");
    setPaymentType("cash");
  };

  const handlePaySubmit = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      showToast("Enter valid amount", "error");
      return;
    }
    try {
      setPaying(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API.purchase}/pay/${selectedPurchase.purchaseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(payAmount),       // string fix
          paymentType: paymentType,        // NEW
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPayments((prev) =>
          prev.map((p) =>
            p.purchaseId === selectedPurchase.purchaseId
              ? {
                ...p,
                paidAmount: data.data.paidAmount,
                balanceAmount: data.data.balanceAmount,
                paymentMode:
                  data.data.balanceAmount === 0
                    ? "Paid"
                    : data.data.paidAmount > 0
                      ? "Partial Paid"
                      : "Unpaid",
              }
              : p
          )
        );
        showToast(data.message || "Payment successful", "success");
        closePayModal();
      } else {
        showToast(data.message || "Payment failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast(err?.message || "Payment failed", "error");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className={styles.container}>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className={styles.header}>
        <h2>Supplier payments</h2>
        <input
          type="text"
          placeholder="Search supplier / invoice..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
        />
      </div>

      <div className={styles.count}>
        Total records : <strong>{filteredPayments.length}</strong>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No</th>
              <th>Invoice</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9">
                  <div className={styles.tableLoader}>
                    <div className={styles.spinner}></div>
                    <p>Loading payments...</p>
                  </div>
                </td>
              </tr>
            ) : filteredPayments.length === 0 ? (
              <tr>
                <td colSpan="9">
                  <div className={styles.emptyState}>
                    No records found
                  </div>
                </td>
              </tr>
            ) : (
              filteredPayments.map((item, index) => (
                <tr key={item.purchaseId}>
                  <td>{index + 1}</td>
                  <td>{item.invoiceNo}</td>
                  <td>{new Date(item.invoiceDate).toLocaleDateString("en-IN")}</td>
                  <td>{item.supplierName}</td>
                  <td>₹ {Number(item.totalAmount).toFixed(2)}</td>
                  <td>₹ {Number(item.paidAmount).toFixed(2)}</td>
                  <td>₹ {Number(item.balanceAmount).toFixed(2)}</td>
                  <td>
                    <span>
                      {item.paymentMode}
                    </span>
                  </td>
                  <td>
                    {item.paymentMode !== "Paid" && (
                      <button className={styles.payBtn} onClick={() => openPayModal(item)}>
                        Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {payModal && (
        <div className={styles.modalOverlay} onClick={closePayModal}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3>Pay supplier - {selectedPurchase?.supplierName}</h3>
            <p>Balance: ₹ {Number(selectedPurchase?.balanceAmount).toFixed(2)}</p>

            <input
              type="number"
              placeholder="Enter amount"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className={styles.payInput}
              autoFocus
            />

            {/* Payment Type Dropdown */}
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className={styles.payInput}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank transfer</option>
              <option value="cheque">Cheque</option>
            </select>

            <div className={styles.modalActions}>
              <button onClick={closePayModal} disabled={paying}>Cancel</button>
              <button
                className={styles.confirmPayBtn}
                onClick={handlePaySubmit}
                disabled={paying}
              >
                {paying ? "Paying..." : "Confirm pay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payment;