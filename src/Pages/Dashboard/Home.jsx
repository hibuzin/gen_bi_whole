import { useEffect, useState } from "react";
import styles from "./Home.module.css";
import { API } from "../../constants/api";
import { FaPencilAlt, } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [reportType, setReportType] = useState("today");
  const [salesData, setSalesData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };

  useEffect(() => {
    fetchSalesReport(reportType);
  }, [reportType]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchSalesReport = async (type) => {
    try {
      const res = await fetch(
        `${API.bill}/sales-check?type=${type}`,
        { headers: authHeaders }
      );

      const json = await res.json();
      const d = json?.data;

      setSalesData([
        {
          name: type,
          bills: d?.totalBills || 0,
          sales: d?.totalSales || 0,
        },
      ]);
    } catch (err) {
      setSalesData([]);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(API.bill, {
        headers: authHeaders,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to fetch bills");
      }

      const list = Array.isArray(json?.data) ? json.data : [];

      const allBills = list.sort(
        (a, b) => Number(b.billCount || 0) - Number(a.billCount || 0)
      );

      setTransactions(allBills);
    } catch (err) {
      console.error("Bill fetch error:", err);
      setTransactions([]);
    }
  };

  return (
    <div className={styles.container}>

      {/* FIXED TOP */}
      <div className={styles.pageHeader}>
        <h1>Dashboard</h1>
        <div className={styles.divider}></div>
      </div>

      {/* ONLY THIS SCROLLS */}
      <div className={styles.pageContent}>
        <div className={styles.transactionSection}>
          <div className={styles.transactionTitleRow}>
            <div>
              <h2>All Bills</h2>
              <p>{transactions.length} bills</p>
            </div>
          </div>

          <div className={styles.transactionTableWrapper}>
            <table className={styles.transactionTable}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Bill no</th>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Return</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="11" className={styles.emptyCell}>
                      No bills found for today
                    </td>
                  </tr>
                ) : (
                  transactions.map((bill, index) => {
                    const paymentMethod =
                      bill.payment?.paymentMethod ||
                      bill.payment?.payments?.[0]?.method ||
                      bill.paymentMethod ||
                      "cash";

                    const paymentStatus =
                      bill.payment?.paymentStatus ||
                      bill.paymentStatus ||
                      "paid";

                    const paidAmount = Number(
                      bill.payment?.paidAmount ||
                      bill.paidAmount ||
                      0
                    );

                    const pendingAmount = Number(
                      bill.payment?.pendingAmount ||
                      bill.pendingAmount ||
                      0
                    );

                    const returnAmount = Number(
                      bill.payment?.returnAmount ||
                      bill.returnAmount ||
                      0
                    );

                    const totalAmount = Number(
                      bill.summary?.grandTotal ||
                      bill.totalAmount ||
                      0
                    );

                    return (
                      <tr
                        key={bill.billId || bill._id}
                        className={styles.tableRow}
                        onClick={() =>
                          navigate(
                            `/customer/${bill.customer?._id || bill.customer?.id || "walkin"}/bill/${bill.billId || bill._id}`
                          )
                        }
                      >
                        <td>{index + 1}</td>

                        <td>
                          <strong>{bill.invoiceNo || "-"}</strong>
                        </td>

                        <td>{bill.invoiceTime || "-"}</td>

                        <td>
                          <div className={styles.customerDetails}>
                            <strong>
                              {bill.customer?.name ||
                                bill.customer?.customerName ||
                                "Walk in Customer"}
                            </strong>

                            <span>
                              {bill.customer?.mobile || "-"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span >
                            {paymentMethod}
                          </span>
                        </td>

                        <td>
                          <span
                            
                          >
                            {paymentStatus}
                          </span>
                        </td>

                        <td>₹ {paidAmount.toFixed(2)}</td>

                        <td>₹ {pendingAmount.toFixed(2)}</td>

                        <td>₹ {returnAmount.toFixed(2)}</td>

                        <td className={styles.totalAmount}>
                          ₹ {totalAmount.toFixed(2)}
                        </td>

                        <td
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/posbilling", {
                              state: {
                                editBill: bill,
                              },
                            });
                          }}
                        >
                          <FaPencilAlt
                            size={15}
                            className={styles.openIcon}
                          />
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
    </div>
  );
}