import { useEffect, useState } from "react";
import styles from "./SalesSummary.module.css";

function SalesSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesSummary();
  }, []);

  const fetchSalesSummary = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://192.168.31.181:5000/api/gst-reports/sales-summary",
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
      console.error("Error fetching sales summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>
            Loading sales summary...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>GST REPORT</p>

          <h1 className={styles.title}>Sales Summary</h1>

          <p className={styles.subtitle}>
            Complete overview of sales, taxable amount, and GST details.
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <p className={styles.label}>Total Bills</p>
          <h2 className={styles.value}>
            {summary?.totalBills || 0}
          </h2>
        </div>

        <div className={styles.card}>
          <p className={styles.label}>Total Sales</p>
          <h2 className={styles.value}>
            ₹ {summary?.totalSales || 0}
          </h2>
        </div>

        <div className={styles.card}>
          <p className={styles.label}>Taxable Amount</p>
          <h2 className={styles.value}>
            ₹ {summary?.taxableAmount || 0}
          </h2>
        </div>

        <div className={styles.card}>
          <p className={styles.label}>CGST</p>
          <h2 className={styles.value}>
            ₹ {summary?.cgst || 0}
          </h2>
        </div>

        <div className={styles.card}>
          <p className={styles.label}>SGST</p>
          <h2 className={styles.value}>
            ₹ {summary?.sgst || 0}
          </h2>
        </div>

        <div className={styles.card}>
          <p className={styles.label}>IGST</p>
          <h2 className={styles.value}>
            ₹ {summary?.igst || 0}
          </h2>
        </div>

        <div className={`${styles.card} ${styles.highlightCard}`}>
          <p className={styles.label}>Total Tax</p>
          <h2 className={styles.value}>
            ₹ {summary?.totalTax || 0}
          </h2>
        </div>
      </div>
    </div>
  );
}

export default SalesSummary;