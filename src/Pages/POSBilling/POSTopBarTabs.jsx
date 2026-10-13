import { useEffect, useState } from "react";
import styles from "./POSTopBarTabs.module.css";
import { API } from "../../constants/api";
import pauseIcon from "../../assets/pause.png";

function POSTopBarTabs({
  navigate,
  token,
  priceType,
  setPriceType,
  holdTabs,
  setHoldTabs,
  activeHoldId,
  setActiveHoldId,
  scannedItems,
  setScannedItems,
  codes,
  setCodes,
  setScanCode,
  setLoading,
  showToast,
  clearCustomer,
  latestBillCount,
  isEditMode,
  editInvoiceNo,
  recentBillsRefresh,
}) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [recentBills, setRecentBills] = useState([]);

  // DATE & TIME
  const formattedDate = `${String(
    currentDateTime.getDate()
  ).padStart(2, "0")} / ${String(
    currentDateTime.getMonth() + 1
  ).padStart(2, "0")} / ${currentDateTime.getFullYear()}`;

  const formattedTime = currentDateTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // CLEAR CURRENT BILL
  const clearCurrentBill = () => {
    setActiveHoldId(null);
    setScannedItems([]);
    setCodes([]);
    setScanCode("");
    clearCustomer?.();
  };

  const fetchRecentBills = async () => {
    try {
      const res = await fetch(`${API.bill}?period=today&gst=all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch recent bills");
      }

      const bills = Array.isArray(data.data) ? data.data : [];

      setRecentBills(
        bills.filter((bill) => bill.billId)
      );
    } catch (err) {
      console.log("Recent bills fetch error:", err);
    }
  };

  useEffect(() => {
    fetchRecentBills();
  }, [recentBillsRefresh]);

  const handleRecentBillClick = async (bill) => {
    try {
      const res = await fetch(`${API.bill}/${bill.billId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load bill");
      }

      const selectedBill = data.data;

      navigate("/posbilling", {
        state: {
          editBill: selectedBill,
        },
      });
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // HOLD BILL
  const holdBill = () => {
    if (holdTabs.length >= 5) {
      showToast("Maximum 5 billing screens only", "error");
      return;
    }

    if (scannedItems.length === 0) {
      showToast("Please add items", "error");
      return;
    }

    try {
      setLoading(true);

      const user = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const userId = user.userId;

      if (!userId) {
        throw new Error("User information not found");
      }

      const holdStorageKey = `pos_hold_bill_data_${userId}`;

      const savedHolds = JSON.parse(
        localStorage.getItem(holdStorageKey) || "[]"
      );

      const holdId = `hold_${Date.now()}`;

      const holdNo =
        savedHolds.length > 0
          ? Math.max(
            ...savedHolds.map((hold) => Number(hold.holdNo) || 0)
          ) + 1
          : 1;

      const newHold = {
        holdId,
        holdNo,
        priceType,
        items: scannedItems,
      };

      const updatedHolds = [
        ...savedHolds,
        newHold,
      ];

      localStorage.setItem(
        holdStorageKey,
        JSON.stringify(updatedHolds)
      );

      showToast(
        `Bill Hold Successfully (#${holdNo})`,
        "success"
      );

      setHoldTabs((prev) => [
        ...prev,
        {
          holdId,
          holdNo,
          screenNo: prev.length + 1,
        },
      ]);

      setActiveHoldId(null);
      setScannedItems([]);
      setCodes([]);
      setScanCode("");
      clearCustomer?.();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // RESUME HOLD BILL
  const resumeHoldBill = (holdId) => {
    try {
      setLoading(true);

      const user = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const userId = user.userId;

      if (!userId) {
        throw new Error("User information not found");
      }

      const holdStorageKey = `pos_hold_bill_data_${userId}`;

      const savedHolds = JSON.parse(
        localStorage.getItem(holdStorageKey) || "[]"
      );

      const savedHold = savedHolds.find(
        (hold) => hold.holdId === holdId
      );

      if (!savedHold) {
        throw new Error("Hold bill not found");
      }

      setActiveHoldId(savedHold.holdId);

      setScannedItems(savedHold.items);

      setCodes(
        savedHold.items.flatMap((item) =>
          Array(Number(item.qty || 1)).fill(item.barcode)
        )
      );

      showToast(
        `Hold #${savedHold.holdNo} loaded`,
        "success"
      );
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // DELETE HOLD TAB
  const closeHoldTab = (e, tab) => {
    e.stopPropagation();

    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    const userId = user.userId;

    const holdStorageKey = `pos_hold_bill_data_${userId}`;

    const savedHolds = JSON.parse(
      localStorage.getItem(holdStorageKey) || "[]"
    );

    const updatedHolds = savedHolds.filter(
      (hold) => hold.holdId !== tab.holdId
    );

    localStorage.setItem(
      holdStorageKey,
      JSON.stringify(updatedHolds)
    );

    setHoldTabs((prev) =>
      prev
        .filter((t) => t.holdId !== tab.holdId)
        .map((t, index) => ({
          ...t,
          screenNo: index + 1,
        }))
    );

    if (activeHoldId === tab.holdId) {
      setActiveHoldId(null);
      setScannedItems([]);
      setCodes([]);
      setScanCode("");
      clearCustomer?.();
    }
  };

  return (
    <>
   
   {/* TOP BAR */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button
            className={styles.exitBtn}
            onClick={() => {
              setActiveHoldId(null);
              setScannedItems([]);
              setCodes([]);
              setScanCode("");
              clearCustomer?.();

              if (isEditMode) {
                navigate("/posbilling", {
                  replace: true,
                  state: null,
                });
              } else {
                navigate(-1);
              }
            }}
          >
            <span>←</span>
            EXIT BILLING
          </button>

          <span className={styles.billCount}>
            {isEditMode
              ? `Editing: ${editInvoiceNo || ""}`
              : `Current Bill: #${Number(latestBillCount || 0) + 1}`}
          </span>

          <div className={styles.priceTypeSelector}>
            <button
              type="button"
              className={
                priceType === "retail"
                  ? styles.priceTypeActive
                  : styles.priceTypeBtn
              }
              onClick={() => setPriceType("retail")}
            >
              Retail
            </button>

            <button
              type="button"
              className={
                priceType === "wholesale"
                  ? styles.priceTypeActive
                  : styles.priceTypeBtn
              }
              onClick={() => setPriceType("wholesale")}
            >
              Wholesale
            </button>
          </div>
        </div>

        <div className={styles.topBarRight}>
          <span className={styles.recentLabel}>Recent Bills</span>

          <div className={styles.recentBills}>
            {recentBills.map((bill) => (
              <button
                key={bill.billId}
                type="button"
                className={styles.recentBillBtn}
                onClick={() => handleRecentBillClick(bill)}
              >
                {bill.invoiceNo || `#${bill.billCount}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Row ── */}
      <div className={styles.tabsRow}>
        {holdTabs.map((tab) => (
          <div
            key={tab.holdId}
            className={
              activeHoldId === tab.holdId
                ? styles.tabActive
                : styles.tabHold
            }
            onClick={() => resumeHoldBill(tab.holdId)}
          >
            <span>Billing screen {tab.screenNo}</span>

            <button
              type="button"
              className={styles.closeTabBtn}
              onClick={(e) => closeHoldTab(e, tab)}
            >
              ×
            </button>
          </div>
        ))}

        <div
          className={!activeHoldId ? styles.tabActive : styles.tabHold}
          onClick={() => {
            setActiveHoldId(null);
            setScannedItems([]);
            setCodes([]);
            setScanCode("");
          }}
        >
          <span>Billing Tab {holdTabs.length + 1}</span>

          <button
            type="button"
            className={styles.closeTabBtn}
            onClick={(e) => {
              e.stopPropagation();
              setActiveHoldId(null);
              setScannedItems([]);
              setCodes([]);
              setScanCode("");
              clearCustomer();
            }}
          >
            ×
          </button>
        </div>

        {!isEditMode && (
          <div className={styles.tabAdd} onClick={holdBill}>
  <img
    src={pauseIcon}
    alt=""
    className={styles.pauseIcon}
  />
  Pause Bill & Create New
</div>
        )}
      </div>
    </>
  );
}

export default POSTopBarTabs;