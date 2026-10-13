import { useEffect, useMemo, useState } from "react";
import styles from "./SalesReturn.module.css";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaEye, FaUndo, FaPlus } from "react-icons/fa";
import { API } from "../../constants/api";

function SalesReturn() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedReturn, setSelectedReturn] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSalesReturns();
  }, []);

  const fetchSalesReturns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(API.salesReturn, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setReturns(data.data || []);
      }
    } catch (err) {
      console.log("Sales return error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    const num = Number(value || 0);
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const filteredReturns = useMemo(() => {
    const q = search.toLowerCase().trim();

    return returns.filter((item) => {
      return (
        item.returnNo?.toLowerCase().includes(q) ||
        item.invoiceNo?.toLowerCase().includes(q) ||
        item.refundMethod?.toLowerCase().includes(q) 
      );
    });
  }, [returns, search]);

  const totalReturnAmount = filteredReturns.reduce(
    (sum, item) => sum + Number(item.totalReturnAmount || 0),
    0
  );

  const totalItems = filteredReturns.reduce(
    (sum, item) => sum + (item.items?.length || 0),
    0
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Sales return</h1>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.createReturnBox}
            onClick={() => navigate("/create-sales-return")}
          >
            <div>
              <b>Create sales return</b>
            </div>
          </button>
        </div>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}>
          <p>Total returns</p>
          <h2>{filteredReturns.length}</h2>
        </div>

        <div className={styles.card}>
          <p>Total items returned</p>
          <h2>{totalItems}</h2>
        </div>

        <div className={styles.card}>
          <p>Total refund amount</p>
          <h2>₹ {formatMoney(totalReturnAmount)}</h2>
        </div>
      </div>

      <div className={styles.searchBox}>
        <FaSearch />
        <input
          type="text"
          placeholder="Search return no, invoice no, refund method..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Return no</th>
              <th>Invoice no</th>
              <th>Date</th>
              <th>Items</th>
              <th>Refund method</th>
              <th>Total amount</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9">
                  <div className={styles.tableLoader}>
                    <div className={styles.spinner}></div>
                    <p>Loading sales returns...</p>
                  </div>
                </td>
              </tr>
            ) : filteredReturns.length === 0 ? (
              <tr>
                <td colSpan="9">
                  <div className={styles.emptyState}>
                    No sales return found
                  </div>
                </td>
              </tr>
            ) : (
              filteredReturns.map((item, index) => (
                <tr key={item._id}>
                  <td>{index + 1}</td>
                  <td className={styles.returnNo}>{item.returnNo || "-"}</td>
                  <td>{item.invoiceNo || "-"}</td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>{item.items?.length || 0}</td>
                  <td className={styles.capitalize}>
                    {item.refundMethod || "-"}
                  </td>
                  
                  <td className={styles.amount}>
                    ₹ {formatMoney(item.totalReturnAmount)}
                  </td>
                  <td>
                    <button
                      className={styles.viewBtn}
                      onClick={() => setSelectedReturn(item)}
                    >
                      <FaEye /> View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedReturn && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelectedReturn(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{selectedReturn.returnNo}</h2>
                <p>Invoice no: {selectedReturn.invoiceNo}</p>
              </div>

              <button
                className={styles.closeBtn}
                onClick={() => setSelectedReturn(null)}
              >
                ×
              </button>
            </div>

            <div className={styles.modalInfo}>
              <div>
                <span>Date</span>
                <b>{formatDate(selectedReturn.createdAt)}</b>
              </div>

              <div>
                <span>Refund method</span>
                <b>{selectedReturn.refundMethod || "-"}</b>
              </div>

              <div>
                <span>Total refund</span>
                <b>₹ {formatMoney(selectedReturn.totalReturnAmount)}</b>
              </div>
            </div>

            <div className={styles.itemsTitle}>Returned items</div>

            <div className={styles.itemTableWrap}>
              <table className={styles.itemTable}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Barcode</th>
                    <th>Sold qty</th>
                    <th>Return qty</th>
                    <th>Gst %</th>
                    <th>Gst amount</th>
                    <th>Return amount</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedReturn.items?.map((p) => (
                    <tr key={p._id}>
                      <td>{p.productName || p.productId?.name || "-"}</td>
                      <td>{p.barcode || "-"}</td>
                      <td>{p.soldQty || 0}</td>
                      <td>{p.returnQty || 0}</td>
                      <td>{p.gstRate || 0}%</td>
                      <td>₹ {formatMoney(p.gstAmount)}</td>
                      <td>₹ {formatMoney(p.returnAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedReturn.reason && (
              <div className={styles.reasonBox}>
                <span>Reason</span>
                <p>{selectedReturn.reason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesReturn;