import { useEffect, useState } from "react";
import styles from "./PurchaseReturn.module.css";
import { FiPlus } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { API } from "../../constants/api";

function PurchaseReturn() {
  const [returns, setReturns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const navigate = useNavigate();

  useEffect(() => {
    fetchReturns();
  }, [statusFilter]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API.purchaseReturn}?status=${statusFilter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch returns");
      }

      setReturns(data.data || []);
    } catch (err) {
      console.error("RETURN FETCH ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getId = (value) => {
    if (!value) return "N/A";
    if (typeof value === "string") return value;
    return value._id || value.id || "N/A";
  };

  const getPurchaseText = (item) => {
    return item.purchaseId?.invoiceNo || getId(item.purchaseId);
  };

  const getSupplierText = (item) => {
    return (
      item.supplierId?.name ||
      item.purchaseId?.supplierName ||
      getId(item.supplierId)
    );
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1>Purchase returns</h1>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.count}>{returns.length} Records</div>

            <button
              className={styles.addBtn}
              onClick={() => navigate("/create-returns")}
            >
              Create purchase return
            </button>
          </div>
        </div>

        <div className={styles.filterTabs}>
          {["pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              type="button"
              className={`${styles.tabBtn} ${statusFilter === status ? styles.activeTab : ""
                }`}
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Purchase</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Total items</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5">
                    <div className={styles.tableLoader}>
                      <div className={styles.spinner}></div>
                      <p>Loading returns...</p>
                    </div>
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className={styles.emptyState}>
                      No {statusFilter} returns found
                    </div>
                  </td>
                </tr>
              ) : (
                returns.map((item) => (
                  <tr key={item._id} onClick={() => setSelected(item)}>
                    <td>{getPurchaseText(item)}</td>
                    <td>{getSupplierText(item)}</td>
                    <td>
                      <span
                        className={`${styles.status} ${styles[item.status] || ""
                          }`}
                      >
                        {item.status || "pending"}
                      </span>
                    </td>
                    <td>{item.items?.length || 0}</td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div
          className={styles.overlay}
          onClick={(e) =>
            e.target === e.currentTarget && setSelected(null)
          }
        >
          <div className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <div>
                <h2>Purchase return details</h2>
                <p>Return id: {selected._id}</p>
              </div>

              <button
                className={styles.closeBtn}
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoCard}>
                <label>Status</label>
                <span
                  className={`${styles.status} ${styles[selected.status] || ""
                    }`}
                >
                  {selected.status || "pending"}
                </span>
              </div>

              <div className={styles.infoCard}>
                <label>Created date</label>
                <p>{formatDate(selected.createdAt)}</p>
              </div>

              <div className={styles.infoCard}>
                <label>Purchase</label>
                <p>{selected.purchaseId?.invoiceNo || getId(selected.purchaseId)}</p>
              </div>

              <div className={styles.infoCard}>
                <label>Supplier</label>
                <p>{getSupplierText(selected)}</p>
              </div>

              <div className={styles.infoCard}>
                <label>Created by</label>
                <p>{getId(selected.createdBy)}</p>
              </div>

              <div className={styles.infoCard}>
                <label>Super admin</label>
                <p>{getId(selected.superAdminId)}</p>
              </div>
            </div>

            <div className={styles.itemsSection}>
              <h3>Returned items</h3>

              <div className={styles.itemsWrap}>
                {selected.items?.map((item) => (
                  <div key={item._id} className={styles.itemCard}>
                    <div>
                      <label>Product</label>
                      <p>{item.productId?.name || getId(item.productId)}</p>
                    </div>

                    <div>
                      <label>Quantity</label>
                      <p>{item.qty}</p>
                    </div>

                    <div>
                      <label>Reason</label>
                      <p>{item.reason || "N/A"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PurchaseReturn;