
import { useEffect, useState } from "react";
import styles from "./Sales.module.css";
import { API } from "../../constants/api";

function Sales() {
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [paymentPeriod, setPaymentPeriod] = useState("today");
  const [payments, setPayments] = useState(null);

  const [salesData, setSalesData] = useState({
    today: null,
    week: null,
    month: null,
    year: null,
  });

  const rows = [
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "month", label: "This month" },
    { key: "year", label: "This year" },
  ];

  const paymentPeriods = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "week", label: "This week" },
    { key: "month", label: "This month" },
    { key: "year", label: "This year" },
  ];

  useEffect(() => {
    fetchAllSales();
  }, []);

  useEffect(() => {
    fetchPayments(paymentPeriod);
  }, [paymentPeriod]);

  const fetchPayments = async (period) => {
    try {
      setPaymentLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API.paymentBase}/${period}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const text = await res.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Invalid response from server: ${text.slice(0, 100)}`
        );
      }

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || "Failed to fetch payments"
        );
      }

      setPayments(data.data);
    } catch (err) {
      console.log(err);
      setPayments(null);
    } finally {
      setPaymentLoading(false);
    }
  };

  const fetchAllSales = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const types = ["today", "week", "month", "year"];

      const responses = await Promise.all(
        types.map((type) =>
          fetch(`${API.salesCheck}?type=${type}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).then((res) => res.json())
        )
      );

      const result = {};

      types.forEach((type, index) => {
        result[type] = responses[index]?.data || {
          totalBills: 0,
          totalSales: 0,
          totalGST: 0,
          totalDiscount: 0,
          subTotal: 0,
          profitAmount: 0,
        };
      });

      setSalesData(result);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (val) =>
    `₹ ${Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const paymentLabel =
    paymentPeriods.find((item) => item.key === paymentPeriod)?.label ||
    "Today";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Sales</h2>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.tbl}>
          <thead>
            <tr>
              <th>Period</th>
              <th>Total bills</th>
              <th>Sub total</th>
              <th>Total gst</th>
              <th>Total discount</th>
              <th>Profit</th>
              <th>Total sales</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7">
                  <div className={styles.tableLoader}>
                    <div className={styles.spinner}></div>
                    <p>Loading sales...</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const data = salesData[row.key];

                return (
                  <tr key={row.key}>
                    <td className={styles.periodCell}>
                      {row.label}
                    </td>

                    <td>{data?.totalBills || 0}</td>

                    <td>
                      {formatAmount(data?.subTotal)}
                    </td>

                    <td>
                      {formatAmount(data?.totalGST)}
                    </td>

                    <td>
                      {formatAmount(data?.totalDiscount)}
                    </td>

                    <td>
                      {formatAmount(data?.profitAmount)}
                    </td>

                    <td className={styles.salesCell}>
                      {formatAmount(data?.totalSales)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.paymentSection}>
        <div className={styles.header}>
          <div>
            <h2>{paymentLabel} Payments</h2>
          </div>

          <select
            value={paymentPeriod}
            onChange={(event) =>
              setPaymentPeriod(event.target.value)
            }
          >
            {paymentPeriods.map((period) => (
              <option
                key={period.key}
                value={period.key}
              >
                {period.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.paymentSummary}>
          <div>
            <span>Total payments</span>
            <strong>
              {paymentLoading
                ? 0
                : payments?.totalPayments || 0}
            </strong>
          </div>

          <div>
            <span>Total amount</span>
            <strong>
              {paymentLoading
                ? formatAmount(0)
                : formatAmount(payments?.totalAmount)}
            </strong>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th>Payment method</th>
                <th>Total payments</th>
                <th>Total amount</th>
              </tr>
            </thead>

            <tbody>
              {paymentLoading ? (
                <tr>
                  <td colSpan="3">
                    <div className={styles.tableLoader}>
                      <div className={styles.spinner}></div>
                      <p>Loading payments...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                [
                  { key: "upi", label: "UPI" },
                  { key: "card", label: "Card" },
                  { key: "cash", label: "Cash" },
                  { key: "bank", label: "Bank" },
                  { key: "cheque", label: "Cheque" },
                ].map((method) => {
                  const data =
                    payments?.summary?.[method.key];

                  return (
                    <tr key={method.key}>
                      <td className={styles.periodCell}>
                        {method.label}
                      </td>

                      <td>
                        {data?.totalPayments || 0}
                      </td>

                      <td className={styles.salesCell}>
                        {formatAmount(data?.totalAmount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Sales;