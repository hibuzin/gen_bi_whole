import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import styles from "./GRN.module.css";

function GRN() {
  const [grns, setGrns] = useState([]);
  const [selected, setSelected] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchGRNS();
  }, []);

  const fetchGRNS = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        "http://192.168.31.181:5000/api/GRN/grn",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to fetch GRNs"
        );
      }

      setGrns(data.data || []);

    } catch (err) {
      console.error("GRN FETCH ERROR:", err);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1>Goods Received Notes</h1>
            <p>
              View and manage received stock entries
            </p>
          </div>

          <button
            className={styles.addBtn}
            onClick={() => navigate("/create-grn")}
          >
            <FiPlus />
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Purchase</th>
                <th>Total Items</th>
                <th>Partial</th>
                <th>Scan</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {grns.map((grn) => (
                <tr
                  key={grn._id}
                  onClick={() => setSelected(grn)}
                >
                  <td>
                    {grn.purchaseId?._id || "—"}
                  </td>

                  <td>{grn.totalItems}</td>

                  <td>
                    {grn.isPartial
                      ? "Yes"
                      : "No"}
                  </td>

                  <td>
                    {grn.receivedByScan
                      ? "Yes"
                      : "No"}
                  </td>

                  <td>
                    {formatDate(grn.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div
          className={styles.overlay}
          onClick={(e) =>
            e.target === e.currentTarget &&
            setSelected(null)
          }
        >
          <div className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <div>
                <h2>GRN Details</h2>

                <p>{selected._id}</p>
              </div>

              <button
                className={styles.closeBtn}
                onClick={() =>
                  setSelected(null)
                }
              >
                ✕
              </button>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoCard}>
                <label>Purchase ID</label>

                <span>
                  {selected.purchaseId?._id ||
                    "—"}
                </span>
              </div>

              <div className={styles.infoCard}>
                <label>Total Amount</label>

                <span>
                  {selected.purchaseId
                    ?.totalAmount || "—"}
                </span>
              </div>

              <div className={styles.infoCard}>
                <label>Total Items</label>

                <span>
                  {selected.totalItems}
                </span>
              </div>

              <div className={styles.infoCard}>
                <label>Partial</label>

                <span>
                  {selected.isPartial
                    ? "Yes"
                    : "No"}
                </span>
              </div>

              <div className={styles.infoCard}>
                <label>Received By Scan</label>

                <span>
                  {selected.receivedByScan
                    ? "Yes"
                    : "No"}
                </span>
              </div>

              <div className={styles.infoCard}>
                <label>Created At</label>

                <span>
                  {formatDate(
                    selected.createdAt
                  )}
                </span>
              </div>
            </div>

            <div className={styles.itemsSection}>
              <h3>Items</h3>

              <div className={styles.itemsWrap}>
                {selected.items.map(
                  (item, index) => (
                    <div
                      key={index}
                      className={styles.itemCard}
                    >
                      <div>
                        <label>Product</label>

                        <p>
                          {item.productId
                            ?.name || "—"}
                        </p>
                      </div>

                      <div>
                        <label>Quantity</label>

                        <p>{item.qty}</p>
                      </div>

                      <div>
                        <label>Cost Price</label>

                        <p>
                          {item.costPrice}
                        </p>
                      </div>

                      <div>
                        <label>Barcode</label>

                        <p>
                          {item.barcode ||
                            "—"}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GRN;