import { useEffect, useState } from "react";
import styles from "./RateWiseSales.module.css";

function RateWiseSales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRateWiseSales();
  }, []);

  const fetchRateWiseSales = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://192.168.31.181:5000/api/gst-reports/rate-wise-sales",
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
        setSales(data.data);
      }
    } catch (error) {
      console.error("Error fetching rate wise sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalTaxable = sales.reduce(
    (acc, item) => acc + item.taxableAmount,
    0
  );

  const totalTax = sales.reduce(
    (acc, item) => acc + item.taxAmount,
    0
  );

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>
            Loading rate wise sales...
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

          <h1 className={styles.title}>Rate Wise Sales</h1>

          <p className={styles.subtitle}>
            Detailed breakdown of taxable amount and tax
            grouped by GST rate.
          </p>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>
            Total GST Rates
          </p>

          <h2 className={styles.summaryValue}>
            {sales.length}
          </h2>
        </div>

        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>
            Total Taxable Amount
          </p>

          <h2 className={styles.summaryValue}>
            ₹ {totalTaxable}
          </h2>
        </div>

        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>
            Total Tax Amount
          </p>

          <h2 className={styles.summaryValue}>
            ₹ {totalTax}
          </h2>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>S.No</th>
                <th>GST Rate</th>
                <th className={styles.right}>
                  Taxable Amount
                </th>
                <th className={styles.right}>
                  Tax Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {sales.map((item, index) => (
                <tr key={index}>
                  <td>
                    <span className={styles.serial}>
                      {index + 1}
                    </span>
                  </td>

                  <td>
                    <span className={styles.rateBadge}>
                      {item.gstRate}%
                    </span>
                  </td>

                  <td className={styles.amount}>
                    ₹ {item.taxableAmount}
                  </td>

                  <td className={styles.tax}>
                    ₹ {item.taxAmount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            {sales.length} GST rate entries available
          </p>
        </div>
      </div>
    </div>
  );
}

export default RateWiseSales;