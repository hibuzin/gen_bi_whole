import { useEffect, useState } from "react";
import styles from "./CashRegister.module.css";
import { API } from "../constants/api";
import Toast from "../components/Toast";

function CashRegister() {
  const [cash, setCash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [openingAmount, setOpeningAmount] = useState("");
  const [cashOutAmount, setCashOutAmount] = useState("");
  const [cashOutNote, setCashOutNote] = useState("");
  const [closingAmount, setClosingAmount] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

  const fetchCurrentCash = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(API.cashRegisterCurrent, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.success) {
        setCash(data.data);
      } else {
        setCash(null);
      }
    } catch (err) {
      console.log(err);
      setCash(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentCash();
  }, []);

  const handleOpenRegister = async () => {
    if (!openingAmount || Number(openingAmount) <= 0) {
      showToast("Enter opening amount", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(API.cashRegisterOpen, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          openingAmount: Number(openingAmount),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to open register");

      setCash(data.data);
      setOpeningAmount("");
      showToast(data.message || "Cash register opened");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleCashOut = async () => {
    if (!cashOutAmount || Number(cashOutAmount) <= 0) {
      showToast("Enter cash out amount", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(API.cashRegisterCashOut, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(cashOutAmount),
          note: cashOutNote,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Cash out failed");

      setCash(data.data);
      setCashOutAmount("");
      setCashOutNote("");
      showToast(data.message || "Cash out added");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleCloseRegister = async () => {
    if (!closingAmount || Number(closingAmount) < 0) {
      showToast("Enter closing amount", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(API.cashRegisterClose, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          closingAmount: Number(closingAmount),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Close register failed");

      setCash(data.data);
      setClosingAmount("");
      showToast(data.message || "Cash register closed");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const isOpen = cash?.status === "open";

  return (
    <div className={styles.container}>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className={styles.header}>
        <div>
          <h1>Cash In Hand</h1>
          <p>Manage opening cash, cash out and closing amount</p>
        </div>

        <span className={`${styles.status} ${isOpen ? styles.open : styles.closed}`}>
          {cash?.status || "not opened"}
        </span>
      </div>

      {loading ? (
        <div className={styles.pageLoader}>
          <div className={styles.spinner}></div>
          <p>Loading cash register...</p>
        </div>
      ) : (
        <div className={styles.contentScroll}>
          {!isOpen && (
            <div className={styles.openBox}>
              <h3>Open Cash Register</h3>
              <p>Enter today opening cash amount</p>

              <div className={styles.formRow}>
                <input
                  type="number"
                  placeholder="Opening amount"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                />

                <button onClick={handleOpenRegister}>Open Register</button>
              </div>
            </div>
          )}

          {cash && (
            <>
              <div className={styles.cards}>
                <div className={styles.card}>
                  <p>Opening Amount</p>
                  <h2>₹ {formatMoney(cash.openingAmount)}</h2>
                </div>

                <div className={styles.card}>
                  <p>Cash Sales</p>
                  <h2>₹ {formatMoney(cash.cashSales)}</h2>
                </div>

                <div className={styles.card}>
                  <p>UPI Sales</p>
                  <h2>₹ {formatMoney(cash.upiSales)}</h2>
                </div>

                <div className={styles.card}>
                  <p>Card Sales</p>
                  <h2>₹ {formatMoney(cash.cardSales)}</h2>
                </div>

                <div className={styles.card}>
                  <p>Cash Out</p>
                  <h2>₹ {formatMoney(cash.cashOut)}</h2>
                </div>

                <div className={styles.card}>
                  <p>Expected Cash</p>
                  <h2>₹ {formatMoney(cash.expectedCash)}</h2>
                </div>
              </div>

              {isOpen && (
                <div className={styles.actionGrid}>
                  <div className={styles.actionBox}>
                    <h3>Add Cash Out</h3>

                    <input
                      type="number"
                      placeholder="Amount"
                      value={cashOutAmount}
                      onChange={(e) => setCashOutAmount(e.target.value)}
                    />

                    <input
                      type="text"
                      placeholder="Note eg: tea, expense"
                      value={cashOutNote}
                      onChange={(e) => setCashOutNote(e.target.value)}
                    />

                    <button onClick={handleCashOut}>Add Cash Out</button>
                  </div>

                  <div className={styles.actionBox}>
                    <h3>Close Register</h3>

                    <input
                      type="number"
                      placeholder="Actual closing cash"
                      value={closingAmount}
                      onChange={(e) => setClosingAmount(e.target.value)}
                    />

                    <div className={styles.diffBox}>
                      Difference: ₹{" "}
                      {formatMoney(Number(closingAmount || 0) - Number(cash.expectedCash || 0))}
                    </div>

                    <button className={styles.closeRegisterBtn} onClick={handleCloseRegister}>
                      Close Register
                    </button>
                  </div>
                </div>
              )}

              {cash && !isOpen && (
                <div className={styles.closedBox}>
                  <h3>Register Closed</h3>
                  <p>Closing Amount: ₹ {formatMoney(cash.closingAmount)}</p>
                  <p>Expected Cash: ₹ {formatMoney(cash.expectedCash)}</p>
                  <p>Difference: ₹ {formatMoney(cash.difference)}</p>
                </div>
              )}

              {cash && (
                <div className={styles.historyBox}>
                  <h3>Cash Out History</h3>

                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Date</th>
                        <th>Note</th>
                        <th>Amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {cash.cashOutHistory?.length > 0 ? (
                        cash.cashOutHistory.map((item, index) => (
                          <tr key={item._id}>
                            <td>{index + 1}</td>
                            <td>{new Date(item.date).toLocaleString("en-IN")}</td>
                            <td>{item.note || "-"}</td>
                            <td>₹ {formatMoney(item.amount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className={styles.empty}>
                            No cash out history
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
           </div>
)}
        </div>
      );
}

      export default CashRegister;