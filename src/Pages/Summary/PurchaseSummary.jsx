import { useEffect, useState } from "react";
import styles from "./PurchaseSummary.module.css";

function PurchaseSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        API.purchaseSummary,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingCard}>
          <div className={styles.spinner}></div>
          <p>Loading purchase summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>GST REPORT</p>

          <h1 className={styles.title}>Purchase Summary</h1>

          <p className={styles.subtitle}>
            Overview of total purchases and input GST details.
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <p className={styles.label}>Total Purchases</p>
          </div>

          <h2 className={styles.value}>
            {summary?.totalPurchases || 0}
          </h2>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTop}>
            <p className={styles.label}>Total Purchase Amount</p>
          </div>

          <h2 className={styles.value}>
            ₹ {summary?.totalPurchase || 0}
          </h2>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTop}>
            <p className={styles.label}>Input GST</p>
          </div>

          <h2 className={styles.value}>
            ₹ {summary?.inputGST || 0}
          </h2>
        </div>
      </div>
    </div>
  );
}

export default PurchaseSummary;